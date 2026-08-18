import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrape } from './scraper.js';
import * as vs from './vectorstore.js';
import { STORE_NAME, WORKERS } from './config.js';

const MANIFEST = 'manifest.json';

export function diffManifests(oldManifest, newManifest) {
  const added = [], updated = [], skipped = [];
  for (const [id, entry] of Object.entries(newManifest)) {
    if (!(id in oldManifest)) added.push(id);
    else if (oldManifest[id].hash !== entry.hash) updated.push(id);
    else skipped.push(id);
  }
  const deleted = Object.keys(oldManifest).filter(id => !(id in newManifest));
  return { added, updated, deleted, skipped };
}

function loadManifest() {
  return fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const runNext = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
}

async function main() {
  const oldManifest = loadManifest();
  console.log('Scraping articles...');
  const newManifest = await scrape();
  const { added, updated, deleted, skipped } = diffManifests(oldManifest, newManifest);
  console.log(`delta: added=${added.length} updated=${updated.length} deleted=${deleted.length} skipped=${skipped.length}`);

  const client = vs.getClient();
  const storeName = await vs.getOrCreateStore(client, STORE_NAME);
  const existingDocs = await vs.listDocIds(client, storeName);

  const toUpload = [...added, ...updated];
  let totalChunks = 0, uploadedCount = 0;
  await runPool(toUpload, WORKERS, async (id) => {
    const entry = newManifest[id];
    if (existingDocs[id]) await vs.deleteDocument(client, existingDocs[id]);
    const filePath = path.join('articles', `${entry.slug}.md`);
    totalChunks += await vs.uploadFile(client, storeName, filePath, entry.title, id);
    console.log(`[${++uploadedCount}/${toUpload.length}] uploaded ${id}`);
  });

  for (const id of deleted) if (existingDocs[id]) await vs.deleteDocument(client, existingDocs[id]);

  fs.writeFileSync(MANIFEST, JSON.stringify(newManifest, null, 2));
  console.log(`uploaded files=${toUpload.length} chunks=${totalChunks}`);
  console.log(`SUMMARY added=${added.length} updated=${updated.length} skipped=${skipped.length} deleted=${deleted.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
}
