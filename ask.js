import { fileURLToPath } from 'url';
import * as vs from './vectorstore.js';
import { MODEL, SYSTEM_PROMPT, STORE_NAME } from './config.js';

export async function ask(question) {
  const client = vs.getClient();
  const storeName = await vs.getOrCreateStore(client, STORE_NAME);
  const response = await client.models.generateContent({
    model: MODEL,
    contents: question,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
    },
  });
  return response.text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const question = process.argv.slice(2).join(' ') || 'How do I add a YouTube video?';
  ask(question).then(answer => { console.log(answer); process.exit(0); })
    .catch(error => { console.error(error); process.exit(1); });
}
