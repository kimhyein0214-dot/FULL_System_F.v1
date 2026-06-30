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
  pickingPanel: document.getElementById("picking-panel"),
  dashboardPanel: document.getElementById("dashboard-panel"),
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
  const codeNoOuterBracket = rawCode.replace(/^\[(.*)\]$/, "$1").trim();
  const candidates = [...new Set([rawCode, codeNoOuterBracket].filter(Boolean))];

  for (const code of candidates) {
    option = option.replace(new RegExp(`\\[\\s*${escapeRegExp(code)}\\s*\\]`, "gi"), "");
    option = option.replace(new RegExp(escapeRegExp(code), "gi"), "");
  }

  const optionCompact = compactCode(option);
  const codeCompact = compactCode(rawCode);
  if (codeCompact && optionCompact.includes(codeCompact)) {
    option = option
      .split(/(\[[^\]]+\]|[A-Za-z가-힣]*[-_\s]*[A-Za-z0-9]+[-_\s][A-Za-z0-9_-]+)/g)
      .filter((part) => compactCode(part) !== codeCompact)
      .join("");
  }

  return option
    .replace(/\[\s*\]/g, "")
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,/|·:：-]+|[\s,/|·:：-]+$/g, "")
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
  if (!allowWorkflowEvents) els.metricEvents.textContent = "OFF";
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

  const rows = [
    ["전체 송장", `${invoices.length}건`],
    ["전체 상품", `${items.length}개`],
    ["피킹완료", `${picked}개`],
    ["부족항목", `${shortage}개`],
    ["보류", `${hold}개`],
    ["서랍없음", `${noDrawer}건`],
    ["골드 송장", `${goldInvoices}건`],
    ["골드 상품", `${goldItems}개`],
  ];

  els.dashboardSummary.innerHTML = rows
    .map(
      ([label, value]) => `<div class="dashboard-stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>`,
    )
    .join("");
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

function renderPickingRow(invoice, item, invoiceIndex = 0, itemIndex = 0) {
  const shortage = shortageQty(item);
  const checked = isPicked(item);
  const imageUrl = productImageUrl(item.sellpiaProductCode);
  const option = cleanOptionName(item.optionName, item.ownCode) || item.productName || "-";
  const product = item.productName || "";
  const invoiceStatsValue = invoiceStats(invoice);
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
          ${item.sellpiaProductCode ? `<span class="small-badge">${escapeHtml(item.sellpiaProductCode)}</span>` : ""}
          ${item.sellpiaLocation ? `<span class="small-badge">${escapeHtml(item.sellpiaLocation)}</span>` : ""}
        </div>
        <p class="option">${escapeHtml(option)}</p>
        <p class="product">${escapeHtml(product)}</p>
        <div class="invoice-meta">
          <span>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</span>
          <span>${escapeHtml(invoice.invoiceNo || "송장없음")}</span>
          <span>송장 ${invoiceStatsValue.picked}/${invoiceStatsValue.total}</span>
          ${invoice.seller ? `<span>${escapeHtml(invoice.seller)}</span>` : ""}
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
}

function setActiveTab(tab) {
  state.activeTab = tab === "dashboard" ? "dashboard" : "picking";
  document.querySelectorAll("[data-app-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.appTab === state.activeTab);
  });
  if (els.pickingPanel) els.pickingPanel.hidden = state.activeTab !== "picking";
  if (els.dashboardPanel) els.dashboardPanel.hidden = state.activeTab !== "dashboard";
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
  els.orderList.addEventListener("click", (event) => onOrderListClick(event).catch(showError));
  els.orderList.addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) return;
    const card = event.target.closest("[data-slot-key]");
    if (!card) return;
    selectPickingCard(card.dataset.slotKey);
  });
  els.orderList.addEventListener("change", onDrawerChange);
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
