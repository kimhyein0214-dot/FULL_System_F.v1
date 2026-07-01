import { loadWorkflowQueues } from "../adapters/workflowEventAdapter.mjs?v=20260701-workflow-read2";
import { buildPickingViewModel } from "../workflows/picking/buildPickingViewModel.mjs";

const SUPABASE_URL = "https://vgxocngpykhlkosiaeew.supabase.co";
const SUPABASE_KEY = "sb_publishable_XVnKGJo66GZiYTq5Ivu8dA_SjBVvX0g";
const IMAGE_SUPABASE_URL = "https://bpgvqmtsjgegnrdzmpep.supabase.co";
const IMAGE_BUCKET = "product-images";
const JO_SIZE = 4;

const params = new URLSearchParams(location.search);
const allowWrites = params.get("write") === "1";
const allowWorkflowEvents = allowWrites && params.get("events") === "1";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  activeTab: "picking",
  selectedDate: new Date().toISOString().slice(0, 10),
  session: "ALL",
  workSortMode: true,
  filterMode: "all",
  viewModel: null,
  groups: [],
  groupInfos: [],
  currentGroup: 0,
  trayOpen: false,
  trayExpanded: false,
  currentTrayKey: "",
  searchText: "",
  workflowQueues: null,
  workflowQueueError: "",
  selectedShortageKey: "",
  selectedInspectionGroup: "",
  workflowEventsReady: false,
  workflowEventsChecked: false,
  saving: new Set(),
};

const els = {
  dateInput: document.getElementById("date-input"),
  refreshBtn: document.getElementById("refresh-btn"),
  todayBtn: document.getElementById("today-btn"),
  sortToggle: document.getElementById("sort-toggle"),
  searchInput: document.getElementById("search-input"),
  filterBar: document.getElementById("filter-bar"),
  groupList: document.getElementById("group-list"),
  jumpGroupInput: document.getElementById("jump-group-input"),
  jumpGroupBtn: document.getElementById("jump-group-btn"),
  jumpSeqInput: document.getElementById("jump-seq-input"),
  jumpSeqBtn: document.getElementById("jump-seq-btn"),
  jumpInvoiceInput: document.getElementById("jump-invoice-input"),
  jumpInvoiceBtn: document.getElementById("jump-invoice-btn"),
  pickingPanel: document.getElementById("picking-panel"),
  dashboardPanel: document.getElementById("dashboard-panel"),
  shortagePanel: document.getElementById("shortage-panel"),
  inspectionPanel: document.getElementById("inspection-panel"),
  shortageListCount: document.getElementById("shortage-list-count"),
  shortageListBody: document.getElementById("shortage-list-body"),
  shortageDetail: document.getElementById("shortage-detail"),
  inspectionListCount: document.getElementById("inspection-list-count"),
  inspectionListBody: document.getElementById("inspection-list-body"),
  inspectionDetail: document.getElementById("inspection-detail"),
  dashboardSummary: document.getElementById("dashboard-summary"),
  orderList: document.getElementById("order-list"),
  panelSubtitle: document.getElementById("panel-subtitle"),
  currentGroupLabel: document.getElementById("current-group-label"),
  progressText: document.getElementById("progress-text"),
  progressFill: document.getElementById("progress-fill"),
  bottomTray: document.getElementById("bottom-tray"),
  trayHandle: document.getElementById("tray-handle"),
  trayExpandBtn: document.getElementById("tray-expand-btn"),
  trayLabel: document.getElementById("tray-label"),
  trayCount: document.getElementById("tray-count"),
  trayTitle: document.getElementById("tray-title"),
  trayBoard: document.getElementById("tray-board"),
  metricOrders: document.getElementById("metric-orders"),
  metricPicked: document.getElementById("metric-picked"),
  metricShortage: document.getElementById("metric-shortage"),
  metricHold: document.getElementById("metric-hold"),
  metricWrite: document.getElementById("metric-write"),
  metricEvents: document.getElementById("metric-events"),
  toast: document.getElementById("toast"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactCode(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[()[\]{}]/g, "")
    .toUpperCase();
}

function codeCompareKey(value) {
  return String(value || "")
    .replace(/[\s()[\]{}]/g, "")
    .replace(/[^0-9A-Z_-]/gi, "")
    .toUpperCase();
}

function ownCodeCandidates(ownCode) {
  const raw = String(ownCode || "").trim();
  const withoutPrefix = raw.replace(/^\[[^\]]+\]\s*/, "").trim();
  const noBrackets = raw.replace(/[\[\]{}()]/g, "").trim();
  const compact = codeCompareKey(raw);
  const withoutPrefixCompact = codeCompareKey(withoutPrefix);
  return [...new Set([raw, withoutPrefix, noBrackets, compact, withoutPrefixCompact].filter(Boolean))];
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 1800);
}

async function fetchAllRows(makeQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await makeQuery().range(from, to);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function productImageUrl(sellpiaProductCode) {
  const code = String(sellpiaProductCode || "").trim();
  if (!code) return "";
  return `${IMAGE_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/sellpia/${encodeURIComponent(code)}.jpg`;
}

function isPicked(item) {
  return Boolean(item.pickingState?.isPicked);
}

function shortageQty(item) {
  return Number(item.pickingState?.shortageQty || item.shortageState?.shortageQty || 0);
}

function isHold(item) {
  return Boolean(item.pickingState?.isHold || item.shortageState?.isHold);
}

function isGoldItem(item) {
  const ownCode = String(item.ownCode || "").trim().toUpperCase();
  const sellpiaCode = String(item.sellpiaProductCode || "").trim().toUpperCase();
  const text = `${item.productName || ""} ${item.optionName || ""}`.toUpperCase();
  return (
    ownCode.startsWith("GPA") ||
    ownCode.startsWith("GPB") ||
    ownCode.includes("14K") ||
    sellpiaCode.startsWith("GPA") ||
    sellpiaCode.startsWith("GPB") ||
    sellpiaCode.includes("14K") ||
    text.includes("14K")
  );
}

function invoiceHasGold(invoice) {
  return (invoice.items || []).some(isGoldItem);
}

function invoiceDrawerValue(invoice) {
  return String(
    invoice.sellpiaMemo1 ||
      (invoice.items || []).find((item) => String(item.pickingState?.drawerMemo || "").trim())?.pickingState?.drawerMemo ||
      "",
  ).trim();
}

function invoiceHasNoDrawer(invoice) {
  return !invoiceDrawerValue(invoice);
}

function itemStateKey(invoice, item) {
  return `${invoice.orderGroupNo}::${item.sellpiaItemNo}`;
}

function cleanOptionName(optionName, ownCode) {
  const rawOption = String(optionName || "").trim();
  const rawCode = String(ownCode || "").trim();
  if (!rawOption || !rawCode) return rawOption;

  let option = rawOption;
  const candidates = ownCodeCandidates(rawCode);
  const candidateKeys = new Set(candidates.map(codeCompareKey).filter(Boolean));

  option = option.replace(/\[([^\]]+)\]/g, (match, inner) => {
    const innerKey = codeCompareKey(inner);
    return candidateKeys.has(innerKey) ? "" : match;
  });

  for (const code of candidates) {
    option = option.replace(new RegExp(escapeRegExp(code), "gi"), "");
  }

  return option
    .replace(/\[\s*\]/g, "")
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,/|:>-]+|[\s,/|:>-]+$/g, "")
    .trim();
}

