import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { CHARS_PER_CHUNK } from './config.js';

export function getClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) { console.error('Missing GEMINI_API_KEY (or API_KEY) env var'); process.exit(1); }
  return new GoogleGenAI({ apiKey });
}

async function collectAll(pager) {
  const items = [];
  for (;;) {
    for (const item of pager.page) items.push(item);
    if (pager.hasNextPage && pager.hasNextPage()) await pager.nextPage();
    else return items;
  }
}

export async function getOrCreateStore(client, displayName) {
  const stores = await collectAll(await client.fileSearchStores.list());
  const existing = stores.find(store => store.displayName === displayName);
  if (existing) return existing.name;
  const created = await client.fileSearchStores.create({ config: { displayName } });
  return created.name;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const TRANSIENT = [429, 500, 502, 503];

async function withRetry(fn, tries = 5) {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = Number(error?.status ?? error?.code);
      if (attempt < tries - 1 && TRANSIENT.includes(status)) {
        await sleep(2 ** attempt * 1000);
        continue;
      }
      throw error;
    }
  }
}

async function waitForOperation(client, operation) {
  while (!operation.done) {
    await sleep(3000);
    operation = await withRetry(() => client.operations.get({ operation }));
  }
  return operation;
}

export async function listDocIds(client, storeName) {
  const docIdToName = {};
  const documents = await collectAll(
    await client.fileSearchStores.documents.list({ parent: storeName, config: { pageSize: 20 } }));
  for (const document of documents) {
    for (const field of document.customMetadata || []) {
      if (field.key === 'doc_id') docIdToName[field.stringValue] = document.name;
    }
  }
  return docIdToName;
}

export async function uploadFile(client, storeName, filePath, displayName, docId) {
  const operation = await withRetry(() => client.fileSearchStores.uploadToFileSearchStore({
    file: filePath,
    fileSearchStoreName: storeName,
    config: {
      displayName,
      mimeType: 'text/markdown',
      customMetadata: [{ key: 'doc_id', stringValue: docId }],
    },
  }));
  await waitForOperation(client, operation);
  return Math.max(1, Math.floor(fs.statSync(filePath).size / CHARS_PER_CHUNK));
}

export async function deleteDocument(client, documentName) {
  await withRetry(() => client.fileSearchStores.documents.delete({ name: documentName, config: { force: true } }));
}
