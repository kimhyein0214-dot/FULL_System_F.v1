import { loadWorkflowQueues } from "../adapters/workflowEventAdapter.mjs?v=20260703-workflow-drawer1";
import { buildPickingViewModel } from "../workflows/picking/buildPickingViewModel.mjs?v=20260706-memo2-text1";
import {
  buildWorkflowState,
  completedInvoicesForInspection,
  openShortageItems,
  repickedInvoicesForInspection,
} from "../workflows/workflowEvents.mjs";

const SUPABASE_URL = "https://vgxocngpykhlkosiaeew.supabase.co";
const SUPABASE_KEY = "sb_publishable_XVnKGJo66GZiYTq5Ivu8dA_SjBVvX0g";
const IMAGE_SUPABASE_URL = "https://bpgvqmtsjgegnrdzmpep.supabase.co";
const IMAGE_BUCKET = "product-images";
const JO_SIZE = 4;
const CS_TEMPLATE_PRESETS = {
  d1: {
    label: "1일차 기본",
    text:
      "[#{SHOPNAME}/입고지연 상품 안내]\n\n안녕하세요, #{NAME} 고객님!\n주문 상품 중 아래의 상품이 거래처 지연/불량 등의 사유로, 부득이하게 출고가 지연되고 있습니다. 이용에 불편을 드려 대단히 죄송합니다.\n\n●지연상품\n#{PRODUCT}(#{OPTION})\n※ 보통 1-2일내로 정상출고되며, 추가지연시 다시 연락드립니다.\n※ 안내가 없는 제품은 입고완료 제품입니다.\n※ 만약 빠른 출고를 위하여 해당 제품의 취소 / 옵션 변경을 희망하시는 경우, 핑크로켓 고객센터(카카오톡:핑크로켓) / 구매처 게시판 등으로 연락부탁드립니다!\n\n빠른 출고가 되도록 노력하겠습니다!",
  },
  d3_ms: {
    label: "3일차 메이크샵",
    text:
      "[#{SHOPNAME}/지연상품 취소 및 출고 안내]\n\n안녕하세요, #{NAME} 고객님!\n안내드린 상품의 입고가 3 영업일 이상 경과되어,\n주문시에 선택하신 장기지연 처리 방법으로 취소/환불 후, 내일 준비된 제품만 출고될 예정입니다.\n(주말의 경우 차주 월요일 출고 / 단독상품 주문시 주문취소)\n정상 출고 도와드리지 못해 대단히 죄송합니다.\n\n●취소예정상품\n#{PRODUCT}(#{OPTION})\n※ 안내가 없는 제품은 입고완료 제품입니다.\n\n더욱 나은 서비스를 위해 노력하겠습니다. 감사합니다!",
  },
  d3_pf: {
    label: "3일차 플랫폼",
    text:
      "[#{SHOPNAME}/입고지연 취소 및 출고 안내]\n\n안녕하세요, #{NAME} 고객님!\n안내드린 지연상품의 입고가 3 영업일 이상 지속되어, 장기지연이 예상되고 있습니다.\n이에 부득이하게 해당 제품을 취소처리 후, 내일 나머지 제품만 출고될 예정입니다.\n(주말의 경우 차주 월요일 출고 / 단독상품 주문시 주문취소)\n오래 기다려 주셨으나, 정상출고 도와드리지 못해 대단히 죄송합니다.\n\n●취소예정상품\n#{PRODUCT}(#{OPTION})\n※ 안내가 없는 제품은 입고완료 제품입니다.\n※ 만약 취소하지 않고, 입고시까지 기다리시기를 원하시는 경우, 다음날 9:30AM까지 핑크로켓 고객센터(카카오톡:핑크로켓) / 구매처 게시판 등으로 연락부탁드립니다.\n\n더욱 나은 서비스를 위해 노력하겠습니다. 감사합니다!",
  },
  d5_hi: {
    label: "5일차 부분출고",
    text:
      "[#{SHOPNAME}/부분 출고 안내]\n\n안녕하세요, #{NAME} 고객님!\n안내드린 상품의 입고가 5 영업일 이상 경과되어, 장기지연이 예상되고 있습니다. 이에 부득이하게 내일 준비된 제품만 우선적으로 부분출고될 예정입니다.\n(주말의 경우 차주 월요일 출고)\n이용에 불편을 드려 대단히 죄송합니다.\n\n●지연상품\n#{PRODUCT}(#{OPTION})\n※ 안내가 없는 제품은 입고완료 제품으로, 익일 부분출고됩니다.\n※ 지연상품의 입고지연이 지속될 경우, 취소처리 될 수 있습니다.\n\n더욱 나은 서비스를 위해 노력하겠습니다. 감사합니다!",
  },
  d5_lo: {
    label: "5일차 취소출고",
    text:
      "[#{SHOPNAME}/지연상품 취소 및 출고 안내]\n\n안녕하세요, #{NAME} 고객님!\n안내드린 상품의 입고가 5 영업일 이상 경과되어, 입고일이 불투명한 장기지연이 예상되고 있습니다. 이에 부득이하게 해당 제품을 취소처리 후, 내일 나머지 제품만 출고될 예정입니다.\n(주말의 경우 차주 월요일 출고 / 단독상품 주문시 주문취소)\n오래 기다려 주셨으나, 정상출고 도와드리지 못해 대단히 죄송합니다.\n\n●취소예정상품\n#{PRODUCT}(#{OPTION})\n※ 안내가 없는 제품은 입고완료 제품입니다.\n※ 만약 취소하지 않고, 입고시까지 기다리시기를 원하시는 경우, 다음날 9:30AM까지 핑크로켓 고객센터(카카오톡:핑크로켓) / 구매처 게시판 등으로 연락부탁드립니다. 이경우, 추후 입고지연이 지속될 경우, 취소처리 될 수 있습니다.\n\n더욱 나은 서비스를 위해 노력하겠습니다. 감사합니다!",
  },
  d10: {
    label: "10일차 잔여취소",
    text:
      "[#{SHOPNAME}/지연상품 취소 안내]\n\n안녕하세요, #{NAME} 고객님!\n부분출고 후 지연상품의 입고를 꾸준히 체크하였으나, 현재 입고일이 불투명한 장기지연이 계속되고 있는 상태입니다. 이에 부득이하게 해당 제품을 취소처리 해드리고자 합니다.\n오래 기다려 주셨으나, 정상출고 도와드리지 못해 대단히 죄송합니다.\n\n●취소예정상품\n#{PRODUCT}(#{OPTION})\n\n더욱 나은 서비스를 위해 노력하겠습니다. 감사합니다!",
  },
  d0: {
    label: "내일출고",
    text:
      "[#{SHOPNAME}/내일 출고 안내]\n\n안녕하세요, #{NAME} 고객님!\n주문하신 상품이 오늘 모두 준비가 완료되었습니다.\n꼼꼼히 검품/포장 후, 내일 출고하겠습니다.\n(주말의 경우 차주 월요일 출고)\n기다려주셔서 감사합니다! :)",
  },
  "14k_1": {
    label: "14K 1일차",
    text:
      "[#{SHOPNAME}/14K제품 배송안내]\n\n안녕하세요, #{NAME} 고객님!\n주문하신 14K 제품이 현재 제작진행 중입니다!\n\n●현재 제작중인 14K 제품\n#{PRODUCT}(#{OPTION})\n※ 안내가 없는 제품은 입고완료된 제품입니다.\n※ 14K 제품은 주문 후 제작되는 방식입니다. (1-2주 소요 / 빠른 출고를 위한 선재고 보유품목 제외)\n※ 자세한 내용은 상세 공지 확인해주세요!\n\n빠른 출고가 되도록 노력하겠습니다!",
  },
  "14k_5": {
    label: "14K 5일차 부분출고",
    text:
      "[#{SHOPNAME}/부분 출고 안내]\n\n안녕하세요, #{NAME} 고객님!\n주문해 주신 상품 중, 제작 주문이 들어간 제품 이외에 준비된 제품만 내일 우선적으로 부분출고될 예정입니다.\n(주말의 경우 차주 월요일 출고)\n\n●현재 제작중인 14K 제품\n#{PRODUCT}(#{OPTION})\n※ 안내가 없는 제품은 준비완료 제품으로, 익일 부분출고됩니다.\n※ 안내된 제품은 제작이 완료되는 대로 추가출고됩니다.\n\n더욱 나은 서비스를 위해 노력하겠습니다. 감사합니다!",
  },
};
const CS_DAYS = [
  { key: "all", label: "전체" },
  { key: "내일출고", label: "내일출고" },
  { key: "1일차", label: "1일차 기본" },
  { key: "3일차 메이크샵", label: "3일차 메이크샵" },
  { key: "3일차 플랫폼", label: "3일차 플랫폼" },
  { key: "5일차 부분출고", label: "5일차 부분출고" },
  { key: "5일차 취소출고", label: "5일차 취소출고" },
  { key: "10일차", label: "10일차 잔여취소" },
  { key: "14K 1일차", label: "14K 1일차" },
  { key: "14K 5일차", label: "14K 5일차 부분출고" },
];
const CS_DAY_TEMPLATE = {
  내일출고: "d0",
  "1일차": "d1",
  "3일차 메이크샵": "d3_ms",
  "3일차 플랫폼": "d3_pf",
  "5일차 부분출고": "d5_hi",
  "5일차 취소출고": "d5_lo",
  "10일차": "d10",
  "14K 1일차": "14k_1",
  "14K 5일차": "14k_5",
};

const params = new URLSearchParams(location.search);
const allowWrites = params.get("write") !== "0";
const allowOrderReorder = allowWrites && params.get("reorder") !== "0";
const allowWorkflowEvents = allowWrites && params.get("events") !== "0";
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
  shortageFilter: "all",
  shortageSearchText: "",
  receivingLabel: {
    only: false,
    fileName: "",
    productMap: new Map(),
    ownCodeMap: new Map(),
    rowCount: 0,
    totalQty: 0,
    error: "",
  },
  selectedInspectionGroup: "",
  selectedCompletedGroup: "",
  completedDateMode: "receipt",
  inspectionFilter: "all",
  inspectionHideCompleted: false,
  inspectionSearchText: "",
  csDateFilter: "all",
  csSearchText: "",
  selectedCsKey: "",
  sidebarCollapsed: false,
  workflowEventsReady: false,
  workflowEventsChecked: false,
  saving: new Set(),
  workflowSaving: new Set(),
  drawerKeypad: {
    orderGroupNo: "",
    value: "",
    note: "",
  },
  orderListModal: {
    open: false,
    filter: "all",
    search: "",
  },
  dashboardMonthKey: todayDateString().slice(0, 7),
  photoViewer: {
    open: false,
    src: "",
    title: "",
  },
};

const els = {
  dateInput: document.getElementById("date-input"),
  refreshBtn: document.getElementById("refresh-btn"),
  todayBtn: document.getElementById("today-btn"),
  sortToggle: document.getElementById("sort-toggle"),
  searchInput: document.getElementById("search-input"),
  filterBar: document.getElementById("filter-bar"),
  mainGrid: document.querySelector(".main-grid"),
  sidebar: document.querySelector(".sidebar"),
  sidebarToggle: document.getElementById("sidebar-toggle"),
  sideShortcuts: document.getElementById("side-shortcuts"),
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
  csPanel: document.getElementById("cs-panel"),
  completedPanel: document.getElementById("completed-panel"),
  shortageListCount: document.getElementById("shortage-list-count"),
  shortageListBody: document.getElementById("shortage-list-body"),
  shortageDetail: document.getElementById("shortage-detail"),
  shortageFilterBar: document.getElementById("shortage-filter-bar"),
  shortageSearchInput: document.getElementById("shortage-search-input"),
  shortageReceivingFile: document.getElementById("shortage-receiving-file"),
  shortageReceivingOnly: document.getElementById("shortage-receiving-only"),
  shortageReceivingStatus: document.getElementById("shortage-receiving-status"),
  inspectionListCount: document.getElementById("inspection-list-count"),
  inspectionListBody: document.getElementById("inspection-list-body"),
  inspectionDetail: document.getElementById("inspection-detail"),
  csDateTabs: document.getElementById("cs-date-tabs"),
  csSearchInput: document.getElementById("cs-search-input"),
  csListCount: document.getElementById("cs-list-count"),
  csListBody: document.getElementById("cs-list-body"),
  csDetail: document.getElementById("cs-detail"),
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

function receivingProductCodeKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function receivingOwnCodeKeys(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const withoutPrefix = raw.replace(/^\[[^\]]+\]\s*/, "").trim();
  const withoutTrailingLabel = withoutPrefix.replace(/\]\s*\d+$/g, "").trim();
  return [...new Set([raw, withoutPrefix, withoutTrailingLabel, ...ownCodeCandidates(raw)].map(codeCompareKey).filter(Boolean))];
}

