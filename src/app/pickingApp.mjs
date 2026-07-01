import { loadWorkflowQueues } from "../adapters/workflowEventAdapter.mjs?v=20260701-inspection-all1";
import { buildPickingViewModel } from "../workflows/picking/buildPickingViewModel.mjs";

const SUPABASE_URL = "https://vgxocngpykhlkosiaeew.supabase.co";
const SUPABASE_KEY = "sb_publishable_XVnKGJo66GZiYTq5Ivu8dA_SjBVvX0g";
const IMAGE_SUPABASE_URL = "https://bpgvqmtsjgegnrdzmpep.supabase.co";
const IMAGE_BUCKET = "product-images";
const JO_SIZE = 4;

const params = new URLSearchParams(location.search);
const allowWrites = params.get("write") === "1";
const allowWorkflowEvents = params.get("events") !== "0";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function todayDateString() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const state = {
  activeTab: "picking",
  selectedDate: todayDateString(),
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
  selectedCompletedGroup: "",
  completedDateMode: "receipt",
  inspectionFilter: "all",
  inspectionSearchText: "",
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
  inspectionFilterBar: document.getElementById("inspection-filter-bar"),
  inspectionSearchInput: document.getElementById("inspection-search-input"),
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
  completedPanel: document.getElementById("completed-panel"),
  shortageListCount: document.getElementById("shortage-list-count"),
  shortageListBody: document.getElementById("shortage-list-body"),
  shortageDetail: document.getElementById("shortage-detail"),
  inspectionListCount: document.getElementById("inspection-list-count"),
  inspectionListBody: document.getElementById("inspection-list-body"),
  inspectionDetail: document.getElementById("inspection-detail"),
  completedListCount: document.getElementById("completed-list-count"),
  completedListBody: document.getElementById("completed-list-body"),
  completedDetail: document.getElementById("completed-detail"),
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

function itemOrderNo(item, fallbackIndex = 0) {
  return Number(item?.itemOrderIndex || 0) || fallbackIndex + 1;
}

function invoiceItemIndex(invoice, item) {
  const index = (invoice?.items || []).findIndex((row) => row.sellpiaItemNo === item?.sellpiaItemNo);
  return index >= 0 ? index : 0;
}

function renderInvoiceSlots(invoiceIndex, item, itemIndex) {
  const activeSlot = (invoiceIndex % JO_SIZE) + 1;
  const orderNo = itemOrderNo(item, itemIndex);
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

function invoiceSequenceNo(invoice, fallbackIndex = 0) {
  return Number(invoice?.sortOrder || 0) || fallbackIndex + 1;
}

function invoiceSequenceLabel(invoice, fallbackIndex = 0) {
  return `${invoiceSequenceNo(invoice, fallbackIndex)}번`;
}

function itemSequenceNo(item, fallbackIndex = 0) {
  const explicit = Number(item?.itemOrderIndex || 0);
  if (explicit) return explicit;
  const suffix = String(item?.sellpiaItemNo || "").match(/(?:_\[(\d{1,3})\]|\((\d{1,3})\)|_(\d{1,3}))$/);
  return suffix ? Number(suffix[1] || suffix[2] || suffix[3]) : fallbackIndex + 1;
}

function formatAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("ko-KR") : "-";
}

function renderInspectionItemHeader() {
  return `<div class="workflow-item-row workflow-item-header">
    <span>상품순서번호</span>
    <span>사진</span>
    <span>옵션명</span>
    <span>수량</span>
    <span>상품명</span>
    <span>금액</span>
    <span>자사코드</span>
    <span>셀피아코드</span>
    <span>부족수량</span>
    <span>상태</span>
  </div>`;
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function dateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function completedEventForInvoice(invoice) {
  return [...(state.workflowQueues?.invoiceEvents || [])]
    .filter((event) => event.order_group_no === invoice.orderGroupNo && event.event_type === "inspection_completed")
    .sort((a, b) => new Date(b.event_at || b.created_at || 0).getTime() - new Date(a.event_at || a.created_at || 0).getTime())[0];
}

function completedDateForInvoice(invoice) {
  const event = completedEventForInvoice(invoice);
  return dateKey(event?.event_at || event?.created_at || workflowInvoiceState(invoice)?.lastEventAt);
}

function completedInvoicesForSelectedDate() {
  const rows = state.workflowQueues?.inspectionCompletedInvoices || [];
  return rows
    .filter((invoice) => {
      if (state.completedDateMode === "completed") return completedDateForInvoice(invoice) === state.selectedDate;
      return String(invoice.receiptDate || "").slice(0, 10) === state.selectedDate;
    })
    .sort((a, b) => {
      const aEvent = completedEventForInvoice(a);
      const bEvent = completedEventForInvoice(b);
      const aTime = new Date(aEvent?.event_at || aEvent?.created_at || workflowInvoiceState(a)?.lastEventAt || 0).getTime() || 0;
      const bTime = new Date(bEvent?.event_at || bEvent?.created_at || workflowInvoiceState(b)?.lastEventAt || 0).getTime() || 0;
      return bTime - aTime || String(a.invoiceNo || "").localeCompare(String(b.invoiceNo || ""));
    });
}

function invoiceTextForSearch(invoice) {
  return [
    invoice.invoiceNo,
    invoice.orderGroupNo,
    invoice.displayName,
    invoice.csDisplayName,
    invoice.recipientName,
    invoice.buyerName,
    invoice.seller,
    ...(invoice.items || []).flatMap((item) => [item.ownCode, item.sellpiaProductCode, item.productName, item.optionName]),
  ]
    .join(" ")
    .toLowerCase();
}

function invoiceHasRepickedShortage(invoice) {
  return (invoice.items || []).some((item) => {
    const itemState = workflowItemState(invoice, item);
    return itemState?.shortageRepicked && !itemState?.inspected && !itemState?.cancelled;
  });
}

function invoiceMatchesInspectionFilter(invoice) {
  const invoiceState = workflowInvoiceState(invoice);
  if (state.inspectionFilter === "gold") return invoiceHasGold(invoice);
  if (state.inspectionFilter === "hold") return Boolean(invoiceState?.hold);
  if (state.inspectionFilter === "shortage") return invoiceHasRepickedShortage(invoice);
  return true;
}

function invoiceMatchesInspectionSearch(invoice) {
  const search = state.inspectionSearchText.trim().toLowerCase();
  if (!search) return true;
  return invoiceTextForSearch(invoice).includes(search);
}

function mergeInvoicesUnique(...lists) {
  const merged = [];
  const seen = new Set();
  for (const list of lists) {
    for (const invoice of list || []) {
      const key = invoice.orderGroupNo || invoice.invoiceNo;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(invoice);
    }
  }
  return merged;
}

function isInspectionPendingInvoice(invoice) {
  const invoiceState = workflowInvoiceState(invoice);
  return !invoiceState?.inspected && !invoiceState?.cancelled;
}

function inspectionSourceInvoices() {
  return mergeInvoicesUnique(state.viewModel?.invoices || [], state.workflowQueues?.inspectionInvoices || []).filter(isInspectionPendingInvoice);
}

function workflowSummary() {
  const queues = state.workflowQueues;
  const inspectionCount = inspectionSourceInvoices().length;
  if (!queues) {
    return {
      ready: false,
      status: state.workflowQueueError ? "오류" : "대기",
      shortageItems: 0,
      inspectionInvoices: inspectionCount,
      completedInvoices: 0,
      repickedItems: 0,
      missingInvoices: 0,
      eventRows: 0,
    };
  }

  const repickedItems = Array.from(queues.workflowState.itemStateByKey.values()).filter(
    (row) => row.shortageRepicked && !row.inspected && !row.cancelled,
  ).length;
  const syntheticEventRows = (queues.syntheticEvents?.itemEvents?.length || 0) + (queues.syntheticEvents?.invoiceEvents?.length || 0);

  return {
    ready: true,
    status: "ON",
    shortageItems: queues.shortageItems.length,
    inspectionInvoices: inspectionCount,
    completedInvoices: queues.inspectionCompletedInvoices.length,
    repickedItems,
    missingInvoices: Math.max(0, queues.orderGroupNos.length - queues.viewModel.invoices.length),
    eventRows: queues.itemEvents.length + queues.invoiceEvents.length + syntheticEventRows,
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
  const completedRows = state.workflowQueues?.inspectionCompletedInvoices || [];
  const completedByReceiptDate = completedRows.filter((invoice) => String(invoice.receiptDate || "").slice(0, 10) === state.selectedDate).length;
  const completedByDoneDate = completedRows.filter((invoice) => completedDateForInvoice(invoice) === state.selectedDate).length;

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
              <div><span>작업완료</span><strong>${workflow.completedInvoices}</strong><em>송장</em></div>
              <div><span>피킹완료 미검품</span><strong>${workflow.repickedItems}</strong><em>상품</em></div>
              <div class="${workflow.missingInvoices ? "bad" : ""}"><span>원본 연결 누락</span><strong>${workflow.missingInvoices}</strong><em>송장</em></div>
            </div>
            <p>미송피킹/검품은 선택 날짜가 아니라 workflow event 상태 기준으로 집계됩니다.</p>`
      }
    </div>
    <div class="dashboard-card dashboard-workflow-card">
      <h3>검품/완료 확인</h3>
      <div class="dashboard-workflow-status">
        <div><span>선택 접수일 완료</span><strong>${completedByReceiptDate}</strong><em>건</em></div>
        <div><span>선택 완료일 완료</span><strong>${completedByDoneDate}</strong><em>건</em></div>
        <div><span>검품 대기</span><strong>${workflow.inspectionInvoices}</strong><em>건</em></div>
        <div><span>미송피킹 대기</span><strong>${workflow.shortageItems}</strong><em>상품</em></div>
      </div>
      <div class="dashboard-actions">
        <button class="btn" data-dashboard-tab="shortage" type="button">미송피킹 보기</button>
        <button class="btn" data-dashboard-tab="inspection" type="button">검품대기 보기</button>
        <button class="btn" data-dashboard-tab="completed" type="button">작업완료 보기</button>
      </div>
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
      const orderNo = itemOrderNo(item, invoiceItemIndex(invoice, item));
      return `<button class="workflow-row ${key === state.selectedShortageKey ? "selected" : ""}" data-shortage-key="${escapeHtml(key)}" type="button">
        <span class="workflow-row-code">${escapeHtml(item.ownCode || "-")}</span>
        <span class="workflow-row-main">
          <strong>${escapeHtml(cleanOptionName(item.optionName, item.ownCode) || item.productName || "-")}</strong>
          <span class="workflow-row-order">상품순서 ${orderNo}번</span>
          <small>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")} · ${escapeHtml(invoice.invoiceNo || "송장없음")}</small>
        </span>
        <span class="workflow-row-badge danger">미송 ${Number(itemState?.shortageQty || 0) || 1}</span>
      </button>`;
    })
    .join("");

  const selected = rows.find(({ invoice, item }) => workflowItemKey(invoice, item) === state.selectedShortageKey) || rows[0];
  const selectedState = selected.state || workflowItemState(selected.invoice, selected.item);
  const seller = sellerBadgeMeta(selected.invoice.seller);
  const repickDisabled = allowWorkflowEvents ? "" : "disabled";
  els.shortageDetail.innerHTML = `<div class="workflow-detail-card">
    <div class="workflow-detail-head">
      <div>
        <strong>${escapeHtml(selected.item.ownCode || "-")}</strong>
        <span>${escapeHtml(selected.invoice.displayName || selected.invoice.csDisplayName || "-")}</span>
      </div>
      <div class="workflow-detail-actions">
        ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        <button class="btn primary" data-action="shortage-repicked" data-shortage-key="${escapeHtml(workflowItemKey(selected.invoice, selected.item))}" type="button" ${repickDisabled}>피킹완료</button>
      </div>
    </div>
    <div class="workflow-detail-main">
      <div class="workflow-photo">${productImageUrl(selected.item.sellpiaProductCode) ? `<img src="${productImageUrl(selected.item.sellpiaProductCode)}" alt="">` : "사진"}</div>
      <div class="workflow-detail-text">
        <h3>${escapeHtml(cleanOptionName(selected.item.optionName, selected.item.ownCode) || selected.item.productName || "-")}</h3>
        <p>${escapeHtml(selected.item.productName || "")}</p>
        <dl>
          <div><dt>상품순서</dt><dd>${itemOrderNo(selected.item, invoiceItemIndex(selected.invoice, selected.item))}번</dd></div>
          <div><dt>송장번호</dt><dd>${escapeHtml(selected.invoice.invoiceNo || "-")}</dd></div>
          <div><dt>부족수량</dt><dd>${Number(selectedState?.shortageQty || 0) || 1}개</dd></div>
          <div><dt>접수일</dt><dd>${escapeHtml(selected.invoice.receiptDate || "-")}</dd></div>
          <div><dt>마지막 이벤트</dt><dd>${escapeHtml(formatShortDate(selectedState?.lastEventAt))}</dd></div>
        </dl>
        <div class="workflow-memo-editor">
          <label>
            <span>관리메모</span>
            <input data-shortage-field="drawerMemo" value="${escapeHtml(selectedState?.drawerMemo || selected.invoice.sellpiaMemo1 || "")}" placeholder="서랍번호/CS메모">
          </label>
          <label>
            <span>관리메모2</span>
            <textarea data-shortage-field="memo" rows="2" placeholder="상품별 미송 메모">${escapeHtml(selectedState?.memo || selected.item.sellpiaMemo2 || "")}</textarea>
          </label>
          <button class="btn" data-action="shortage-memo-save" data-shortage-key="${escapeHtml(workflowItemKey(selected.invoice, selected.item))}" type="button" ${repickDisabled}>메모 저장</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderInspectionPanels() {
  const pendingInvoices = inspectionSourceInvoices();
  const invoices = pendingInvoices.filter(invoiceMatchesInspectionFilter).filter(invoiceMatchesInspectionSearch);
  if (els.inspectionListCount) els.inspectionListCount.textContent = `대기 ${invoices.length}건 / 전체 ${pendingInvoices.length}건`;

  els.inspectionFilterBar?.querySelectorAll("[data-inspection-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.inspectionFilter === state.inspectionFilter);
  });

  if (state.workflowQueueError && !pendingInvoices.length) {
    renderWorkflowEmpty(els.inspectionListBody, state.workflowQueueError);
    renderWorkflowEmpty(els.inspectionDetail, "이벤트 큐를 불러오지 못했습니다.");
    return;
  }

  if (!state.workflowQueues && !state.viewModel) {
    renderWorkflowEmpty(els.inspectionListBody, "검품 대기 송장을 불러오는 중입니다.");
    renderWorkflowEmpty(els.inspectionDetail, "검품 대기 송장을 선택하면 전체 상품이 표시됩니다.");
    return;
  }

  if (!invoices.length) {
    const emptyText = pendingInvoices.length ? "현재 필터/검색에 맞는 검품 대기 송장이 없습니다." : "현재 검품 대기 송장이 없습니다.";
    renderWorkflowEmpty(els.inspectionListBody, emptyText);
    renderWorkflowEmpty(els.inspectionDetail, `${emptyText} 완료된 송장은 작업완료 탭에서 확인하세요.`);
    return;
  }

  if (!invoices.some((invoice) => invoice.orderGroupNo === state.selectedInspectionGroup)) {
    state.selectedInspectionGroup = invoices[0].orderGroupNo;
  }

  els.inspectionListBody.innerHTML = invoices
    .map((invoice, index) => {
      const itemStates = (invoice.items || []).map((item) => workflowItemState(invoice, item)).filter(Boolean);
      const repicked = itemStates.filter((row) => row.shortageRepicked && !row.inspected && !row.cancelled).length;
      const invoiceState = workflowInvoiceState(invoice);
      const seller = sellerBadgeMeta(invoice.seller);
      const badges = [
        seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : "",
        invoiceHasGold(invoice) ? '<span class="workflow-row-badge gold">골드</span>' : "",
        invoiceState?.hold ? '<span class="workflow-row-badge hold">보류</span>' : "",
        repicked ? `<span class="workflow-row-badge warn">검품 ${repicked}</span>` : "",
      ]
        .filter(Boolean)
        .join("");
      return `<button class="workflow-row ${invoice.orderGroupNo === state.selectedInspectionGroup ? "selected" : ""}" data-inspection-group="${escapeHtml(invoice.orderGroupNo)}" type="button">
        <span class="workflow-row-code">${escapeHtml(invoiceSequenceLabel(invoice, index))}</span>
        <span class="workflow-row-main">
          <strong>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</strong>
          <small>상품 ${invoice.items.length}종 · 접수 ${escapeHtml(invoice.receiptDate || "-")} · ${escapeHtml(invoice.invoiceNo || "송장없음")}</small>
        </span>
        <span class="workflow-row-badges">${badges}</span>
      </button>`;
    })
    .join("");

  const selected = invoices.find((invoice) => invoice.orderGroupNo === state.selectedInspectionGroup) || invoices[0];
  const seller = sellerBadgeMeta(selected.seller);
  const invoiceState = workflowInvoiceState(selected);
  const actionDisabled = allowWorkflowEvents ? "" : "disabled";
  const holdAction = invoiceState?.hold ? "inspection-hold-release" : "inspection-hold";
  const holdLabel = invoiceState?.hold ? "보류 해제" : "보류 처리";
  const selectedRepicked = (selected.items || []).filter((item) => {
    const itemState = workflowItemState(selected, item);
    return itemState?.shortageRepicked && !itemState?.inspected && !itemState?.cancelled;
  }).length;
  const selectedIndex = invoices.findIndex((invoice) => invoice.orderGroupNo === selected.orderGroupNo);
  const selectedSequence = invoiceSequenceLabel(selected, selectedIndex >= 0 ? selectedIndex : 0);
  els.inspectionDetail.innerHTML = `<div class="inspection-header-skeleton ${invoiceState?.hold ? "is-hold" : ""}">
      <div class="inspection-title-block">
        <strong>${escapeHtml(selectedSequence)}</strong>
        <span>${escapeHtml(selected.displayName || selected.csDisplayName || "-")} · 접수 ${escapeHtml(selected.receiptDate || "-")}</span>
      </div>
      <div class="inspection-actions">
        <span class="invoice-badge">${escapeHtml(selected.invoiceNo || "송장없음")}</span>
        ${invoiceHasGold(selected) ? '<span class="workflow-row-badge gold">골드</span>' : ""}
        ${selectedRepicked ? `<span class="workflow-row-badge warn">미송 ${selectedRepicked}</span>` : ""}
        ${invoiceState?.hold ? '<span class="workflow-row-badge hold">보류</span>' : ""}
        <button class="btn" data-action="${holdAction}" data-inspection-group="${escapeHtml(selected.orderGroupNo)}" type="button" ${actionDisabled}>${holdLabel}</button>
        <button class="btn primary" data-action="inspection-complete" data-inspection-group="${escapeHtml(selected.orderGroupNo)}" type="button" ${actionDisabled}>완료 처리</button>
        ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
      </div>
    </div>
    <div class="workflow-item-table inspection-item-table">
      ${renderInspectionItemHeader()}
      ${(selected.items || [])
        .map((item, index) => {
          const itemState = workflowItemState(selected, item);
          const rowClass = itemState?.shortageRepicked && !itemState?.inspected ? "repicked" : "";
          const imageUrl = productImageUrl(item.sellpiaProductCode);
          const option = cleanOptionName(item.optionName, item.ownCode) || "-";
          const product = item.productName || "-";
          const shortage = Number(itemState?.shortageQty || shortageQty(item) || 0);
          const statusText = rowClass ? "미송피킹 완료" : "전체상품";
          return `<div class="workflow-item-row ${rowClass}">
            <span class="workflow-seq-cell">${itemSequenceNo(item, index)}</span>
            <div class="workflow-item-photo">${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : "사진"}</div>
            <em class="workflow-option-cell">${escapeHtml(option)}</em>
            <b>${Number(item.quantity) || 1}</b>
            <strong class="workflow-product-cell">${escapeHtml(product)}</strong>
            <span class="workflow-amount-cell">${escapeHtml(formatAmount(item.itemSalesAmount))}</span>
            <strong class="workflow-code-cell">${escapeHtml(item.ownCode || "-")}</strong>
            <span class="workflow-sellpia-cell">${escapeHtml(item.sellpiaProductCode || "-")}</span>
            <span class="workflow-shortage-cell">${shortage}</span>
            <small>${statusText}</small>
          </div>`;
        })
        .join("")}
    </div>
    ${invoiceState?.memo ? `<div class="workflow-note">${escapeHtml(invoiceState.memo)}</div>` : ""}`;
}

function renderCompletedPanels() {
  const invoices = completedInvoicesForSelectedDate();
  const allCompleted = state.workflowQueues?.inspectionCompletedInvoices || [];
  const modeLabel = state.completedDateMode === "completed" ? "완료일" : "접수일";
  if (els.completedListCount) els.completedListCount.textContent = `${modeLabel} ${invoices.length}건 / 전체 ${allCompleted.length}건`;

  document.querySelectorAll("[data-completed-date-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.completedDateMode === state.completedDateMode);
  });

  if (state.workflowQueueError) {
    renderWorkflowEmpty(els.completedListBody, state.workflowQueueError);
    renderWorkflowEmpty(els.completedDetail, "작업완료 큐를 불러오지 못했습니다.");
    return;
  }

  if (!state.workflowQueues) {
    renderWorkflowEmpty(els.completedListBody, "작업완료 송장을 불러오는 중입니다.");
    renderWorkflowEmpty(els.completedDetail, "완료된 송장을 선택하면 전체 상품이 표시됩니다.");
    return;
  }

  if (!invoices.length) {
    renderWorkflowEmpty(els.completedListBody, `${state.selectedDate} 기준 작업완료 송장이 없습니다.`);
    renderWorkflowEmpty(els.completedDetail, "선택한 날짜 기준 작업완료 송장이 없습니다.");
    return;
  }

  if (!invoices.some((invoice) => invoice.orderGroupNo === state.selectedCompletedGroup)) {
    state.selectedCompletedGroup = invoices[0].orderGroupNo;
  }

  els.completedListBody.innerHTML = invoices
    .map((invoice) => {
      const invoiceState = workflowInvoiceState(invoice);
      const completedEvent = completedEventForInvoice(invoice);
      const completedAt = completedEvent?.event_at || completedEvent?.created_at || invoiceState?.lastEventAt;
      return `<button class="workflow-row ${invoice.orderGroupNo === state.selectedCompletedGroup ? "selected" : ""}" data-completed-group="${escapeHtml(invoice.orderGroupNo)}" type="button">
        <span class="workflow-row-code">${escapeHtml(invoice.invoiceNo || "송장없음")}</span>
        <span class="workflow-row-main">
          <strong>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</strong>
          <small>접수 ${escapeHtml(invoice.receiptDate || "-")} · 완료 ${escapeHtml(formatShortDate(completedAt))} · 상품 ${invoice.items.length}종</small>
        </span>
        <span class="workflow-row-badge done">완료</span>
      </button>`;
    })
    .join("");

  const selected = invoices.find((invoice) => invoice.orderGroupNo === state.selectedCompletedGroup) || invoices[0];
  const seller = sellerBadgeMeta(selected.seller);
  const invoiceState = workflowInvoiceState(selected);
  const completedEvent = completedEventForInvoice(selected);
  const completedAt = completedEvent?.event_at || completedEvent?.created_at || invoiceState?.lastEventAt;
  const actionDisabled = allowWorkflowEvents ? "" : "disabled";
  els.completedDetail.innerHTML = `<div class="inspection-header-skeleton is-completed">
      <div>
        <strong>${escapeHtml(selected.invoiceNo || "송장없음")}</strong>
        <span>${escapeHtml(selected.displayName || selected.csDisplayName || "-")} · 접수 ${escapeHtml(selected.receiptDate || "-")} · 완료 ${escapeHtml(formatShortDate(completedAt))}</span>
      </div>
      <div class="inspection-actions">
        ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        <button class="btn primary" data-action="inspection-reopen" data-completed-group="${escapeHtml(selected.orderGroupNo)}" type="button" ${actionDisabled}>완료 취소</button>
      </div>
    </div>
    <div class="workflow-item-table">
      ${(selected.items || [])
        .map((item, index) => {
          const itemState = workflowItemState(selected, item);
          const rowClass = itemState?.shortageRepicked ? "repicked" : "";
          const imageUrl = productImageUrl(item.sellpiaProductCode);
          return `<div class="workflow-item-row ${rowClass}">
            <span>${index + 1}</span>
            <div class="workflow-item-photo">${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : "사진"}</div>
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
  document.querySelectorAll("[data-app-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.appTab === state.activeTab);
  });
  if (els.pickingPanel) els.pickingPanel.hidden = !["picking", "gold"].includes(state.activeTab);
  if (els.dashboardPanel) els.dashboardPanel.hidden = state.activeTab !== "dashboard";
  if (els.shortagePanel) els.shortagePanel.hidden = state.activeTab !== "shortage";
  if (els.inspectionPanel) els.inspectionPanel.hidden = state.activeTab !== "inspection";
  if (els.completedPanel) els.completedPanel.hidden = state.activeTab !== "completed";
  renderMetrics();
  renderDashboard();
  renderShortagePanels();
  renderInspectionPanels();
  renderCompletedPanels();
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

function buildInvoiceEvent(invoice, eventType, overrides = {}) {
  return {
    receipt_date: invoice.receiptDate || state.selectedDate,
    order_group_no: invoice.orderGroupNo,
    invoice_no: invoice.invoiceNo || "",
    event_type: eventType,
    memo: overrides.memo || null,
    actor: "front",
    source: "f_v1_inspection",
    payload: {
      displayName: invoice.displayName || invoice.csDisplayName || "",
      itemCount: (invoice.items || []).length,
    },
  };
}

async function saveWorkflowItemEvent(invoice, item, eventType, overrides = {}) {
  if (!allowWorkflowEvents) {
    toast("이벤트 저장은 ?write=1&events=1에서 가능합니다.");
    return false;
  }
  const { error } = await db.from("workflow_item_events").insert(buildItemEvent(invoice, item, eventType, overrides));
  if (error) {
    state.workflowEventsChecked = true;
    state.workflowEventsReady = false;
    renderMetrics();
    console.warn("workflow_item_events insert failed", error);
    toast("피킹 저장 완료 · 이벤트 테이블 미준비");
    return false;
  }
  state.workflowEventsChecked = true;
  state.workflowEventsReady = true;
  renderMetrics();
  return true;
}

async function saveWorkflowInvoiceEvent(invoice, eventType, overrides = {}) {
  if (!allowWorkflowEvents) {
    toast("이벤트 저장은 ?write=1&events=1에서 가능합니다.");
    return false;
  }
  const { error } = await db.from("workflow_invoice_events").insert(buildInvoiceEvent(invoice, eventType, overrides));
  if (error) {
    state.workflowEventsChecked = true;
    state.workflowEventsReady = false;
    renderMetrics();
    console.warn("workflow_invoice_events insert failed", error);
    toast("송장 이벤트 저장 실패");
    return false;
  }
  state.workflowEventsChecked = true;
  state.workflowEventsReady = true;
  renderMetrics();
  return true;
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

async function completeSelectedShortagePicking(shortageKey = state.selectedShortageKey) {
  const row = (state.workflowQueues?.shortageItems || []).find(({ invoice, item }) => workflowItemKey(invoice, item) === shortageKey);
  if (!row) {
    toast("미송피킹 대상을 찾지 못했습니다.");
    return;
  }

  const ok = await saveWorkflowItemEvent(row.invoice, row.item, "shortage_repick_completed", {
    quantity: 0,
    memo: "shortage repicked",
    drawerMemo: row.state?.drawerMemo || row.item.pickingState?.drawerMemo || row.invoice.sellpiaMemo1 || null,
  });
  if (!ok) return;

  state.selectedInspectionGroup = row.invoice.orderGroupNo;
  state.selectedShortageKey = "";
  await loadWorkflowData();
  toast("미송피킹 완료: 검품탭에 송장 전체가 표시됩니다.");
}

async function saveSelectedShortageMemo(shortageKey = state.selectedShortageKey) {
  const row = (state.workflowQueues?.shortageItems || []).find(({ invoice, item }) => workflowItemKey(invoice, item) === shortageKey);
  if (!row) {
    toast("미송피킹 대상을 찾지 못했습니다.");
    return;
  }
  const drawerMemo = els.shortageDetail?.querySelector("[data-shortage-field='drawerMemo']")?.value?.trim() || "";
  const memo = els.shortageDetail?.querySelector("[data-shortage-field='memo']")?.value?.trim() || "";
  const qty = Number(row.state?.shortageQty || 0) || 1;
  const ok = await saveWorkflowItemEvent(row.invoice, row.item, "shortage_qty_changed", {
    quantity: qty,
    memo,
    drawerMemo,
  });
  if (!ok) return;
  await loadWorkflowData();
  state.selectedShortageKey = shortageKey;
  renderShortagePanels();
  toast("미송 메모 저장 완료");
}

function selectedInspectionInvoice(orderGroupNo = state.selectedInspectionGroup) {
  return (
    [...inspectionSourceInvoices(), ...(state.workflowQueues?.inspectionCompletedInvoices || [])].find((invoice) => invoice.orderGroupNo === orderGroupNo) ||
    null
  );
}

async function completeSelectedInspection(orderGroupNo = state.selectedInspectionGroup) {
  const invoice = selectedInspectionInvoice(orderGroupNo);
  if (!invoice) {
    toast("검품 대기 송장을 찾지 못했습니다.");
    return;
  }
  const ok = await saveWorkflowInvoiceEvent(invoice, "inspection_completed", { memo: "inspection completed" });
  if (!ok) return;
  state.activeTab = "completed";
  state.selectedCompletedGroup = invoice.orderGroupNo;
  state.selectedInspectionGroup = "";
  await loadWorkflowData();
  toast("검품 완료 처리되었습니다.");
}

async function reopenSelectedInspection(orderGroupNo = state.selectedInspectionGroup) {
  const invoice = selectedInspectionInvoice(orderGroupNo);
  if (!invoice) {
    toast("검품 완료 송장을 찾지 못했습니다.");
    return;
  }
  const ok = await saveWorkflowInvoiceEvent(invoice, "inspection_reopened", { memo: "inspection reopened" });
  if (!ok) return;
  state.activeTab = "inspection";
  state.selectedInspectionGroup = invoice.orderGroupNo;
  state.selectedCompletedGroup = "";
  await loadWorkflowData();
  toast("검품 완료가 취소되었습니다.");
}

async function toggleSelectedInspectionHold(orderGroupNo = state.selectedInspectionGroup) {
  const invoice = selectedInspectionInvoice(orderGroupNo);
  if (!invoice) {
    toast("검품 대기 송장을 찾지 못했습니다.");
    return;
  }
  const invoiceState = workflowInvoiceState(invoice);
  const eventType = invoiceState?.hold ? "hold_released" : "hold_created";
  const ok = await saveWorkflowInvoiceEvent(invoice, eventType, { memo: invoiceState?.hold ? "hold released" : "hold created" });
  if (!ok) return;
  state.selectedInspectionGroup = invoice.orderGroupNo;
  await loadWorkflowData();
  toast(invoiceState?.hold ? "보류 해제되었습니다." : "보류 처리되었습니다.");
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
  const allowedTabs = new Set(["dashboard", "picking", "gold", "shortage", "inspection", "completed"]);
  state.activeTab = allowedTabs.has(tab) ? tab : "picking";
  if (state.activeTab === "gold") {
    state.filterMode = "gold";
    state.searchText = "";
    if (els.searchInput) els.searchInput.value = "";
  } else if (tab === "picking" && state.filterMode === "gold") {
    state.filterMode = "all";
  }
  render();
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

function currentWorkflowRows() {
  if (state.activeTab === "shortage") return state.workflowQueues?.shortageItems || [];
  if (state.activeTab === "inspection") {
    return inspectionSourceInvoices().filter(invoiceMatchesInspectionFilter).filter(invoiceMatchesInspectionSearch);
  }
  if (state.activeTab === "completed") return completedInvoicesForSelectedDate();
  return [];
}

function moveWorkflowSelection(delta) {
  const rows = currentWorkflowRows();
  if (!rows.length) return;
  if (state.activeTab === "shortage") {
    const keys = rows.map(({ invoice, item }) => workflowItemKey(invoice, item));
    const current = keys.indexOf(state.selectedShortageKey);
    state.selectedShortageKey = keys[Math.max(0, Math.min(keys.length - 1, (current >= 0 ? current : 0) + delta))];
    renderShortagePanels();
    return;
  }
  if (state.activeTab === "inspection") {
    const keys = rows.map((invoice) => invoice.orderGroupNo);
    const current = keys.indexOf(state.selectedInspectionGroup);
    state.selectedInspectionGroup = keys[Math.max(0, Math.min(keys.length - 1, (current >= 0 ? current : 0) + delta))];
    renderInspectionPanels();
    return;
  }
  if (state.activeTab === "completed") {
    const keys = rows.map((invoice) => invoice.orderGroupNo);
    const current = keys.indexOf(state.selectedCompletedGroup);
    state.selectedCompletedGroup = keys[Math.max(0, Math.min(keys.length - 1, (current >= 0 ? current : 0) + delta))];
    renderCompletedPanels();
  }
}

function focusActiveSearch() {
  const target = state.activeTab === "inspection" ? els.inspectionSearchInput : els.searchInput;
  target?.focus();
  target?.select();
}

function activateTabShortcut(key) {
  const tabs = {
    "1": "dashboard",
    "2": "picking",
    "3": "gold",
    "4": "shortage",
    "5": "inspection",
    "6": "completed",
  };
  if (!tabs[key]) return false;
  setActiveTab(tabs[key]);
  return true;
}

function isTypingTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function onGlobalKeydown(event) {
  if (!isTypingTarget(event.target) && activateTabShortcut(event.key)) {
    event.preventDefault();
    return;
  }
  if (event.key.toLowerCase() === "q" && !isTypingTarget(event.target)) {
    event.preventDefault();
    focusActiveSearch();
    return;
  }
  if ((event.key === "Tab" || event.key === "ArrowDown" || event.key === "ArrowUp") && !isTypingTarget(event.target)) {
    event.preventDefault();
    const delta = event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey) ? -1 : 1;
    if (["shortage", "inspection", "completed"].includes(state.activeTab)) moveWorkflowSelection(delta);
    else moveSelection(delta);
    return;
  }
  if (event.code === "Space" && !isTypingTarget(event.target)) {
    event.preventDefault();
    if (state.activeTab === "shortage") completeSelectedShortagePicking().catch(showError);
    else if (state.activeTab === "inspection") completeSelectedInspection().catch(showError);
    else toggleSelectedItem().catch(showError);
  }
}

function bindEvents() {
  document.querySelectorAll("[data-app-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.appTab));
  });
  els.refreshBtn.addEventListener("click", () => loadPickingData().catch(showError));
  els.todayBtn.addEventListener("click", () => {
    state.selectedDate = todayDateString();
    state.selectedCompletedGroup = "";
    els.dateInput.value = state.selectedDate;
    loadPickingData().catch(showError);
  });
  els.dateInput.addEventListener("change", () => {
    state.selectedDate = els.dateInput.value;
    state.currentGroup = 0;
    state.selectedCompletedGroup = "";
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
  els.inspectionFilterBar?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inspection-filter]");
    if (!button) return;
    state.inspectionFilter = button.dataset.inspectionFilter || "all";
    state.selectedInspectionGroup = "";
    renderInspectionPanels();
  });
  els.inspectionSearchInput?.addEventListener("input", () => {
    state.inspectionSearchText = els.inspectionSearchInput.value;
    state.selectedInspectionGroup = "";
    renderInspectionPanels();
    const digits = onlyDigits(state.inspectionSearchText);
    if (digits.length >= 13) {
      const row = inspectionSourceInvoices().find((invoice) => onlyDigits(invoice.invoiceNo).includes(digits));
      if (row) {
        state.selectedInspectionGroup = row.orderGroupNo;
        renderInspectionPanels();
      }
    }
  });
  els.dashboardSummary?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dashboard-tab]");
    if (!button) return;
    setActiveTab(button.dataset.dashboardTab);
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
  els.shortageDetail?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "shortage-repicked") {
      completeSelectedShortagePicking(button.dataset.shortageKey).catch(showError);
    }
    if (button.dataset.action === "shortage-memo-save") {
      saveSelectedShortageMemo(button.dataset.shortageKey).catch(showError);
    }
  });
  els.inspectionListBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inspection-group]");
    if (!button) return;
    state.selectedInspectionGroup = button.dataset.inspectionGroup;
    renderInspectionPanels();
  });
  els.inspectionDetail?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "inspection-complete") {
      completeSelectedInspection(button.dataset.inspectionGroup).catch(showError);
    }
    if (button.dataset.action === "inspection-reopen") {
      reopenSelectedInspection(button.dataset.inspectionGroup).catch(showError);
    }
    if (button.dataset.action === "inspection-hold" || button.dataset.action === "inspection-hold-release") {
      toggleSelectedInspectionHold(button.dataset.inspectionGroup).catch(showError);
    }
  });
  document.querySelectorAll("[data-completed-date-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.completedDateMode = button.dataset.completedDateMode === "completed" ? "completed" : "receipt";
      state.selectedCompletedGroup = "";
      renderCompletedPanels();
    });
  });
  els.completedListBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-completed-group]");
    if (!button) return;
    state.selectedCompletedGroup = button.dataset.completedGroup;
    renderCompletedPanels();
  });
  els.completedDetail?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "inspection-reopen") {
      reopenSelectedInspection(button.dataset.completedGroup).catch(showError);
    }
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
