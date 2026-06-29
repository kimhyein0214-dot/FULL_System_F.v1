const PR_URL = 'https://vgxocngpykhlkosiaeew.supabase.co';
const PR_KEY = 'sb_publishable_XVnKGJo66GZiYTq5Ivu8dA_SjBVvX0g';
const SYS_URL = 'https://bpgvqmtsjgegnrdzmpep.supabase.co';
const SYS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZ3ZxbXRzamdlZ25yZHptcGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Mjc0NTIsImV4cCI6MjA5NzMwMzQ1Mn0.tIxMFEUqALi2gywDxKJpxEZ9qcGhYRw8QJeMtRjKFDI';
const FUNCTION_URL = `${SYS_URL}/functions/v1/migrate-google-product-image`;

const args = new Map(process.argv.slice(2).map(arg => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : 'true'];
}));

const token = process.env.MIGRATION_TOKEN || args.get('token');
if (!token) {
  console.error('MIGRATION_TOKEN env var or --token is required.');
  process.exit(1);
}

const limit = Number(args.get('limit') || 0);
const concurrency = Math.max(1, Number(args.get('concurrency') || 4));
const includeExisting = args.has('include-existing');
const logPath = args.get('log') || `migration_logs/google_image_migration_${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAll(baseUrl, key, path) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        range: `${from}-${from + 999}`,
        'range-unit': 'items',
      },
    });
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < 1000) break;
  }
  return rows;
}

async function appendLog(row) {
  const { appendFile } = await import('node:fs/promises');
  await appendFile(logPath, JSON.stringify({ at: new Date().toISOString(), ...row }) + '\n', 'utf8');
}

async function migrateOne(row, attempt = 1) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-migration-token': token,
    },
    body: JSON.stringify({
      p_code: row.p_code,
      own_code: row.own_code || '',
      image_url: row.image_url,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    const message = body?.message || body?.error || `HTTP ${res.status}`;
    if (attempt < 3 && (res.status >= 500 || res.status === 429 || body?.error === 'image_fetch_failed')) {
      await sleep(750 * attempt);
      return migrateOne(row, attempt + 1);
    }
    throw new Error(message);
  }
  return body;
}

async function main() {
  console.log('Loading PR_system products and System_v1 image catalog...');
  const [products, systemImages] = await Promise.all([
    fetchAll(PR_URL, PR_KEY, 'products?select=p_code,own_code,image_url&image_url=not.is.null'),
    fetchAll(SYS_URL, SYS_KEY, 'sellpia_product_images_public?select=p_code,storage_public_url,source_image_url'),
  ]);

  const systemCodes = new Set(
    systemImages
      .filter(row => String(row.storage_public_url || row.source_image_url || '').trim())
      .map(row => String(row.p_code || '').trim())
      .filter(Boolean),
  );
  let queue = products
    .map(row => ({
      p_code: String(row.p_code || '').trim(),
      own_code: String(row.own_code || '').trim(),
      image_url: String(row.image_url || '').trim(),
    }))
    .filter(row => /^[0-9]{3,}(?:-\d+)?$/.test(row.p_code))
    .filter(row => /^https:\/\/lh3\.googleusercontent\.com\//.test(row.image_url));

  if (!includeExisting) queue = queue.filter(row => !systemCodes.has(row.p_code));
  if (limit > 0) queue = queue.slice(0, limit);

  console.log(JSON.stringify({
    prProductsWithGoogleImage: products.length,
    systemImages: systemImages.length,
    includeExisting,
    queued: queue.length,
    concurrency,
    logPath,
  }, null, 2));

  let next = 0;
  let ok = 0;
  let failed = 0;
  const started = Date.now();

  async function worker(id) {
    while (next < queue.length) {
      const idx = next++;
      const row = queue[idx];
      try {
        const result = await migrateOne(row);
        ok++;
        await appendLog({ status: 'ok', worker: id, index: idx, ...result });
      } catch (err) {
        failed++;
        await appendLog({ status: 'failed', worker: id, index: idx, p_code: row.p_code, own_code: row.own_code, image_url: row.image_url, error: String(err.message || err) });
      }
      if ((ok + failed) % 25 === 0 || ok + failed === queue.length) {
        const elapsedSec = Math.max(1, Math.round((Date.now() - started) / 1000));
        console.log(`[${ok + failed}/${queue.length}] ok=${ok} failed=${failed} elapsed=${elapsedSec}s`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, idx) => worker(idx + 1)));
  console.log(JSON.stringify({ done: true, ok, failed, logPath }, null, 2));
  if (failed > 0) process.exitCode = 2;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