function numberFromCell(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : 0;
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

function photoTitleForItem(item = {}) {
  return [item.ownCode, cleanOptionName(item.optionName, item.ownCode) || item.productName].filter(Boolean).join(" · ");
}

function photoImgAttrs(src, title = "") {
  return `data-photo-src="${escapeHtml(src)}" data-photo-title="${escapeHtml(title)}"`;
}

function ensurePhotoViewer() {
  let overlay = document.getElementById("photo-viewer-overlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "photo-viewer-overlay";
  overlay.className = "photo-viewer-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `<div class="photo-viewer" role="dialog" aria-modal="true" aria-label="상품 사진 확대">
    <div class="photo-viewer-head">
      <strong id="photo-viewer-title">상품 사진</strong>
      <div>
        <button class="btn" data-photo-action="refresh" type="button">새로고침</button>
        <button class="btn" data-photo-action="close" type="button">닫기</button>
      </div>
    </div>
    <div class="photo-viewer-body">
      <img id="photo-viewer-img" alt="">
    </div>
  </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function bustImageUrl(src) {
  const separator = String(src || "").includes("?") ? "&" : "?";
  return `${src}${separator}v=${Date.now()}`;
}

function openPhotoViewer(src, title = "") {
  if (!src) return;
  const overlay = ensurePhotoViewer();
  state.photoViewer = { open: true, src, title };
  overlay.hidden = false;
  overlay.querySelector("#photo-viewer-title").textContent = title || "상품 사진";
  overlay.querySelector("#photo-viewer-img").src = src;
}

function closePhotoViewer() {
  const overlay = document.getElementById("photo-viewer-overlay");
  state.photoViewer.open = false;
  if (overlay) overlay.hidden = true;
}

function refreshPhotoViewer() {
  if (!state.photoViewer.src) return;
  const image = document.getElementById("photo-viewer-img");
  if (image) image.src = bustImageUrl(state.photoViewer.src);
}

function isPicked(item) {
  return Boolean(item.pickingState?.isPicked);
}

function normalizedShortageMemo2(value) {
  const text = String(value ?? "").trim();
  return text === "0" ? "" : text;
}

function isRepickDoneMemo2(value) {
  const compact = String(value || "").replace(/\s+/g, "");
  return compact === "ㅁ" || compact === "✓" || compact === "✔" || compact.toLowerCase() === "done" || compact.includes("피킹완료");
}

function shortageQtyFromMemo2(value) {
  const text = normalizedShortageMemo2(value);
  if (!text || isRepickDoneMemo2(text)) return 0;
  if (/^\d+$/.test(text)) return Math.max(0, Number(text) || 0);
  const matched = text.match(/\bshortage\s*(\d+)\b/i)?.[1] || text.match(/부족\s*(\d+)/)?.[1] || text.match(/\d+/)?.[0];
  return matched ? Math.max(0, Number(matched) || 0) : 1;
}

function itemManagementMemo2(item, fallbackValue = "") {
  const memo = firstRawPreservedText(item?.raw, "o_shop_memo2", "shop_memo2", "memo2", "sellpia_memo2") || item?.sellpiaMemo2 || item?.pickingState?.shortageMemo2 || "";
  if (String(memo || "").trim()) return String(memo);
  const fallbackQty = shortageQtyFromMemo2(fallbackValue);
  return fallbackQty > 0 ? String(fallbackQty) : "";
}

function shortageQty(item) {
  return shortageQtyFromMemo2(itemManagementMemo2(item));
}

function normalizedShortageQty(value) {
  return shortageQtyFromMemo2(value);
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

function itemHasLabelTarget(item) {
  return isGoldItem(item) || isLabelTarget({ privateCode: item?.ownCode || "" });
}

function invoiceHasLabelTarget(invoice) {
  return (invoice.items || []).some(itemHasLabelTarget);
}

function itemManagementMemo(item) {
  return String(
    item?.sellpiaMemo1 ||
      item?.raw?.o_shop_memo ||
      item?.raw?.shop_memo ||
      item?.raw?.memo1 ||
      item?.pickingState?.drawerMemo ||
      item?.shortageState?.drawerMemo ||
      "",
  ).trim();
}

function invoiceDrawerValue(invoice) {
  return String(
    (invoice.items || []).map(itemManagementMemo).find(Boolean) ||
      invoice.sellpiaMemo1 ||
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

function itemHasOpenWorkflowShortage(invoice, item) {
  const itemState = workflowItemState(invoice, item);
  if (itemState?.cancelled || itemState?.shortageRepicked || itemState?.inspected) return false;
  if (itemState?.shortageOpen) return true;
  return shortageQty(item) > 0;
}

function invoiceHasOpenWorkflowShortage(invoice) {
  return (invoice.items || []).some((item) => itemHasOpenWorkflowShortage(invoice, item));
}

function invoiceReadyFromPicking(invoice) {
  const invoiceState = workflowInvoiceState(invoice);
  if (invoiceState?.cancelled) return false;
  if (invoiceHasOpenWorkflowShortage(invoice)) return false;
  if (invoiceState?.inspected) return true;

  const stats = invoiceStats(invoice);
  return stats.total > 0 && stats.picked === stats.total && stats.shortage === 0 && stats.hold === 0;
}

function invoiceSessionRank(invoice) {
  const session = String(invoice?.session || invoice?.raw?.am_pm || "").trim().toUpperCase();
  if (session === "AM" || session === "오전") return 0;
  if (session === "PM" || session === "오후") return 1;
  return 2;
}

function invoiceItemKindCount(invoice) {
  const keys = (invoice?.items || [])
    .map((item) => String(item.ownCode || item.sellpiaProductCode || item.productName || item.sellpiaItemNo || "").trim())
    .filter(Boolean);
  return new Set(keys).size || (invoice?.items || []).length;
}

function compareWorkInvoices(a, b) {
  const aStats = invoiceStats(a);
  const bStats = invoiceStats(b);
  return (
    invoiceSessionRank(a) - invoiceSessionRank(b) ||
    invoiceItemKindCount(a) - invoiceItemKindCount(b) ||
    aStats.qty - bStats.qty ||
    (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999) ||
    String(a.orderGroupNo).localeCompare(String(b.orderGroupNo), "ko", { numeric: true })
  );
}

function sortInvoices(invoices) {
  const rows = [...invoices];
  if (!state.workSortMode) return rows;
  return rows.sort(compareWorkInvoices);
}

function optionHasBarChange(item) {
  const raw = `${item?.optionName || ""} ${item?.raw?.p_option || ""} ${item?.raw?.option_name || ""}`;
  return /바\s*변경|바변경/i.test(raw);
}

function optionClass(item, base = "option") {
  return [base, optionHasBarChange(item) ? "option-change" : ""].filter(Boolean).join(" ");
}

function orderedInvoicesForSystemSequence(invoices = []) {
  const sorted = [...invoices].sort(compareWorkInvoices);
  return [...sorted.filter((invoice) => !invoiceHasGold(invoice)), ...sorted.filter(invoiceHasGold)];
}

function workOrderedInvoices() {
  return orderedInvoicesForSystemSequence(state.viewModel?.invoices || []);
}

function frontOrderedInvoicesForExport() {
  return exportOrderedInvoices(state.viewModel?.invoices || []);
}

function workflowOrderedInvoices() {
  return orderedInvoicesForSystemSequence(state.workflowQueues?.viewModel?.invoices || []);
}

const invoiceSequenceCache = {
  workSortMode: null,
  viewModel: null,
  workflowViewModel: null,
  map: new Map(),
};

function invoiceSystemSequenceMap() {
  const workflowViewModel = state.workflowQueues?.viewModel || null;
  if (
    invoiceSequenceCache.workSortMode === state.workSortMode &&
    invoiceSequenceCache.viewModel === state.viewModel &&
    invoiceSequenceCache.workflowViewModel === workflowViewModel
  ) {
    return invoiceSequenceCache.map;
  }
  const map = new Map();
  for (const rows of [workOrderedInvoices(), workflowOrderedInvoices()]) {
    rows.forEach((row, index) => {
      const key = systemInvoiceKey(row);
      if (key && !map.has(key)) map.set(key, index + 1);
    });
  }
  invoiceSequenceCache.workSortMode = state.workSortMode;
  invoiceSequenceCache.viewModel = state.viewModel;
  invoiceSequenceCache.workflowViewModel = workflowViewModel;
  invoiceSequenceCache.map = map;
  return map;
}

function normalizeRouteCode(value) {
  return String(value || "").trim().replace(/^\[|\]$/g, "").toUpperCase();
}

function exportRouteBaseCode(value) {
  const raw = String(value || "").trim().replace(/^낱/i, "").toUpperCase();
  const bracket = raw.match(/^\[([A-Z]+)\]\s*([A-Z])/);
  if (bracket) {
    const zone = bracket[1].trim();
    const aisle = bracket[2].trim();
    if (zone === "P" || zone === "E" || zone === "H") return zone + aisle;
    return zone;
  }
  return normalizeRouteCode(raw).replace(/^낱/i, "").replace(/[\]\s]+/g, "");
}

const EXPORT_ROUTE_ORDER = [
  "CA",
  "PS",
  "PT",
  "PQ",
  "PR",
  "PO",
  "PP",
  "PM",
  "PN",
  "PG",
  "PH",
  "PE",
  "PF",
  "PC",
  "PD",
  "PA",
  "PB",
  "PK",
  "PL",
  "PI",
  "PJ",
  "EA",
  "ED",
  "EC",
  "EB",
  "EE",
  "EF",
  "BA",
  "NA",
  "SA",
  "RA",
  "HA",
  "HB",
  "HC",
  "HD",
];
const EXPORT_ROUTE_RANK = EXPORT_ROUTE_ORDER.reduce((map, code, index) => {
  map[code] = index;
  return map;
}, {});

function exportRouteRank(value) {
  const code = exportRouteBaseCode(value);
  if (!code) return 9999;
  if (EXPORT_ROUTE_RANK[code] !== undefined) return EXPORT_ROUTE_RANK[code];
  const prefix2 = code.slice(0, 2);
  if (EXPORT_ROUTE_RANK[prefix2] !== undefined) return EXPORT_ROUTE_RANK[prefix2];
  const first = code.charAt(0);
  if (first === "P") return 900;
  if (first === "E") return 920;
  if (/^[HNRSB]/.test(first)) return 940;
  return 9999;
}

function compareExportRouteCode(a, b) {
  const aRank = exportRouteRank(a);
  const bRank = exportRouteRank(b);
  if (aRank !== bRank) return aRank - bRank;
  return String(exportRouteBaseCode(a)).localeCompare(String(exportRouteBaseCode(b)), "en", { numeric: true, sensitivity: "base" });
}

function exportRouteMetrics(codes = []) {
  const ranks = (codes || []).map(exportRouteRank).filter((number) => Number.isFinite(number) && number < 9999);
  const startRank = ranks.length ? Math.min(...ranks) : 9999;
  const endRank = ranks.length ? Math.max(...ranks) : 9999;
  const routeSpan = ranks.length ? endRank - startRank : 9999;
  const primaryRouteCode = (codes || []).filter(Boolean).sort(compareExportRouteCode)[0] || "";
  return {
    startRank,
    endRank,
    routeSpan,
    routeZoneSpread: new Set(ranks).size || 1,
    primaryRouteCode,
  };
}

function exportOriginalRank(invoice, fallback) {
  const rawRank = firstRawText(invoice.raw, "sellpia_seq_no", "original_seq_no", "print_seq_no", "sort_order");
  const number = Number(String(rawRank || invoice.sortOrder || fallback || 0).replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 ? number : Number(fallback) || 0;
}

function exportSortMetrics(invoice) {
  const items = invoice.items || [];
  const itemKindCount = new Set(items.map((item) => item.ownCode || item.sellpiaProductCode).filter(Boolean)).size;
  const totalItemQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const hasShortage = items.some((item) => {
    const memoShortage = parseInt(String(item.sellpiaMemo2 || "").replace(/[^0-9-]/g, ""), 10) || 0;
    return memoShortage > 0 || shortageQty(item) > 0;
  });
  const hasHold =
    Boolean(invoice.raw?.hold || invoice.raw?.is_hold || invoice.raw?.shipping_hold || workflowInvoiceState(invoice)?.hold) ||
    items.some(isHold);
  const routeCodes = items.map((item) => normalizeRouteCode(item.ownCode || item.sellpiaProductCode)).filter(Boolean);
  const route = exportRouteMetrics(routeCodes);
  return {
    itemKindCount: itemKindCount || 0,
    totalItemQty: totalItemQty || 0,
    hasGoldItem: invoiceHasGold(invoice),
    hasShortage,
    hasHold,
    routeZoneRank: route.startRank,
    routeZoneSpread: route.routeZoneSpread,
    primaryRouteCode: route.primaryRouteCode,
    startRank: route.startRank,
    endRank: route.endRank,
    routeSpan: route.routeSpan,
  };
}

function exportProblemRank(metrics = {}) {
  if (metrics.hasHold) return 2;
  if (metrics.hasGoldItem) return 1;
  return 0;
}

function compareExportInvoices(a, b) {
  const aMetrics = a._exportSortMetrics || {};
  const bMetrics = b._exportSortMetrics || {};
  const aProblem = exportProblemRank(aMetrics);
  const bProblem = exportProblemRank(bMetrics);
  if (aProblem !== bProblem) return aProblem - bProblem;
  if ((aMetrics.itemKindCount || 0) !== (bMetrics.itemKindCount || 0)) return (aMetrics.itemKindCount || 0) - (bMetrics.itemKindCount || 0);
  if ((aMetrics.routeZoneRank ?? 9999) !== (bMetrics.routeZoneRank ?? 9999)) return (aMetrics.routeZoneRank ?? 9999) - (bMetrics.routeZoneRank ?? 9999);
  if ((aMetrics.routeSpan ?? 9999) !== (bMetrics.routeSpan ?? 9999)) return (aMetrics.routeSpan ?? 9999) - (bMetrics.routeSpan ?? 9999);
  if ((aMetrics.routeZoneSpread || 1) !== (bMetrics.routeZoneSpread || 1)) return (aMetrics.routeZoneSpread || 1) - (bMetrics.routeZoneSpread || 1);
  if ((aMetrics.totalItemQty || 0) !== (bMetrics.totalItemQty || 0)) return (aMetrics.totalItemQty || 0) - (bMetrics.totalItemQty || 0);
  const codeCompare = String(aMetrics.primaryRouteCode || "").localeCompare(String(bMetrics.primaryRouteCode || ""), "en", {
    numeric: true,
    sensitivity: "base",
  });
  if (codeCompare !== 0) return codeCompare;
  return (a._exportOriginalRank || 0) - (b._exportOriginalRank || 0);
}

function compareExportInvoicesWithinKind(a, b) {
  const aMetrics = a._exportSortMetrics || {};
  const bMetrics = b._exportSortMetrics || {};
  const aProblem = exportProblemRank(aMetrics);
  const bProblem = exportProblemRank(bMetrics);
  if (aProblem !== bProblem) return aProblem - bProblem;
  if ((aMetrics.routeZoneRank ?? 9999) !== (bMetrics.routeZoneRank ?? 9999)) return (aMetrics.routeZoneRank ?? 9999) - (bMetrics.routeZoneRank ?? 9999);
  if ((aMetrics.routeSpan ?? 9999) !== (bMetrics.routeSpan ?? 9999)) return (aMetrics.routeSpan ?? 9999) - (bMetrics.routeSpan ?? 9999);
  if ((aMetrics.routeZoneSpread || 1) !== (bMetrics.routeZoneSpread || 1)) return (aMetrics.routeZoneSpread || 1) - (bMetrics.routeZoneSpread || 1);
  if ((aMetrics.totalItemQty || 0) !== (bMetrics.totalItemQty || 0)) return (aMetrics.totalItemQty || 0) - (bMetrics.totalItemQty || 0);
  return (a._exportOriginalRank || 0) - (b._exportOriginalRank || 0);
}

function buildRouteOptimizedExportInvoices(invoices) {
  const buckets = new Map();
  [...invoices].sort(compareExportInvoices).forEach((invoice) => {
    const metrics = invoice._exportSortMetrics || {};
    const key = [exportProblemRank(metrics), metrics.itemKindCount || 0].join("|");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(invoice);
  });

  const result = [];
  [...buckets.entries()]
    .sort((a, b) => {
      const [aProblem, aKind] = a[0].split("|").map(Number);
      const [bProblem, bKind] = b[0].split("|").map(Number);
      return aProblem - bProblem || aKind - bKind;
    })
    .forEach(([, bucket]) => {
      const sorted = [...bucket].sort(compareExportInvoicesWithinKind);
      const batches = [];
      for (let index = 0; index < sorted.length; index += JO_SIZE) {
        const orders = sorted.slice(index, index + JO_SIZE);
        const starts = orders.map((invoice) => invoice._exportSortMetrics?.startRank ?? 9999);
        const ends = orders.map((invoice) => invoice._exportSortMetrics?.endRank ?? 9999);
        batches.push({ orders, start: Math.min(...starts), end: Math.max(...ends) });
      }
      let prevEnd = result.length ? (result[result.length - 1]._exportSortMetrics?.endRank ?? 0) : 0;
      while (batches.length) {
        let bestIndex = 0;
        let bestScore = Infinity;
        batches.forEach((batch, index) => {
          const score = Math.abs((batch.start ?? 9999) - prevEnd);
          if (score < bestScore) {
            bestScore = score;
            bestIndex = index;
          }
        });
        const [next] = batches.splice(bestIndex, 1);
        result.push(...next.orders.sort(compareExportInvoicesWithinKind));
        prevEnd = next.end;
      }
    });
  return result;
}

function exportOrderedInvoices(invoices = state.viewModel?.invoices || []) {
  return orderedInvoicesForSystemSequence(invoices).map((invoice, index) => ({ ...invoice, plannedPrintSeqNo: index + 1 }));
}

function inspectionDateRank(invoice) {
  const receiptDate = String(invoice?.receiptDate || "").slice(0, 10);
  if (receiptDate && receiptDate === state.selectedDate) return 0;
  return 1;
}

function sortInspectionInvoices(invoices) {
  return [...(invoices || [])].sort((a, b) => {
    const aDateRank = inspectionDateRank(a);
    const bDateRank = inspectionDateRank(b);
    if (aDateRank !== bDateRank) return aDateRank - bDateRank;
    if (aDateRank > 0) {
      const dateCompare = String(a.receiptDate || "").localeCompare(String(b.receiptDate || ""));
      if (dateCompare !== 0) return dateCompare;
    }
    return (
      invoiceSessionRank(a) - invoiceSessionRank(b) ||
      visibleInvoiceSequenceNo(a, 999999) - visibleInvoiceSequenceNo(b, 999999) ||
      String(a.orderGroupNo || "").localeCompare(String(b.orderGroupNo || ""), "ko", { numeric: true })
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
    if (String(a.invoice.orderGroupNo || "") === String(b.invoice.orderGroupNo || "")) {
      return (
        compareInvoiceItemsBySellpiaRow(aItem, bItem) ||
        String(aItem.sellpiaItemNo || "").localeCompare(String(bItem.sellpiaItemNo || ""), "ko", { numeric: true })
      );
    }
    if (aGold && bGold) {
      return (
        (a.invoice.sortOrder ?? 999999) - (b.invoice.sortOrder ?? 999999) ||
        String(a.invoice.orderGroupNo).localeCompare(String(b.invoice.orderGroupNo), "ko") ||
        compareInvoiceItemsBySellpiaRow(aItem, bItem)
      );
    }
    if (aGold !== bGold) {
      return (
        (a.invoice.sortOrder ?? 999999) - (b.invoice.sortOrder ?? 999999) ||
        String(a.invoice.orderGroupNo).localeCompare(String(b.invoice.orderGroupNo), "ko")
      );
    }
    return (
      compareExportRouteCode(aItem.ownCode || aItem.sellpiaProductCode, bItem.ownCode || bItem.sellpiaProductCode) ||
      visibleInvoiceSequenceNo(a.invoice, 999999) - visibleInvoiceSequenceNo(b.invoice, 999999) ||
      compareInvoiceItemsBySellpiaRow(aItem, bItem) ||
      (a.invoice.sortOrder ?? 999999) - (b.invoice.sortOrder ?? 999999) ||
      String(a.invoice.orderGroupNo).localeCompare(String(b.invoice.orderGroupNo), "ko")
    );
  });
}

function rebuildGroups() {
  const invoices = workOrderedInvoices();
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
  const base = statusView ? workOrderedInvoices() : state.groups[state.currentGroup] || [];

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
      invoiceItemsInSellpiaRowOrder(invoice).map((item, itemIndex) => ({ invoice, item, invoiceIndex, itemIndex })),
    ),
  );
}

function currentTrayInvoices() {
  return currentVisibleInvoices();
}

function itemSlotKey(invoice, item) {
  return `${invoice.orderGroupNo}::${item.sellpiaItemNo}`;
}

function itemSortRank(item) {
  const sortOrder = Number(item?.sortOrder);
  if (Number.isFinite(sortOrder) && sortOrder > 0) return sortOrder;
  const itemOrder = Number(item?.itemOrderIndex);
  if (Number.isFinite(itemOrder) && itemOrder > 0) return itemOrder;
  return 999999;
}

function compareInvoiceItemsBySellpiaRow(a, b) {
  return (
    itemSortRank(a) - itemSortRank(b) ||
    String(a?.sellpiaItemNo || "").localeCompare(String(b?.sellpiaItemNo || ""), "ko", { numeric: true }) ||
    String(a?.ownCode || "").localeCompare(String(b?.ownCode || ""), "ko", { numeric: true })
  );
}

function invoiceItemsInSellpiaRowOrder(invoice) {
  return [...(invoice?.items || [])].sort(compareInvoiceItemsBySellpiaRow);
}

function itemOrderNo(item, fallbackIndex = 0) {
  void item;
  return fallbackIndex + 1;
}

function invoiceItemIndex(invoice, item) {
  const index = invoiceItemsInSellpiaRowOrder(invoice).findIndex((row) => row.sellpiaItemNo === item?.sellpiaItemNo);
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
  if (text.includes("지그재그") || text.includes("zigzag") || text.includes("zig")) {
    return { label: "지그재그", className: "seller-zigzag" };
  }
  if (text.includes("에이블리") || text.includes("ably") || text.includes("a-bly")) {
    return { label: "에이블리", className: "seller-ably" };
  }
  if (text.includes("쿠팡") || text.includes("coupang")) {
    return { label: "쿠팡", className: "seller-coupang" };
  }
  if (text.includes("스마트") || text.includes("smart") || text.includes("naver") || text.includes("네이버")) {
    return { label: "스마트스토어", className: "seller-smartstore" };
  }
  return { label: "메이크샵", className: "seller-makeshop" };
}

function workflowItemKey(invoice, item) {
  return `${invoice.orderGroupNo}::${item.sellpiaItemNo}`;
}

function workflowItemState(invoice, item) {
  return state.workflowQueues?.workflowState?.itemStateByKey?.get(workflowItemKey(invoice, item)) || null;
}

function workflowAwareShortageQty(itemState, item) {
  if (itemState && itemState.shortageQty !== null && itemState.shortageQty !== undefined) {
    return Number(itemState.shortageQty) || 0;
  }
  return shortageQty(item);
}

function workflowInvoiceState(invoice) {
  return state.workflowQueues?.workflowState?.invoiceStateByKey?.get(invoice.orderGroupNo) || null;
}

function workflowEventTime(row) {
  return new Date(row?.event_at || row?.created_at || row?.lastEventAt || 0).getTime() || 0;
}

function invoiceSequenceNo(invoice, fallbackIndex = 0) {
  return Number(invoice?.sortOrder || 0) || fallbackIndex + 1;
}

function invoiceSequenceLabel(invoice, fallbackIndex = 0) {
  return `${invoiceSequenceNo(invoice, fallbackIndex)}번`;
}

function systemInvoiceKey(invoice) {
  return String(invoice?.orderGroupNo || invoice?.invoiceNo || "").trim();
}

function invoiceSystemSequenceNo(invoice, fallbackIndex = 0) {
  const key = systemInvoiceKey(invoice);
  if (key) {
    const sequence = invoiceSystemSequenceMap().get(key);
    if (sequence) return sequence;
  }
  return fallbackIndex + 1;
}

function visibleInvoiceSequenceNo(invoice, fallbackIndex = 0) {
  return invoiceSystemSequenceNo(invoice, fallbackIndex);
}

function visibleInvoiceSequenceLabel(invoice, fallbackIndex = 0) {
  return `${visibleInvoiceSequenceNo(invoice, fallbackIndex)}번`;
}

function invoiceGroupSlotLabel(invoice, fallbackIndex = 0) {
  const sequence = visibleInvoiceSequenceNo(invoice, fallbackIndex);
  if (!sequence) return "-";
  const groupNo = Math.floor((sequence - 1) / JO_SIZE) + 1;
  const slotNo = ((sequence - 1) % JO_SIZE) + 1;
  return `${groupNo}조-${slotNo}번`;
}

function invoiceSequenceWithGroupLabel(invoice, fallbackIndex = 0) {
  return `${visibleInvoiceSequenceLabel(invoice, fallbackIndex)} · ${invoiceGroupSlotLabel(invoice, fallbackIndex)}`;
}

function itemSequenceNo(item, fallbackIndex = 0) {
  void item;
  return fallbackIndex + 1;
}

function formatAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("ko-KR") : "-";
}

function parseAmountNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(/[^0-9.-]/g, "");
  if (!/\d/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function getInvoiceTotalAmount(invoice) {
  const candidates = [
    invoice?.orderTotalAmount,
    invoice?.order_amount,
    invoice?.order_price,
    invoice?.total_amount,
    invoice?.total_price,
    invoice?.pay_amount,
    invoice?.settle_price,
    invoice?.o_total_price,
    invoice?.order_total,
    invoice?.raw?.sellpia_order_total_amount,
    invoice?.raw?.order_total_amount,
    invoice?.raw?.order_amount,
    invoice?.raw?.order_price,
    invoice?.raw?.total_amount,
    invoice?.raw?.total_price,
    invoice?.raw?.pay_amount,
    invoice?.raw?.settle_price,
    invoice?.raw?.o_total_price,
    invoice?.raw?.order_total,
  ];
  for (const value of candidates) {
    const amount = parseAmountNumber(value);
    if (amount !== null) return amount;
  }
  return null;
}

function renderInspectionTotalAmountBadge(invoice) {
  const totalAmount = getInvoiceTotalAmount(invoice);
  if (totalAmount === null) return "";
  return `<span class="invoice-badge" aria-label="총 주문금액">총금액 ${escapeHtml(formatAmount(totalAmount))}원</span>
    ${totalAmount >= 20000 ? '<span class="workflow-row-badge warn">사은품확인!</span>' : ""}`;
}

function invoiceTotalQuantity(invoice) {
  return (invoice?.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

function renderInspectionItemHeader(includeLabelNo = false, totalQty = null) {
  const totalQtyLabel = Number.isFinite(totalQty) ? ` (총 ${totalQty.toLocaleString("ko-KR")}개)` : "";
  return `<div class="workflow-item-row workflow-item-header">
    <span>상품순서번호</span>
    ${includeLabelNo ? "<span>라벨번호</span>" : ""}
    <span>사진</span>
    <span>옵션명</span>
    <span>수량${totalQtyLabel}</span>
    <span>상품명</span>
    <span>금액</span>
    <span>자사코드</span>
    <span>셀피아코드</span>
    <span>부족수량</span>
    <span>셀피아 주문메모</span>
    <span>상품 확인메모</span>
    <span>상태</span>
  </div>`;
}

function inspectionLabelNumberMap(selectedInvoice) {
  if (!selectedInvoice || !invoiceHasLabelTarget(selectedInvoice)) return new Map();
  const selectedKey = selectedInvoice.orderGroupNo || selectedInvoice.invoiceNo;
  const map = new Map();
  const weekdaySeq = {};
  labelSourceInvoices(new Map()).forEach((invoice) => {
    (labelItemsForInvoice(invoice, new Map()) || []).forEach((item) => {
      const target = getLabelTargetResult({ privateCode: item.ownCode || "" }, null);
      const optionName = normalizeLabelOptionName(item.optionName || "");
      if (!target.ok || !optionName) return;
      const qty = Math.max(1, parseInt(String(item.quantity || 1).replace(/,/g, ""), 10) || 1);
      const weekday = getLabelWeekday(labelReceivedAtForItem(invoice, item));
      const numbers = [];
      for (let index = 0; index < qty; index += 1) {
        weekdaySeq[weekday] = (weekdaySeq[weekday] || 0) + 1;
        numbers.push(`${weekday}${weekdaySeq[weekday]}`);
      }
      if ((invoice.orderGroupNo || invoice.invoiceNo) !== selectedKey) return;
      map.set(itemSlotKey(invoice, item), numbers.join(", "));
    });
  });
  return map;
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
  const invoiceState = workflowInvoiceState(invoice);
  if (invoiceState?.shortageInvoiceRepicked && !invoiceState?.inspected && !invoiceState?.cancelled) return true;
  return (invoice.items || []).some((item) => {
    const itemState = workflowItemState(invoice, item);
    return (itemHasOpenWorkflowShortage(invoice, item) || itemState?.shortageRepicked) && !itemState?.inspected && !itemState?.cancelled;
  });
}

function shortageLabelSourceInvoices() {
  return sortInspectionInvoices(
    mergeInvoicesUnique(
      state.workflowQueues?.viewModel?.invoices || [],
      state.viewModel?.invoices || [],
      state.workflowQueues?.inspectionInvoices || [],
    ).filter(invoiceHasRepickedShortage),
  );
}

function compactReceiptDateLabel(value) {
  const key = String(value || "").slice(0, 10);
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[2]}${match[3]}`;
  return key.replace(/\D/g, "").slice(-4) || "날짜없음";
}

function shortageInvoiceDisplayLabel(invoice) {
  const targetKey = systemInvoiceKey(invoice);
  if (!targetKey) return "미송";
  const counters = {};
  for (const row of shortageLabelSourceInvoices()) {
    const key = systemInvoiceKey(row);
    if (!key) continue;
    const receiptDate = String(row.receiptDate || "").slice(0, 10) || "날짜없음";
    counters[receiptDate] = (counters[receiptDate] || 0) + 1;
    if (key === targetKey) return `${compactReceiptDateLabel(receiptDate)}미송${counters[receiptDate]}`;
  }
  const fallbackDate = String(invoice?.receiptDate || "").slice(0, 10) || "날짜없음";
  return `${compactReceiptDateLabel(fallbackDate)}미송`;
}

function invoicePrimaryWorkflowLabel(invoice, fallbackIndex = 0) {
  if (!invoiceHasRepickedShortage(invoice)) return visibleInvoiceSequenceLabel(invoice, fallbackIndex);
  const shortageLabel = shortageInvoiceDisplayLabel(invoice);
  const receiptDate = String(invoice?.receiptDate || "").slice(0, 10);
  if (receiptDate && receiptDate === state.selectedDate) return `${visibleInvoiceSequenceLabel(invoice, fallbackIndex)} / ${shortageLabel}`;
  return shortageLabel;
}

function invoiceSecondaryWorkflowLabel(invoice, fallbackIndex = 0) {
  return invoiceHasRepickedShortage(invoice) ? invoice.invoiceNo || "" : invoiceGroupSlotLabel(invoice, fallbackIndex);
}

function invoiceMatchesInspectionFilter(invoice) {
  const invoiceState = workflowInvoiceState(invoice);
  if (state.inspectionFilter === "normal") return !invoiceHasRepickedShortage(invoice);
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

function ensureInspectionFilterButtons() {
  const bar = els.inspectionFilterBar;
  if (!bar) return;
  const shortageButton = bar.querySelector("[data-inspection-filter='shortage']");
  if (shortageButton) shortageButton.textContent = "미송피킹";
  if (bar.querySelector("[data-inspection-filter='normal']")) return;
  const button = document.createElement("button");
  button.className = "filter-chip";
  button.dataset.inspectionFilter = "normal";
  button.type = "button";
  button.textContent = "일반검품";
  bar.insertBefore(button, shortageButton || bar.querySelector("[data-inspection-filter='hold']") || null);
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

function isInspectionVisibleBaseInvoice(invoice) {
  const invoiceState = workflowInvoiceState(invoice);
  return !invoiceState?.cancelled;
}

function inspectionSourceInvoices() {
  const pickingReadyInvoices = (state.viewModel?.invoices || []).filter(invoiceReadyFromPicking);
  const shortageInvoices = mergeInvoicesUnique(state.workflowQueues?.viewModel?.invoices || [], state.viewModel?.invoices || []).filter(invoiceHasRepickedShortage);
  const latestScrapeInvoices = state.workflowQueues?.viewModel?.invoices || [];
  return sortInspectionInvoices(
    mergeInvoicesUnique(
      latestScrapeInvoices,
      pickingReadyInvoices,
      shortageInvoices,
      state.workflowQueues?.inspectionInvoices || [],
      state.workflowQueues?.inspectionCompletedInvoices || [],
    ).filter(isInspectionVisibleBaseInvoice),
  );
}

function workflowSummary() {
  const queues = state.workflowQueues;
  const inspectionInvoices = inspectionSourceInvoices();
  const pendingInspectionInvoices = inspectionInvoices.filter((invoice) => !workflowInvoiceState(invoice)?.inspected);
  const repickedPendingInvoices = pendingInspectionInvoices.filter(invoiceHasRepickedShortage);
  const holdInvoices = inspectionInvoices.filter((invoice) => workflowInvoiceState(invoice)?.hold || invoiceStats(invoice).hold > 0);
  const goldInspectionInvoices = inspectionInvoices.filter(invoiceHasGold);
  const goldInspectionItems = goldInspectionInvoices.flatMap((invoice) => invoice.items || []).filter(isGoldItem);
  if (!queues) {
    return {
      ready: false,
      status: state.workflowQueueError ? "오류" : "대기",
      shortageItems: 0,
      inspectionInvoices: pendingInspectionInvoices.length,
      repickedInvoices: repickedPendingInvoices.length,
      completedInvoices: 0,
      repickedItems: 0,
      holdInvoices: holdInvoices.length,
      goldInvoices: goldInspectionInvoices.length,
      goldItems: goldInspectionItems.length,
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
    inspectionInvoices: pendingInspectionInvoices.length,
    repickedInvoices: repickedPendingInvoices.length,
    completedInvoices: queues.inspectionCompletedInvoices.length,
    repickedItems,
    holdInvoices: holdInvoices.length,
    goldInvoices: goldInspectionInvoices.length,
    goldItems: goldInspectionItems.length,
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

function dashboardItemBuckets(items = []) {
  return items.reduce(
    (acc, item) => {
      if (isHold(item)) acc.hold += 1;
      else if (shortageQty(item) > 0) acc.shortage += 1;
      else if (isPicked(item)) acc.picked += 1;
      else acc.todo += 1;
      return acc;
    },
    { picked: 0, shortage: 0, hold: 0, todo: 0 },
  );
}

function dashboardDonutSegments(segments = []) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, Number(segment.value) || 0), 0);
  if (!total) return { total: 0, style: "#e5eaf2 0 100%", segments };
  let cursor = 0;
  const parts = segments
    .filter((segment) => Number(segment.value) > 0)
    .map((segment) => {
      const start = cursor;
      cursor += (Number(segment.value) / total) * 100;
      return `${segment.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });
  return { total, style: parts.join(", "), segments };
}

function dashboardMonthKey(dateValue = state.selectedDate) {
  if (state.dashboardMonthKey) return state.dashboardMonthKey;
  const key = dateKey(dateValue) || todayDateString();
  return key.slice(0, 7);
}

function setDashboardMonthFromDate(dateValue = state.selectedDate) {
  const key = dateKey(dateValue) || todayDateString();
  state.dashboardMonthKey = key.slice(0, 7);
}

function shiftDashboardMonth(delta) {
  const key = dashboardMonthKey();
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  state.dashboardMonthKey = local.toISOString().slice(0, 7);
  renderDashboard();
}

function dashboardMonthDays(monthKey = dashboardMonthKey()) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const cells = [];
  const leading = first.getDay();
  for (let index = 0; index < leading; index += 1) cells.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, month - 1, day);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    cells.push(local.toISOString().slice(0, 10));
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function dashboardSourceInvoices() {
  return mergeInvoicesUnique(
    state.viewModel?.invoices || [],
    state.workflowQueues?.viewModel?.invoices || [],
    state.workflowQueues?.inspectionInvoices || [],
    state.workflowQueues?.inspectionCompletedInvoices || [],
  );
}

function createDashboardDayStats(date) {
  return {
    date,
    invoices: 0,
    items: 0,
    pickedInvoices: 0,
    shortageItems: 0,
    holdInvoices: 0,
    inspectionInvoices: 0,
    completedInvoices: 0,
    repickedInvoices: 0,
    goldInvoices: 0,
  };
}

function dashboardDayStatsMap(invoices = dashboardSourceInvoices()) {
  const map = new Map();
  const ensure = (date) => {
    if (!map.has(date)) map.set(date, createDashboardDayStats(date));
    return map.get(date);
  };

  invoices.forEach((invoice) => {
    const date = dateKey(invoice.receiptDate);
    if (!date) return;
    const stats = ensure(date);
    const itemRows = invoice.items || [];
    const invoiceState = workflowInvoiceState(invoice);
    const invoiceStatsRow = invoiceStats(invoice);
    stats.invoices += 1;
    stats.items += itemRows.length;
    if (invoiceStatsRow.done || invoiceState?.picked) stats.pickedInvoices += 1;
    if (invoiceStatsRow.hold > 0 || invoiceState?.hold) stats.holdInvoices += 1;
    if (invoiceHasGold(invoice)) stats.goldInvoices += 1;
    if (invoiceState?.inspected) stats.completedInvoices += 1;
    if (!invoiceState?.inspected && isInspectionVisibleBaseInvoice(invoice)) stats.inspectionInvoices += 1;
    if (invoiceHasRepickedShortage(invoice)) stats.repickedInvoices += 1;
    stats.shortageItems += itemRows.filter((item) => {
      const itemState = workflowItemState(invoice, item);
      return workflowAwareShortageQty(itemState, item) > 0;
    }).length;
  });

  return map;
}

function dashboardStatusChips(stats, { includeTotal = false } = {}) {
  const rows = [
    includeTotal ? { key: "total", label: "송장", value: stats.invoices, unit: "건" } : null,
    { key: "shortage", label: "미송", value: stats.shortageItems, unit: "개" },
    { key: "inspection", label: "검품", value: stats.inspectionInvoices, unit: "건" },
    { key: "completed", label: "완료", value: stats.completedInvoices, unit: "건" },
    { key: "hold", label: "보류", value: stats.holdInvoices, unit: "건" },
    { key: "repicked", label: "미송완료", value: stats.repickedInvoices, unit: "건" },
    { key: "gold", label: "골드", value: stats.goldInvoices, unit: "건" },
  ].filter(Boolean);

  return rows.filter((row) => Number(row.value) > 0);
}

function renderDashboardStatusChips(stats, options = {}) {
  const chips = dashboardStatusChips(stats, options);
  if (!chips.length) return "";
  return chips
    .map(
      (chip) =>
        `<span class="dashboard-status-chip ${escapeHtml(chip.key)}">${escapeHtml(chip.label)} <strong>${chip.value}</strong>${escapeHtml(chip.unit || "")}</span>`,
    )
    .join("");
}

function renderMetrics() {
  const invoices = state.viewModel?.invoices || [];
  const items = invoices.flatMap((invoice) => invoice.items || []);
  els.metricOrders.textContent = String(invoices.length);
  els.metricPicked.textContent = String(items.filter(isPicked).length);
  els.metricShortage.textContent = String(items.filter((item) => shortageQty(item) > 0).length);
  els.metricHold.textContent = String(items.filter(isHold).length);
  els.metricWrite.textContent = allowWrites ? "ON" : "OFF";
  const workflow = workflowSummary();
  if (!allowWorkflowEvents) els.metricEvents.textContent = "OFF";
  else if (workflow.ready || state.workflowQueueError) els.metricEvents.textContent = workflow.status;
  else if (!state.workflowEventsChecked) els.metricEvents.textContent = "대기";
  else els.metricEvents.textContent = state.workflowEventsReady ? "ON" : "미준비";
}

function renderDashboard() {
  if (!els.dashboardSummary) return;
  const workflow = workflowSummary();
  const monthKey = dashboardMonthKey();
  const monthDays = dashboardMonthDays(monthKey);
  const dayStats = dashboardDayStatsMap();
  const selectedStats = dayStats.get(state.selectedDate) || createDashboardDayStats(state.selectedDate);
  const monthTotals = [...dayStats.values()]
    .filter((stats) => String(stats.date || "").startsWith(monthKey))
    .reduce((acc, stats) => {
      Object.keys(acc).forEach((key) => {
        if (key !== "date") acc[key] += Number(stats[key] || 0);
      });
      return acc;
    }, createDashboardDayStats(monthKey));
  const selectedChips = renderDashboardStatusChips(selectedStats, { includeTotal: true });
  const monthChips = renderDashboardStatusChips(monthTotals, { includeTotal: true });

  els.dashboardSummary.innerHTML = `<div class="dashboard-calendar-card">
      <div class="dashboard-calendar-head">
        <div>
          <h3>${escapeHtml(monthKey.replace("-", "년 "))}월 작업 캘린더</h3>
          <p>접수일 기준으로 묶고, 값이 있는 상태만 표시합니다.</p>
        </div>
        <div class="dashboard-calendar-tools">
          <button class="btn mini" data-dashboard-month="-1" type="button">이전달</button>
          <button class="btn mini" data-dashboard-month="today" type="button">이번달</button>
          <button class="btn mini" data-dashboard-month="1" type="button">다음달</button>
          <div class="dashboard-month-total">${monthChips || '<span class="dashboard-empty-inline">표시할 상태 없음</span>'}</div>
        </div>
      </div>
      <div class="dashboard-calendar-weekdays">
        ${["일", "월", "화", "수", "목", "금", "토"].map((day) => `<span>${day}</span>`).join("")}
      </div>
      <div class="dashboard-calendar-grid">
        ${monthDays
          .map((day) => {
            if (!day) return '<div class="dashboard-calendar-day empty"></div>';
            const stats = dayStats.get(day) || createDashboardDayStats(day);
            const chips = renderDashboardStatusChips(stats, { includeTotal: true });
            return `<button class="dashboard-calendar-day ${day === state.selectedDate ? "selected" : ""} ${chips ? "has-data" : ""}" data-dashboard-date="${escapeHtml(day)}" type="button">
              <div class="dashboard-day-top">
                <strong>${Number(day.slice(8, 10))}</strong>
                ${day === todayDateString() ? "<em>오늘</em>" : ""}
              </div>
              <div class="dashboard-day-chips">${chips}</div>
            </button>`;
          })
          .join("")}
      </div>
    </div>
    <div class="dashboard-selected-card">
      <h3>선택일 요약</h3>
      <strong class="dashboard-selected-date">${escapeHtml(state.selectedDate)}</strong>
      <div class="dashboard-selected-chips">${selectedChips || '<span class="dashboard-empty-inline">표시할 상태 없음</span>'}</div>
      <div class="dashboard-actions">
        <button class="btn" data-dashboard-tab="shortage" type="button">미송피킹</button>
        <button class="btn" data-dashboard-tab="inspection" type="button">검품대기</button>
        <button class="btn" data-dashboard-tab="completed" type="button">작업완료</button>
      </div>
    </div>
    <div class="workflow-dashboard">
      <div class="workflow-flow-head">
        <strong>미송 / 입고 / 검품 연결</strong>
        <span class="${workflow.ready ? "ok" : state.workflowQueueError ? "bad" : "wait"}">${escapeHtml(workflow.status)}</span>
      </div>
      ${
        state.workflowQueueError
          ? `<div class="workflow-error">${escapeHtml(state.workflowQueueError)}</div>`
          : `<div class="dashboard-workflow-chips">
              ${[
                ["shortage", "미송피킹 대기", workflow.shortageItems, "상품"],
                ["inspection", "검품 대기", workflow.inspectionInvoices, "송장"],
                ["completed", "작업완료", workflow.completedInvoices, "송장"],
                ["repicked", "미송완료 미검품", workflow.repickedInvoices, "송장"],
                ["hold", "보류", workflow.holdInvoices, "송장"],
                ["gold", "골드 송장", workflow.goldInvoices, "건"],
                ["bad", "원본 연결 누락", workflow.missingInvoices, "송장"],
              ]
                .filter((row) => Number(row[2]) > 0)
                .map(
                  ([key, label, value, unit]) =>
                    `<span class="dashboard-status-chip ${escapeHtml(key)}">${escapeHtml(label)} <strong>${value}</strong>${escapeHtml(unit)}</span>`,
                )
                .join("") || '<span class="dashboard-empty-inline">표시할 상태 없음</span>'}
            </div>
            <div class="dashboard-actions">
              <button class="btn" data-dashboard-tab="shortage" type="button">미송피킹 보기</button>
              <button class="btn" data-dashboard-tab="inspection" type="button">검품대기 보기</button>
              <button class="btn" data-dashboard-tab="completed" type="button">작업완료 보기</button>
            </div>
            <p>미송피킹/검품은 선택 날짜가 아니라 workflow event 상태 기준으로 집계됩니다.</p>`
      }
    </div>`;
}

function orderListModalRows() {
  const search = state.orderListModal.search.trim().toLowerCase();
  const filter = state.orderListModal.filter;
  return sortedAllInvoices().flatMap((invoice, invoiceIndex) => {
    const invoiceItemCount = (invoice.items || []).length;
    const invoiceQty = (invoice.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    return invoiceItemsInSellpiaRowOrder(invoice).flatMap((item) => {
      const done = isPicked(item);
      const shortage = shortageQty(item);
      if (filter === "unpick" && done) return [];
      if (filter === "done" && !done) return [];
      if (filter === "short" && shortage <= 0) return [];
      const haystack = [
        invoiceSequenceWithGroupLabel(invoice, invoiceIndex),
        invoice.invoiceNo,
        invoice.orderGroupNo,
        invoice.displayName,
        invoice.csDisplayName,
        invoice.recipientName,
        invoice.buyerName,
        item.ownCode,
        item.sellpiaProductCode,
        item.productName,
        item.optionName,
      ]
        .join(" ")
        .toLowerCase();
      if (search && !haystack.includes(search)) return [];
      return [
        {
          invoice,
          item,
          invoiceIndex,
          done,
          shortage,
          invoiceItemCount,
          invoiceQty,
        },
      ];
    });
  });
}

function ensureOrderListModal() {
  let modal = document.getElementById("order-list-modal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "order-list-modal";
  modal.className = "order-list-modal-overlay";
  modal.hidden = true;
  modal.innerHTML = `<div class="order-list-modal" role="dialog" aria-modal="true" aria-label="주문리스트">
    <div class="order-list-modal-head">
      <h3>주문리스트</h3>
      <div class="order-list-modal-tools">
        <input id="order-list-modal-search" type="search" placeholder="주문자/수취인/자사코드/송장/출력">
        <button type="button" class="order-list-modal-close" data-order-list-action="close">×</button>
      </div>
    </div>
    <div class="order-list-modal-filters" id="order-list-modal-filters">
      <button type="button" data-order-list-filter="all">전체</button>
      <button type="button" data-order-list-filter="unpick">미피킹</button>
      <button type="button" data-order-list-filter="done">피킹완료</button>
      <button type="button" data-order-list-filter="short">미송있음</button>
    </div>
    <div class="order-list-modal-table-wrap">
      <table class="order-list-modal-table">
        <thead>
          <tr>
            <th>출력</th>
            <th>주문자</th>
            <th>자사코드</th>
            <th>상품명</th>
            <th>수량</th>
            <th>서랍</th>
            <th>부족</th>
            <th>피킹</th>
          </tr>
        </thead>
        <tbody id="order-list-modal-body"></tbody>
      </table>
    </div>
    <div class="order-list-modal-foot" id="order-list-modal-foot">0건</div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target.id === "order-list-modal" || event.target.closest("[data-order-list-action='close']")) {
      closeOrderListModal();
      return;
    }
    const filterButton = event.target.closest("[data-order-list-filter]");
    if (!filterButton) return;
    state.orderListModal.filter = filterButton.dataset.orderListFilter || "all";
    renderOrderListModal();
  });
  modal.querySelector("#order-list-modal-search")?.addEventListener("input", (event) => {
    state.orderListModal.search = event.target.value;
    renderOrderListModal();
  });
  return modal;
}

function renderOrderListModal() {
  const modal = ensureOrderListModal();
  modal.hidden = !state.orderListModal.open;
  if (!state.orderListModal.open) return;
  const searchInput = modal.querySelector("#order-list-modal-search");
  if (searchInput && searchInput.value !== state.orderListModal.search) searchInput.value = state.orderListModal.search;
  modal.querySelectorAll("[data-order-list-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.orderListFilter === state.orderListModal.filter);
  });
  const body = modal.querySelector("#order-list-modal-body");
  const foot = modal.querySelector("#order-list-modal-foot");
  const rows = orderListModalRows();
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="8" class="order-list-modal-empty">데이터 없음</td></tr>';
    if (foot) foot.textContent = "0건";
    return;
  }
  body.innerHTML = rows
    .map(({ invoice, item, invoiceIndex, done, shortage, invoiceItemCount, invoiceQty }) => {
      const rowClass = done ? "done" : shortage > 0 ? "shortage" : "";
      const name = itemName(item);
      const option = itemOption(item);
      return `<tr class="${rowClass}">
        <td><strong>${escapeHtml(invoiceSequenceWithGroupLabel(invoice, invoiceIndex))}</strong><small>${escapeHtml(invoice.invoiceNo || "-")}</small></td>
        <td>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}<div class="order-list-modal-badges"><span>${invoiceItemCount}종</span><span>${invoiceQty}개</span>${invoiceHasGold(invoice) ? "<span>골드</span>" : ""}</div></td>
        <td class="code">${escapeHtml(item.ownCode || item.sellpiaProductCode || "-")}</td>
        <td class="name">${escapeHtml(option ? `${name} / ${option}` : name)}</td>
        <td class="center">${Number(item.quantity) || 1}</td>
        <td class="center accent">${escapeHtml(invoice.sellpiaMemo1 || "-")}</td>
        <td class="center ${shortage > 0 ? "danger" : ""}">${shortage || "-"}</td>
        <td class="center">${done ? "✓" : "-"}</td>
      </tr>`;
    })
    .join("");
  if (foot) foot.textContent = `${rows.length}건`;
}

function openOrderListModal() {
  state.orderListModal.open = true;
  renderOrderListModal();
  document.getElementById("order-list-modal-search")?.focus();
}

function closeOrderListModal() {
  state.orderListModal.open = false;
  renderOrderListModal();
}

function renderTray() {
  if (!els.trayBoard) return;
  const invoices = currentTrayInvoices();
  const rows = invoices.flatMap((invoice, invoiceIndex) =>
    invoiceItemsInSellpiaRowOrder(invoice).map((item) => ({ invoice, item, invoiceIndex })),
  );
  const done = rows.filter(({ item }) => isPicked(item)).length;
  const groupLabel =
    state.searchText || state.filterMode !== "all"
      ? filterLabel(state.filterMode)
      : state.groupInfos[state.currentGroup]?.label || `${state.currentGroup + 1}조`;

  els.bottomTray?.classList.toggle("open", state.trayOpen);
  els.bottomTray?.classList.toggle("expanded", state.trayExpanded);
  if (els.bottomTray) els.bottomTray.scrollTop = 0;
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
        ? `${invoiceSequenceWithGroupLabel(firstInvoice)} · ${firstInvoice.displayName || firstInvoice.csDisplayName || ""}`
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
                <span class="tray-item-check" data-tray-toggle>${isPicked(item) ? "✓" : ""}</span>
                <span class="tray-item-main">
                  <span class="tray-item-seq">${escapeHtml(invoiceSequenceWithGroupLabel(invoice))}</span>
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
      const bulkTargets = groupBulkTargets(group);
      const bulkDone = bulkTargets.length > 0 && bulkTargets.every(({ item }) => isPicked(item));
      return `<div class="group-row">
        <button class="${classes}" data-group="${index}" type="button">
          <span>${escapeHtml(info.label)}</span>
          <span>${stats.done}/${stats.total}${stats.shortage ? ` · 미송 ${stats.shortage}` : ""}</span>
        </button>
        <button class="group-bulk-btn ${bulkDone ? "done" : ""}" data-bulk-group="${index}" type="button" title="${bulkDone ? "체크 취소" : "일괄 체크"}" ${bulkTargets.length ? "" : "disabled"}>${bulkDone ? "↩" : "☑"}</button>
      </div>`;
    })
    .join("");
}

function renderFilters() {
  els.filterBar.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filterMode);
  });
}

function sideShortcutConfig() {
  if (state.activeTab === "picking") {
    return {
      title: "상태 바로가기",
      items: [
        ["filter", "all", "전체"],
        ["filter", "todo", "미완료"],
        ["filter", "shortage", "미송"],
        ["filter", "nodrawer", "서랍없음"],
        ["filter", "gold", "골드"],
        ["filter", "hold", "보류"],
        ["filter", "done", "완료"],
      ],
    };
  }
  if (state.activeTab === "shortage") {
    return {
      title: "미송 보기",
      items: [
        ["shortage", "all", "전체"],
        ["shortage", "code", "자사코드별"],
        ["shortage", "drawer", "서랍입력"],
        ["shortage", "completed", "기존완료"],
      ],
    };
  }
  if (state.activeTab === "inspection") {
    return {
      title: "검품 보기",
      items: [
        ["inspection", "all", "전체"],
        ["inspection", "shortage", "미송포함"],
        ["inspection", "hold", "보류"],
        ["inspection", "gold", "골드"],
        ["inspection-hide", "toggle", state.inspectionHideCompleted ? "완료보기" : "완료제거"],
      ],
    };
  }
  if (state.activeTab === "cs") {
    return {
      title: "CS 보기",
      items: [],
    };
  }
  if (state.activeTab === "completed") {
    return {
      title: "완료 기준",
      items: [
        ["completed-date", "receipt", "접수일"],
        ["completed-date", "completed", "완료일"],
      ],
    };
  }
  return { title: "바로가기", items: [] };
}

function isSideShortcutActive(type, value) {
  if (type === "filter") return state.filterMode === value;
  if (type === "shortage") return state.shortageFilter === value;
  if (type === "inspection") return state.inspectionFilter === value;
  if (type === "inspection-hide") return state.inspectionHideCompleted;
  if (type === "completed-date") return state.completedDateMode === value;
  return false;
}

function renderSideShortcuts() {
  if (!els.sideShortcuts) return;
  const config = sideShortcutConfig();
  if (!config.items.length || state.sidebarCollapsed) {
    els.sideShortcuts.innerHTML = "";
    return;
  }
  els.sideShortcuts.innerHTML = `<div class="side-title">${escapeHtml(config.title)}</div>
    <div class="side-shortcut-grid">
      ${config.items
        .map(
          ([type, value, label]) =>
            `<button class="side-shortcut ${isSideShortcutActive(type, value) ? "active" : ""}" data-side-shortcut="${type}" data-side-value="${escapeHtml(value)}" type="button">${escapeHtml(label)}</button>`,
        )
        .join("")}
    </div>`;
}

function applySideShortcut(type, value) {
  if (type === "filter") {
    state.filterMode = value || "all";
    render();
    return;
  }
  if (type === "shortage") {
    state.shortageFilter = value || "all";
    state.selectedShortageKey = "";
    renderShortagePanels();
    renderSideShortcuts();
    return;
  }
  if (type === "inspection") {
    state.inspectionFilter = value || "all";
    state.selectedInspectionGroup = "";
    renderInspectionPanels();
    renderSideShortcuts();
    return;
  }
  if (type === "inspection-hide") {
    state.inspectionHideCompleted = !state.inspectionHideCompleted;
    state.selectedInspectionGroup = "";
    renderInspectionPanels();
    renderSideShortcuts();
    return;
  }
  if (type === "completed-date") {
    state.completedDateMode = value || "receipt";
    state.selectedCompletedGroup = "";
    renderCompletedPanels();
    renderSideShortcuts();
  }
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

function groupBulkTargets(group = []) {
  return group.flatMap((invoice) =>
    (invoice.items || [])
      .filter((item) => shortageQty(item) === 0 && !isHold(item))
      .map((item) => ({ invoice, item })),
  );
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

  if (isGoldGroupedPickingView(invoices)) {
    els.orderList.innerHTML = invoices.map((invoice, invoiceIndex) => renderGoldInvoiceCard(invoice, invoiceIndex)).join("");
    return;
  }

  els.orderList.innerHTML = rows.map(({ invoice, item, invoiceIndex, itemIndex }) => renderPickingRow(invoice, item, invoiceIndex, itemIndex)).join("");
}

function isGoldGroupedPickingView(invoices = currentVisibleInvoices()) {
  if (!invoices.some(invoiceHasGold)) return false;
  return state.filterMode === "gold" || state.groupInfos[state.currentGroup]?.kind === "gold";
}

function sortedInvoiceItemsForPicking(invoice) {
  return invoiceItemsInSellpiaRowOrder(invoice);
}

function renderGoldInvoiceCard(invoice, invoiceIndex = 0) {
  const items = sortedInvoiceItemsForPicking(invoice);
  const picked = items.filter(isPicked).length;
  const shortage = items.filter((item) => shortageQty(item) > 0).length;
  const qty = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const seller = sellerBadgeMeta(invoice.seller);
  return `<article class="gold-invoice-card">
    <div class="gold-invoice-head">
      <div>
        <strong>${escapeHtml(invoiceSequenceWithGroupLabel(invoice, invoiceIndex))}</strong>
        <span>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")} · ${items.length}종 ${qty}개</span>
      </div>
      <div class="gold-invoice-badges">
        ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        <span class="gold-badge">골드송장</span>
        ${shortage ? `<span class="workflow-row-badge danger">미송 ${shortage}</span>` : ""}
        <span class="workflow-row-badge done">${picked}/${items.length}</span>
      </div>
    </div>
    <div class="gold-item-list">
      ${items.map((item, itemIndex) => renderGoldInvoiceItem(invoice, item, invoiceIndex, itemIndex)).join("")}
    </div>
  </article>`;
}

function renderGoldInvoiceItem(invoice, item, invoiceIndex = 0, itemIndex = 0) {
  const key = itemSlotKey(invoice, item);
  const checked = isPicked(item);
  const shortage = shortageQty(item);
  const imageUrl = productImageUrl(item.sellpiaProductCode);
  const option = cleanOptionName(item.optionName, item.ownCode) || item.productName || "-";
  const classes = [
    "gold-item-row",
    checked ? "is-picked" : "",
    shortage ? "has-shortage" : "",
    isHold(item) ? "has-hold" : "",
    isGoldItem(item) ? "is-gold" : "",
    key === state.currentTrayKey ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<div class="${classes}" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}" data-slot-key="${escapeHtml(key)}">
    <button class="pick-check ${checked ? "checked" : ""}" data-action="toggle" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">${checked ? "✓" : ""}</button>
    <div class="gold-item-photo">${imageUrl ? `<img src="${imageUrl}" ${photoImgAttrs(imageUrl, photoTitleForItem(item))} alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : "사진"}</div>
    <div class="gold-item-main">
      <span class="workflow-row-order">상품순서 ${itemOrderNo(item, itemIndex)}번</span>
      <strong class="${optionClass(item, "option")}">${escapeHtml(option)}</strong>
      <small>${escapeHtml(item.ownCode || "-")} · ${escapeHtml(item.productName || "")}</small>
    </div>
    <span class="gold-item-qty">${Number(item.quantity) || 1}개</span>
    <div class="shortage-control gold-shortage-control">
      ${shortageQtyInput(invoice, item, shortage, "compact")}
    </div>
    <textarea class="drawer-input gold-drawer-input" inputmode="none" data-action="drawer" data-order-group="${escapeHtml(invoice.orderGroupNo)}" rows="1" placeholder="서랍" readonly>${escapeHtml(invoiceDrawerValue(invoice))}</textarea>
  </div>`;
}

function renderWorkflowEmpty(target, message) {
  if (target) target.innerHTML = `<div class="workflow-empty">${escapeHtml(message)}</div>`;
}

function shortageFilterLabel(filter = state.shortageFilter) {
  return (
    {
      all: "전체",
      code: "자사코드별",
      drawer: "서랍입력",
      completed: "기존완료",
    }[filter] || "전체"
  );
}

function repickedShortageRows() {
  return (state.workflowQueues?.viewModel?.invoices || []).flatMap((invoice) => {
    const invoiceState = workflowInvoiceState(invoice);
    if (invoiceState?.inspected || invoiceState?.cancelled) return [];
    return (invoice.items || [])
      .map((item) => ({
        invoice,
        item,
        state: workflowItemState(invoice, item),
        completed: true,
      }))
      .filter((row) => row.state?.shortageRepicked && !row.state?.inspected && !row.state?.cancelled);
  });
}

function resetReceivingLabel(error = "") {
  state.receivingLabel.fileName = "";
  state.receivingLabel.productMap = new Map();
  state.receivingLabel.ownCodeMap = new Map();
  state.receivingLabel.rowCount = 0;
  state.receivingLabel.totalQty = 0;
  state.receivingLabel.error = error;
}

function addReceivingEntry(entry) {
  if (!entry?.productCode) return;
  const productKey = receivingProductCodeKey(entry.productCode);
  if (!productKey) return;
  const productMap = state.receivingLabel.productMap;
  const current = productMap.get(productKey) || {
    productCode: entry.productCode,
    optionName: entry.optionName || "",
    ownCode: entry.ownCode || "",
    qty: 0,
    rows: 0,
  };
  current.qty += Number(entry.qty || 0);
  current.rows += 1;
  if (!current.optionName && entry.optionName) current.optionName = entry.optionName;
  if (!current.ownCode && entry.ownCode) current.ownCode = entry.ownCode;
  productMap.set(productKey, current);

  for (const ownKey of receivingOwnCodeKeys(entry.ownCode)) {
    if (!state.receivingLabel.ownCodeMap.has(ownKey)) state.receivingLabel.ownCodeMap.set(ownKey, current);
  }
}

function receivingColumnIndex(headers, names) {
  const normalized = headers.map((value) => String(value || "").replace(/\s+/g, "").trim());
  return normalized.findIndex((header) => names.some((name) => header === name));
}

function parseReceivingRows(sheetRows = []) {
  const headerIndex = sheetRows.findIndex((row) => {
    const text = (row || []).map((cell) => String(cell || "").replace(/\s+/g, "").trim());
    return text.includes("상품코드") && text.includes("입고");
  });
  if (headerIndex < 0) throw new Error("라벨지에서 상품코드/입고 헤더를 찾지 못했습니다.");

  const headers = sheetRows[headerIndex] || [];
  const productIndex = receivingColumnIndex(headers, ["상품코드", "상품CODE", "상품코드"]);
  const optionIndex = receivingColumnIndex(headers, ["옵션명", "옵션"]);
  const qtyIndex = receivingColumnIndex(headers, ["입고", "입고수량", "수량"]);
  const ownIndex = receivingColumnIndex(headers, ["자사코드", "자사상품코드"]);
  if (productIndex < 0 || qtyIndex < 0) throw new Error("라벨지 필수 컬럼이 부족합니다.");

  return sheetRows.slice(headerIndex + 1).flatMap((row) => {
    const productCode = String(row?.[productIndex] || "").trim();
    if (!productCode) return [];
    return [
      {
        productCode,
        optionName: String(row?.[optionIndex] || "").trim(),
        qty: numberFromCell(row?.[qtyIndex]),
        ownCode: String(row?.[ownIndex] || "").trim(),
      },
    ];
  });
}

async function loadReceivingLabelFile(file) {
  if (!file) return;
  if (!window.XLSX) {
    resetReceivingLabel("XLSX 로드 실패");
    toast("XLSX 라이브러리 로드 실패");
    renderShortagePanels();
    return;
  }
  try {
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(new Uint8Array(buffer), { type: "array" });
    const firstSheetName = workbook.SheetNames?.[0];
    if (!firstSheetName) throw new Error("시트를 찾지 못했습니다.");
    const sheetRows = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, raw: false, defval: "" });
    const entries = parseReceivingRows(sheetRows);
    resetReceivingLabel();
    state.receivingLabel.fileName = file.name || "";
    for (const entry of entries) {
      addReceivingEntry(entry);
      state.receivingLabel.totalQty += Number(entry.qty || 0);
    }
    state.receivingLabel.rowCount = state.receivingLabel.productMap.size;
    toast(`입고 라벨 ${state.receivingLabel.rowCount}종 불러옴`);
  } catch (error) {
    resetReceivingLabel(error?.message || "라벨지 읽기 실패");
    toast(`입고 라벨 읽기 실패: ${state.receivingLabel.error}`);
  }
  state.selectedShortageKey = "";
  renderShortagePanels();
  renderSideShortcuts();
}

function receivingLabelEntryForItem(item = {}) {
  const productKey = receivingProductCodeKey(item.sellpiaProductCode || item.raw?.p_code || item.raw?.sellpia_p_code);
  if (productKey && state.receivingLabel.productMap.has(productKey)) return state.receivingLabel.productMap.get(productKey);
  for (const ownKey of receivingOwnCodeKeys(item.ownCode || item.raw?.prod_code || item.raw?.p_dpcode)) {
    if (state.receivingLabel.ownCodeMap.has(ownKey)) return state.receivingLabel.ownCodeMap.get(ownKey);
  }
  return null;
}

function shortageRowReceivingEntry(row) {
  return receivingLabelEntryForItem(row?.item || {});
}

function shortageRowMatchesReceiving(row) {
  if (!state.receivingLabel.only) return true;
  return Boolean(shortageRowReceivingEntry(row));
}

function updateShortageReceivingStatus(openRows = []) {
  if (els.shortageReceivingOnly && els.shortageReceivingOnly.checked !== state.receivingLabel.only) {
    els.shortageReceivingOnly.checked = state.receivingLabel.only;
  }
  if (!els.shortageReceivingStatus) return;
  if (state.receivingLabel.error) {
    els.shortageReceivingStatus.textContent = state.receivingLabel.error;
    els.shortageReceivingStatus.classList.add("warn");
    return;
  }
  els.shortageReceivingStatus.classList.remove("warn");
  if (!state.receivingLabel.rowCount) {
    els.shortageReceivingStatus.textContent = "라벨 없음";
    return;
  }
  const matched = openRows.filter(shortageRowReceivingEntry).length;
  els.shortageReceivingStatus.textContent = `입고 ${state.receivingLabel.rowCount}종 · 미송 ${matched}건`;
}

function drawerMemoForShortageRow(row) {
  return String(row?.state?.drawerMemo || itemManagementMemo(row?.item) || invoiceDrawerValue(row?.invoice) || "").trim();
}

function shortageRowMatchesSearch(row) {
  const search = state.shortageSearchText.trim().toLowerCase();
  if (!search) return true;
  const invoice = row.invoice || {};
  const drawerMemo = drawerMemoForShortageRow(row);
  const sequenceNo = String(visibleInvoiceSequenceNo(invoice) || "");
  const shortageLabel = shortageInvoiceDisplayLabel(invoice);
  const text = [
    invoice.invoiceNo,
    invoice.orderGroupNo,
    invoice.displayName,
    invoice.csDisplayName,
    invoice.recipientName,
    invoice.buyerName,
    sequenceNo,
    visibleInvoiceSequenceLabel(invoice),
    shortageLabel,
    drawerMemo,
  ]
    .join(" ")
    .toLowerCase();
  const digits = onlyDigits(search);
  if (digits && search === digits) {
    return onlyDigits(invoice.invoiceNo).includes(digits) || sequenceNo === digits || onlyDigits(drawerMemo).includes(digits);
  }
  return text.includes(search);
}

function shortageRowsForCurrentFilter() {
  const openRows = state.workflowQueues?.shortageItems || [];
  let rows = openRows;
  if (state.shortageFilter === "completed") {
    rows = repickedShortageRows().sort((a, b) => workflowEventTime(b.state) - workflowEventTime(a.state));
  } else if (state.shortageFilter === "drawer") {
    rows = openRows.filter(drawerMemoForShortageRow);
  } else if (state.shortageFilter === "code") {
    rows = [...openRows].sort(
      (a, b) =>
        String(a.item.ownCode || "").localeCompare(String(b.item.ownCode || ""), "ko") ||
        String(a.item.optionName || "").localeCompare(String(b.item.optionName || ""), "ko") ||
        visibleInvoiceSequenceNo(a.invoice) - visibleInvoiceSequenceNo(b.invoice),
    );
  }
  return rows.filter(shortageRowMatchesReceiving).filter(shortageRowMatchesSearch);
}

function shortageRowOwnCode(row) {
  return String(row?.item?.ownCode || "").trim() || "자사코드 없음";
}

function shortageGroupStats(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const code = shortageRowOwnCode(row);
    if (!groups.has(code)) groups.set(code, { code, rows: [], qty: 0 });
    const group = groups.get(code);
    group.rows.push(row);
    group.qty += Number(row.state?.shortageQty || 0) || 1;
  }
  return [...groups.values()];
}

function renderShortageRow({ invoice, item, state: itemState, completed }) {
  const key = workflowItemKey(invoice, item);
  const orderNo = itemOrderNo(item, invoiceItemIndex(invoice, item));
  const receiptDate = String(invoice.receiptDate || "").slice(0, 10);
  const invoiceSeq = shortageInvoiceDisplayLabel(invoice);
  const receiving = receivingLabelEntryForItem(item);
  return `<button class="workflow-row ${key === state.selectedShortageKey ? "selected" : ""} ${completed ? "is-completed" : ""} ${receiving ? "has-receiving" : ""}" data-shortage-key="${escapeHtml(key)}" type="button">
    <span class="workflow-row-code">${escapeHtml(item.ownCode || "-")}</span>
    <span class="workflow-row-main">
      <strong>${escapeHtml(cleanOptionName(item.optionName, item.ownCode) || item.productName || "-")}</strong>
      <span class="workflow-row-order">상품순서 ${orderNo}번</span>
      <small>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")} · ${escapeHtml(invoiceSeq)}</small>
      ${receiptDate ? `<small class="workflow-row-receipt">접수 ${escapeHtml(receiptDate)}</small>` : ""}
      ${receiving ? `<small class="receiving-row-note">입고 ${escapeHtml(receiving.qty || "-")}개</small>` : ""}
    </span>
    <span class="workflow-row-badge ${completed ? "done" : "danger"}">${completed ? "기존완료" : `미송 ${Number(itemState?.shortageQty || 0) || 1}`}</span>
  </button>`;
}

function renderShortageRows(rows) {
  if (state.shortageFilter !== "code") return rows.map(renderShortageRow).join("");
  return shortageGroupStats(rows)
    .map((group) => {
      const sample = group.rows[0]?.item;
      const sampleName = cleanOptionName(sample?.optionName, sample?.ownCode) || sample?.productName || "";
      return `<section class="workflow-code-group">
        <div class="workflow-code-group-head">
          <strong>${escapeHtml(group.code)}</strong>
          <span>${group.rows.length}건 · 미송 ${group.qty}개</span>
          ${sampleName ? `<small>${escapeHtml(sampleName)}</small>` : ""}
        </div>
        ${group.rows.map(renderShortageRow).join("")}
      </section>`;
    })
    .join("");
}

function renderShortageInvoiceItems(invoice) {
  return `<div class="workflow-item-table shortage-invoice-table">
    ${invoiceItemsInSellpiaRowOrder(invoice)
      .map((item, index) => {
        const itemState = workflowItemState(invoice, item);
        const imageUrl = productImageUrl(item.sellpiaProductCode);
        const shortage = workflowAwareShortageQty(itemState, item);
        return `<div class="workflow-item-row ${shortage > 0 ? "repicked" : ""}">
          <span>${itemSequenceNo(item, index)}</span>
          <div class="workflow-item-photo">${imageUrl ? `<img src="${imageUrl}" ${photoImgAttrs(imageUrl, photoTitleForItem(item))} alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : "?ъ쭊"}</div>
          <strong>${escapeHtml(item.ownCode || "-")}</strong>
          <em class="${optionHasBarChange(item) ? "option-change" : ""}">${escapeHtml(cleanOptionName(item.optionName, item.ownCode) || item.productName || "-")}</em>
          <b>${Number(item.quantity) || 1}개</b>
          <small>${shortage > 0 ? `미송 ${shortage}` : "정상"}</small>
        </div>`;
      })
      .join("")}
  </div>`;
}

function renderShortagePanels() {
  const rows = shortageRowsForCurrentFilter();
  const openCount = state.workflowQueues?.shortageItems?.length || 0;
  const openRows = state.workflowQueues?.shortageItems || [];
  const completedCount = repickedShortageRows().length;
  const codeGroupCount = state.shortageFilter === "code" ? shortageGroupStats(rows).length : 0;
  updateShortageReceivingStatus(openRows);
  if (els.shortageSearchInput && els.shortageSearchInput.value !== state.shortageSearchText) {
    els.shortageSearchInput.value = state.shortageSearchText;
  }
  els.shortageFilterBar?.querySelectorAll("[data-shortage-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.shortageFilter === state.shortageFilter);
  });
  if (els.shortageListCount) {
    els.shortageListCount.textContent =
      state.shortageFilter === "all"
        ? `${state.shortageSearchText.trim() ? "검색 " : ""}대기 ${openCount}개 · 표시 ${rows.length}개 · 완료 ${completedCount}개`
        : state.shortageFilter === "code"
          ? `자사코드 ${codeGroupCount}개 · 상품 ${rows.length}개`
          : `${shortageFilterLabel()} ${rows.length}개`;
  }

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
    const emptyMessage = state.receivingLabel.only && !state.receivingLabel.rowCount
      ? "입고 라벨지를 먼저 불러오세요."
      : state.receivingLabel.only
        ? "입고 라벨과 일치하는 미송 대상이 없습니다."
        : state.shortageSearchText.trim()
          ? "검색 결과가 없습니다."
          : `${shortageFilterLabel()} 대상이 없습니다.`;
    renderWorkflowEmpty(els.shortageListBody, emptyMessage);
    renderWorkflowEmpty(els.shortageDetail, emptyMessage);
    return;
  }

  if (!rows.some(({ invoice, item }) => workflowItemKey(invoice, item) === state.selectedShortageKey)) {
    state.selectedShortageKey = workflowItemKey(rows[0].invoice, rows[0].item);
  }

  els.shortageListBody.innerHTML = renderShortageRows(rows);

  const selected = rows.find(({ invoice, item }) => workflowItemKey(invoice, item) === state.selectedShortageKey) || rows[0];
  const selectedState = selected.state || workflowItemState(selected.invoice, selected.item);
  const seller = sellerBadgeMeta(selected.invoice.seller);
  const repickDisabled = allowWorkflowEvents ? "" : "disabled";
  const selectedKey = workflowItemKey(selected.invoice, selected.item);
  const selectedCompleted = Boolean(selected.completed);
  const receiving = receivingLabelEntryForItem(selected.item);
  els.shortageDetail.innerHTML = `<div class="workflow-detail-card">
    <div class="workflow-detail-head">
      <div>
        <strong>${escapeHtml(selected.item.ownCode || "-")}</strong>
        <span>${escapeHtml(selected.invoice.displayName || selected.invoice.csDisplayName || "-")}</span>
      </div>
      <div class="workflow-detail-actions">
        ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        <span class="workflow-row-badge warn">메모입력용</span>
      </div>
    </div>
    <div class="workflow-detail-main">
      <div class="workflow-photo">${productImageUrl(selected.item.sellpiaProductCode) ? `<img src="${productImageUrl(selected.item.sellpiaProductCode)}" ${photoImgAttrs(productImageUrl(selected.item.sellpiaProductCode), photoTitleForItem(selected.item))} alt="">` : "사진"}</div>
      <div class="workflow-detail-text">
        <h3 class="${optionHasBarChange(selected.item) ? "option-change" : ""}">${escapeHtml(cleanOptionName(selected.item.optionName, selected.item.ownCode) || selected.item.productName || "-")}</h3>
        <p>${escapeHtml(selected.item.productName || "")}</p>
        <dl>
          <div><dt>상품순서</dt><dd>${itemOrderNo(selected.item, invoiceItemIndex(selected.invoice, selected.item))}번</dd></div>
          <div><dt>미송표기</dt><dd>${escapeHtml(shortageInvoiceDisplayLabel(selected.invoice))}</dd></div>
          <div><dt>송장번호</dt><dd>${escapeHtml(selected.invoice.invoiceNo || "-")}</dd></div>
          <div><dt>부족수량</dt><dd class="shortage-qty-with-order">${shortageQtyInput(selected.invoice, selected.item, selectedCompleted ? previousShortageQuantity(selected.invoice, selected.item) : Number(selectedState?.shortageQty || 0) || 1, "workflow-number-input")}<small>주문 ${Number(selected.item.quantity) || 1}개</small></dd></div>
          ${receiving ? `<div><dt>입고라벨</dt><dd>${escapeHtml(`입고 ${receiving.qty || "-"}개`)}${receiving.optionName ? `<small>${escapeHtml(receiving.optionName)}</small>` : ""}</dd></div>` : ""}
          <div><dt>접수일</dt><dd>${escapeHtml(selected.invoice.receiptDate || "-")}</dd></div>
          <div><dt>마지막 이벤트</dt><dd>${escapeHtml(formatShortDate(selectedState?.lastEventAt))}</dd></div>
        </dl>
        <div class="workflow-memo-editor">
          <label>
            <span>관리메모</span>
            <input data-shortage-field="drawerMemo" value="${escapeHtml(drawerMemoForShortageRow(selected))}" placeholder="서랍번호/CS메모">
          </label>
          <label>
            <span>관리메모2</span>
            <textarea data-shortage-field="memo" rows="2" placeholder="상품별 미송 메모">${escapeHtml(selectedState?.memo || selected.item.sellpiaMemo2 || "")}</textarea>
          </label>
          ${selectedCompleted ? '<small class="workflow-help-text">기존 완료 기록입니다. 미송피킹 대기 목록에는 표시되지 않습니다.</small>' : `<div class="workflow-actions-row"><button class="btn" data-action="shortage-memo-save" data-shortage-key="${escapeHtml(selectedKey)}" type="button" ${repickDisabled}>메모 저장</button><button class="btn primary" data-action="shortage-repicked" data-shortage-key="${escapeHtml(selectedKey)}" type="button" ${repickDisabled}>미송피킹완료</button></div>`}
        </div>
      </div>
    </div>
    ${renderShortageInvoiceItems(selected.invoice)}
  </div>`;
}

function renderInspectionPanels(options = {}) {
  ensureInspectionFilterButtons();
  const renderList = options.list !== false;
  const allInvoices = inspectionSourceInvoices();
  const completedCount = allInvoices.filter((invoice) => workflowInvoiceState(invoice)?.inspected).length;
  const pendingInvoices = state.inspectionHideCompleted
    ? allInvoices.filter((invoice) => !workflowInvoiceState(invoice)?.inspected)
    : allInvoices;
  const invoices = pendingInvoices.filter(invoiceMatchesInspectionFilter).filter(invoiceMatchesInspectionSearch);
  if (els.inspectionListCount) {
    els.inspectionListCount.textContent = `표시 ${invoices.length}건 / 전체 ${allInvoices.length}건 · 완료 ${completedCount}건`;
  }

  els.inspectionFilterBar?.querySelectorAll("[data-inspection-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.inspectionFilter === state.inspectionFilter);
  });
  els.inspectionFilterBar?.querySelectorAll("[data-inspection-hide-completed]").forEach((button) => {
    button.classList.toggle("active", state.inspectionHideCompleted);
    button.textContent = state.inspectionHideCompleted ? "완료보기" : "완료제거";
    button.disabled = completedCount === 0;
  });

  if (state.workflowQueueError && !allInvoices.length) {
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
    const emptyText = allInvoices.length ? "현재 필터/검색에 맞는 검품 송장이 없습니다." : "현재 검품 송장이 없습니다.";
    renderWorkflowEmpty(els.inspectionListBody, emptyText);
    renderWorkflowEmpty(els.inspectionDetail, `${emptyText} 완료제거가 켜져 있으면 완료보기로 전환하세요.`);
    return;
  }

  if (!invoices.some((invoice) => invoice.orderGroupNo === state.selectedInspectionGroup)) {
    state.selectedInspectionGroup = invoices[0].orderGroupNo;
  }

  if (renderList) {
    els.inspectionListBody.innerHTML = invoices
      .map((invoice, index) => {
        const itemStates = (invoice.items || []).map((item) => workflowItemState(invoice, item)).filter(Boolean);
        const repicked = itemStates.filter((row) => row.shortageRepicked && !row.inspected && !row.cancelled).length;
        const invoiceState = workflowInvoiceState(invoice);
        const completed = Boolean(invoiceState?.inspected);
        const seller = sellerBadgeMeta(invoice.seller);
        const rowClasses = [
          "workflow-row",
          invoice.orderGroupNo === state.selectedInspectionGroup ? "selected" : "",
          completed ? "is-completed" : "",
          invoiceState?.hold ? "is-hold" : "",
          repicked ? "has-shortage" : "",
          invoiceHasGold(invoice) ? "is-gold" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const badges = [
          seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : "",
          completed ? '<span class="workflow-row-badge done">완료</span>' : "",
          invoiceHasGold(invoice) ? '<span class="workflow-row-badge gold">골드</span>' : "",
          invoiceState?.hold ? '<span class="workflow-row-badge hold">보류</span>' : "",
          repicked ? `<span class="workflow-row-badge warn">검품 ${repicked}</span>` : "",
        ]
          .filter(Boolean)
          .join("");
        return `<button class="${rowClasses}" data-inspection-group="${escapeHtml(invoice.orderGroupNo)}" type="button">
          <span class="workflow-row-code seq-with-slot">
            <strong>${escapeHtml(invoicePrimaryWorkflowLabel(invoice, index))}</strong>
            <small>${escapeHtml(invoiceSecondaryWorkflowLabel(invoice, index))}</small>
          </span>
          <span class="workflow-row-main">
            <strong>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</strong>
            <small>상품 ${invoice.items.length}종 · 접수 ${escapeHtml(invoice.receiptDate || "-")}</small>
          </span>
          <span class="workflow-row-badges">${badges}</span>
        </button>`;
      })
      .join("");
  } else {
    els.inspectionListBody?.querySelectorAll("[data-inspection-group]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.inspectionGroup === state.selectedInspectionGroup);
    });
  }

  const selected = invoices.find((invoice) => invoice.orderGroupNo === state.selectedInspectionGroup) || invoices[0];
  const seller = sellerBadgeMeta(selected.seller);
  const invoiceState = workflowInvoiceState(selected);
  const selectedCompleted = Boolean(invoiceState?.inspected);
  const selectedHeld = Boolean(invoiceState?.hold);
  const actionDisabled = allowWorkflowEvents ? "" : "disabled";
  const completeDisabled = !allowWorkflowEvents || (selectedHeld && !selectedCompleted) ? "disabled" : "";
  const completeTitle = selectedHeld && !selectedCompleted ? 'title="보류 송장은 보류 해제 후 완료 처리할 수 있습니다."' : "";
  const holdAction = invoiceState?.hold ? "inspection-hold-release" : "inspection-hold";
  const holdLabel = invoiceState?.hold ? "보류 해제" : "보류 처리";
  const selectedRepicked = (selected.items || []).filter((item) => {
    const itemState = workflowItemState(selected, item);
    return itemState?.shortageRepicked && !itemState?.inspected && !itemState?.cancelled;
  }).length;
  const selectedIndex = invoices.findIndex((invoice) => invoice.orderGroupNo === selected.orderGroupNo);
  const selectedGold = invoiceHasGold(selected);
  const selectedLabelTarget = invoiceHasLabelTarget(selected);
  const labelNoByItem = selectedLabelTarget ? inspectionLabelNumberMap(selected) : new Map();
  const selectedTotalQty = invoiceTotalQuantity(selected);
  const selectedHeaderMeta = [
    selected.displayName || selected.csDisplayName || "-",
    `접수 ${selected.receiptDate || "-"}`,
  ].join(" · ");
  const completeAction = selectedCompleted ? "inspection-reopen" : "inspection-complete";
  const completeLabel = selectedCompleted ? "완료 취소" : "완료 처리";
  els.inspectionDetail.innerHTML = `<div class="inspection-header-skeleton ${invoiceState?.hold ? "is-hold" : ""} ${selectedCompleted ? "is-completed" : ""}">
      <div class="inspection-title-block">
        <div class="inspection-title-line">
          <strong>${escapeHtml(invoicePrimaryWorkflowLabel(selected, selectedIndex >= 0 ? selectedIndex : 0))}</strong>
          ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        </div>
        <span>${escapeHtml(selectedHeaderMeta)}</span>
        <label class="inspection-drawer-box" style="flex-wrap: wrap;">
          <span>서랍번호</span>
          <textarea class="drawer-input inspection-drawer-input" data-inspection-drawer data-order-group="${escapeHtml(selected.orderGroupNo)}" rows="2" placeholder="서랍번호 / 메모">${escapeHtml(invoiceDrawerValue(selected))}</textarea>
          ${renderInspectionTotalAmountBadge(selected)}
        </label>
      </div>
      <div class="inspection-actions">
        <span class="invoice-badge inspection-slot-badge">${escapeHtml(invoiceSecondaryWorkflowLabel(selected, selectedIndex >= 0 ? selectedIndex : 0))}</span>
        <button class="btn" data-action="${holdAction}" data-inspection-group="${escapeHtml(selected.orderGroupNo)}" type="button" ${actionDisabled}>${holdLabel}</button>
        <button class="btn primary" data-action="${completeAction}" data-inspection-group="${escapeHtml(selected.orderGroupNo)}" type="button" ${completeDisabled} ${completeTitle}>${completeLabel}</button>
        ${selectedCompleted ? '<span class="workflow-row-badge done">완료</span>' : ""}
        ${selectedGold ? '<span class="workflow-row-badge gold">골드</span>' : ""}
        ${selectedRepicked ? `<span class="workflow-row-badge warn">미송 ${selectedRepicked}</span>` : ""}
        ${invoiceState?.hold ? '<span class="workflow-row-badge hold">보류</span>' : ""}
      </div>
    </div>
    <div class="workflow-item-table inspection-item-table ${selectedLabelTarget ? "has-label-number" : ""}">
      ${renderInspectionItemHeader(selectedLabelTarget, selectedTotalQty)}
      ${invoiceItemsInSellpiaRowOrder(selected)
        .map((item, index) => {
          const itemState = workflowItemState(selected, item);
          const itemRepicked = Boolean(itemState?.shortageRepicked && !itemState?.cancelled);
          const rowClass = [itemRepicked ? "repicked" : "", selectedCompleted ? "inspected" : ""].filter(Boolean).join(" ");
          const imageUrl = productImageUrl(item.sellpiaProductCode);
          const option = cleanOptionName(item.optionName, item.ownCode) || "-";
          const product = item.productName || "-";
          const labelNo = labelNoByItem.get(itemSlotKey(selected, item)) || "-";
          const shortage = workflowAwareShortageQty(itemState, item);
          const statusText = selectedCompleted ? "검품완료" : itemRepicked ? "미송피킹 완료" : "전체상품";
          const statusNotes = [itemState?.drawerMemo ? `서랍 ${itemState.drawerMemo}` : "", itemState?.memo ? itemState.memo : ""].filter(Boolean);
          const sellpiaOrderMemo = itemSellpiaOrderMemo(selected, item);
          const inspectionMemo = itemInspectionMemo(item);
          const memoReadonly = allowWrites ? "" : "readonly";
          const memoHint = allowWrites ? "" : ' title="읽기전용입니다. URL의 write=0을 제거하면 저장할 수 있습니다."';
          const reopenButton =
            itemRepicked && !selectedCompleted
              ? `<button class="workflow-inline-btn danger" data-action="shortage-repick-reopen" data-order-group="${escapeHtml(selected.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}" type="button" ${actionDisabled}>완료취소</button>`
              : "";
          return `<div class="workflow-item-row ${rowClass}">
            <span class="workflow-seq-cell">${itemSequenceNo(item, index)}</span>
            ${selectedLabelTarget ? `<span class="workflow-label-cell">${escapeHtml(labelNo)}</span>` : ""}
            <div class="workflow-item-photo">${imageUrl ? `<img src="${imageUrl}" ${photoImgAttrs(imageUrl, photoTitleForItem(item))} alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : "사진"}</div>
            <em class="${optionClass(item, "workflow-option-cell")}">${escapeHtml(option)}</em>
            <b>${Number(item.quantity) || 1}</b>
            <strong class="workflow-product-cell">${escapeHtml(product)}</strong>
            <span class="workflow-amount-cell">${escapeHtml(formatAmount(item.itemSalesAmount))}</span>
            <strong class="workflow-code-cell">${escapeHtml(item.ownCode || "-")}</strong>
            <span class="workflow-sellpia-cell">${escapeHtml(item.sellpiaProductCode || "-")}</span>
            ${shortageQtyInput(selected, item, shortage, "workflow-shortage-cell compact")}
            <label class="inspection-memo-cell ${sellpiaOrderMemo ? "has-value" : ""}">
              <textarea data-inspection-memo-field="sellpia-order" data-order-group="${escapeHtml(selected.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}" rows="2" placeholder="셀피아 주문메모" ${memoReadonly}${memoHint}>${escapeHtml(sellpiaOrderMemo)}</textarea>
            </label>
            <label class="inspection-memo-cell ${inspectionMemo ? "has-value" : ""}">
              <textarea data-inspection-memo-field="confirm" data-order-group="${escapeHtml(selected.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}" rows="2" placeholder="상품 확인메모" ${memoReadonly}${memoHint}>${escapeHtml(inspectionMemo)}</textarea>
            </label>
            <small class="workflow-status-cell">
              <span>${escapeHtml(statusText)}</span>
              ${statusNotes.length ? `<em>${escapeHtml(statusNotes.join(" / "))}</em>` : ""}
              ${reopenButton}
            </small>
          </div>`;
        })
        .join("")}
    </div>
    ${invoiceState?.memo ? `<div class="workflow-note">${escapeHtml(invoiceState.memo)}</div>` : ""}`;
}

function csRowKey(invoice, item) {
  return workflowItemKey(invoice, item);
}

function csShortageStartEvent(invoice, item) {
  const key = csRowKey(invoice, item);
  return [...(state.workflowQueues?.itemEvents || [])]
    .filter((event) => `${event.order_group_no}::${event.sellpia_item_no}` === key && ["shortage_created", "shortage_qty_changed"].includes(event.event_type))
    .sort((a, b) => workflowEventTime(a) - workflowEventTime(b))[0];
}

function daysSinceDateKey(key) {
  if (!key) return 0;
  const start = new Date(`${key}T00:00:00`);
  const today = new Date(`${todayDateString()}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function csMethodText(invoice, item) {
  return firstRawText(
    invoice?.raw,
    "method",
    "delay_method",
    "long_delay_method",
    "cs_method",
    "process_method",
    "처리방법",
    "장기지연처리방법",
  ) || firstRawText(item?.raw, "method", "delay_method", "long_delay_method", "cs_method", "process_method", "처리방법", "장기지연처리방법");
}

function isCsMakeshopMethod(row) {
  const method = String(row.csMethod || "").trim();
  if (method) return true;
  return sellerBadgeMeta(row.invoice.seller)?.className === "seller-makeshop";
}

function classifyCsRowsByDay(rows) {
  const groups = Object.fromEntries(CS_DAYS.filter((day) => day.key !== "all").map((day) => [day.key, []]));
  const invoiceRows = new Map();
  rows.forEach((row) => {
    const key = row.invoice.orderGroupNo || row.invoice.invoiceNo || row.key;
    if (!invoiceRows.has(key)) invoiceRows.set(key, []);
    invoiceRows.get(key).push(row);
  });
  rows.forEach((row) => {
    const key = row.invoice.orderGroupNo || row.invoice.invoiceNo || row.key;
    const sameInvoiceRows = invoiceRows.get(key) || [];
    const hasHoldRow = sameInvoiceRows.some((item) => item.csReason === "hold");
    const allReady = sameInvoiceRows.length > 0 && !hasHoldRow && sameInvoiceRows.every((item) => Number(item.currentShortageQty || 0) === 0);
    const elapsed = Number(row.elapsedDays || 0);
    const push = (dayKey) => groups[dayKey]?.push({ ...row, csDayKey: dayKey });
    if (allReady) {
      push("내일출고");
      return;
    }
    if (isGoldItem(row.item)) {
      push(elapsed >= 5 ? "14K 5일차" : "14K 1일차");
      return;
    }
    if (elapsed >= 10) push("10일차");
    else if (elapsed >= 5) {
      push("5일차 부분출고");
      push("5일차 취소출고");
    } else if (elapsed >= 3) push(isCsMakeshopMethod(row) ? "3일차 메이크샵" : "3일차 플랫폼");
    else push("1일차");
  });
  return groups;
}

function csDayLabel(key) {
  return CS_DAYS.find((day) => day.key === key)?.label || key || "전체";
}

function defaultCsDayKey(row) {
  const byDay = classifyCsRowsByDay([row]);
  return CS_DAYS.find((day) => day.key !== "all" && byDay[day.key]?.length)?.key || "";
}

function recommendedCsTemplateKey(row) {
  const dayKey = row.csDayKey || defaultCsDayKey(row);
  return CS_DAY_TEMPLATE[dayKey] || (isGoldItem(row.item) ? "14k_1" : "d1");
}

function buildCsMessage(row) {
  const option = cleanOptionName(row.item.optionName, row.item.ownCode) || row.item.productName || "-";
  const product = row.item.productName || row.item.ownCode || "-";
  const preset = CS_TEMPLATE_PRESETS[recommendedCsTemplateKey(row)] || CS_TEMPLATE_PRESETS.d1;
  return preset.text
    .replace(/#{SHOPNAME}/g, "핑크로켓")
    .replace(/#{NAME}/g, row.invoice.displayName || row.invoice.csDisplayName || row.invoice.recipientName || "고객")
    .replace(/#{PRODUCT}\(#{OPTION}\)/g, `${product}(${option})`)
    .replace(/#{PRODUCT}/g, product)
    .replace(/#{OPTION}/g, option);
}

function legacyAllCsRows() {
  const invoices = state.workflowQueues?.viewModel?.invoices || state.viewModel?.invoices || [];
  const rows = [];
  for (const invoice of invoices) {
    const invoiceState = workflowInvoiceState(invoice);
    if (invoiceState?.inspected || invoiceState?.cancelled) continue;
    const invoiceNeedsCs = Boolean(invoiceState?.hold || invoiceState?.csPending);
    let invoiceRowCount = 0;
    for (const item of invoice.items || []) {
      const itemState = workflowItemState(invoice, item);
      const qty = workflowAwareShortageQty(itemState, item);
      const started = csShortageStartEvent(invoice, item);
      if (!started && qty <= 0 && !itemState?.shortageRepicked) continue;
      const date = dateKey(invoice.receiptDate);
      invoiceRowCount += 1;
      rows.push({
        key: csRowKey(invoice, item),
        invoice,
        item,
        state: itemState,
        shortageQty: qty || previousShortageQuantity(invoice, item) || 1,
        currentShortageQty: qty,
        shortageDate: date,
        elapsedDays: daysSinceDateKey(date),
        csMethod: csMethodText(invoice, item),
        csReason: invoiceNeedsCs ? "hold" : "shortage",
      });
    }
    if (invoiceNeedsCs && invoiceRowCount === 0) {
      const item = invoice.items?.[0];
      if (!item) continue;
      const key = `${invoice.orderGroupNo || invoice.invoiceNo || "invoice"}::hold`;
      const date = dateKey(invoice.receiptDate);
      rows.push({
        key,
        invoice,
        item,
        state: null,
        shortageQty: 0,
        currentShortageQty: 0,
        shortageDate: date,
        elapsedDays: daysSinceDateKey(date),
        csMethod: csMethodText(invoice, item),
        csReason: "hold",
      });
    }
  }
  const byDay = classifyCsRowsByDay(rows);
  const defaultDayByKey = new Map();
  CS_DAYS.filter((day) => day.key !== "all").forEach((day) => {
    (byDay[day.key] || []).forEach((row) => {
      if (!defaultDayByKey.has(row.key)) defaultDayByKey.set(row.key, day.key);
    });
  });
  return rows
    .map((row) => ({ ...row, csDayKey: defaultDayByKey.get(row.key) || defaultCsDayKey(row) }))
    .sort((a, b) => String(b.shortageDate).localeCompare(String(a.shortageDate)) || visibleInvoiceSequenceNo(a.invoice) - visibleInvoiceSequenceNo(b.invoice));
}

function legacyFilteredCsRows() {
  const search = state.csSearchText.trim().toLowerCase();
  const allRows = allCsRows();
  const byDay = classifyCsRowsByDay(allRows);
  const sourceRows = state.csDateFilter === "all" ? allRows : byDay[state.csDateFilter] || [];
  return sourceRows.filter((row) => {
    if (!search) return true;
    return [
      row.invoice.invoiceNo,
      visibleInvoiceSequenceLabel(row.invoice),
      row.invoice.displayName,
      row.invoice.csDisplayName,
      row.invoice.recipientName,
      row.item.ownCode,
      row.item.sellpiaProductCode,
      row.item.productName,
      row.item.optionName,
      invoiceDrawerValue(row.invoice),
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

function legacyRenderCsPanels() {
  if (els.csSearchInput && els.csSearchInput.value !== state.csSearchText) els.csSearchInput.value = state.csSearchText;
  if (state.workflowQueueError) {
    renderWorkflowEmpty(els.csListBody, state.workflowQueueError);
    renderWorkflowEmpty(els.csDetail, "CS 대상 데이터를 불러오지 못했습니다.");
    return;
  }
  if (!state.workflowQueues && !state.viewModel) {
    renderWorkflowEmpty(els.csListBody, "미송 데이터를 불러오는 중입니다.");
    renderWorkflowEmpty(els.csDetail, "연락 대상을 선택하면 템플릿을 표시합니다.");
    return;
  }

  const allRows = allCsRows();
  const byDay = classifyCsRowsByDay(allRows);
  if (state.csDateFilter !== "all" && !CS_DAYS.some((day) => day.key === state.csDateFilter)) state.csDateFilter = "all";
  const dayButtons = CS_DAYS.map((day) => [day.key, `${day.label} ${day.key === "all" ? allRows.length : byDay[day.key]?.length || 0}`]);
  if (els.csDateTabs) {
    els.csDateTabs.innerHTML = dayButtons
      .map(([value, label]) => `<button class="filter-chip ${state.csDateFilter === value ? "active" : ""}" data-cs-date="${escapeHtml(value)}" type="button">${escapeHtml(label)}</button>`)
      .join("");
  }
  const rows = filteredCsRows();
  if (els.csListCount) els.csListCount.textContent = `${rows.length}건 / 전체 ${allRows.length}건`;
  if (!rows.length) {
    renderWorkflowEmpty(els.csListBody, "현재 조건에 맞는 CS 대상이 없습니다.");
    renderWorkflowEmpty(els.csDetail, "일차/상태 필터를 조정해보세요.");
    return;
  }
  if (!rows.some((row) => row.key === state.selectedCsKey)) state.selectedCsKey = rows[0].key;
  els.csListBody.innerHTML = rows
    .map((row) => {
      const selected = row.key === state.selectedCsKey;
      const seller = sellerBadgeMeta(row.invoice.seller);
      const option = cleanOptionName(row.item.optionName, row.item.ownCode) || row.item.productName || "-";
      const holdBadge = row.csReason === "hold" ? '<span class="workflow-row-badge hold">보류</span>' : "";
      return `<button class="workflow-row ${selected ? "selected" : ""}" data-cs-key="${escapeHtml(row.key)}" type="button">
        <span class="workflow-row-code seq-with-slot">
          <strong>${escapeHtml(visibleInvoiceSequenceLabel(row.invoice))}</strong>
          <small>${escapeHtml(csDayLabel(row.csDayKey || defaultCsDayKey(row)))}</small>
        </span>
        <span class="workflow-row-main">
          <strong>${escapeHtml(row.invoice.displayName || row.invoice.csDisplayName || "-")}</strong>
          <small>${escapeHtml(row.item.ownCode || "-")} · ${escapeHtml(option)} · 미송 ${row.shortageQty}</small>
          <small>${escapeHtml(row.shortageDate)} · ${row.elapsedDays}일 경과 · 서랍 ${escapeHtml(invoiceDrawerValue(row.invoice) || "-")}</small>
        </span>
        <span class="workflow-row-badges">
          ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
          ${holdBadge}
          <span class="workflow-row-badge danger">CS필요</span>
        </span>
      </button>`;
    })
    .join("");

  const selected = rows.find((row) => row.key === state.selectedCsKey) || rows[0];
  const option = cleanOptionName(selected.item.optionName, selected.item.ownCode) || selected.item.productName || "-";
  const orderMemo = itemSellpiaOrderMemo(selected.invoice, selected.item);
  const readonlyHint = allowWrites ? "" : "readonly title=\"URL의 write=0을 제거하면 저장할 수 있습니다.\"";
  els.csDetail.innerHTML = `<div class="cs-detail-card">
    <div class="workflow-detail-head">
      <div>
        <strong>${escapeHtml(selected.invoice.displayName || selected.invoice.csDisplayName || "-")}</strong>
        <span>${escapeHtml(csDayLabel(selected.csDayKey || defaultCsDayKey(selected)))} · ${escapeHtml(selected.shortageDate)} · ${selected.elapsedDays}일 경과 · 미송 ${selected.shortageQty}</span>
      </div>
      <div class="workflow-detail-actions">
        <span class="invoice-badge">주문메모</span>
        ${selected.csReason === "hold" ? '<span class="workflow-row-badge hold">보류</span>' : ""}
      </div>
    </div>
    <div class="cs-product-line">
      <strong>${escapeHtml(selected.item.ownCode || "-")}</strong>
      <span class="${optionHasBarChange(selected.item) ? "option-change" : ""}">${escapeHtml(option)}</span>
      <small>송장 ${escapeHtml(selected.invoice.invoiceNo || "-")} · ${escapeHtml(invoiceSequenceWithGroupLabel(selected.invoice))}</small>
    </div>
    <div class="cs-memo-editor">
      <label>
        <span>셀피아 주문메모</span>
        <textarea data-cs-order-memo data-order-group="${escapeHtml(selected.invoice.orderGroupNo)}" data-item-no="${escapeHtml(selected.item.sellpiaItemNo)}" rows="8" placeholder="주문메모" ${readonlyHint}>${escapeHtml(orderMemo)}</textarea>
      </label>
      <button class="btn primary" data-cs-order-memo-save data-order-group="${escapeHtml(selected.invoice.orderGroupNo)}" data-item-no="${escapeHtml(selected.item.sellpiaItemNo)}" type="button">주문메모 저장</button>
    </div>
  </div>`;
}

function csSourceInvoices() {
  return sortInspectionInvoices(
    mergeInvoicesUnique(
      state.viewModel?.invoices || [],
      state.workflowQueues?.viewModel?.invoices || [],
      state.workflowQueues?.inspectionInvoices || [],
      state.workflowQueues?.inspectionCompletedInvoices || [],
    ).filter(isInspectionVisibleBaseInvoice),
  );
}

function allCsRows() {
  return csSourceInvoices().map((invoice, index) => ({
    key: invoice.orderGroupNo || invoice.invoiceNo || `cs-${index}`,
    invoice,
    index,
  }));
}

function filteredCsRows() {
  const search = state.csSearchText.trim().toLowerCase();
  return allCsRows().filter((row) => {
    if (!search) return true;
    return `${invoiceTextForSearch(row.invoice)} ${invoiceDrawerValue(row.invoice)}`.toLowerCase().includes(search);
  });
}

function renderCsPanels() {
  if (els.csSearchInput && els.csSearchInput.value !== state.csSearchText) els.csSearchInput.value = state.csSearchText;
  if (state.workflowQueueError) {
    renderWorkflowEmpty(els.csListBody, state.workflowQueueError);
    renderWorkflowEmpty(els.csDetail, "CS 데이터를 불러오지 못했습니다.");
    return;
  }
  if (!state.workflowQueues && !state.viewModel) {
    renderWorkflowEmpty(els.csListBody, "데이터를 불러오는 중입니다.");
    renderWorkflowEmpty(els.csDetail, "송장을 선택하면 메모를 수정할 수 있습니다.");
    return;
  }

  state.csDateFilter = "all";
  const allRows = allCsRows();
  if (els.csDateTabs) {
    els.csDateTabs.innerHTML = `<button class="filter-chip active" data-cs-date="all" type="button">전체 ${allRows.length}</button>`;
  }
  const rows = filteredCsRows();
  if (els.csListCount) els.csListCount.textContent = `${rows.length}건 / 전체 ${allRows.length}건`;
  if (!rows.length) {
    renderWorkflowEmpty(els.csListBody, "현재 조건에 맞는 송장이 없습니다.");
    renderWorkflowEmpty(els.csDetail, "검색어를 조정해보세요.");
    return;
  }

  if (!rows.some((row) => row.key === state.selectedCsKey)) state.selectedCsKey = rows[0].key;
  els.csListBody.innerHTML = rows
    .map((row) => {
      const { invoice } = row;
      const selected = row.key === state.selectedCsKey;
      const seller = sellerBadgeMeta(invoice.seller);
      const invoiceState = workflowInvoiceState(invoice);
      const shortageCount = invoiceItemsInSellpiaRowOrder(invoice).reduce((sum, item) => sum + workflowAwareShortageQty(workflowItemState(invoice, item), item), 0);
      return `<button class="workflow-row ${selected ? "selected" : ""}" data-cs-key="${escapeHtml(row.key)}" type="button">
        <span class="workflow-row-code seq-with-slot">
          <strong>${escapeHtml(invoicePrimaryWorkflowLabel(invoice, row.index))}</strong>
          <small>${escapeHtml(invoiceSecondaryWorkflowLabel(invoice, row.index))}</small>
        </span>
        <span class="workflow-row-main">
          <strong>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</strong>
          <small>상품 ${invoice.items?.length || 0}종 · 접수 ${escapeHtml(invoice.receiptDate || "-")}</small>
          <small>관리메모 ${escapeHtml(invoiceDrawerValue(invoice) || "-")} · 관리메모2 ${shortageCount}</small>
        </span>
        <span class="workflow-row-badges">
          ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
          ${invoiceState?.hold ? '<span class="workflow-row-badge hold">보류</span>' : ""}
          ${invoiceState?.inspected ? '<span class="workflow-row-badge done">완료</span>' : ""}
          ${shortageCount ? `<span class="workflow-row-badge danger">부족 ${shortageCount}</span>` : ""}
        </span>
      </button>`;
    })
    .join("");

  const selected = rows.find((row) => row.key === state.selectedCsKey) || rows[0];
  const invoice = selected.invoice;
  const seller = sellerBadgeMeta(invoice.seller);
  const invoiceState = workflowInvoiceState(invoice);
  const readonlyHint = allowWrites ? "" : "readonly title=\"URL에 write=1이 없으면 저장할 수 없습니다.\"";
  const memoReadonly = allowWrites ? "" : "readonly";
  const memoHint = allowWrites ? "" : ' title="URL에 write=1이 없으면 저장할 수 없습니다."';
  const selectedIndex = rows.findIndex((row) => row.key === selected.key);
  els.csDetail.innerHTML = `<div class="inspection-header-skeleton ${invoiceState?.hold ? "is-hold" : ""} ${invoiceState?.inspected ? "is-completed" : ""}">
      <div class="inspection-title-block">
        <div class="inspection-title-line">
          <strong>${escapeHtml(invoicePrimaryWorkflowLabel(invoice, selectedIndex >= 0 ? selectedIndex : 0))}</strong>
          ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        </div>
        <span>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")} · 접수 ${escapeHtml(invoice.receiptDate || "-")} · 송장 ${escapeHtml(invoice.invoiceNo || "-")}</span>
        <label class="inspection-drawer-box">
          <span>관리메모</span>
          <textarea class="drawer-input inspection-drawer-input" data-cs-drawer data-order-group="${escapeHtml(invoice.orderGroupNo)}" rows="2" placeholder="서랍번호 / 메모" ${readonlyHint}>${escapeHtml(invoiceDrawerValue(invoice))}</textarea>
        </label>
      </div>
      <div class="inspection-actions">
        <span class="invoice-badge inspection-slot-badge">${escapeHtml(invoiceSecondaryWorkflowLabel(invoice, selectedIndex >= 0 ? selectedIndex : 0))}</span>
        ${invoiceState?.hold ? '<span class="workflow-row-badge hold">보류</span>' : ""}
        ${invoiceState?.inspected ? '<span class="workflow-row-badge done">완료</span>' : ""}
        ${invoiceHasGold(invoice) ? '<span class="workflow-row-badge gold">골드</span>' : ""}
      </div>
    </div>
    <div class="workflow-item-table inspection-item-table">
      <div class="workflow-item-row workflow-item-header">
        <span>상품순서번호</span>
        <span>사진</span>
        <span>옵션명</span>
        <span>수량</span>
        <span>상품명</span>
        <span>금액</span>
        <span>자사코드</span>
        <span>셀피아코드</span>
        <span>관리메모2</span>
        <span>주문메모</span>
        <span>상태</span>
      </div>
      ${invoiceItemsInSellpiaRowOrder(invoice)
        .map((item, index) => {
          const itemState = workflowItemState(invoice, item);
          const imageUrl = productImageUrl(item.sellpiaProductCode);
          const option = cleanOptionName(item.optionName, item.ownCode) || "-";
          const product = item.productName || "-";
          const shortage = workflowAwareShortageQty(itemState, item);
          const sellpiaOrderMemo = itemSellpiaOrderMemo(invoice, item);
          return `<div class="workflow-item-row">
            <span class="workflow-seq-cell">${itemSequenceNo(item, index)}</span>
            <div class="workflow-item-photo">${imageUrl ? `<img src="${imageUrl}" ${photoImgAttrs(imageUrl, photoTitleForItem(item))} alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : "사진"}</div>
            <em class="${optionClass(item, "workflow-option-cell")}">${escapeHtml(option)}</em>
            <b>${Number(item.quantity) || 1}</b>
            <strong class="workflow-product-cell">${escapeHtml(product)}</strong>
            <span class="workflow-amount-cell">${escapeHtml(formatAmount(item.itemSalesAmount))}</span>
            <strong class="workflow-code-cell">${escapeHtml(item.ownCode || "-")}</strong>
            <span class="workflow-sellpia-cell">${escapeHtml(item.sellpiaProductCode || "-")}</span>
            ${shortageQtyInput(invoice, item, shortage, "workflow-shortage-cell compact")}
            <label class="inspection-memo-cell ${sellpiaOrderMemo ? "has-value" : ""}">
              <textarea data-cs-order-memo data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}" rows="2" placeholder="셀피아 주문메모" ${memoReadonly}${memoHint}>${escapeHtml(sellpiaOrderMemo)}</textarea>
            </label>
            <small class="workflow-status-cell">
              <span>${invoiceState?.inspected ? "검품완료" : itemState?.shortageRepicked ? "미송피킹" : "작업중"}</span>
            </small>
          </div>`;
        })
        .join("")}
    </div>`;
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
        <span class="workflow-row-code seq-with-slot">
          <strong>${escapeHtml(visibleInvoiceSequenceLabel(invoice))}</strong>
          <small>${escapeHtml(invoiceGroupSlotLabel(invoice))}</small>
        </span>
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
        <strong>${escapeHtml(invoiceSequenceWithGroupLabel(selected))}</strong>
        <span>${escapeHtml(selected.displayName || selected.csDisplayName || "-")} · 접수 ${escapeHtml(selected.receiptDate || "-")} · 완료 ${escapeHtml(formatShortDate(completedAt))}</span>
      </div>
      <div class="inspection-actions">
        ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        <button class="btn primary" data-action="inspection-reopen" data-completed-group="${escapeHtml(selected.orderGroupNo)}" type="button" ${actionDisabled}>완료 취소</button>
      </div>
    </div>
    <div class="workflow-item-table">
      ${invoiceItemsInSellpiaRowOrder(selected)
        .map((item, index) => {
          const itemState = workflowItemState(selected, item);
          const rowClass = itemState?.shortageRepicked ? "repicked" : "";
          const imageUrl = productImageUrl(item.sellpiaProductCode);
          return `<div class="workflow-item-row ${rowClass}">
            <span>${index + 1}</span>
            <div class="workflow-item-photo">${imageUrl ? `<img src="${imageUrl}" ${photoImgAttrs(imageUrl, photoTitleForItem(item))} alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : "사진"}</div>
            <strong>${escapeHtml(item.ownCode || "-")}</strong>
            <em class="${optionHasBarChange(item) ? "option-change" : ""}">${escapeHtml(cleanOptionName(item.optionName, item.ownCode) || item.productName || "-")}</em>
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
      ${imageUrl ? `<img class="thumb" src="${imageUrl}" ${photoImgAttrs(imageUrl, photoTitleForItem(item))} alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="thumb"></div>'}
    </div>
    <div class="picking-body">
      <div class="picking-main">
        <div class="picking-title-line">
          <span class="work-no own-code-display">${escapeHtml(item.ownCode || "-")}</span>
          ${goldItem ? '<span class="gold-badge">골드</span>' : goldInvoice ? '<span class="gold-badge soft">골드송장</span>' : ""}
          ${item.sellpiaLocation ? `<span class="small-badge">${escapeHtml(item.sellpiaLocation)}</span>` : ""}
        </div>
        <p class="${optionClass(item)}">${escapeHtml(option)}</p>
        <p class="product">${escapeHtml(product)}</p>
        <div class="invoice-meta">
          <span>${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</span>
          <span>${escapeHtml(invoiceSequenceWithGroupLabel(invoice))}</span>
          ${seller ? `<span class="seller-badge ${seller.className}">${escapeHtml(seller.label)}</span>` : ""}
        </div>
      </div>
      <div class="picking-controls">
        <div class="qty-tile">${Number(item.quantity) || 1}개</div>
        ${renderInvoiceSlots(invoiceIndex, item, itemIndex)}
        <div class="shortage-control">
          <button data-action="shortage" data-delta="-1" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">−</button>
          ${shortageQtyInput(invoice, item, shortage)}
          <button data-action="shortage" data-delta="1" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">+</button>
        </div>
        <div class="drawer-box">
          <label>서랍</label>
          <textarea class="drawer-input" inputmode="none" data-action="drawer" data-order-group="${escapeHtml(invoice.orderGroupNo)}" rows="2" placeholder="서랍번호" readonly>${escapeHtml(drawerValue)}</textarea>
        </div>
      </div>
    </div>
  </article>`;
}

function renderShell() {
  document.querySelectorAll("[data-app-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.appTab === state.activeTab);
  });
  els.mainGrid?.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  els.sidebar?.classList.toggle("collapsed", state.sidebarCollapsed);
  if (els.sidebarToggle) {
    els.sidebarToggle.textContent = state.sidebarCollapsed ? "▶" : "◀";
    els.sidebarToggle.title = state.sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기";
    els.sidebarToggle.setAttribute("aria-expanded", String(!state.sidebarCollapsed));
  }
  if (els.pickingPanel) els.pickingPanel.hidden = state.activeTab !== "picking";
  if (els.dashboardPanel) els.dashboardPanel.hidden = state.activeTab !== "dashboard";
  if (els.shortagePanel) els.shortagePanel.hidden = state.activeTab !== "shortage";
  if (els.inspectionPanel) els.inspectionPanel.hidden = state.activeTab !== "inspection";
  if (els.csPanel) els.csPanel.hidden = state.activeTab !== "cs";
  if (els.completedPanel) els.completedPanel.hidden = state.activeTab !== "completed";
  renderSideShortcuts();
}

function renderActivePanel(options = {}) {
  if (options.metrics !== false) renderMetrics();
  if (state.activeTab === "dashboard") {
    renderDashboard();
    return;
  }
  if (state.activeTab === "picking") {
    renderFilters();
    renderGroups();
    renderOrderList();
    renderTray();
    return;
  }
  if (state.activeTab === "shortage") {
    renderShortagePanels();
    return;
  }
  if (state.activeTab === "inspection") {
    renderInspectionPanels();
    return;
  }
  if (state.activeTab === "cs") {
    renderCsPanels();
    return;
  }
  if (state.activeTab === "completed") {
    renderCompletedPanels();
  }
}

function render() {
  renderShell();
  renderActivePanel();
}

let activePanelRenderTimer = 0;

function renderActivePanelSoon(delayMs = 120, options = {}) {
  window.clearTimeout(activePanelRenderTimer);
  activePanelRenderTimer = window.setTimeout(() => {
    activePanelRenderTimer = 0;
    renderActivePanel(options);
  }, delayMs);
}

function renderPickingSurfaces() {
  renderMetrics();
  renderGroups();
  renderOrderList();
  renderTray();
}

let pickingSurfaceRenderTimer = 0;

function schedulePickingSurfaces(delayMs = 3000) {
  window.clearTimeout(pickingSurfaceRenderTimer);
  const run = () => {
    pickingSurfaceRenderTimer = 0;
    renderPickingSurfaces();
  };
  pickingSurfaceRenderTimer = window.setTimeout(() => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 1200 });
      return;
    }
    run();
  }, delayMs);
}

function renderWorkflowSurfaces() {
  renderMetrics();
  if (state.activeTab === "dashboard") renderDashboard();
  if (state.activeTab === "shortage") renderShortagePanels();
  if (state.activeTab === "inspection") renderInspectionPanels();
  if (state.activeTab === "cs") renderCsPanels();
  if (state.activeTab === "completed") renderCompletedPanels();
}

function renderWorkflowSurfacesIfVisible() {
  if (["dashboard", "shortage", "inspection", "cs", "completed"].includes(state.activeTab)) {
    renderActivePanel();
    return;
  }
  renderMetrics();
}

function findInvoiceAndItem(orderGroupNo, sellpiaItemNo) {
  const invoices = [
    ...(state.viewModel?.invoices || []),
    ...(state.workflowQueues?.viewModel?.invoices || []),
    ...(state.workflowQueues?.inspectionInvoices || []),
    ...(state.workflowQueues?.inspectionCompletedInvoices || []),
  ];
  const invoice = invoices.find((row) => row.orderGroupNo === orderGroupNo);
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

function itemDataSelector(invoice, item) {
  const orderGroupNo = String(invoice?.orderGroupNo || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const sellpiaItemNo = String(item?.sellpiaItemNo || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `[data-order-group="${orderGroupNo}"][data-item-no="${sellpiaItemNo}"]`;
}

function paintPickingItemState(invoice, item) {
  const picked = isPicked(item);
  const shortage = shortageQty(item);
  const selector = itemDataSelector(invoice, item);
  const card = els.orderList?.querySelector(`.picking-item-card${selector}, .gold-item-row${selector}`);
  if (card) {
    card.classList.toggle("is-picked", picked);
    card.classList.toggle("has-shortage", shortage > 0);
    card.classList.toggle("has-hold", isHold(item));
    const check = card.querySelector("[data-action='toggle']");
    if (check) {
      check.classList.toggle("checked", picked);
      check.textContent = picked ? "✓" : "";
    }
    const shortageValue = card.querySelector(".shortage-value");
    if (shortageValue) shortageValue.textContent = String(shortage);
    const shortageInput = card.querySelector(".shortage-input");
    if (shortageInput && document.activeElement !== shortageInput) shortageInput.value = String(shortage);
  }

  const trayItem = els.trayBoard?.querySelector(`[data-tray-key="${itemSlotKey(invoice, item).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`);
  if (trayItem) {
    const meta = itemStatusMeta(item);
    trayItem.classList.remove("picked", "shortage", "hold", "todo");
    trayItem.classList.add(meta.className);
    trayItem.querySelector(".tray-item-check")?.replaceChildren(document.createTextNode(picked ? "✓" : ""));
    const stateNode = trayItem.querySelector(".tray-item-state");
    if (stateNode) stateNode.textContent = meta.label;
  }
}

function shortageEventType(prev, next) {
  if (next > 0 && prev === 0) return "shortage_created";
  if (next === 0 && prev > 0) return "shortage_repick_completed";
  if (next !== prev) return "shortage_qty_changed";
  return null;
}

function buildItemEvent(invoice, item, eventType, overrides = {}) {
  return {
    receipt_date: dateKey(invoice.receiptDate) || null,
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
    receipt_date: dateKey(invoice.receiptDate) || null,
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

function rebuildWorkflowQueuesFromLocalEvents() {
  if (!state.workflowQueues) return;
  const viewModel = state.workflowQueues.viewModel || state.viewModel;
  const workflowState = buildWorkflowState({
    itemEvents: [...(state.workflowQueues.syntheticEvents?.itemEvents || []), ...(state.workflowQueues.itemEvents || [])],
    invoiceEvents: [...(state.workflowQueues.syntheticEvents?.invoiceEvents || []), ...(state.workflowQueues.invoiceEvents || [])],
  });
  state.workflowQueues.workflowState = workflowState;
  state.workflowQueues.shortageItems = openShortageItems(viewModel, workflowState);
  state.workflowQueues.inspectionInvoices = repickedInvoicesForInspection(viewModel, workflowState);
  state.workflowQueues.inspectionCompletedInvoices = completedInvoicesForInspection(viewModel, workflowState);
}

function applyWorkflowItemEvent(row) {
  if (!state.workflowQueues || !row) return;
  state.workflowQueues.itemEvents = [...(state.workflowQueues.itemEvents || []), row];
  rebuildWorkflowQueuesFromLocalEvents();
}

function applyWorkflowInvoiceEvent(row) {
  if (!state.workflowQueues || !row) return;
  state.workflowQueues.invoiceEvents = [...(state.workflowQueues.invoiceEvents || []), row];
  rebuildWorkflowQueuesFromLocalEvents();
}

async function saveWorkflowItemEvent(invoice, item, eventType, overrides = {}) {
  if (!allowWorkflowEvents) {
    toast("이벤트 저장이 비활성화되어 있습니다. URL의 write=0 또는 events=0을 제거해주세요.");
    return false;
  }
  const savingKey = `item::${workflowItemKey(invoice, item)}::${eventType}`;
  if (state.workflowSaving.has(savingKey)) return false;
  state.workflowSaving.add(savingKey);
  const eventRow = buildItemEvent(invoice, item, eventType, overrides);
  try {
    const { data, error } = await db.from("workflow_item_events").insert(eventRow).select("*").single();
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
    const savedEvent = data || { ...eventRow, event_at: new Date().toISOString() };
    applyWorkflowItemEvent(savedEvent);
    renderWorkflowSurfacesIfVisible();
    return savedEvent;
  } finally {
    state.workflowSaving.delete(savingKey);
  }
}

async function saveWorkflowInvoiceEvent(invoice, eventType, overrides = {}) {
  if (!allowWorkflowEvents) {
    toast("이벤트 저장이 비활성화되어 있습니다. URL의 write=0 또는 events=0을 제거해주세요.");
    return false;
  }
  const savingKey = `invoice::${invoice.orderGroupNo}::${eventType}`;
  if (state.workflowSaving.has(savingKey)) return false;
  state.workflowSaving.add(savingKey);
  const eventRow = buildInvoiceEvent(invoice, eventType, overrides);
  try {
    const { data, error } = await db.from("workflow_invoice_events").insert(eventRow).select("*").single();
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
    const savedEvent = data || { ...eventRow, event_at: new Date().toISOString() };
    applyWorkflowInvoiceEvent(savedEvent);
    renderWorkflowSurfacesIfVisible();
    return savedEvent;
  } finally {
    state.workflowSaving.delete(savingKey);
  }
}

async function savePickingRow(invoice, item, eventType = null, eventOverrides = {}) {
  if (!allowWrites) {
    toast("읽기전용입니다. URL의 write=0을 제거하면 저장할 수 있습니다.");
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
  if (!allowWrites) {
    toast("?쎄린?꾩슜?낅땲?? URL??write=0???쒓굅?섎㈃ ??ν븷 ???덉뒿?덈떎.");
    return;
  }
  for (const item of invoice.items || []) {
    patchLocalPickingState(invoice, item, { drawerMemo });
    await savePickingRow(invoice, item, null, { drawerMemo });
    item.sellpiaMemo1 = drawerMemo;
    if (item.raw) item.raw.o_shop_memo = drawerMemo;
    const { error } = await db.from("order_items").update({ o_shop_memo: drawerMemo }).eq("ord_no", invoice.orderGroupNo).eq("item_no", item.sellpiaItemNo);
    if (error) throw error;
  }
}

async function setShortageQty(orderGroupNo, sellpiaItemNo, nextValue) {
  const { invoice, item } = findInvoiceAndItem(orderGroupNo, sellpiaItemNo);
  if (!invoice || !item) {
    toast("부족수량 대상을 찾지 못했습니다.");
    return;
  }
  const prevText = itemManagementMemo2(item);
  const nextText = normalizedShortageMemo2(nextValue);
  const prev = shortageQty(item);
  const next = normalizedShortageQty(nextText);
  if (prev === next && prevText === nextText) return;
  const eventType = shortageEventType(prev, next);
  patchLocalPickingState(invoice, item, { shortageQty: next, shortageMemo2: nextText });
  item.sellpiaMemo2 = nextText;
  if (item.raw) {
    item.raw.o_shop_memo2 = nextText;
    item.raw.shop_memo2 = nextText;
    item.raw.memo2 = nextText;
  }
  paintPickingItemState(invoice, item);
  schedulePickingSurfaces();
  try {
    await savePickingRow(invoice, item, eventType, { quantity: next, memo: nextText || null });
    const { error } = await db.from("order_items").update({ o_shop_memo2: nextText }).eq("ord_no", invoice.orderGroupNo).eq("item_no", item.sellpiaItemNo);
    if (error) throw error;
    renderWorkflowSurfacesIfVisible();
    toast("관리메모2 저장");
  } catch (error) {
    patchLocalPickingState(invoice, item, { shortageQty: prev, shortageMemo2: prevText });
    item.sellpiaMemo2 = prevText;
    if (item.raw) {
      item.raw.o_shop_memo2 = prevText;
      item.raw.shop_memo2 = prevText;
      item.raw.memo2 = prevText;
    }
    render();
    toast(`관리메모2 저장 실패: ${error.message}`);
  }
}

function onShortageInputChange(event) {
  const input = event.target.closest("[data-shortage-input]");
  if (!input) return;
  input.value = normalizedShortageMemo2(input.value);
  setShortageQty(input.dataset.orderGroup, input.dataset.itemNo, input.value).catch(showError);
}

function shortageQtyInput(invoice, item, value = shortageQty(item), extraClass = "") {
  return `<input class="shortage-input ${extraClass}" data-shortage-input data-action="shortage-set" type="text" value="${escapeHtml(itemManagementMemo2(item, value))}" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}" aria-label="관리메모2">`;
}

function firstRawText(source, ...keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function firstRawPreservedText(source, ...keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined) continue;
    const text = String(value);
    if (text.trim()) return text;
  }
  return "";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows) {
  const csv = (rows || []).map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestampForFilename() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function itemSellerProductName(item) {
  return firstRawPreservedText(item.raw, "seller_product_name", "seller_p_name", "mall_product_name", "p_name") || item.productName || "";
}

function itemSellerOptionName(item) {
  return firstRawPreservedText(item.raw, "seller_option_name", "seller_p_option", "mall_option_name", "p_option") || item.optionName || "";
}

function itemSellpiaItemNo(item) {
  return firstRawText(item.raw, "item_no", "sellpia_item_no", "order_item_no") || item.sellpiaItemNo || "";
}

function isSellerOrderMemoLine(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  const normalized = text.replace(/\s+/g, "");
  if (/^(판매처)?주문번호[:：-]?[A-Za-z0-9_-]{8,}$/.test(normalized)) return true;
  if (/^(에이블리|쿠팡|플레이오토|playauto|ably|coupang)[:：-]?[A-Za-z0-9_-]{8,}$/i.test(normalized)) return true;
  return /^[0-9]{8,}$/.test(normalized.replace(/[-_]/g, ""));
}

function cleanSellpiaManageMemo(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isSellerOrderMemoLine(line))
    .join("\n");
}

function itemOrderMemo(invoice, item) {
  return cleanSellpiaManageMemo(firstRawText(item.raw, "order_memo", "o_memo", "memo") || invoice.orderMemo || "");
}

function itemSellpiaOrderMemo(invoice, item) {
  return firstRawPreservedText(item.raw, "order_memo", "o_memo", "memo") || invoice.orderMemo || "";
}

function inspectionMemoCode(item) {
  return String(item?.sellpiaProductCode || item?.raw?.p_code || item?.ownCode || "").trim();
}

function itemInspectionMemo(item) {
  return String(item?.inspectionMemo || item?.raw?.insp_memo || item?.raw?.inspection_memo || "").trim();
}

function patchLocalInspectionMemo(invoice, item, value) {
  const code = inspectionMemoCode(item);
  for (const inv of state.viewModel?.invoices || []) {
    if (inv.invoiceNo !== invoice.invoiceNo && inv.orderGroupNo !== invoice.orderGroupNo) continue;
    for (const row of inv.items || []) {
      if (inspectionMemoCode(row) !== code) continue;
      row.inspectionMemo = value || "";
      if (row.raw) row.raw.insp_memo = value || "";
    }
  }
  for (const inv of state.workflowQueues?.viewModel?.invoices || []) {
    if (inv.invoiceNo !== invoice.invoiceNo && inv.orderGroupNo !== invoice.orderGroupNo) continue;
    for (const row of inv.items || []) {
      if (inspectionMemoCode(row) !== code) continue;
      row.inspectionMemo = value || "";
      if (row.raw) row.raw.insp_memo = value || "";
    }
  }
}

function patchLocalSellpiaOrderMemo(invoice, item, value) {
  for (const inv of state.viewModel?.invoices || []) {
    if (inv.orderGroupNo !== invoice.orderGroupNo) continue;
    for (const row of inv.items || []) {
      if (String(row.sellpiaItemNo || "") !== String(item.sellpiaItemNo || "")) continue;
      if (row.raw) row.raw.order_memo = value || "";
    }
  }
  for (const inv of state.workflowQueues?.viewModel?.invoices || []) {
    if (inv.orderGroupNo !== invoice.orderGroupNo) continue;
    for (const row of inv.items || []) {
      if (String(row.sellpiaItemNo || "") !== String(item.sellpiaItemNo || "")) continue;
      if (row.raw) row.raw.order_memo = value || "";
    }
  }
}

function buildPlannedPrintCsvRows() {
  const headers = ["작업번호", "송장번호", "셀피아순번", "주문자", "수취인", "상품종류수", "총수량", "골드포함", "부족/미송", "배송보류"];
  const rows = [headers];
  exportOrderedInvoices().forEach((invoice, index) => {
    const stats = invoiceStats(invoice);
    const metrics = invoice._exportSortMetrics || {};
    rows.push([
      invoice.plannedPrintSeqNo || index + 1,
      invoice.invoiceNo || "",
      invoice.raw?.sellpia_seq_no || invoice.raw?.original_seq_no || invoice.raw?.sort_order || invoice.sortOrder || "",
      invoice.buyerName || invoice.displayName || "",
      invoice.recipientName || invoice.csDisplayName || invoice.displayName || "",
      metrics.itemKindCount || stats.total,
      metrics.totalItemQty || stats.qty,
      metrics.hasGoldItem ? "Y" : "",
      metrics.hasShortage ? "Y" : "",
      metrics.hasHold ? "Y" : "",
    ]);
  });
  return rows;
}

function exportPlannedPrintCsv() {
  if (!state.viewModel?.invoices?.length) {
    toast("출력대상 CSV 대상이 없습니다.");
    return;
  }
  const rows = buildPlannedPrintCsvRows();
  downloadCsv(`planned_print_${timestampForFilename()}.csv`, rows);
  toast(`출력대상 CSV ${rows.length - 1}건 다운로드`);
}

function compactFilenamePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "");
}

function alimtalkPhone(invoice) {
  return (
    firstRawText(
      invoice.raw,
      "receiver_mobile",
      "recipient_mobile",
      "receiver_hp",
      "recipient_hp",
      "orderer_mobile",
      "buyer_mobile",
      "mobile",
      "phone",
    ) ||
    invoice.recipientPhone ||
    invoice.buyerPhone ||
    invoiceReceiverMobile(invoice) ||
    invoiceReceiverTel(invoice)
  );
}

function alimtalkName(invoice) {
  return invoice.recipientName || invoice.displayName || invoice.csDisplayName || invoice.buyerName || "";
}

function alimtalkProduct(item) {
  return itemSellerProductName(item) || item.productName || item.ownCode || "";
}

function alimtalkOption(item) {
  return itemSellerOptionName(item) || item.optionName || "";
}

function alimtalkDelayedItemsForInvoice(invoice) {
  return invoiceItemsInSellpiaRowOrder(invoice).filter((item) => {
    const itemState = workflowItemState(invoice, item);
    if (itemState?.inspected || itemState?.cancelled || itemState?.shortageRepicked) return false;
    return itemHasOpenWorkflowShortage(invoice, item) || isHold(item);
  });
}

function alimtalkProductLine(item) {
  const product = alimtalkProduct(item);
  const option = alimtalkOption(item);
  return option ? `${product}(${option})` : product;
}

function alimtalkDebugColumns(row) {
  const invoiceState = workflowInvoiceState(row.invoice);
  const seller = sellerBadgeMeta(row.invoice.seller)?.label || row.invoice.seller || "";
  const delayedItems = alimtalkDelayedItemsForInvoice(row.invoice);
  const shortageItems = delayedItems.length ? delayedItems : row.csReason === "hold" && row.item ? [row.item] : [];
  return [seller, dateKey(row.invoice.receiptDate), invoiceState?.inspected ? "ON" : "OFF", shortageItems.map(alimtalkProductLine).join("\n")];
}

function alimtalkBaseRow(row, item, extra = {}) {
  const invoice = row.invoice;
  const itemState = item ? workflowItemState(invoice, item) : null;
  const date = dateKey(invoice.receiptDate);
  return {
    key: item ? csRowKey(invoice, item) : row.key,
    invoice,
    item,
    state: itemState,
    shortageQty: item ? workflowAwareShortageQty(itemState, item) || previousShortageQuantity(invoice, item) || 1 : 0,
    currentShortageQty: item ? workflowAwareShortageQty(itemState, item) : 0,
    shortageDate: date,
    elapsedDays: daysSinceDateKey(date),
    csMethod: item ? csMethodText(invoice, item) : "",
    ...extra,
  };
}

function buildAlimtalkRowsFromCsInvoices(csRows) {
  const rows = [];
  for (const row of csRows || []) {
    const invoice = row.invoice;
    const invoiceState = workflowInvoiceState(invoice);
    const delayedItems = alimtalkDelayedItemsForInvoice(invoice);
    if (delayedItems.length) {
      delayedItems.forEach((item) => {
        const itemState = workflowItemState(invoice, item);
        rows.push(
          alimtalkBaseRow(row, item, {
            currentShortageQty: workflowAwareShortageQty(itemState, item),
            csReason: isHold(item) || invoiceState?.hold || invoiceState?.csPending ? "hold" : "shortage",
          }),
        );
      });
      continue;
    }
    if (invoiceState?.hold || invoiceState?.csPending) {
      const item = invoiceItemsInSellpiaRowOrder(invoice)[0] || null;
      if (item) rows.push(alimtalkBaseRow(row, item, { key: `${row.key}::hold`, csReason: "hold", currentShortageQty: 0, shortageQty: 0 }));
      continue;
    }
    if (invoiceReadyFromPicking(invoice)) {
      const item = invoiceItemsInSellpiaRowOrder(invoice)[0] || null;
      rows.push(alimtalkBaseRow(row, item, { key: row.key, csReason: "ready", currentShortageQty: 0, shortageQty: 0 }));
    }
  }
  return rows;
}

function classifyAlimtalkRowsByDay(rows) {
  return classifyCsRowsByDay(rows);
}

function alimtalkRowsForDay(dayKey, rows) {
  const debugHeader = ["판매처", "접수일", "검품완료여부", "미송상품"];
  const header = (dayKey === "내일출고" ? ["전화번호", "#{NAME}"] : ["전화번호", "#{NAME}", "#{PRODUCT}", "#{OPTION}"]).concat(debugHeader);
  const body = rows.map((row) =>
    dayKey === "내일출고"
      ? [alimtalkPhone(row.invoice), alimtalkName(row.invoice), ...alimtalkDebugColumns(row)]
      : [alimtalkPhone(row.invoice), alimtalkName(row.invoice), alimtalkProduct(row.item), alimtalkOption(row.item), ...alimtalkDebugColumns(row)],
  );
  return [header, ...body];
}

function exportAlimtalkCsv() {
  const allRows = buildAlimtalkRowsFromCsInvoices(allCsRows());
  if (!allRows.length) {
    toast("알림톡 CSV 대상이 없습니다.");
    return;
  }
  const byDay = classifyAlimtalkRowsByDay(allRows);
  const timestamp = timestampForFilename();
  let fileCount = 0;
  let rowCount = 0;
  CS_DAYS.filter((day) => day.key !== "all").forEach((day) => {
    const rows = byDay[day.key] || [];
    if (!rows.length) return;
    const csvRows = alimtalkRowsForDay(day.key, rows);
    const templateKey = CS_DAY_TEMPLATE[day.key] || day.key;
    downloadCsv(`alimtalk_${compactFilenamePart(day.label)}_${templateKey}_${timestamp}.csv`, csvRows);
    fileCount += 1;
    rowCount += rows.length;
  });
  toast(fileCount ? `알림톡 CSV ${fileCount}개 · ${rowCount}건 다운로드` : "알림톡 CSV 대상이 없습니다.");
}

function invoiceReceiverTel(invoice) {
  return firstRawText(invoice.raw, "receiver_tel", "recipient_tel", "receiver_phone", "recipient_phone", "tel");
}

function invoiceReceiverMobile(invoice) {
  return (
    firstRawText(invoice.raw, "receiver_mobile", "recipient_mobile", "receiver_hp", "recipient_hp", "mobile") ||
    (!invoiceReceiverTel(invoice) ? invoice.recipientPhone : "")
  );
}

function invoiceZipcode(invoice) {
  return firstRawText(invoice.raw, "zipcode", "zip_code", "post_code", "receiver_zipcode", "recipient_zipcode", "receiver_zip");
}

function invoiceAddress(invoice) {
  const direct = firstRawText(invoice.raw, "receiver_address", "recipient_address", "address", "addr", "receiver_addr", "recipient_addr");
  if (direct) return direct;
  return [firstRawText(invoice.raw, "receiver_addr1", "recipient_addr1", "addr1"), firstRawText(invoice.raw, "receiver_addr2", "recipient_addr2", "addr2")]
    .filter(Boolean)
    .join(" ");
}

function buildToggleCsvRows() {
  const headers = [
    "주문번호",
    "접수일자",
    "주문품목No",
    "판매처상품명",
    "판매처옵션명",
    "주문수량",
    "수취인명",
    "수취인연락처",
    "수취인핸드폰",
    "우편번호",
    "주소",
    "주문메모",
  ];
  const rows = [headers];
  frontOrderedInvoicesForExport().forEach((invoice) => {
    invoiceItemsInSellpiaRowOrder(invoice).forEach((item) => {
      rows.push([
        invoice.orderGroupNo || "",
        invoice.receiptDate || "",
        itemSellpiaItemNo(item),
        itemSellerProductName(item),
        itemSellerOptionName(item),
        item.quantity || 1,
        invoice.recipientName || invoice.displayName || "",
        invoiceReceiverTel(invoice),
        invoiceReceiverMobile(invoice),
        invoiceZipcode(invoice),
        invoiceAddress(invoice),
        itemOrderMemo(invoice, item),
      ]);
    });
  });
  return rows;
}

function validateToggleCsvRows(rows) {
  const stats = {
    total: 0,
    missingRequired: 0,
    missingName: 0,
    missingTel: 0,
    missingZip: 0,
    missingAddress: 0,
    missingItemNo: 0,
    badItemNo: 0,
  };
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    stats.total += 1;
    const orderNo = String(row[0] || "").trim();
    const itemNo = String(row[2] || "").trim();
    const name = String(row[6] || "").trim();
    const hasTel = String(row[7] || "").trim() || String(row[8] || "").trim();
    const zip = String(row[9] || "").trim();
    const address = String(row[10] || "").trim();
    if (!itemNo) stats.missingItemNo += 1;
    if (itemNo && orderNo && itemNo === orderNo) stats.badItemNo += 1;
    if (!name) stats.missingName += 1;
    if (!hasTel) stats.missingTel += 1;
    if (!zip) stats.missingZip += 1;
    if (!address) stats.missingAddress += 1;
    if (!name || !hasTel || !zip || !address || !itemNo || itemNo === orderNo) stats.missingRequired += 1;
  }
  return stats;
}

function showPostOfficeEnrichmentStatus() {
  if (!state.viewModel?.invoices?.length) {
    toast("보강현황 대상 주문이 없습니다.");
    return;
  }

  const invoices = exportOrderedInvoices();
  const rows = buildToggleCsvRows();
  const stats = validateToggleCsvRows(rows);
  let enriched = 0;
  let missingAddress = 0;
  let missingTel = 0;
  let missingZip = 0;
  let missingMobile = 0;
  let missingMemo = 0;
  let missingOrderNo = 0;

  invoices.forEach((invoice) => {
    if (firstRawText(invoice.raw, "enriched_at", "postoffice_enriched_at")) enriched += 1;
    if (!invoiceAddress(invoice)) missingAddress += 1;
    if (!invoiceReceiverTel(invoice) && !invoiceReceiverMobile(invoice)) missingTel += 1;
    if (!invoiceReceiverMobile(invoice)) missingMobile += 1;
    if (!invoiceZipcode(invoice)) missingZip += 1;
    if (!itemOrderMemo(invoice, (invoice.items || [])[0] || {})) missingMemo += 1;
    if (!String(invoice.orderGroupNo || "").trim()) missingOrderNo += 1;
  });

  const message = [
    "토글 등록 CSV 준비 현황",
    "",
    `총 주문: ${invoices.length}`,
    `CSV 상품행: ${stats.total}`,
    `보강 완료(enriched_at): ${enriched}`,
    `주소 누락: ${missingAddress}`,
    `연락처(전화/핸드폰 모두) 누락: ${missingTel}`,
    `핸드폰 누락: ${missingMobile}`,
    `우편번호 누락: ${missingZip}`,
    `주문메모 누락: ${missingMemo}`,
    `주문번호 누락: ${missingOrderNo}`,
    `주문품목No 누락: ${stats.missingItemNo}`,
    `주문번호로 잘못 들어간 품목No: ${stats.badItemNo}`,
    `필수정보 누락 상품행: ${stats.missingRequired}`,
  ].join("\n");

  console.log("[TOGLE] registration CSV status", {
    totalOrders: invoices.length,
    enriched,
    missingAddress,
    missingTel,
    missingMobile,
    missingZip,
    missingMemo,
    missingOrderNo,
    csvStats: stats,
  });
  window.alert(message);
}

function exportToggleCsv() {
  if (!state.viewModel?.invoices?.length) {
    toast("토글 CSV 대상이 없습니다.");
    return;
  }
  if (state.session !== "ALL" && !window.confirm("현재 오전/오후 필터가 적용되어 있습니다. 현재 필터 데이터만 토글 CSV로 받을까요?")) {
    return;
  }
  const rows = buildToggleCsvRows();
  const stats = validateToggleCsvRows(rows);
  if (stats.missingRequired > 0) {
    const proceed = window.confirm(
      `토글 등록 필수정보가 누락된 행이 있습니다.\n\n총 ${stats.total}행 중 ${stats.missingRequired}행 누락\n- 수취인명: ${stats.missingName}\n- 연락처: ${stats.missingTel}\n- 우편번호: ${stats.missingZip}\n- 주소: ${stats.missingAddress}\n- 주문품목No: ${stats.missingItemNo}\n- 주문번호로 들어간 품목No: ${stats.badItemNo}\n\n그래도 다운로드할까요?`,
    );
    if (!proceed) return;
  }
  downloadCsv(`togle_registration_${timestampForFilename()}.csv`, rows);
  toast(`토글 CSV ${rows.length - 1}행 다운로드`);
}

const LABEL_CSV_HEADER = ["라벨번호", "상품코드", "자사코드", "판매처 상품명", "판매처 옵션명", "수량", "접수일자", "수취인"];
const LABEL_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function createLabelExportStats() {
  return {
    originalRows: 0,
    targetRows: 0,
    finalRows: 0,
    invalidQtyDefaulted: 0,
    skipped: {
      noPrivateCode: 0,
      caExcluded: 0,
      notGp: 0,
      optionFailed: 0,
      qtyZero: 0,
      printed: 0,
      duplicateKey: 0,
    },
  };
}

function addLabelSkip(stats, reason) {
  if (stats?.skipped && Object.prototype.hasOwnProperty.call(stats.skipped, reason)) stats.skipped[reason] += 1;
}

function normalizePrivateCode(rawCode) {
  const raw = String(rawCode || "").trim();
  if (!raw) return "";
  const match = raw.match(/\[[^\]]+\]/);
  return match ? match[0].trim() : "";
}

function getLabelTargetResult(row, stats) {
  const raw = String(row?.privateCode ?? row?.prodCode ?? row?.code ?? "").trim();
  if (!raw) {
    addLabelSkip(stats, "noPrivateCode");
    return { ok: false, code: "" };
  }
  const normalized = normalizePrivateCode(raw);
  if (/^\[CA/i.test(raw) || /^\[CA/i.test(normalized)) {
    addLabelSkip(stats, "caExcluded");
    return { ok: false, code: normalized };
  }
  if (!normalized || !/^\[GP/i.test(normalized)) {
    addLabelSkip(stats, "notGp");
    return { ok: false, code: normalized };
  }
  return { ok: true, code: normalized };
}

function isLabelTarget(row) {
  return getLabelTargetResult(row, null).ok;
}

function normalizeProductName(productCode, productName) {
  if (String(productCode || "").trim().startsWith("6778")) return "14K 골드 볼 피어싱 0.8mm 24종";
  return String(productName || "").trim();
}

function formatCsvTextCell(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `="${text.replace(/"/g, '""')}"`;
}

function normalizeLabelOptionName(optionName) {
  let value = String(optionName || "").trim();
  if (value.includes(":")) value = value.split(":").pop();
  if (value.includes("[")) value = value.split("[")[0];
  return value.trim();
}

function getLabelWeekday(receivedAt) {
  const raw = String(receivedAt || state.selectedDate || "").trim();
  const compact = raw.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  const date = compact ? new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3])) : new Date(raw);
  if (Number.isNaN(date.getTime())) return LABEL_WEEKDAYS[new Date().getDay()];
  return LABEL_WEEKDAYS[date.getDay()];
}

function makeLabelKey(row, privateCode, optionName, unitIndex) {
  return [
    String(row?.invNo || row?.orderNo || "").trim(),
    String(row?.productCode || "").trim(),
    String(privateCode || "").trim(),
    String(optionName || "").trim(),
    String(row?.receivedAt || "").trim(),
    String(unitIndex),
  ].join("|");
}

function getPrintedLabelKeys() {
  return new Set();
}

function expandRowsByQty(row, stats) {
  const rawQty = String(row?.qty ?? "").replace(/,/g, "").trim();
  let qty = parseInt(rawQty, 10);
  if (!Number.isFinite(qty)) {
    qty = 1;
    if (stats) stats.invalidQtyDefaulted += 1;
  }
  if (qty <= 0) {
    addLabelSkip(stats, "qtyZero");
    return [];
  }
  return Array.from({ length: qty }, () => ({ ...row, qty: 1 }));
}

function buildLabelCsvRows(rows, options = {}) {
  const stats = createLabelExportStats();
  const csvRows = [LABEL_CSV_HEADER];
  const xlsxMode = options.format === "xlsx";
  const weekdaySeq = {};
  const emittedKeys = new Set();
  const printedKeys = options.printedKeys || getPrintedLabelKeys();
  const newLabelKeys = [];

  (rows || []).forEach((row) => {
    stats.originalRows += 1;
    const target = getLabelTargetResult(row, stats);
    if (!target.ok) return;
    const optionName = normalizeLabelOptionName(row.optionName);
    if (!optionName) {
      addLabelSkip(stats, "optionFailed");
      return;
    }
    const expanded = expandRowsByQty(row, stats);
    if (!expanded.length) return;
    stats.targetRows += 1;
    const productName = normalizeProductName(row.productCode, row.productName);
    const weekday = getLabelWeekday(row.receivedAt);
    expanded.forEach((expandedRow, copyIndex) => {
      const unitIndex = copyIndex + 1;
      const labelKey = makeLabelKey(row, target.code, optionName, unitIndex);
      if (printedKeys.has(labelKey)) {
        addLabelSkip(stats, "printed");
        return;
      }
      if (emittedKeys.has(labelKey)) {
        addLabelSkip(stats, "duplicateKey");
        return;
      }
      emittedKeys.add(labelKey);
      newLabelKeys.push(labelKey);
      weekdaySeq[weekday] = (weekdaySeq[weekday] || 0) + 1;
      csvRows.push([
        `${weekday}${weekdaySeq[weekday]}`,
        xlsxMode ? String(expandedRow.productCode || "").trim() : formatCsvTextCell(expandedRow.productCode || ""),
        target.code,
        productName,
        optionName,
        1,
        expandedRow.receivedAt || "",
        expandedRow.recipient || "",
      ]);
    });
  });

  stats.finalRows = csvRows.length - 1;
  return { rows: csvRows, stats, labelKeys: newLabelKeys };
}

function downloadLabelCsv(filename, rows) {
  downloadCsv(filename, rows);
}

function downloadLabelXlsx(filename, rows) {
  if (!window.XLSX) {
    toast("XLSX 라이브러리 로드 실패: CSV로 저장합니다.");
    downloadLabelCsv(filename.replace(/\.xlsx$/i, ".csv"), rows);
    return;
  }
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.aoa_to_sheet(rows || []);
  ws["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 42 }, { wch: 36 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
  const range = window.XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  for (let row = 0; row <= range.e.r; row += 1) {
    ["B", "C", "G"].forEach((col) => {
      const address = `${col}${row + 1}`;
      if (ws[address]) {
        ws[address].t = "s";
        ws[address].z = "@";
      }
    });
  }
  window.XLSX.utils.book_append_sheet(wb, ws, "라벨");
  window.XLSX.writeFile(wb, filename, { bookType: "xlsx" });
}

function labelReceivedAtForItem(invoice, item) {
  return invoice?.receiptDate || firstRawText(item.raw, "receipt_date") || "";
}

function labelShortageRankKeysForRow(row) {
  const orderKeys = [row?.ord_no, row?.inv_no].map((value) => String(value || "").trim()).filter(Boolean);
  const itemKeys = [row?.item_no, row?.p_code, row?.sellpia_p_code].map((value) => String(value || "").trim()).filter(Boolean);
  return orderKeys.flatMap((orderKey) => itemKeys.map((itemKey) => `${orderKey}::${itemKey}`));
}

function labelShortageRankKeysForItem(invoice, item) {
  const orderKeys = [invoice?.orderGroupNo, invoice?.invoiceNo].map((value) => String(value || "").trim()).filter(Boolean);
  const itemKeys = [item?.sellpiaItemNo, item?.ownCode, item?.sellpiaProductCode].map((value) => String(value || "").trim()).filter(Boolean);
  return orderKeys.flatMap((orderKey) => itemKeys.map((itemKey) => `${orderKey}::${itemKey}`));
}

async function loadLabelShortageRankMap() {
  const rows = await fetchAllRows(() =>
    db
      .from("shortage")
      .select("ord_no,inv_no,item_no,p_code,sellpia_p_code,created_at,updated_at,work_date")
      .order("created_at", { ascending: true, nullsFirst: false }),
  );
  const map = new Map();
  rows.forEach((row, index) => {
    const time = new Date(row.created_at || row.updated_at || row.work_date || 0).getTime() || 0;
    const rank = { index, time };
    labelShortageRankKeysForRow(row).forEach((key) => {
      if (!map.has(key)) map.set(key, rank);
    });
  });
  return map;
}

function labelItemRank(invoice, item, shortageRankMap) {
  for (const key of labelShortageRankKeysForItem(invoice, item)) {
    const rank = shortageRankMap?.get(key);
    if (rank) return rank;
  }
  return null;
}

function compareLabelItems(invoice, shortageRankMap) {
  return (a, b) => {
    const aRank = labelItemRank(invoice, a, shortageRankMap);
    const bRank = labelItemRank(invoice, b, shortageRankMap);
    if (aRank || bRank) {
      if (!aRank) return 1;
      if (!bRank) return -1;
      if (aRank.time !== bRank.time) return aRank.time - bRank.time;
      if (aRank.index !== bRank.index) return aRank.index - bRank.index;
    }
    return compareInvoiceItemsBySellpiaRow(a, b);
  };
}

function labelInvoiceRank(invoice, shortageRankMap) {
  let best = null;
  (invoice.items || []).forEach((item) => {
    const rank = labelItemRank(invoice, item, shortageRankMap);
    if (!rank) return;
    if (!best || rank.time < best.time || (rank.time === best.time && rank.index < best.index)) best = rank;
  });
  return best;
}

function labelSourceInvoices(shortageRankMap = new Map()) {
  const selected = exportOrderedInvoices(state.viewModel?.invoices || [])
    .filter((invoice) => (invoice.items || []).some((item) => isGoldItem(item) || isLabelTarget({ privateCode: item.ownCode || "" })))
    .map((invoice) => ({ ...invoice, _labelSelectedDate: true }));
  const selectedKeys = new Set(selected.map((invoice) => invoice.orderGroupNo || invoice.invoiceNo).filter(Boolean));
  const extras = mergeInvoicesUnique(
    state.workflowQueues?.inspectionInvoices || [],
    state.workflowQueues?.inspectionCompletedInvoices || [],
    state.workflowQueues?.viewModel?.invoices || [],
  )
    .filter((invoice) => {
      const key = invoice.orderGroupNo || invoice.invoiceNo;
      if (!key || selectedKeys.has(key)) return false;
      return (invoice.items || []).some((item) => isGoldItem(item) || isLabelTarget({ privateCode: item.ownCode || "" }));
    })
    .sort(
      (a, b) => {
        const dateCompare = String(a.receiptDate || "").localeCompare(String(b.receiptDate || ""));
        if (dateCompare !== 0) return dateCompare;
        const aRank = labelInvoiceRank(a, shortageRankMap);
        const bRank = labelInvoiceRank(b, shortageRankMap);
        if (aRank || bRank) {
          if (!aRank) return 1;
          if (!bRank) return -1;
          if (aRank.time !== bRank.time) return aRank.time - bRank.time;
          if (aRank.index !== bRank.index) return aRank.index - bRank.index;
        }
        return (
          (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999) ||
          String(a.orderGroupNo || "").localeCompare(String(b.orderGroupNo || ""), "ko", { numeric: true })
        );
      },
    );
  return [...selected, ...extras];
}

function labelItemsForInvoice(invoice, shortageRankMap) {
  return [...(invoice.items || [])].sort(compareLabelItems(invoice, shortageRankMap));
}

function buildGoldLabelSourceRows(shortageRankMap = new Map()) {
  return labelSourceInvoices(shortageRankMap).flatMap((invoice) =>
    labelItemsForInvoice(invoice, shortageRankMap).map((item) => ({
      invNo: invoice.invoiceNo || "",
      orderNo: invoice.orderGroupNo || "",
      productCode: item.sellpiaProductCode || "",
      privateCode: item.ownCode || "",
      productName: item.productName || "",
      optionName: item.optionName || "",
      qty: item.quantity,
      receivedAt: labelReceivedAtForItem(invoice, item),
      recipient: invoice.recipientName || invoice.buyerName || invoice.displayName || "",
    })),
  );
}

async function exportGoldLabelXlsx() {
  if (!state.workflowQueues && !state.workflowQueueError) {
    await loadWorkflowData();
  }
  const shortageRankMap = await loadLabelShortageRankMap();
  const sourceRows = buildGoldLabelSourceRows(shortageRankMap);
  if (!sourceRows.length) {
    toast("라벨 XLSX 대상이 없습니다.");
    return;
  }
  const result = buildLabelCsvRows(sourceRows, { format: "xlsx" });
  if (!result.rows || result.rows.length <= 1) {
    toast("라벨 XLSX 대상 GP 상품이 없습니다.");
    return;
  }
  downloadLabelXlsx(`label_${timestampForFilename()}.xlsx`, result.rows);
  toast(`라벨 XLSX ${result.rows.length - 1}행 다운로드`);
}

async function reorderInvoiceSortOrder() {
  if (!allowOrderReorder) {
    toast("송장순서 재정렬이 비활성화되어 있습니다.");
    return;
  }
  if (state.session === "ALL") {
    toast("오전 또는 오후를 선택한 뒤 해당 시간대만 송장순서 재정렬하세요.");
    return;
  }
  const targetSession = state.session;
  const ordered = workOrderedInvoices().filter((invoice) => String(invoice?.session || invoice?.raw?.am_pm || "").trim().toUpperCase() === targetSession);
  if (!ordered.length) {
    toast(`${targetSession === "AM" ? "오전" : "오후"} 재정렬할 송장이 없습니다.`);
    return;
  }

  const sessionLabel = targetSession === "AM" ? "오전" : "오후";
  const proceed = window.confirm(
    `현재 ${sessionLabel} 화면에 보이는 작업순서 기준으로 ${ordered.length}개 송장의 sort_order를 다시 저장할까요?\n다른 시간대 송장순서는 변경하지 않습니다.\n골드 송장은 해당 시간대의 뒤쪽으로 배치됩니다.`,
  );
  if (!proceed) return;

  for (let index = 0; index < ordered.length; index += 1) {
    const invoice = ordered[index];
    const nextSortOrder = index + 1;
    const { error } = await db.from("orders").update({ sort_order: nextSortOrder }).eq("ord_no", invoice.orderGroupNo).eq("am_pm", targetSession);
    if (error) throw error;
    invoice.sortOrder = nextSortOrder;
  }

  state.workSortMode = false;
  els.sortToggle.classList.remove("primary");
  els.sortToggle.textContent = "송장순서";
  state.currentGroup = 0;
  await loadPickingData();
  toast(`${sessionLabel} 송장순서 재정렬 완료: ${ordered.length}건`);
}

async function reorderInvoicesByCurrentView() {
  return reorderInvoiceSortOrder();
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
  row.item.sellpiaMemo2 = "";
  if (row.item.raw) {
    row.item.raw.o_shop_memo2 = "";
    row.item.raw.shop_memo2 = "";
    row.item.raw.memo2 = "";
  }
  const { error } = await db.from("order_items").update({ o_shop_memo2: "" }).eq("ord_no", row.invoice.orderGroupNo).eq("item_no", row.item.sellpiaItemNo);
  if (error) throw error;

  state.selectedInspectionGroup = row.invoice.orderGroupNo;
  state.selectedShortageKey = "";
  renderWorkflowSurfaces();
  toast("미송피킹 완료: 관리메모2를 비우고 검품탭에 송장 전체가 표시됩니다.");
}

function findWorkflowInvoiceItem(orderGroupNo, sellpiaItemNo) {
  const groupNo = String(orderGroupNo || "");
  const itemNo = String(sellpiaItemNo || "");
  const invoices = [
    ...(state.workflowQueues?.viewModel?.invoices || []),
    ...(state.workflowQueues?.inspectionInvoices || []),
    ...(state.workflowQueues?.inspectionCompletedInvoices || []),
  ];
  for (const invoice of invoices) {
    if (String(invoice.orderGroupNo || "") !== groupNo) continue;
    const item = (invoice.items || []).find((entry) => String(entry.sellpiaItemNo || "") === itemNo);
    if (item) return { invoice, item };
  }
  return { invoice: null, item: null };
}

function previousShortageQuantity(invoice, item) {
  const key = workflowItemKey(invoice, item);
  const events = [...(state.workflowQueues?.syntheticEvents?.itemEvents || []), ...(state.workflowQueues?.itemEvents || [])]
    .filter((event) => `${event.order_group_no}::${event.sellpia_item_no}` === key)
    .sort((a, b) => workflowEventTime(a) - workflowEventTime(b) || Number(a.id || 0) - Number(b.id || 0));

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.event_type !== "shortage_created" && event.event_type !== "shortage_qty_changed") continue;
    const qty = Number(event.quantity || 0);
    if (qty > 0) return qty;
  }
  return Number(item.shortageState?.shortageQty || item.pickingState?.shortageQty || 1) || 1;
}

async function reopenShortageRepick(orderGroupNo, sellpiaItemNo) {
  const { invoice, item } = findWorkflowInvoiceItem(orderGroupNo, sellpiaItemNo);
  if (!invoice || !item) {
    toast("미송피킹 완료취소 대상을 찾지 못했습니다.");
    return;
  }
  const itemState = workflowItemState(invoice, item);
  if (!itemState?.shortageRepicked || itemState?.cancelled) {
    toast("이미 미송피킹 대기 상태입니다.");
    return;
  }

  const ok = await saveWorkflowItemEvent(invoice, item, "shortage_created", {
    quantity: previousShortageQuantity(invoice, item),
    memo: itemState?.memo || "shortage repick reopened",
    drawerMemo: itemState?.drawerMemo || item.pickingState?.drawerMemo || invoice.sellpiaMemo1 || null,
  });
  if (!ok) return;

  state.activeTab = "shortage";
  state.selectedShortageKey = workflowItemKey(invoice, item);
  state.selectedInspectionGroup = "";
  renderWorkflowSurfaces();
  toast("미송피킹 완료를 취소했습니다. 미송피킹 목록으로 돌아갑니다.");
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
  row.item.sellpiaMemo1 = drawerMemo;
  row.item.sellpiaMemo2 = memo;
  if (row.item.raw) row.item.raw.o_shop_memo = drawerMemo;
  if (row.item.raw) {
    row.item.raw.o_shop_memo2 = memo;
    row.item.raw.shop_memo2 = memo;
    row.item.raw.memo2 = memo;
  }
  const { error } = await db.from("order_items").update({ o_shop_memo: drawerMemo, o_shop_memo2: memo }).eq("ord_no", row.invoice.orderGroupNo).eq("item_no", row.item.sellpiaItemNo);
  if (error) throw error;
  state.selectedShortageKey = shortageKey;
  renderWorkflowSurfaces();
  toast("미송 메모 저장 완료");
}

function findInspectionInvoiceItem(orderGroupNo, sellpiaItemNo) {
  const groupNo = String(orderGroupNo || "");
  const itemNo = String(sellpiaItemNo || "");
  const invoices = [
    ...(state.viewModel?.invoices || []),
    ...(state.workflowQueues?.viewModel?.invoices || []),
    ...(state.workflowQueues?.inspectionInvoices || []),
    ...(state.workflowQueues?.inspectionCompletedInvoices || []),
  ];
  for (const invoice of invoices) {
    if (String(invoice.orderGroupNo || "") !== groupNo) continue;
    const item = (invoice.items || []).find((entry) => String(entry.sellpiaItemNo || "") === itemNo);
    if (item) return { invoice, item };
  }
  return { invoice: null, item: null };
}

async function saveInspectionSellpiaOrderMemo(orderGroupNo, sellpiaItemNo, value) {
  if (!allowWrites) {
    toast("읽기전용입니다. URL의 write=0을 제거하면 셀피아 주문메모를 저장할 수 있습니다.");
    return;
  }
  const { invoice, item } = findInspectionInvoiceItem(orderGroupNo, sellpiaItemNo);
  if (!invoice || !item) {
    toast("셀피아 주문메모 저장 대상을 찾지 못했습니다.");
    return;
  }
  const nextValue = String(value || "");
  const buildQuery = (patch) => {
    let query = db.from("order_items").update(patch).eq("ord_no", invoice.orderGroupNo);
    if (item.sellpiaItemNo) query = query.eq("item_no", item.sellpiaItemNo);
    else query = query.eq("sort_order", item.sortOrder || item.itemOrderIndex || 0);
    return query;
  };
  let { error } = await buildQuery({ order_memo: nextValue, order_memo_updated_at: new Date().toISOString() });
  if (error && /order_memo_updated_at|column|schema cache/i.test(error.message || "")) {
    ({ error } = await buildQuery({ order_memo: nextValue }));
  }
  if (error) {
    toast(`셀피아 주문메모 저장 실패: ${error.message}`);
    throw error;
  }
  patchLocalSellpiaOrderMemo(invoice, item, nextValue);
  toast("셀피아 주문메모 저장");
}

async function saveInspectionConfirmMemo(orderGroupNo, sellpiaItemNo, value) {
  if (!allowWrites) {
    toast("읽기전용입니다. URL의 write=0을 제거하면 상품 확인메모를 저장할 수 있습니다.");
    return;
  }
  const { invoice, item } = findInspectionInvoiceItem(orderGroupNo, sellpiaItemNo);
  if (!invoice || !item) {
    toast("상품 확인메모 저장 대상을 찾지 못했습니다.");
    return;
  }
  const code = inspectionMemoCode(item);
  if (!code) {
    toast("셀피아코드가 없어 상품 확인메모를 저장할 수 없습니다.");
    return;
  }
  const nextValue = String(value || "").trim();
  const row = {
    inv_no: invoice.invoiceNo || "",
    ord_no: invoice.orderGroupNo,
    item_no: item.sellpiaItemNo || "",
    p_code: code,
    insp_memo: nextValue,
    memo_updated_at: new Date().toISOString(),
  };
  let { error } = await db.from("inspection").upsert(row, { onConflict: "inv_no,p_code" });
  if (error && /memo_updated_at|column|schema cache/i.test(error.message || "")) {
    const { memo_updated_at, ...fallbackRow } = row;
    void memo_updated_at;
    ({ error } = await db.from("inspection").upsert(fallbackRow, { onConflict: "inv_no,p_code" }));
  }
  if (error) {
    toast(`상품 확인메모 저장 실패: ${error.message}`);
    throw error;
  }
  patchLocalInspectionMemo(invoice, item, nextValue);
  toast("상품 확인메모 저장");
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
  if (workflowInvoiceState(invoice)?.hold) {
    toast("보류 송장은 보류 해제 후 완료 처리할 수 있습니다.");
    return;
  }
  const ok = await saveWorkflowInvoiceEvent(invoice, "inspection_completed", { memo: "inspection completed" });
  if (!ok) return;
  state.activeTab = "inspection";
  state.selectedInspectionGroup = invoice.orderGroupNo;
  state.selectedCompletedGroup = invoice.orderGroupNo;
  state.inspectionHideCompleted = false;
  renderWorkflowSurfaces();
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
  renderWorkflowSurfaces();
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
  renderWorkflowSurfaces();
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
    paintPickingItemState(invoice, item);
    schedulePickingSurfaces();
    try {
      await savePickingRow(invoice, item, isPicked(item) ? "picked" : "pick_unchecked");
      toast("피킹 상태 저장");
    } catch (error) {
      patchLocalPickingState(invoice, item, { isPicked: !isPicked(item) });
      renderPickingSurfaces();
      toast(`저장 실패: ${error.message}`);
    }
  }

  if (action === "shortage") {
    const delta = Number(target.dataset.delta || 0);
    const prev = shortageQty(item);
    const next = Math.max(0, prev + delta);
    await setShortageQty(orderGroupNo, sellpiaItemNo, next);
  }
}

function onDrawerChange(event) {
  const input = event.target.closest("[data-action='drawer'], [data-inspection-drawer], [data-cs-drawer]");
  if (!input) return;
  const invoice = findInvoiceAndItem(input.dataset.orderGroup, "")?.invoice || (state.viewModel?.invoices || []).find((row) => row.orderGroupNo === input.dataset.orderGroup);
  if (!invoice) return;
  const value = input.value.trim();
  saveDrawerForInvoice(invoice, value)
    .then(() => {
      invoice.sellpiaMemo1 = value;
      if (input.matches("[data-inspection-drawer]")) renderInspectionPanels();
      else if (input.matches("[data-cs-drawer]")) renderCsPanels();
      else render();
      toast("서랍번호 저장");
    })
    .catch((error) => toast(`서랍번호 저장 실패: ${error.message}`));
}

function drawerDigitsOnly(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

function drawerPrefixForSeller(seller) {
  const text = String(seller || "").trim().toLowerCase();
  if (text.includes("ably") || text.includes("a-bly") || text.includes("에이블리")) return "ㅁㅇ";
  if (text.includes("coupang") || text.includes("쿠팡")) return "ㅁㅋ";
  if (text.includes("zigzag") || text.includes("zig") || text.includes("지그재그")) return "ㅁㅈ";
  if (text.includes("smart") || text.includes("naver") || text.includes("스마트") || text.includes("네이버")) return "ㅁㅅ";
  return "ㅁㅁ";
}

function splitDrawerMemo(value) {
  const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
  const first = (lines.shift() || "").trim();
  const rest = lines.join("\n").trim();
  if (/^(ㅁ[ㅁㅅㅇㅋㅈ])?\s*\d+\s*$/.test(first)) {
    return { digits: drawerDigitsOnly(first), note: rest };
  }
  return { digits: drawerDigitsOnly(first), note: [first, rest].filter(Boolean).join("\n") };
}

function composeDrawerMemo(invoice, digits, note = "") {
  const drawerNo = drawerDigitsOnly(digits);
  const cleanNote = String(note || "").trim();
  if (!drawerNo) return cleanNote;
  const firstLine = `${drawerPrefixForSeller(invoice?.seller)}${drawerNo}`;
  return cleanNote ? `${firstLine}\n${cleanNote}` : firstLine;
}

function ensureDrawerKeypad() {
  let overlay = document.getElementById("drawer-keypad-overlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "drawer-keypad-overlay";
  overlay.className = "drawer-keypad-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `<div class="drawer-keypad" role="dialog" aria-modal="true" aria-label="서랍번호 입력">
    <div class="drawer-keypad-display">
      <strong id="drawer-keypad-value">-</strong>
      <span>서랍번호</span>
    </div>
    <div class="drawer-keypad-grid">
      ${["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => `<button type="button" data-keypad-digit="${digit}">${digit}</button>`).join("")}
      <button type="button" data-keypad-action="clear">지움</button>
      <button type="button" data-keypad-digit="0">0</button>
      <button type="button" data-keypad-action="delete">⌫</button>
    </div>
    <div class="drawer-keypad-actions">
      <button type="button" data-keypad-action="close">닫기</button>
      <button type="button" class="primary" data-keypad-action="done">확인</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (event) => onDrawerKeypadClick(event).catch(showError));
  return overlay;
}

function renderDrawerKeypad() {
  const display = document.getElementById("drawer-keypad-value");
  if (display) display.textContent = state.drawerKeypad.value || "-";
}

function openDrawerKeypad(input) {
  if (!input) return;
  state.drawerKeypad.orderGroupNo = input.dataset.orderGroup || "";
  const parsed = splitDrawerMemo(input.value);
  state.drawerKeypad.value = parsed.digits;
  state.drawerKeypad.note = parsed.note;
  const overlay = ensureDrawerKeypad();
  overlay.hidden = false;
  renderDrawerKeypad();
}

function closeDrawerKeypad() {
  const overlay = document.getElementById("drawer-keypad-overlay");
  if (overlay) overlay.hidden = true;
  state.drawerKeypad.orderGroupNo = "";
  state.drawerKeypad.value = "";
  state.drawerKeypad.note = "";
}

async function commitDrawerKeypad() {
  if (!allowWrites) {
    toast("읽기전용입니다. URL의 write=0을 제거하면 서랍번호를 저장할 수 있습니다.");
    closeDrawerKeypad();
    return;
  }
  const invoice = (state.viewModel?.invoices || []).find((row) => row.orderGroupNo === state.drawerKeypad.orderGroupNo);
  if (!invoice) {
    toast("서랍번호 저장 대상을 찾지 못했습니다.");
    closeDrawerKeypad();
    return;
  }
  const value = composeDrawerMemo(invoice, state.drawerKeypad.value, state.drawerKeypad.note);
  await saveDrawerForInvoice(invoice, value);
  invoice.sellpiaMemo1 = value;
  closeDrawerKeypad();
  render();
  toast("서랍번호 저장");
}

async function onDrawerKeypadClick(event) {
  if (event.target.id === "drawer-keypad-overlay") {
    closeDrawerKeypad();
    return;
  }
  const digit = event.target.closest("[data-keypad-digit]")?.dataset.keypadDigit;
  if (digit !== undefined) {
    state.drawerKeypad.value = drawerDigitsOnly(`${state.drawerKeypad.value}${digit}`);
    renderDrawerKeypad();
    return;
  }
  const action = event.target.closest("[data-keypad-action]")?.dataset.keypadAction;
  if (action === "clear") state.drawerKeypad.value = "";
  if (action === "delete") state.drawerKeypad.value = state.drawerKeypad.value.slice(0, -1);
  if (action === "close") closeDrawerKeypad();
  if (action === "done") await commitDrawerKeypad();
  renderDrawerKeypad();
}

function onDrawerKeypadOpen(event) {
  const input = event.target.closest(".drawer-input[data-action='drawer']");
  if (!input) return;
  event.preventDefault();
  input.blur();
  openDrawerKeypad(input);
}

async function bulkToggleGroup(groupIndex) {
  if (!allowWrites) {
    toast("읽기전용입니다. URL의 write=0을 제거하면 조 일괄 체크를 저장할 수 있습니다.");
    return;
  }

  const group = state.groups[groupIndex] || [];
  const targets = groupBulkTargets(group);
  if (!targets.length) {
    toast("일괄 체크할 상품이 없습니다.");
    return;
  }

  const nextPicked = !targets.every(({ item }) => isPicked(item));
  const changed = targets.filter(({ item }) => isPicked(item) !== nextPicked);
  if (!changed.length) {
    toast("변경할 상품이 없습니다.");
    return;
  }

  changed.forEach(({ invoice, item }) => patchLocalPickingState(invoice, item, { isPicked: nextPicked }));
  renderPickingSurfaces();

  try {
    for (const { invoice, item } of changed) {
      await savePickingRow(invoice, item, nextPicked ? "picked" : "pick_unchecked");
    }
    toast(`${state.groupInfos[groupIndex]?.label || `${groupIndex + 1}조`} ${nextPicked ? "일괄 체크" : "일괄 체크 취소"} 완료: ${changed.length}건`);
  } catch (error) {
    toast(`조 일괄 체크 저장 실패: ${error.message}`);
    await loadPickingData();
  }
}

async function loadPickingData() {
  els.orderList.innerHTML = '<div class="empty">데이터를 불러오는 중입니다.</div>';
  const selectedDate = state.selectedDate;
  const session = state.session;

  const buildOrderQuery = (query) => {
    let next = query.order("sort_order", { ascending: true, nullsFirst: false });
    if (session !== "ALL") next = next.eq("am_pm", session);
    return next;
  };

  const receiptDateOrders = await fetchAllRows(() => buildOrderQuery(db.from("orders").select("*").eq("receipt_date", selectedDate)));
  const ordersByNo = new Map();
  receiptDateOrders.forEach((row) => {
    const key = String(row.ord_no || "").trim();
    if (key) ordersByNo.set(key, row);
  });
  const orders = [...ordersByNo.values()].sort((a, b) => {
    const left = Number(a.sort_order ?? Number.MAX_SAFE_INTEGER);
    const right = Number(b.sort_order ?? Number.MAX_SAFE_INTEGER);
    if (left !== right) return left - right;
    return String(a.ord_no || "").localeCompare(String(b.ord_no || ""));
  });

  const orderNos = orders.map((row) => String(row.ord_no || "").trim()).filter(Boolean);
  const items = orderNos.length
    ? await fetchAllRows(() => db.from("order_items").select("*").in("ord_no", orderNos).order("sort_order", { ascending: true, nullsFirst: false }))
    : [];
  const pickingRows = orderNos.length ? await fetchAllRows(() => db.from("picking").select("*").in("ord_no", orderNos)) : [];
  const shortageRows = orderNos.length ? await fetchAllRows(() => db.from("shortage").select("*").in("ord_no", orderNos)) : [];
  const inspectionRows = orderNos.length ? await loadInspectionMemoRows(orderNos) : [];
  const itemsWithInspectionMemos = applyInspectionMemos(items, inspectionRows);

  state.viewModel = buildPickingViewModel({
    orders,
    orderItems: itemsWithInspectionMemos,
    pickingRows,
    shortageRows,
  });
  rebuildGroups();
  render();
  await loadWorkflowData();
}

async function loadInspectionMemoRows(orderNos) {
  try {
    return await fetchAllRows(() => db.from("inspection").select("inv_no,ord_no,item_no,p_code,insp_memo,memo_updated_at").in("ord_no", orderNos));
  } catch (error) {
    console.warn("inspection memo load skipped", error);
    return [];
  }
}

function applyInspectionMemos(items, memoRows) {
  if (!memoRows?.length) return items;
  const memoByKey = new Map();
  for (const row of memoRows) {
    const memo = String(row.insp_memo || "").trim();
    if (!memo) continue;
    const code = String(row.p_code || "").trim();
    const ord = String(row.ord_no || "").trim();
    const inv = String(row.inv_no || "").trim();
    if (ord && code) memoByKey.set(`${ord}::${code}`, memo);
    if (inv && code) memoByKey.set(`${inv}::${code}`, memo);
  }
  return items.map((item) => {
    const code = String(item.p_code || item.sellpia_p_code || item.sellpia_product_code || item.prod_code || item.p_dpcode || "").trim();
    const ord = String(item.ord_no || item.order_group_no || "").trim();
    const inv = String(item.inv_no || item.dnum || "").trim();
    const memo = memoByKey.get(`${ord}::${code}`) || memoByKey.get(`${inv}::${code}`) || "";
    return memo ? { ...item, insp_memo: memo } : item;
  });
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
  const requestedTab = tab === "gold" ? "picking" : tab;
  const allowedTabs = new Set(["dashboard", "picking", "shortage", "inspection", "cs", "completed"]);
  state.activeTab = allowedTabs.has(requestedTab) ? requestedTab : "picking";
  if (tab === "gold") {
    state.filterMode = "gold";
    state.searchText = "";
    if (els.searchInput) els.searchInput.value = "";
  }
  renderShell();
  renderActivePanelSoon(0, { metrics: false });
}

function scrollToTrayItem(key) {
  state.currentTrayKey = key;
  const selectorKey = window.CSS?.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
  let target = els.orderList.querySelector(`[data-slot-key="${selectorKey}"]`);
  if (target) {
    selectPickingCard(key);
  } else {
    renderOrderList();
    renderTray();
    target = els.orderList.querySelector(`[data-slot-key="${selectorKey}"]`);
  }
  if (target) {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function scrollTrayToSelectedItem(key) {
  const selectorKey = window.CSS?.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
  const target = els.trayBoard?.querySelector(`[data-tray-key="${selectorKey}"]`);
  if (!target || !els.trayBoard) return;
  const nextLeft = target.offsetLeft - Math.max(0, (els.trayBoard.clientWidth - target.clientWidth) / 2);
  els.trayBoard.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
  if (els.bottomTray) els.bottomTray.scrollTop = 0;
}

function selectPickingCard(key) {
  state.currentTrayKey = key;
  els.orderList.querySelectorAll(".is-selected[data-slot-key]").forEach((card) => card.classList.remove("is-selected"));
  els.trayBoard?.querySelectorAll(".selected[data-tray-key]").forEach((card) => card.classList.remove("selected"));
  const selectorKey = window.CSS?.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
  els.orderList.querySelector(`[data-slot-key="${selectorKey}"]`)?.classList.add("is-selected");
  els.trayBoard?.querySelector(`[data-tray-key="${selectorKey}"]`)?.classList.add("selected");
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
    if (state.activeTab === "picking") renderPickingSurfaces();
    else render();
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

function canSwipePickingGroup() {
  return state.activeTab === "picking" && state.filterMode === "all" && !state.searchText.trim() && state.groups.length > 1;
}

function movePickingGroup(delta) {
  if (!canSwipePickingGroup()) return false;
  const nextGroup = Math.max(0, Math.min(state.groups.length - 1, state.currentGroup + delta));
  if (nextGroup === state.currentGroup) return false;
  state.currentGroup = nextGroup;
  renderGroups();
  renderOrderList();
  renderTray();
  return true;
}

function bindPickingGroupSwipe() {
  if (!els.orderList) return;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  els.orderList.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    },
    { passive: true },
  );

  els.orderList.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch || !startTime) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const elapsed = Date.now() - startTime;
      startTime = 0;
      if (elapsed > 800 || Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      movePickingGroup(dx < 0 ? 1 : -1);
    },
    { passive: true },
  );
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
  paintPickingItemState(invoice, item);
  schedulePickingSurfaces();
  try {
    await savePickingRow(invoice, item, isPicked(item) ? "picked" : "pick_unchecked");
    toast("피킹 상태 저장");
  } catch (error) {
    patchLocalPickingState(invoice, item, { isPicked: !isPicked(item) });
    renderPickingSurfaces();
    toast(`저장 실패: ${error.message}`);
  }
}

function currentWorkflowRows() {
  if (state.activeTab === "shortage") return shortageRowsForCurrentFilter();
  if (state.activeTab === "inspection") {
    return inspectionSourceInvoices().filter(invoiceMatchesInspectionFilter).filter(invoiceMatchesInspectionSearch);
  }
  if (state.activeTab === "cs") return filteredCsRows();
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
    renderInspectionPanels({ list: false });
    return;
  }
  if (state.activeTab === "cs") {
    const keys = rows.map((row) => row.key);
    const current = keys.indexOf(state.selectedCsKey);
    state.selectedCsKey = keys[Math.max(0, Math.min(keys.length - 1, (current >= 0 ? current : 0) + delta))];
    renderCsPanels();
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
  const target = state.activeTab === "inspection" ? els.inspectionSearchInput : state.activeTab === "cs" ? els.csSearchInput : els.searchInput;
  target?.focus();
  target?.select();
}

function activateTabShortcut(key) {
  const tabs = {
    "1": "dashboard",
    "2": "picking",
    "3": "shortage",
    "4": "inspection",
    "5": "cs",
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
    if (["shortage", "inspection", "cs", "completed"].includes(state.activeTab)) moveWorkflowSelection(delta);
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
  els.sidebarToggle?.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    renderShell();
  });
  els.sideShortcuts?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-side-shortcut]");
    if (!button) return;
    applySideShortcut(button.dataset.sideShortcut, button.dataset.sideValue);
  });
  els.refreshBtn.addEventListener("click", () => loadPickingData().catch(showError));
  els.todayBtn.addEventListener("click", () => {
    state.selectedDate = todayDateString();
    setDashboardMonthFromDate(state.selectedDate);
    state.selectedCompletedGroup = "";
    els.dateInput.value = state.selectedDate;
    loadPickingData().catch(showError);
  });
  els.dateInput.addEventListener("change", () => {
    state.selectedDate = els.dateInput.value;
    setDashboardMonthFromDate(state.selectedDate);
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
    const hideCompletedButton = event.target.closest("[data-inspection-hide-completed]");
    if (hideCompletedButton) {
      state.inspectionHideCompleted = !state.inspectionHideCompleted;
      state.selectedInspectionGroup = "";
      renderInspectionPanels();
      renderSideShortcuts();
      return;
    }
    const button = event.target.closest("[data-inspection-filter]");
    if (!button) return;
    state.inspectionFilter = button.dataset.inspectionFilter || "all";
    state.selectedInspectionGroup = "";
    renderInspectionPanels();
    renderSideShortcuts();
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
  els.csDateTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cs-date]");
    if (!button) return;
    state.csDateFilter = button.dataset.csDate || "all";
    state.selectedCsKey = "";
    renderCsPanels();
  });
  els.csSearchInput?.addEventListener("input", () => {
    state.csSearchText = els.csSearchInput.value;
    state.selectedCsKey = "";
    renderCsPanels();
  });
  els.csListBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cs-key]");
    if (!button) return;
    state.selectedCsKey = button.dataset.csKey;
    renderCsPanels();
  });
  els.csDetail?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-cs-order-memo]");
    if (!field) return;
    field.closest(".inspection-memo-cell")?.classList.toggle("has-value", Boolean(field.value.trim()));
  });
  els.csDetail?.addEventListener("change", (event) => {
    if (event.target.closest("[data-shortage-input]")) {
      onShortageInputChange(event);
      return;
    }
    if (event.target.closest("[data-cs-drawer]")) {
      onDrawerChange(event);
      return;
    }
    const field = event.target.closest("[data-cs-order-memo]");
    if (!field) return;
    saveInspectionSellpiaOrderMemo(field.dataset.orderGroup || "", field.dataset.itemNo || "", field.value).catch(showError);
  });
  els.csDetail?.addEventListener("click", (event) => {
    const memoButton = event.target.closest("[data-cs-order-memo-save]");
    if (!memoButton) return;
    const orderGroupNo = memoButton.dataset.orderGroup;
    const itemNo = memoButton.dataset.itemNo;
    const field = els.csDetail.querySelector(`[data-cs-order-memo][data-order-group="${window.CSS?.escape ? CSS.escape(orderGroupNo) : orderGroupNo}"][data-item-no="${window.CSS?.escape ? CSS.escape(itemNo) : itemNo}"]`);
    saveInspectionSellpiaOrderMemo(orderGroupNo, itemNo, field?.value || "").then(renderCsPanels).catch(showError);
  });
  els.dashboardSummary?.addEventListener("click", (event) => {
    const monthButton = event.target.closest("[data-dashboard-month]");
    if (monthButton) {
      const value = monthButton.dataset.dashboardMonth;
      if (value === "today") setDashboardMonthFromDate(todayDateString());
      else shiftDashboardMonth(Number(value) || 0);
      return;
    }
    const dateButton = event.target.closest("[data-dashboard-date]");
    if (dateButton) {
      state.selectedDate = dateButton.dataset.dashboardDate;
      setDashboardMonthFromDate(state.selectedDate);
      state.currentGroup = 0;
      state.selectedCompletedGroup = "";
      if (els.dateInput) els.dateInput.value = state.selectedDate;
      loadPickingData().catch(showError);
      return;
    }
    const button = event.target.closest("[data-dashboard-tab]");
    if (!button) return;
    setActiveTab(button.dataset.dashboardTab);
  });
  els.dashboardPanel?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dashboard-action]");
    if (!button) return;
    if (button.dataset.dashboardAction === "reorder-invoices") {
      reorderInvoicesByCurrentView().catch(showError);
    }
    if (button.dataset.dashboardAction === "toggle-csv") {
      exportToggleCsv();
    }
    if (button.dataset.dashboardAction === "planned-print-csv") {
      exportPlannedPrintCsv();
    }
    if (button.dataset.dashboardAction === "gold-label") {
      exportGoldLabelXlsx().catch(showError);
    }
    if (button.dataset.dashboardAction === "alimtalk-csv") {
      exportAlimtalkCsv();
    }
    if (button.dataset.dashboardAction === "postoffice-status") {
      showPostOfficeEnrichmentStatus();
    }
    if (button.dataset.dashboardAction === "order-list") {
      openOrderListModal();
    }
  });
  els.groupList.addEventListener("click", (event) => {
    const bulkButton = event.target.closest("[data-bulk-group]");
    if (bulkButton) {
      event.stopPropagation();
      bulkToggleGroup(Number(bulkButton.dataset.bulkGroup)).catch(showError);
      return;
    }
    const button = event.target.closest("[data-group]");
    if (!button) return;
    state.currentGroup = Number(button.dataset.group);
    renderGroups();
    if (state.activeTab === "picking") {
      renderOrderList();
      renderTray();
    }
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
  els.orderList.addEventListener("pointerdown", onDrawerKeypadOpen);
  els.orderList.addEventListener("click", onDrawerKeypadOpen);
  els.orderList.addEventListener("focusin", onDrawerKeypadOpen);
  els.orderList.addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) return;
    const card = event.target.closest("[data-slot-key]");
    if (!card) return;
    selectPickingCard(card.dataset.slotKey);
  });
  els.orderList.addEventListener("change", onDrawerChange);
  els.orderList.addEventListener("change", onShortageInputChange);
  bindPickingGroupSwipe();
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.photoViewer.open) closePhotoViewer();
    if (event.key === "Escape" && state.orderListModal.open) closeOrderListModal();
  });
  document.addEventListener("click", (event) => {
    const image = event.target.closest("[data-photo-src]");
    if (image) {
      openPhotoViewer(image.dataset.photoSrc, image.dataset.photoTitle || "");
      return;
    }
    const photoAction = event.target.closest("[data-photo-action]");
    if (!photoAction) return;
    if (photoAction.dataset.photoAction === "close") closePhotoViewer();
    if (photoAction.dataset.photoAction === "refresh") refreshPhotoViewer();
  });
  els.shortageFilterBar?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shortage-filter]");
    if (!button) return;
    state.shortageFilter = button.dataset.shortageFilter || "all";
    state.selectedShortageKey = "";
    renderShortagePanels();
    renderSideShortcuts();
  });
  els.shortageSearchInput?.addEventListener("input", () => {
    state.shortageSearchText = els.shortageSearchInput.value;
    state.selectedShortageKey = "";
    renderShortagePanels();
    renderSideShortcuts();
  });
  els.shortageReceivingFile?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    loadReceivingLabelFile(file).catch(showError);
  });
  els.shortageReceivingOnly?.addEventListener("change", () => {
    state.receivingLabel.only = Boolean(els.shortageReceivingOnly.checked);
    state.selectedShortageKey = "";
    renderShortagePanels();
    renderSideShortcuts();
  });
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
    if (button.dataset.action === "shortage-repick-reopen") {
      reopenShortageRepick(button.dataset.orderGroup, button.dataset.itemNo).catch(showError);
    }
  });
  els.shortageDetail?.addEventListener("change", onShortageInputChange);
  els.inspectionListBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inspection-group]");
    if (!button) return;
    state.selectedInspectionGroup = button.dataset.inspectionGroup;
    renderInspectionPanels({ list: false });
  });
  els.inspectionDetail?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-inspection-memo-field]");
    if (!field) return;
    field.closest(".inspection-memo-cell")?.classList.toggle("has-value", Boolean(field.value.trim()));
  });
  els.inspectionDetail?.addEventListener("change", (event) => {
    if (event.target.closest("[data-shortage-input]")) {
      onShortageInputChange(event);
      return;
    }
    if (event.target.closest("[data-inspection-drawer]")) {
      onDrawerChange(event);
      return;
    }
    const field = event.target.closest("[data-inspection-memo-field]");
    if (!field) return;
    const orderGroupNo = field.dataset.orderGroup || "";
    const itemNo = field.dataset.itemNo || "";
    if (field.dataset.inspectionMemoField === "sellpia-order") {
      saveInspectionSellpiaOrderMemo(orderGroupNo, itemNo, field.value).catch(showError);
    }
    if (field.dataset.inspectionMemoField === "confirm") {
      saveInspectionConfirmMemo(orderGroupNo, itemNo, field.value).catch(showError);
    }
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
    if (button.dataset.action === "shortage-repick-reopen") {
      reopenShortageRepick(button.dataset.orderGroup, button.dataset.itemNo).catch(showError);
    }
  });
  document.querySelectorAll("[data-completed-date-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.completedDateMode = button.dataset.completedDateMode === "completed" ? "completed" : "receipt";
      state.selectedCompletedGroup = "";
      renderCompletedPanels();
      renderSideShortcuts();
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
    const shouldToggle = Boolean(event.target.closest("[data-tray-toggle]"));
    state.trayOpen = true;
    scrollToTrayItem(button.dataset.trayKey);
    if (shouldToggle) {
      event.preventDefault();
      toggleSelectedItem().catch(showError);
    }
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
