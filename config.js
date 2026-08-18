import fs from 'fs';

if (fs.existsSync('.env')) {
  try { process.loadEnvFile('.env'); } catch {}
}

export const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
export const STORE_NAME = process.env.FILE_SEARCH_STORE || 'minichatbot-doc';
export const WORKERS = parseInt(process.env.SYNC_WORKERS || '6', 10);
export const CHARS_PER_CHUNK = Number(process.env.CHARS_PER_CHUNK) || 1000;

export const SYSTEM_PROMPT = [
  'You are OptiBot, the customer-support bot for OptiSigns.com.',
  '• Tone: helpful, factual, concise.',
  '• Only answer using the uploaded docs.',
  '• Max 5 bullet points; else link to the doc.',
  '• Cite up to 3 "Article URL:" lines per reply.',
].join('\n');
