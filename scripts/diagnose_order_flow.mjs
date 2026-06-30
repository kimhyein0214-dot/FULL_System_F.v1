#!/usr/bin/env node

const DEFAULT_SUPABASE_URL = 'https://vgxocngpykhlkosiaeew.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_XVnKGJo66GZiYTq5Ivu8dA_SjBVvX0g';

const TABLES = {
  production: {
    orders: 'orders',
    orderItems: 'order_items',
    picking: 'picking',
    shortage: 'shortage',
    inspection: 'inspection'
  },
  staging: {
    orders: 'stg_orders',
    orderItems: 'stg_order_items',
    picking: 'stg_picking',
    shortage: 'stg_shortage',
    inspection: 'stg_inspection'
  }
};

function parseArgs(argv) {
  const out = { env: 'production', limit: '20' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (key === 'staging') {
      out.env = 'staging';
      continue;
    }
    out[key] = argv[i + 1] || '';
    i++;
  }
  return out;
}

function requireFetch() {
  if (typeof fetch !== 'function') {
    throw new Error('Node.js 18+ is required because this script uses global fetch.');
  }
}

function compact(value) {
  return String(value ?? '').trim();
}

function encodeValue(value) {
  return encodeURIComponent(compact(value));
}

function unique(values) {
  return [...new Set(values.map(compact).filter(Boolean))];
}

function postgrestIn(values) {
  return unique(values).map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
}

function statusMeaning(status, qty) {
  const st = compact(status);
  const n = Number(qty || 0);
  if (st === '검품완료' || st === '메모정리완료') return 'inspection-done';
  if (st === '피킹완료') return 'ready-for-inspection';
  if (st === '발송완료') return 'sent-done';
  if (n > 0) return 'shortage-waiting';
  return 'normal-or-empty';
}

function firstDate(value) {
  const s = compact(value);
  return s ? s.slice(0, 10) : '';
}

function printRows(title, rows, columns) {
  console.log(`\n## ${title} (${rows.length})`);
  if (!rows.length) {
    console.log('- none');
    return;
  }
  for (const row of rows) {
    const parts = columns.map(col => `${col}=${compact(row[col]) || '-'}`);
    console.log('- ' + parts.join(' | '));
  }
}

