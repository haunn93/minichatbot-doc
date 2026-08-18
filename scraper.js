import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import TurndownService from 'turndown';

const API = 'https://support.optisigns.com/api/v2/help_center/en-us/articles.json';
const DROP_TAGS = ['nav', 'script', 'style', 'aside'];

const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
converter.remove(DROP_TAGS);

export function htmlToMarkdown(html) {
  return converter.turndown(html)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function articleHash(markdown) {
  return crypto.createHash('sha256').update(markdown, 'utf8').digest('hex');
}

export function slugify(title, articleId) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base.slice(0, 60).replace(/-+$/, '')}-${articleId}`;
}

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url);
    if (response.ok) return response;
    if ([429, 500, 502, 503].includes(response.status)) {
      await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000));
      continue;
    }
    throw new Error(`GET ${url} -> ${response.status}`);
  }
  throw new Error(`GET ${url} failed after retries`);
}

export async function fetchArticles() {
  const articles = [];
  let url = `${API}?per_page=100`;
  while (url) {
    const page = await (await fetchWithRetry(url)).json();
    for (const article of page.articles || []) {
      if (article.body) {
        articles.push({
          id: article.id, title: article.title, url: article.html_url, body: article.body,
        });
      }
    }
    url = page.next_page;
  }
  return articles;
}

export async function scrape(outDir = 'articles') {
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = {};
  for (const article of await fetchArticles()) {
    const markdown = htmlToMarkdown(article.body);
    const slug = slugify(article.title, article.id);
    const frontMatter =
      `---\ntitle: ${JSON.stringify(article.title)}\nurl: ${article.url}\nid: ${article.id}\n---\n\n`;
    fs.writeFileSync(path.join(outDir, `${slug}.md`), frontMatter + markdown + '\n', 'utf8');
    manifest[String(article.id)] = {
      hash: articleHash(markdown), slug, url: article.url, title: article.title,
    };
  }
  return manifest;
}