function invoiceStats(invoice) {
  const items = invoice.items || [];
  const picked = items.filter(isPicked).length;
  const shortage = items.filter((item) => shortageQty(item) > 0).length;
  const hold = items.filter(isHold).length;
  return {
    total: items.length,
    picked,
    shortage,
    hold,
    done: items.length > 0 && picked === items.length && shortage === 0 && hold === 0,
    todo: items.some((item) => !isPicked(item)) || shortage > 0 || hold > 0,
    qty: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
  };
}

function sortInvoices(invoices) {
  const rows = [...invoices];
  if (!state.workSortMode) return rows;
  return rows.sort((a, b) => {
    const aStats = invoiceStats(a);
    const bStats = invoiceStats(b);
    return (
      aStats.total - bStats.total ||
      aStats.qty - bStats.qty ||
      (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999) ||
      String(a.orderGroupNo).localeCompare(String(b.orderGroupNo), "ko")
    );
  });
}

function sortPickingRows(rows) {
  if (!state.workSortMode) return rows;
  return [...rows].sort((a, b) => {
    const aItem = a.item;
    const bItem = b.item;
    const aGold = invoiceHasGold(a.invoice);
    const bGold = invoiceHasGold(b.invoice);
    if (aGold && bGold) {
      return (
        (a.invoice.sortOrder ?? 999999) - (b.invoice.sortOrder ?? 999999) ||
        String(a.invoice.orderGroupNo).localeCompare(String(b.invoice.orderGroupNo), "ko") ||
        (aItem.itemOrderIndex ?? 999999) - (bItem.itemOrderIndex ?? 999999)
      );
    }
    if (aGold !== bGold) {
      return (
        (a.invoice.sortOrder ?? 999999) - (b.invoice.sortOrder ?? 999999) ||
        String(a.invoice.orderGroupNo).localeCompare(String(b.invoice.orderGroupNo), "ko")
      );
    }
    return (
      (aItem.sortOrder ?? 999999) - (bItem.sortOrder ?? 999999) ||
      String(aItem.ownCode || "").localeCompare(String(bItem.ownCode || ""), "ko", { numeric: true }) ||
      (aItem.itemOrderIndex ?? 999999) - (bItem.itemOrderIndex ?? 999999) ||
      (a.invoice.sortOrder ?? 999999) - (b.invoice.sortOrder ?? 999999) ||
      String(a.invoice.orderGroupNo).localeCompare(String(b.invoice.orderGroupNo), "ko")
    );
  });
}

function rebuildGroups() {
  const invoices = sortInvoices(state.viewModel?.invoices || []);
  state.groups = [];
  state.groupInfos = [];

  const addGroups = (rows, prefix, kind) => {
    for (let index = 0; index < rows.length; index += JO_SIZE) {
      state.groups.push(rows.slice(index, index + JO_SIZE));
      state.groupInfos.push({ label: `${prefix}${Math.floor(index / JO_SIZE) + 1}조`, kind });
    }
  };

  addGroups(
    invoices.filter((invoice) => !invoiceHasGold(invoice)),
    "",
    "normal",
  );
  addGroups(
    invoices.filter(invoiceHasGold),
    "골드",
    "gold",
  );

  if (!state.groups.length) {
    state.groupInfos = [];
  }
  if (state.currentGroup >= state.groups.length) state.currentGroup = Math.max(0, state.groups.length - 1);
}