async function request(baseUrl, key, table, query) {
  const url = `${baseUrl.replace(/\/+$/, '')}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json'
    }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${table} query failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : [];
}

async function findOrders(cfg, tables, args) {
  const select = 'ord_no,ord_date,order_date,inv_no,orderer,buyer,receiver,sort_order,am_pm,scraped_at,updated_at';
  const limit = encodeValue(args.limit || '20');
  const clauses = [];
  if (args.ord) clauses.push(`ord_no=eq.${encodeValue(args.ord)}`);
  if (args.inv) clauses.push(`inv_no=eq.${encodeValue(args.inv)}`);
  if (args.name) {
    const q = encodeValue(`*${args.name}*`);
    clauses.push(`or=(orderer.ilike.${q},buyer.ilike.${q},receiver.ilike.${q})`);
  }
  if (args.date) clauses.push(`ord_date=eq.${encodeValue(args.date)}`);
  const query = `select=${select}${clauses.length ? '&' + clauses.join('&') : ''}&limit=${limit}`;
  return request(cfg.url, cfg.key, tables.orders, query);
}

async function findByOrdNos(cfg, table, ordNos, select) {
  const ords = unique(ordNos);
  if (!ords.length) return [];
  return request(cfg.url, cfg.key, table, `select=${select}&ord_no=in.(${postgrestIn(ords)})`);
}

async function main() {
  requireFetch();
  const args = parseArgs(process.argv.slice(2));
  if (!args.ord && !args.inv && !args.name && !args.date) {
    throw new Error('Provide at least one filter: --ord, --inv, --name, or --date.');
  }

  const cfg = {
    url: process.env.PR_SYSTEM_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    key: process.env.PR_SYSTEM_SUPABASE_KEY || DEFAULT_SUPABASE_KEY
  };
  const tables = TABLES[args.env] || TABLES.production;
  const orders = await findOrders(cfg, tables, args);
  const ordNos = unique(orders.map(row => row.ord_no));
  const items = await findByOrdNos(cfg, tables.orderItems, ordNos, 'ord_no,item_no,sort_order,inv_no,p_code,prod_code,p_name,p_option,qty,ord_date,order_memo');
  const picking = await findByOrdNos(cfg, tables.picking, ordNos, 'ord_no,inv_no,item_no,item_sort_order,p_code,sellpia_p_code,is_checked,shortage_qty,drawer_no,hold');
  const shortage = await findByOrdNos(cfg, tables.shortage, ordNos, 'ord_no,inv_no,item_no,item_sort_order,p_code,sellpia_p_code,short_qty,drawer_no,status,memo2_val,work_date,created_at,updated_at,orderer');
  const inspection = await findByOrdNos(cfg, tables.inspection, ordNos, 'ord_no,inv_no,item_no,p_code,passed,insp_memo,memo_updated_at');

  console.log(`# Order Flow Diagnosis (${args.env})`);
  console.log(`filters: ${JSON.stringify(args)}`);

  printRows('orders', orders, ['ord_no', 'inv_no', 'orderer', 'buyer', 'receiver', 'ord_date', 'order_date', 'scraped_at', 'updated_at']);
  printRows('order_items', items, ['ord_no', 'inv_no', 'item_no', 'sort_order', 'p_code', 'prod_code', 'qty', 'ord_date', 'order_memo']);
  printRows('picking', picking, ['ord_no', 'inv_no', 'item_no', 'item_sort_order', 'p_code', 'sellpia_p_code', 'is_checked', 'shortage_qty', 'drawer_no', 'hold']);
  printRows('shortage', shortage, ['ord_no', 'inv_no', 'item_no', 'item_sort_order', 'p_code', 'sellpia_p_code', 'short_qty', 'status', 'memo2_val', 'work_date', 'updated_at']);
  printRows('inspection', inspection, ['ord_no', 'inv_no', 'item_no', 'p_code', 'passed', 'insp_memo', 'memo_updated_at']);

  console.log('\n## Visibility Notes');
  for (const order of orders) {
    const ord = compact(order.ord_no);
    const inv = compact(order.inv_no);
    const done = inspection.some(row =>
      compact(row.ord_no) === ord &&
      (compact(row.item_no) === '__done__' || compact(row.p_code) === '__done__') &&
      row.passed === true
    );
    const shortageRows = shortage.filter(row => compact(row.ord_no) === ord);
    const states = shortageRows.map(row => `${compact(row.item_no) || compact(row.p_code)}:${compact(row.status) || '-'}:${statusMeaning(row.status, row.short_qty ?? row.shortage_qty)}`);
    console.log(`- ${ord || inv}: receiptDate=${firstDate(order.ord_date) || '-'}, sellpiaOrderDate=${firstDate(order.order_date) || '-'}, inspectionDone=${done ? 'yes' : 'no'}, shortageStates=${states.join(', ') || '-'}`);
  }

  console.log('\n## Data Warnings');
  const warnings = [];
  for (const order of orders) {
    const ord = compact(order.ord_no);
    const currentInv = compact(order.inv_no);
    const relatedPicking = picking.filter(row => compact(row.ord_no) === ord);
    const relatedShortage = shortage.filter(row => compact(row.ord_no) === ord);
    const stalePickingInvs = unique(relatedPicking.map(row => row.inv_no)).filter(inv => currentInv && inv !== currentInv);
    const staleShortageInvs = unique(relatedShortage.map(row => row.inv_no)).filter(inv => currentInv && inv !== currentInv);
    if (stalePickingInvs.length) {
      warnings.push(`${ord}: picking rows use non-current inv_no ${stalePickingInvs.join(', ')} while orders.inv_no is ${currentInv}`);
    }
    if (staleShortageInvs.length) {
      warnings.push(`${ord}: shortage rows use non-current inv_no ${staleShortageInvs.join(', ')} while orders.inv_no is ${currentInv}`);
    }
    const activeOldShortages = relatedShortage.filter(row =>
      currentInv &&
      compact(row.inv_no) !== currentInv &&
      statusMeaning(row.status, row.short_qty) === 'shortage-waiting'
    );
    if (activeOldShortages.length) {
      warnings.push(`${ord}: ${activeOldShortages.length} active shortage row(s) remain on old invoice numbers`);
    }
  }
  if (!warnings.length) {
    console.log('- none');
  } else {
    warnings.forEach(w => console.log('- ' + w));
  }
}

main().catch(err => {
  console.error(`ERROR: ${err.message}`);
  process.exitCode = 1;
});
