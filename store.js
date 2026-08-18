import * as vs from './vectorstore.js';
import { STORE_NAME } from './config.js';

const client = vs.getClient();
const name = STORE_NAME;
const storeName = await vs.getOrCreateStore(client, name);
const docIds = await vs.listDocIds(client, storeName);
const titles = [];
for await (const document of await client.fileSearchStores.documents.list({ parent: storeName, config: { pageSize: 20 } })) {
  titles.push(document.displayName);
}

console.log(`Gemini File Search store`);
console.log(`  displayName : ${name}`);
console.log(`  resource    : ${storeName}`);
console.log(`  documents   : ${Object.keys(docIds).length}`);
console.log(`  sample docs :`);
for (const title of titles.slice(0, 5)) console.log(`    - ${title}`);
process.exit(0);