function currentVisibleInvoices() {
  const search = state.searchText.trim().toLowerCase();
  const statusView = state.filterMode !== "all" || search;
  const base = statusView ? sortInvoices(state.viewModel?.invoices || []) : state.groups[state.currentGroup] || [];

  return base
    .filter((invoice) => invoiceMatchesFilter(invoice, state.filterMode))
    .filter((invoice) => {
      if (!search) return true;
      const haystack = [
        invoice.invoiceNo,
        invoice.orderGroupNo,
        invoice.displayName,
        invoice.recipientName,
        invoice.buyerName,
        invoice.seller,
        ...invoice.items.flatMap((item) => [item.ownCode, item.sellpiaProductCode, item.productName, item.optionName]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
}

function currentPickingRows() {
  return sortPickingRows(
    currentVisibleInvoices().flatMap((invoice, invoiceIndex) =>
      (invoice.items || []).map((item, itemIndex) => ({ invoice, item, invoiceIndex, itemIndex })),
    ),
  );
}

function currentTrayInvoices() {
  return currentVisibleInvoices();
}

function itemSlotKey(invoice, item) {
  return `${invoice.orderGroupNo}::${item.sellpiaItemNo}`;
}

function itemOrderNo(itemIndex = 0) {
  return itemIndex + 1;
}

function renderInvoiceSlots(invoiceIndex, item, itemIndex) {
  const activeSlot = (invoiceIndex % JO_SIZE) + 1;
  const orderNo = itemOrderNo(itemIndex);
  return `<div class="invoice-slots" aria-label="조 배치 슬롯">
    ${Array.from({ length: JO_SIZE }, (_, index) => {
      const slotNo = index + 1;
      const active = slotNo === activeSlot;
      return `<div class="invoice-slot ${active ? "active" : ""}">
        <span>${slotNo}</span>
        <strong>${active ? escapeHtml(orderNo) : ""}</strong>
      </div>`;
    }).join("")}
  </div>`;
}

function itemStatusMeta(item) {
  if (shortageQty(item) > 0) return { label: `미송 ${shortageQty(item)}`, className: "shortage" };
  if (isHold(item)) return { label: "보류", className: "hold" };
  if (isPicked(item)) return { label: "완료", className: "picked" };
  return { label: "대기", className: "todo" };
}

function sellerBadgeMeta(seller) {
  const text = String(seller || "").trim().toLowerCase();
  if (!text) return null;
  if (text.includes("스마트") || text.includes("smart") || text.includes("naver") || text.includes("네이버")) {
    return { label: "스마트스토어", className: "seller-smartstore" };
  }
  if (text.includes("지그재그") || text.includes("zigzag") || text.includes("zig")) {
    return { label: "지그재그", className: "seller-zigzag" };
  }
  if (text.includes("에이블리") || text.includes("ably") || text.includes("a-bly")) {
    return { label: "에이블리", className: "seller-ably" };
  }
  if (text.includes("쿠팡") || text.includes("coupang")) {
    return { label: "쿠팡", className: "seller-coupang" };
  }
  return { label: "메이크샵", className: "seller-makeshop" };
}

function workflowItemKey(invoice, item) {
  return `${invoice.orderGroupNo}::${item.sellpiaItemNo}`;
}

function workflowItemState(invoice, item) {
  return state.workflowQueues?.workflowState?.itemStateByKey?.get(workflowItemKey(invoice, item)) || null;
}

function workflowInvoiceState(invoice) {
  return state.workflowQueues?.workflowState?.invoiceStateByKey?.get(invoice.orderGroupNo) || null;
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function workflowSummary() {
  const queues = state.workflowQueues;
  if (!queues) {
    return {
      ready: false,
      status: state.workflowQueueError ? "오류" : "대기",
      shortageItems: 0,
      inspectionInvoices: 0,
      repickedItems: 0,
      missingInvoices: 0,
      eventRows: 0,
    };
  }

  const repickedItems = Array.from(queues.workflowState.itemStateByKey.values()).filter(
    (row) => row.shortageRepicked && !row.inspected && !row.cancelled,
  ).length;

  return {
    ready: true,
    status: "ON",
    shortageItems: queues.shortageItems.length,
    inspectionInvoices: queues.inspectionInvoices.length,
    repickedItems,
    missingInvoices: Math.max(0, queues.orderGroupNos.length - queues.viewModel.invoices.length),
    eventRows: queues.itemEvents.length + queues.invoiceEvents.length,
  };
}

function invoiceMatchesFilter(invoice, filterMode) {
  const stats = invoiceStats(invoice);
  if (filterMode === "todo") return stats.todo;
  if (filterMode === "shortage") return stats.shortage > 0;
  if (filterMode === "nodrawer") return invoiceHasNoDrawer(invoice);
  if (filterMode === "gold") return invoiceHasGold(invoice);
  if (filterMode === "hold") return stats.hold > 0;
  if (filterMode === "done") return stats.done;
  return true;
}

function filterLabel(filterMode) {
  return {
    all: "전체",
    todo: "미완료",
    shortage: "미송",
    nodrawer: "서랍없음",
    gold: "골드",
    hold: "보류",
    done: "완료",
  }[filterMode] || "전체";
}

function renderMetrics() {
  const invoices = state.viewModel?.invoices || [];
  const items = invoices.flatMap((invoice) => invoice.items || []);
  els.metricOrders.textContent = String(invoices.length);
  els.metricPicked.textContent = String(items.filter(isPicked).length);
  els.metricShortage.textContent = String(items.filter((item) => shortageQty(item) > 0).length);
  els.metricHold.textContent = String(items.filter(isHold).length);
  els.metricWrite.textContent = allowWorkflowEvents ? "EVENT" : allowWrites ? "ON" : "OFF";
  const workflow = workflowSummary();
  if (workflow.ready || state.workflowQueueError) els.metricEvents.textContent = workflow.status;
  else if (!allowWorkflowEvents) els.metricEvents.textContent = "OFF";
  else if (!state.workflowEventsChecked) els.metricEvents.textContent = "대기";
  else els.metricEvents.textContent = state.workflowEventsReady ? "ON" : "미준비";
}

function renderDashboard() {
  if (!els.dashboardSummary) return;
  const invoices = state.viewModel?.invoices || [];
  const items = invoices.flatMap((invoice) => invoice.items || []);
  const picked = items.filter(isPicked).length;
  const shortage = items.filter((item) => shortageQty(item) > 0).length;
  const hold = items.filter(isHold).length;
  const noDrawer = invoices.filter(invoiceHasNoDrawer).length;
  const goldInvoices = invoices.filter(invoiceHasGold).length;
  const goldItems = items.filter(isGoldItem).length;

  const percent = (value, total) => (total ? Math.min(100, Math.round((value / total) * 100)) : 0);
  const chartRows = [
    { label: "피킹완료", value: picked, total: items.length, unit: "개", tone: "good" },
    { label: "미송", value: shortage, total: items.length, unit: "개", tone: "danger" },
    { label: "보류", value: hold, total: items.length, unit: "개", tone: "warn" },
    { label: "서랍없음", value: noDrawer, total: invoices.length, unit: "건", tone: "muted" },
    { label: "골드송장", value: goldInvoices, total: invoices.length, unit: "건", tone: "gold" },
    { label: "골드상품", value: goldItems, total: items.length, unit: "개", tone: "gold" },
  ];
  const workflow = workflowSummary();

  els.dashboardSummary.innerHTML = `<div class="dashboard-overview">
      <div><span>송장</span><strong>${invoices.length}</strong><em>건</em></div>
      <div><span>상품</span><strong>${items.length}</strong><em>개</em></div>
      <div><span>완료율</span><strong>${percent(picked, items.length)}</strong><em>%</em></div>
    </div>
    <div class="dashboard-chart">
      ${chartRows
        .map((row) => {
          const pct = percent(row.value, row.total);
          return `<div class="dashboard-chart-row ${row.tone}">
            <div class="chart-head">
              <span>${escapeHtml(row.label)}</span>
              <strong>${row.value}${escapeHtml(row.unit)} / ${row.total}${escapeHtml(row.unit)}</strong>
            </div>
            <div class="chart-track"><div class="chart-fill" style="width:${pct}%"></div></div>
          </div>`;
        })
        .join("")}
    </div>
    <div class="workflow-dashboard">
      <div class="workflow-flow-head">
        <strong>미송 → 검품 연결</strong>
        <span class="${workflow.ready ? "ok" : state.workflowQueueError ? "bad" : "wait"}">${escapeHtml(workflow.status)}</span>
      </div>
      ${
        state.workflowQueueError
          ? `<div class="workflow-error">${escapeHtml(state.workflowQueueError)}</div>`
          : `<div class="workflow-flow-grid">
              <div><span>미송피킹 대기</span><strong>${workflow.shortageItems}</strong><em>상품</em></div>
              <div><span>검품 대기</span><strong>${workflow.inspectionInvoices}</strong><em>송장</em></div>
              <div><span>피킹완료 미검품</span><strong>${workflow.repickedItems}</strong><em>상품</em></div>
              <div class="${workflow.missingInvoices ? "bad" : ""}"><span>원본 연결 누락</span><strong>${workflow.missingInvoices}</strong><em>송장</em></div>
            </div>
            <p>미송피킹/검품은 선택 날짜가 아니라 workflow event 상태 기준으로 집계됩니다.</p>`
      }
    </div>`;
}

function renderTray() {
  if (!els.trayBoard) return;
  const invoices = currentTrayInvoices();
  const rows = invoices.flatMap((invoice, invoiceIndex) =>
    (invoice.items || []).map((item) => ({ invoice, item, invoiceIndex })),
  );
  const done = rows.filter(({ item }) => isPicked(item)).length;
  const groupLabel =
    state.searchText || state.filterMode !== "all"
      ? filterLabel(state.filterMode)
      : state.groupInfos[state.currentGroup]?.label || `${state.currentGroup + 1}조`;

  els.bottomTray?.classList.toggle("open", state.trayOpen);
  els.bottomTray?.classList.toggle("expanded", state.trayExpanded);
  if (els.trayHandle) els.trayHandle.setAttribute("aria-expanded", String(state.trayOpen));
  if (els.trayLabel) els.trayLabel.textContent = `${groupLabel} 상품 슬롯`;
  if (els.trayTitle) els.trayTitle.textContent = `${groupLabel} 상품 슬롯`;
  if (els.trayCount) els.trayCount.textContent = `${done}/${rows.length}`;
  if (els.trayExpandBtn) els.trayExpandBtn.textContent = state.trayExpanded ? "접기" : "펼치기";

  if (!rows.length) {
    els.trayBoard.innerHTML = '<div class="tray-empty">표시할 상품이 없습니다.</div>';
    return;
  }

  const slots = [[], [], [], []];
  rows.forEach((row) => {
    slots[Math.min(3, row.invoiceIndex % 4)].push(row);
  });

  els.trayBoard.innerHTML = slots
    .map((slotRows, index) => {
      const picked = slotRows.filter(({ item }) => isPicked(item)).length;
      const shortage = slotRows.filter(({ item }) => shortageQty(item) > 0).length;
      const firstInvoice = slotRows[0]?.invoice;
      const title = firstInvoice
        ? `${index + 1}번 · ${firstInvoice.displayName || firstInvoice.csDisplayName || firstInvoice.invoiceNo || ""}`
        : `${index + 1}번`;
      const body = slotRows.length
        ? slotRows
            .map(({ invoice, item }) => {
              const meta = itemStatusMeta(item);
              const key = itemSlotKey(invoice, item);
              const classes = [
                "tray-item",
                meta.className,
                key === state.currentTrayKey ? "selected" : "",
                isGoldItem(item) ? "is-gold" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return `<button class="${classes}" data-tray-key="${escapeHtml(key)}" type="button">
                <span class="tray-item-check">${isPicked(item) ? "✓" : ""}</span>
                <span class="tray-item-main">
                  <strong>${escapeHtml(item.ownCode || "-")}</strong>
                  <small>${escapeHtml(cleanOptionName(item.optionName, item.ownCode) || item.productName || "-")}</small>
                </span>
                <span class="tray-item-qty">${Number(item.quantity) || 1}개</span>
                <span class="tray-item-state">${escapeHtml(meta.label)}</span>
              </button>`;
            })
            .join("")
        : '<div class="tray-slot-empty">상품 없음</div>';
      return `<section class="tray-slot">
        <div class="tray-slot-head">
          <span>${escapeHtml(title)}</span>
          <strong>${picked}/${slotRows.length}</strong>
          ${shortage ? `<em>미송 ${shortage}</em>` : ""}
        </div>
        <div class="tray-slot-list">${body}</div>
      </section>`;
    })
    .join("");
}

function renderGroups() {
  els.groupList.innerHTML = state.groups
    .map((group, index) => {
      const info = state.groupInfos[index] || { label: `${index + 1}조`, kind: "normal" };
      const stats = group.reduce(
        (acc, invoice) => {
          const invoiceStat = invoiceStats(invoice);
          acc.total += invoiceStat.total;
          acc.done += invoiceStat.picked;
          acc.shortage += invoiceStat.shortage;
          return acc;
        },
        { total: 0, done: 0, shortage: 0 },
      );
      const classes = [
        "group-btn",
        index === state.currentGroup ? "active" : "",
        stats.shortage ? "has-shortage" : "",
        info.kind === "gold" ? "is-gold" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<button class="${classes}" data-group="${index}">
        <span>${escapeHtml(info.label)}</span>
        <span>${stats.done}/${stats.total}${stats.shortage ? ` · 미송 ${stats.shortage}` : ""}</span>
      </button>`;
    })
    .join("");
}

function renderFilters() {
  els.filterBar.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filterMode);
  });
}

function renderProgress(invoices) {
  const items = invoices.flatMap((invoice) => invoice.items || []);
  const done = items.filter(isPicked).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const groupLabel = state.groupInfos[state.currentGroup]?.label || `${state.currentGroup + 1}조`;
  els.currentGroupLabel.textContent =
    state.searchText || state.filterMode !== "all" ? filterLabel(state.filterMode) : groupLabel;
  els.progressText.textContent = `${done}/${total} 완료`;
  els.progressFill.style.width = `${pct}%`;
}

function renderOrderList() {
  const invoices = currentVisibleInvoices();
  const rows = currentPickingRows();
  renderProgress(invoices);
  const groupLabel = state.groupInfos[state.currentGroup]?.label || `${state.currentGroup + 1}조`;
  els.panelSubtitle.textContent =
    state.searchText || state.filterMode !== "all"
      ? `${filterLabel(state.filterMode)} · ${rows.length}상품 / ${invoices.length}송장`
      : `${groupLabel} · ${rows.length}상품 / ${invoices.length}송장`;

  if (!state.viewModel) {
    els.orderList.innerHTML = '<div class="empty">데이터를 불러오는 중입니다.</div>';
    return;
  }

  if (!rows.length) {
    els.orderList.innerHTML = '<div class="empty">표시할 상품이 없습니다.</div>';
    return;
  }

  els.orderList.innerHTML = rows.map(({ invoice, item, invoiceIndex, itemIndex }) => renderPickingRow(invoice, item, invoiceIndex, itemIndex)).join("");
}

function renderWorkflowEmpty(target, message) {
  if (target) target.innerHTML = `<div class="workflow-empty">${escapeHtml(message)}</div>`;
}

function renderShortagePanels() {
  const rows = state.workflowQueues?.shortageItems || [];
  if (els.shortageListCount) els.shortageListCount.textContent = `${rows.length}개`;

  if (state.workflowQueueError) {
    renderWorkflowEmpty(els.shortageListBody, state.workflowQueueError);
    renderWorkflowEmpty(els.shortageDetail, "이벤트 큐를 불러오지 못했습니다.");
    return;
  }

  if (!state.workflowQueues) {
    renderWorkflowEmpty(els.shortageListBody, "이벤트 큐를 불러오는 중입니다.");
    renderWorkflowEmpty(els.shortageDetail, "미송 대상 상품을 선택하면 상세가 표시됩니다.");
    return;
  }

  if (!rows.length) {
    renderWorkflowEmpty(els.shortageListBody, "현재 미송피킹 대기 상품이 없습니다.");
    renderWorkflowEmpty(els.shortageDetail, "미송피킹 대기 상품이 없습니다.");
    return;
  }

  if (!rows.some(({ invoice, item }) => workflowItemKey(invoice, item) === state.selectedShortageKey)) {
    state.selectedShortageKey = workflowItemKey(rows[0].invoice, rows[0].item);
  }

  els.shortageListBody.innerHTML = rows
    .map(({ invoice, item, state: itemState }) => {
      const key = workflowItemKey(invoice, item);
      return `<button class="workflow-row ${key === state.selectedShortageKey ? "selected" : ""}" data-shortage-key="${escapeHtml(key)}" type="button">
        <span class="workflow-row-code">${escapeHtml(item.ownCode || "-")}</span>
        <span class="workflow-row-main">
          <strong>${escapeHtml(cleanOptionName(item.optionName, item.ownCode) || item.productName || "-")}</strong>
          <small>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")} · ${escapeHtml(invoice.invoiceNo || "송장없음")}</small>
        </span>
        <span class="workflow-row-badge danger">미송 ${Number(itemState?.shortageQty || 0) || 1}</span>
      </button>`;
    })
    .join("");

  const selected = rows.find(({ invoice, item }) => workflowItemKey(invoice, item) === state.selectedShortageKey) || rows[0];
  const selectedState = selected.state || workflowItemState(selected.invoice, selected.item);
  const seller = sellerBadgeMeta(selected.invoice.seller);
  els.shortageDetail.innerHTML = `<div class="workflow-detail-card">
    <div class="workflow-detail-head">
      <div>
        <strong>${escapeHtml(selected.item.ownCode || "-")}</strong>
        <span>${escapeHtml(selected.invoice.displayName || selected.invoice.csDisplayName || "-")}</span>
      </div>
      ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
    </div>
    <div class="workflow-detail-main">
      <div class="workflow-photo">${productImageUrl(selected.item.sellpiaProductCode) ? `<img src="${productImageUrl(selected.item.sellpiaProductCode)}" alt="">` : "사진"}</div>
      <div class="workflow-detail-text">
        <h3>${escapeHtml(cleanOptionName(selected.item.optionName, selected.item.ownCode) || selected.item.productName || "-")}</h3>
        <p>${escapeHtml(selected.item.productName || "")}</p>
        <dl>
          <div><dt>송장번호</dt><dd>${escapeHtml(selected.invoice.invoiceNo || "-")}</dd></div>
          <div><dt>부족수량</dt><dd>${Number(selectedState?.shortageQty || 0) || 1}개</dd></div>
          <div><dt>접수일</dt><dd>${escapeHtml(selected.invoice.receiptDate || "-")}</dd></div>
          <div><dt>마지막 이벤트</dt><dd>${escapeHtml(formatShortDate(selectedState?.lastEventAt))}</dd></div>
        </dl>
      </div>
    </div>
  </div>`;
}

function renderInspectionPanels() {
  const invoices = state.workflowQueues?.inspectionInvoices || [];
  if (els.inspectionListCount) els.inspectionListCount.textContent = `${invoices.length}건`;

  if (state.workflowQueueError) {
    renderWorkflowEmpty(els.inspectionListBody, state.workflowQueueError);
    renderWorkflowEmpty(els.inspectionDetail, "이벤트 큐를 불러오지 못했습니다.");
    return;
  }

  if (!state.workflowQueues) {
    renderWorkflowEmpty(els.inspectionListBody, "검품 대기 송장을 불러오는 중입니다.");
    renderWorkflowEmpty(els.inspectionDetail, "검품 대기 송장을 선택하면 전체 상품이 표시됩니다.");
    return;
  }

  if (!invoices.length) {
    renderWorkflowEmpty(els.inspectionListBody, "현재 검품 대기 송장이 없습니다.");
    renderWorkflowEmpty(els.inspectionDetail, "검품 대기 송장이 없습니다.");
    return;
  }

  if (!invoices.some((invoice) => invoice.orderGroupNo === state.selectedInspectionGroup)) {
    state.selectedInspectionGroup = invoices[0].orderGroupNo;
  }

  els.inspectionListBody.innerHTML = invoices
    .map((invoice) => {
      const itemStates = (invoice.items || []).map((item) => workflowItemState(invoice, item)).filter(Boolean);
      const repicked = itemStates.filter((row) => row.shortageRepicked && !row.inspected && !row.cancelled).length;
      return `<button class="workflow-row ${invoice.orderGroupNo === state.selectedInspectionGroup ? "selected" : ""}" data-inspection-group="${escapeHtml(invoice.orderGroupNo)}" type="button">
        <span class="workflow-row-code">${escapeHtml(invoice.invoiceNo || "송장없음")}</span>
        <span class="workflow-row-main">
          <strong>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</strong>
          <small>상품 ${invoice.items.length}종 · 접수 ${escapeHtml(invoice.receiptDate || "-")}</small>
        </span>
        <span class="workflow-row-badge warn">검품 ${repicked}</span>
      </button>`;
    })
    .join("");

  const selected = invoices.find((invoice) => invoice.orderGroupNo === state.selectedInspectionGroup) || invoices[0];
  const seller = sellerBadgeMeta(selected.seller);
  const invoiceState = workflowInvoiceState(selected);
  els.inspectionDetail.innerHTML = `<div class="inspection-header-skeleton">
      <div>
        <strong>${escapeHtml(selected.invoiceNo || "송장없음")}</strong>
        <span>${escapeHtml(selected.displayName || selected.csDisplayName || "-")} · 접수 ${escapeHtml(selected.receiptDate || "-")}</span>
      </div>
      <div class="inspection-actions">
        ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        <button class="btn" type="button" disabled>보류 처리</button>
        <button class="btn primary" type="button" disabled>완료 처리</button>
      </div>
    </div>
    <div class="workflow-item-table">
      ${(selected.items || [])
        .map((item, index) => {
          const itemState = workflowItemState(selected, item);
          const rowClass = itemState?.shortageRepicked && !itemState?.inspected ? "repicked" : "";
          return `<div class="workflow-item-row ${rowClass}">
            <span>${index + 1}</span>
            <strong>${escapeHtml(item.ownCode || "-")}</strong>
            <em>${escapeHtml(cleanOptionName(item.optionName, item.ownCode) || item.productName || "-")}</em>
            <b>${Number(item.quantity) || 1}개</b>
            ${rowClass ? '<small>미송피킹 완료</small>' : "<small>전체상품</small>"}
          </div>`;
        })
        .join("")}
    </div>
    ${invoiceState?.memo ? `<div class="workflow-note">${escapeHtml(invoiceState.memo)}</div>` : ""}`;
}

function renderPickingRow(invoice, item, invoiceIndex = 0, itemIndex = 0) {
  const shortage = shortageQty(item);
  const checked = isPicked(item);
  const imageUrl = productImageUrl(item.sellpiaProductCode);
  const option = cleanOptionName(item.optionName, item.ownCode) || item.productName || "-";
  const product = item.productName || "";
  const goldItem = isGoldItem(item);
  const goldInvoice = invoiceHasGold(invoice);
  const slotKey = itemSlotKey(invoice, item);
  const classes = [
    "picking-item-card",
    checked ? "is-picked" : "",
    shortage ? "has-shortage" : "",
    isHold(item) ? "has-hold" : "",
    goldItem ? "is-gold" : "",
    slotKey === state.currentTrayKey ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const drawerValue = invoiceDrawerValue(invoice);
  const seller = sellerBadgeMeta(invoice.seller);

  return `<article class="${classes}" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}" data-slot-key="${escapeHtml(slotKey)}">
    <div class="thumb-wrap">
      <button class="pick-check ${checked ? "checked" : ""}" data-action="toggle" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">${checked ? "✓" : ""}</button>
      ${imageUrl ? `<img class="thumb" src="${imageUrl}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="thumb"></div>'}
    </div>
    <div class="picking-body">
      <div class="picking-main">
        <div class="picking-title-line">
          <span class="work-no own-code-display">${escapeHtml(item.ownCode || "-")}</span>
          ${goldItem ? '<span class="gold-badge">골드</span>' : goldInvoice ? '<span class="gold-badge soft">골드송장</span>' : ""}
          ${item.sellpiaLocation ? `<span class="small-badge">${escapeHtml(item.sellpiaLocation)}</span>` : ""}
        </div>
        <p class="option">${escapeHtml(option)}</p>
        <p class="product">${escapeHtml(product)}</p>
        <div class="invoice-meta">
          <span>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</span>
          <span>${escapeHtml(invoice.invoiceNo || "송장없음")}</span>
          ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        </div>
      </div>
      <div class="picking-controls">
        <div class="qty-tile">${Number(item.quantity) || 1}개</div>
        ${renderInvoiceSlots(invoiceIndex, item, itemIndex)}
        <div class="shortage-control">
          <button data-action="shortage" data-delta="-1" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">−</button>
          <div class="shortage-value">${shortage}</div>
          <button data-action="shortage" data-delta="1" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">+</button>
        </div>
        <div class="drawer-box">
          <label>서랍</label>
          <input class="drawer-input" data-action="drawer" data-order-group="${escapeHtml(invoice.orderGroupNo)}" value="${escapeHtml(drawerValue)}" placeholder="서랍번호">
        </div>
      </div>
    </div>
  </article>`;
}

function render() {
  renderMetrics();
  renderDashboard();
  renderShortagePanels();
  renderInspectionPanels();
  renderFilters();
  renderGroups();
  renderOrderList();
  renderTray();
}

function findInvoiceAndItem(orderGroupNo, sellpiaItemNo) {
  const invoice = (state.viewModel?.invoices || []).find((row) => row.orderGroupNo === orderGroupNo);
  const item = invoice?.items.find((row) => row.sellpiaItemNo === sellpiaItemNo);
  return { invoice, item };
}

function patchLocalPickingState(invoice, item, patch) {
  if (!item.pickingState) {
    item.pickingState = {
      orderGroupNo: invoice.orderGroupNo,
      sellpiaItemNo: item.sellpiaItemNo,
      key: itemStateKey(invoice, item),
      isPicked: false,
      shortageQty: 0,
      drawerMemo: "",
      isHold: false,
      status: "",
      raw: null,
    };
  }
  Object.assign(item.pickingState, patch);
}

function buildItemEvent(invoice, item, eventType, overrides = {}) {
  return {
    receipt_date: invoice.receiptDate || state.selectedDate,
    order_group_no: invoice.orderGroupNo,
    invoice_no: invoice.invoiceNo || "",
    sellpia_item_no: item.sellpiaItemNo,
    sellpia_product_code: item.sellpiaProductCode || "",
    own_code: item.ownCode || "",
    event_type: eventType,
    quantity: overrides.quantity ?? null,
    memo: overrides.memo || null,
    drawer_memo: overrides.drawerMemo || item.pickingState?.drawerMemo || null,
    actor: "front",
    source: "f_v1_picking",
    payload: {
      productName: item.productName || "",
      optionName: item.optionName || "",
    },
  };
}

async function saveWorkflowItemEvent(invoice, item, eventType, overrides = {}) {
  if (!allowWorkflowEvents) return;
  const { error } = await db.from("workflow_item_events").insert(buildItemEvent(invoice, item, eventType, overrides));
  if (error) {
    state.workflowEventsChecked = true;
    state.workflowEventsReady = false;
    renderMetrics();
    console.warn("workflow_item_events insert failed", error);
    toast("피킹 저장 완료 · 이벤트 테이블 미준비");
    return;
  }
  state.workflowEventsChecked = true;
  state.workflowEventsReady = true;
  renderMetrics();
}

async function savePickingRow(invoice, item, eventType = null, eventOverrides = {}) {
  if (!allowWrites) {
    toast("읽기전용입니다. 저장 테스트는 ?write=1로 열어주세요.");
    return;
  }

  const key = itemStateKey(invoice, item);
  if (state.saving.has(key)) return;
  state.saving.add(key);

  const row = {
    inv_no: invoice.invoiceNo || "",
    ord_no: invoice.orderGroupNo,
    item_no: item.sellpiaItemNo,
    item_sort_order: item.itemOrderIndex ?? item.sortOrder ?? null,
    sellpia_p_code: item.sellpiaProductCode || "",
    p_code: item.ownCode || item.sellpiaProductCode || "",
    is_checked: Boolean(item.pickingState?.isPicked),
    shortage_qty: Number(item.pickingState?.shortageQty || 0),
    drawer_no: item.pickingState?.drawerMemo || "",
    hold: Boolean(item.pickingState?.isHold),
  };

  try {
    const { data: existing, error: findError } = await db
      .from("picking")
      .select("id")
      .eq("ord_no", row.ord_no)
      .eq("item_no", row.item_no)
      .limit(1);
    if (findError) throw findError;

    if (existing && existing[0]?.id) {
      const { error } = await db.from("picking").update(row).eq("id", existing[0].id);
      if (error) throw error;
    } else {
      const { error } = await db.from("picking").insert(row);
      if (error) throw error;
    }
    if (eventType) await saveWorkflowItemEvent(invoice, item, eventType, eventOverrides);
  } finally {
    state.saving.delete(key);
  }
}

async function saveDrawerForInvoice(invoice, drawerMemo) {
  for (const item of invoice.items || []) {
    patchLocalPickingState(invoice, item, { drawerMemo });
    await savePickingRow(invoice, item, null, { drawerMemo });
  }
}

async function onOrderListClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const orderGroupNo = target.dataset.orderGroup;
  const sellpiaItemNo = target.dataset.itemNo;
  const { invoice, item } = findInvoiceAndItem(orderGroupNo, sellpiaItemNo);
  if (!invoice || !item) return;

  if (action === "toggle") {
    patchLocalPickingState(invoice, item, { isPicked: !isPicked(item) });
    render();
    try {
      await savePickingRow(invoice, item, isPicked(item) ? "picked" : "pick_unchecked");
      toast("피킹 상태 저장");
    } catch (error) {
      patchLocalPickingState(invoice, item, { isPicked: !isPicked(item) });
      render();
      toast(`저장 실패: ${error.message}`);
    }
  }

  if (action === "shortage") {
    const delta = Number(target.dataset.delta || 0);
    const prev = shortageQty(item);
    const next = Math.max(0, prev + delta);
    const eventType =
      delta > 0 && prev === 0
        ? "shortage_created"
        : next === 0 && prev > 0
          ? "shortage_repick_completed"
          : next !== prev
            ? "shortage_qty_changed"
            : null;
    patchLocalPickingState(invoice, item, { shortageQty: next });
    render();
    try {
      await savePickingRow(invoice, item, eventType, { quantity: next });
      toast("부족수량 저장");
    } catch (error) {
      patchLocalPickingState(invoice, item, { shortageQty: Math.max(0, next - delta) });
      render();
      toast(`저장 실패: ${error.message}`);
    }
  }
}

function onDrawerChange(event) {
  const input = event.target.closest("[data-action='drawer']");
  if (!input) return;
  const invoice = (state.viewModel?.invoices || []).find((row) => row.orderGroupNo === input.dataset.orderGroup);
  if (!invoice) return;
  const value = input.value.trim();
  saveDrawerForInvoice(invoice, value)
    .then(() => {
      invoice.sellpiaMemo1 = value;
      render();
      toast("서랍번호 저장");
    })
    .catch((error) => toast(`서랍번호 저장 실패: ${error.message}`));
}

async function loadPickingData() {
  els.orderList.innerHTML = '<div class="empty">데이터를 불러오는 중입니다.</div>';
  const selectedDate = state.selectedDate;
  const session = state.session;

  const orders = await fetchAllRows(() => {
    let query = db.from("orders").select("*").eq("ord_date", selectedDate).order("sort_order", { ascending: true, nullsFirst: false });
    if (session !== "ALL") query = query.eq("am_pm", session);
    return query;
  });

  const orderNos = orders.map((row) => String(row.ord_no || "").trim()).filter(Boolean);
  const items = orderNos.length
    ? await fetchAllRows(() => db.from("order_items").select("*").in("ord_no", orderNos).order("sort_order", { ascending: true, nullsFirst: false }))
    : [];
  const pickingRows = orderNos.length ? await fetchAllRows(() => db.from("picking").select("*").in("ord_no", orderNos)) : [];
  const shortageRows = orderNos.length ? await fetchAllRows(() => db.from("shortage").select("*").in("ord_no", orderNos)) : [];

  state.viewModel = buildPickingViewModel({
    orders,
    orderItems: items,
    pickingRows,
    shortageRows,
  });
  rebuildGroups();
  render();
  await loadWorkflowData();
}

async function loadWorkflowData() {
  state.workflowQueueError = "";
  try {
    state.workflowQueues = await loadWorkflowQueues(db);
    state.workflowEventsChecked = true;
    state.workflowEventsReady = true;
  } catch (error) {
    state.workflowQueues = null;
    state.workflowEventsChecked = true;
    state.workflowEventsReady = false;
    state.workflowQueueError = `workflow event 읽기 실패: ${error.message || error}`;
    console.warn("workflow queue load failed", error);
  }
  render();
}

function setActiveTab(tab) {
  const allowedTabs = new Set(["dashboard", "picking", "shortage", "inspection"]);
  state.activeTab = allowedTabs.has(tab) ? tab : "picking";
  document.querySelectorAll("[data-app-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.appTab === state.activeTab);
  });
  if (els.pickingPanel) els.pickingPanel.hidden = state.activeTab !== "picking";
  if (els.dashboardPanel) els.dashboardPanel.hidden = state.activeTab !== "dashboard";
  if (els.shortagePanel) els.shortagePanel.hidden = state.activeTab !== "shortage";
  if (els.inspectionPanel) els.inspectionPanel.hidden = state.activeTab !== "inspection";
  renderDashboard();
}

function scrollToTrayItem(key) {
  state.currentTrayKey = key;
  renderOrderList();
  renderTray();
  const selectorKey = window.CSS?.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
  const target = els.orderList.querySelector(`[data-slot-key="${selectorKey}"]`);
  if (target) {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function scrollTrayToSelectedItem(key) {
  const selectorKey = window.CSS?.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
  const target = els.trayBoard?.querySelector(`[data-tray-key="${selectorKey}"]`);
  if (target) {
    target.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
}

function selectPickingCard(key) {
  state.currentTrayKey = key;
  els.orderList.querySelectorAll("[data-slot-key]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.slotKey === key);
  });
  renderTray();
  scrollTrayToSelectedItem(key);
}

function sortedAllInvoices() {
  return sortInvoices(state.viewModel?.invoices || []);
}

function selectFirstItemOfInvoice(invoice, shouldRender = true) {
  const item = invoice?.items?.[0];
  if (!invoice || !item) return false;
  const key = itemSlotKey(invoice, item);
  state.currentTrayKey = key;
  if (shouldRender) {
    render();
  } else {
    selectPickingCard(key);
  }
  const selectorKey = window.CSS?.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
  const target = els.orderList.querySelector(`[data-slot-key="${selectorKey}"]`);
  if (target) target.scrollIntoView({ block: "center", behavior: "smooth" });
  scrollTrayToSelectedItem(key);
  return true;
}

function resetSearchAndFilterForJump() {
  state.searchText = "";
  state.filterMode = "all";
  if (els.searchInput) els.searchInput.value = "";
}

function setCurrentGroupByInvoice(invoice) {
  const groupIndex = state.groups.findIndex((group) => group.some((row) => row.orderGroupNo === invoice?.orderGroupNo));
  state.currentGroup = groupIndex >= 0 ? groupIndex : 0;
}

function jumpToGroup(value) {
  const groupNo = Number(onlyDigits(value));
  if (!groupNo || groupNo < 1 || groupNo > state.groups.length) {
    toast("해당 조가 없습니다.");
    return;
  }
  resetSearchAndFilterForJump();
  state.currentGroup = groupNo - 1;
  const invoice = state.groups[state.currentGroup]?.[0];
  selectFirstItemOfInvoice(invoice);
}

function jumpToSequence(value) {
  const seq = Number(onlyDigits(value));
  const invoices = sortedAllInvoices();
  const invoice = invoices[seq - 1];
  if (!seq || !invoice) {
    toast("해당 순서가 없습니다.");
    return;
  }
  resetSearchAndFilterForJump();
  setCurrentGroupByInvoice(invoice);
  selectFirstItemOfInvoice(invoice);
}

function findInvoiceByInvoiceNo(value) {
  const digits = onlyDigits(value);
  if (!digits) return null;
  return sortedAllInvoices().find((invoice) => {
    const invoiceDigits = onlyDigits(invoice.invoiceNo);
    return invoiceDigits === digits || invoiceDigits.endsWith(digits) || digits.endsWith(invoiceDigits);
  });
}

function jumpToInvoiceNo(value) {
  const invoice = findInvoiceByInvoiceNo(value);
  if (!invoice) {
    toast("송장번호를 찾지 못했습니다.");
    return false;
  }
  const invoices = sortedAllInvoices();
  const index = invoices.findIndex((row) => row.orderGroupNo === invoice.orderGroupNo);
  resetSearchAndFilterForJump();
  if (index >= 0) setCurrentGroupByInvoice(invoice);
  selectFirstItemOfInvoice(invoice);
  return true;
}

function currentVisibleRowKeys() {
  return currentPickingRows().map(({ invoice, item }) => itemSlotKey(invoice, item));
}

function moveSelection(delta) {
  const keys = currentVisibleRowKeys();
  if (!keys.length) return;
  const currentIndex = Math.max(0, keys.indexOf(state.currentTrayKey));
  const nextIndex = state.currentTrayKey ? Math.min(keys.length - 1, Math.max(0, currentIndex + delta)) : 0;
  scrollToTrayItem(keys[nextIndex]);
}

async function toggleSelectedItem() {
  if (!state.currentTrayKey) {
    const firstKey = currentVisibleRowKeys()[0];
    if (firstKey) scrollToTrayItem(firstKey);
    return;
  }
  const [orderGroupNo, sellpiaItemNo] = state.currentTrayKey.split("::");
  const { invoice, item } = findInvoiceAndItem(orderGroupNo, sellpiaItemNo);
  if (!invoice || !item) return;
  patchLocalPickingState(invoice, item, { isPicked: !isPicked(item) });
  render();
  try {
    await savePickingRow(invoice, item, isPicked(item) ? "picked" : "pick_unchecked");
    toast("피킹 상태 저장");
  } catch (error) {
    patchLocalPickingState(invoice, item, { isPicked: !isPicked(item) });
    render();
    toast(`저장 실패: ${error.message}`);
  }
}

function isTypingTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, button, [contenteditable='true']"));
}

function onGlobalKeydown(event) {
  if (event.key.toLowerCase() === "q" && !isTypingTarget(event.target)) {
    event.preventDefault();
    els.searchInput?.focus();
    els.searchInput?.select();
    return;
  }
  if (event.key === "Tab" && !isTypingTarget(event.target)) {
    event.preventDefault();
    moveSelection(event.shiftKey ? -1 : 1);
    return;
  }
  if (event.code === "Space" && !isTypingTarget(event.target)) {
    event.preventDefault();
    toggleSelectedItem().catch(showError);
  }
}

function bindEvents() {
  document.querySelectorAll("[data-app-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.appTab));
  });
  els.refreshBtn.addEventListener("click", () => loadPickingData().catch(showError));
  els.todayBtn.addEventListener("click", () => {
    state.selectedDate = new Date().toISOString().slice(0, 10);
    els.dateInput.value = state.selectedDate;
    loadPickingData().catch(showError);
  });
  els.dateInput.addEventListener("change", () => {
    state.selectedDate = els.dateInput.value;
    state.currentGroup = 0;
    loadPickingData().catch(showError);
  });
  document.querySelectorAll(".seg").forEach((button) => {
    button.addEventListener("click", () => {
      state.session = button.dataset.session;
      document.querySelectorAll(".seg").forEach((node) => node.classList.toggle("active", node === button));
      state.currentGroup = 0;
      loadPickingData().catch(showError);
    });
  });
  els.sortToggle.addEventListener("click", () => {
    state.workSortMode = !state.workSortMode;
    els.sortToggle.classList.toggle("primary", state.workSortMode);
    els.sortToggle.textContent = state.workSortMode ? "작업순서" : "송장순서";
    rebuildGroups();
    render();
  });
  els.searchInput.addEventListener("input", () => {
    state.searchText = els.searchInput.value;
    render();
    const digits = onlyDigits(state.searchText);
    if (digits.length >= 13 && findInvoiceByInvoiceNo(digits)) {
      jumpToInvoiceNo(digits);
    }
  });
  els.filterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filterMode = button.dataset.filter;
    render();
  });
  els.groupList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-group]");
    if (!button) return;
    state.currentGroup = Number(button.dataset.group);
    render();
  });
  els.jumpGroupBtn?.addEventListener("click", () => jumpToGroup(els.jumpGroupInput.value));
  els.jumpSeqBtn?.addEventListener("click", () => jumpToSequence(els.jumpSeqInput.value));
  els.jumpInvoiceBtn?.addEventListener("click", () => jumpToInvoiceNo(els.jumpInvoiceInput.value));
  els.jumpGroupInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToGroup(els.jumpGroupInput.value);
  });
  els.jumpSeqInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToSequence(els.jumpSeqInput.value);
  });
  els.jumpInvoiceInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToInvoiceNo(els.jumpInvoiceInput.value);
  });
  els.orderList.addEventListener("click", (event) => onOrderListClick(event).catch(showError));
  els.orderList.addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) return;
    const card = event.target.closest("[data-slot-key]");
    if (!card) return;
    selectPickingCard(card.dataset.slotKey);
  });
  els.orderList.addEventListener("change", onDrawerChange);
  els.shortageListBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shortage-key]");
    if (!button) return;
    state.selectedShortageKey = button.dataset.shortageKey;
    renderShortagePanels();
  });
  els.inspectionListBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inspection-group]");
    if (!button) return;
    state.selectedInspectionGroup = button.dataset.inspectionGroup;
    renderInspectionPanels();
  });
  els.trayHandle?.addEventListener("click", () => {
    state.trayOpen = !state.trayOpen;
    renderTray();
  });
  els.trayExpandBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    state.trayOpen = true;
    state.trayExpanded = !state.trayExpanded;
    renderTray();
  });
  els.trayBoard?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tray-key]");
    if (!button) return;
    state.trayOpen = true;
    scrollToTrayItem(button.dataset.trayKey);
  });
  document.addEventListener("keydown", onGlobalKeydown);
}

function showError(error) {
  console.error(error);
  els.orderList.innerHTML = `<div class="error">${escapeHtml(error.message || error)}</div>`;
}

function init() {
  els.dateInput.value = state.selectedDate;
  bindEvents();
  renderMetrics();
  loadPickingData().catch(showError);
}

init();
