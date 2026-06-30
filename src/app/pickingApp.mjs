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
  selectedDate: new Date().toISOString().slice(0, 10),
  session: "ALL",
  workSortMode: true,
  filterMode: "all",
  viewModel: null,
  groups: [],
  currentGroup: 0,
  searchText: "",
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
  orderList: document.getElementById("order-list"),
  panelSubtitle: document.getElementById("panel-subtitle"),
  currentGroupLabel: document.getElementById("current-group-label"),
  progressText: document.getElementById("progress-text"),
  progressFill: document.getElementById("progress-fill"),
  metricOrders: document.getElementById("metric-orders"),
  metricPicked: document.getElementById("metric-picked"),
  metricShortage: document.getElementById("metric-shortage"),
  metricHold: document.getElementById("metric-hold"),
  metricWrite: document.getElementById("metric-write"),
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

function itemStateKey(invoice, item) {
  return `${invoice.orderGroupNo}::${item.sellpiaItemNo}`;
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

function rebuildGroups() {
  const invoices = sortInvoices(state.viewModel?.invoices || []);
  state.groups = [];
  for (let index = 0; index < invoices.length; index += JO_SIZE) {
    state.groups.push(invoices.slice(index, index + JO_SIZE));
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

function invoiceMatchesFilter(invoice, filterMode) {
  const stats = invoiceStats(invoice);
  if (filterMode === "todo") return stats.todo;
  if (filterMode === "shortage") return stats.shortage > 0;
  if (filterMode === "hold") return stats.hold > 0;
  if (filterMode === "done") return stats.done;
  return true;
}

function filterLabel(filterMode) {
  return {
    all: "전체",
    todo: "미완료",
    shortage: "미송",
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
}

function renderGroups() {
  els.groupList.innerHTML = state.groups
    .map((group, index) => {
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
      const classes = ["group-btn", index === state.currentGroup ? "active" : "", stats.shortage ? "has-shortage" : ""]
        .filter(Boolean)
        .join(" ");
      return `<button class="${classes}" data-group="${index}">
        <span>${index + 1}조</span>
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
  els.currentGroupLabel.textContent =
    state.searchText || state.filterMode !== "all" ? filterLabel(state.filterMode) : `${state.currentGroup + 1}조`;
  els.progressText.textContent = `${done}/${total} 완료`;
  els.progressFill.style.width = `${pct}%`;
}

function renderOrderList() {
  const invoices = currentVisibleInvoices();
  renderProgress(invoices);
  els.panelSubtitle.textContent =
    state.searchText || state.filterMode !== "all"
      ? `${filterLabel(state.filterMode)} · ${invoices.length}송장`
      : `${state.currentGroup + 1}조 · ${invoices.length}송장`;

  if (!state.viewModel) {
    els.orderList.innerHTML = '<div class="empty">데이터를 불러오는 중입니다.</div>';
    return;
  }

  if (!invoices.length) {
    els.orderList.innerHTML = '<div class="empty">표시할 주문이 없습니다.</div>';
    return;
  }

  els.orderList.innerHTML = invoices.map(renderInvoice).join("");
}

function renderInvoice(invoice) {
  const stats = invoiceStats(invoice);
  const classes = ["order-card", stats.shortage ? "has-shortage" : "", stats.hold ? "has-hold" : ""].filter(Boolean).join(" ");
  const totalBadge = invoice.orderTotalAmount !== null ? `<span class="small-badge seller-badge">총금액 ${invoice.orderTotalAmount.toLocaleString("ko-KR")}</span>` : "";

  return `<article class="${classes}" data-order-group="${escapeHtml(invoice.orderGroupNo)}">
    <div class="order-head">
      <div class="order-title">
        <span class="work-no">${escapeHtml(invoice.invoiceNo || invoice.orderGroupNo || "-")}</span>
        <span class="name">${escapeHtml(invoice.displayName || invoice.csDisplayName || "-")}</span>
        ${invoice.seller ? `<span class="small-badge seller-badge">${escapeHtml(invoice.seller)}</span>` : ""}
        ${totalBadge}
      </div>
      <div class="order-actions">
        <span class="invoice-badge">${escapeHtml(invoice.invoiceNo || "송장없음")}</span>
        <input class="drawer-input" data-action="drawer" data-order-group="${escapeHtml(invoice.orderGroupNo)}" value="${escapeHtml(invoice.sellpiaMemo1 || invoice.items[0]?.pickingState?.drawerMemo || "")}" placeholder="서랍번호">
      </div>
    </div>
    <div class="items">
      ${invoice.items.map((item) => renderItem(invoice, item)).join("")}
    </div>
  </article>`;
}

function renderItem(invoice, item) {
  const key = itemStateKey(invoice, item);
  const shortage = shortageQty(item);
  const checked = isPicked(item);
  const imageUrl = productImageUrl(item.sellpiaProductCode);
  const option = item.optionName || item.ownCode || item.productName || "-";
  const product = item.productName || "";

  return `<div class="item-row" data-key="${escapeHtml(key)}">
    <button class="pick-check ${checked ? "checked" : ""}" data-action="toggle" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">${checked ? "✓" : ""}</button>
    ${imageUrl ? `<img class="thumb" src="${imageUrl}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="thumb"></div>'}
    <div class="item-main">
      <p class="option">${escapeHtml(option)}</p>
      <p class="product">${escapeHtml(product)}</p>
      <div class="code-line">
        <span class="own-code">${escapeHtml(item.ownCode || "-")}</span>
        ${item.sellpiaProductCode ? `<span class="small-badge">${escapeHtml(item.sellpiaProductCode)}</span>` : ""}
        ${item.sellpiaLocation ? `<span class="small-badge">${escapeHtml(item.sellpiaLocation)}</span>` : ""}
      </div>
    </div>
    <div class="qty">${Number(item.quantity) || 1}개</div>
    <div class="shortage-control">
      <button data-action="shortage" data-delta="-1" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">−</button>
      <div class="shortage-value">${shortage}</div>
      <button data-action="shortage" data-delta="1" data-order-group="${escapeHtml(invoice.orderGroupNo)}" data-item-no="${escapeHtml(item.sellpiaItemNo)}">+</button>
    </div>
  </div>`;
}

function render() {
  renderMetrics();
  renderFilters();
  renderGroups();
  renderOrderList();
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
    console.warn("workflow_item_events insert failed", error);
    toast("피킹 저장 완료 · 이벤트 테이블 미준비");
  }
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

function bindEvents() {
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
    renderOrderList();
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
  els.orderList.addEventListener("change", onDrawerChange);
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
