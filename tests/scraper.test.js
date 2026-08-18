import { test } from 'node:test';
import assert from 'node:assert';
import { htmlToMarkdown, articleHash, slugify } from '../scraper.js';

test('htmlToMarkdown preserves structure and strips nav', () => {
  const html =
    '<nav>menu</nav>' +
    '<h2>Add a video</h2>' +
    '<p>See <a href="/hc/en-us/articles/123">this guide</a>.</p>' +
    '<pre><code>npm run deploy</code></pre>' +
    '<img src="data:image/png;base64,AAAA" alt="pic">';
  const md = htmlToMarkdown(html);
  assert.ok(md.includes('## Add a video'));
  assert.ok(md.includes('[this guide](/hc/en-us/articles/123)'));
  assert.ok(md.includes('npm run deploy'));
  assert.ok(!md.includes('menu'));
  assert.ok(!md.includes('data:image'));
});

test('articleHash is stable and content-sensitive', () => {
  assert.strictEqual(articleHash('abc'), articleHash('abc'));
  assert.notStrictEqual(articleHash('abc'), articleHash('abd'));
});

test('slugify', () => {
  assert.strictEqual(slugify('How do I add a YouTube video?', 42), 'how-do-i-add-a-youtube-video-42');
});
