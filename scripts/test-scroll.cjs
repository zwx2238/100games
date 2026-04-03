#!/usr/bin/env node
/**
 * Playwright test: homepage scroll behavior.
 * Verifies that scrolling works on the homepage grid, the scroll-hint
 * disappears after scrolling, and game cards throughout the page are reachable.
 *
 * Usage: node scripts/test-scroll.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const VIEWPORT = { width: 1440, height: 900 };

// ── Simple static file server ─────────────────────────────────────────────────
function startServer() {
  return new Promise((resolve) => {
    const MIME = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
      '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon',
      '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    };
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT_DIR, decodeURIComponent(req.url.split('?')[0]));
      if (filePath.endsWith('/')) filePath += 'index.html';
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

// ── Assertion helper ──────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const { server, port } = await startServer();
  const baseURL = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();

  try {
    // ── Desktop viewport tests ──────────────────────────────────────────────
    console.log('\n🖥  Desktop scroll tests (1440×900)\n');
    {
      const page = await browser.newPage({ viewport: VIEWPORT });
      await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });

      // Page is scrollable (content taller than viewport)
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      assert(bodyHeight > VIEWPORT.height, 'Page content exceeds viewport height (page is scrollable)');

      // Grid has 100 cards
      const cardCount = await page.locator('.card').count();
      assert(cardCount === 100, `Grid contains 100 game cards (found ${cardCount})`);

      // Scroll hint visible initially
      const hintVisibleBefore = await page.evaluate(() => {
        const hint = document.getElementById('scroll-hint');
        if (!hint) return false;
        const style = window.getComputedStyle(hint);
        return style.display !== 'none';
      });
      assert(hintVisibleBefore, 'Scroll hint is visible before scrolling');

      // Initial scroll position is 0
      const scrollBefore = await page.evaluate(() => window.scrollY);
      assert(scrollBefore === 0, 'Page starts at scroll position 0');

      // Scroll down 300px
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
      await page.waitForTimeout(300);
      const scrollAfter = await page.evaluate(() => window.scrollY);
      assert(scrollAfter >= 200, `Scroll position moved after scrollTo (scrollY=${scrollAfter})`);

      // Scroll hint hidden after scrolling past 50px
      const hintHidden = await page.evaluate(() => {
        const hint = document.getElementById('scroll-hint');
        if (!hint) return true;
        return hint.style.display === 'none';
      });
      assert(hintHidden, 'Scroll hint is hidden after scrolling past 50px');

      // Scroll to bottom — last card is reachable
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(300);
      const lastCardVisible = await page.evaluate(() => {
        const cards = document.querySelectorAll('.card');
        const last = cards[cards.length - 1];
        if (!last) return false;
        const rect = last.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      assert(lastCardVisible, 'Last game card (game 100) is visible after scrolling to bottom');

      // Verify we actually reached the bottom
      const atBottom = await page.evaluate(() =>
        Math.abs((window.scrollY + window.innerHeight) - document.body.scrollHeight) < 5
      );
      assert(atBottom, 'Page scrolled all the way to the bottom');

      // Scroll back to top
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(200);
      const backToTop = await page.evaluate(() => window.scrollY);
      assert(backToTop === 0, 'Page scrolls back to top');

      // First card visible at top
      const firstCardVisible = await page.evaluate(() => {
        const card = document.querySelector('.card');
        if (!card) return false;
        const rect = card.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight;
      });
      assert(firstCardVisible, 'First game card is visible at the top');

      await page.close();
    }

    // ── Mouse wheel scroll test ─────────────────────────────────────────────
    console.log('\n🖱  Mouse wheel scroll test\n');
    {
      const page = await browser.newPage({ viewport: VIEWPORT });
      await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });

      // Simulate mouse wheel scrolling
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(500);
      const scrollPos = await page.evaluate(() => window.scrollY);
      assert(scrollPos > 0, `Mouse wheel scroll moves the page (scrollY=${scrollPos})`);

      await page.close();
    }

    // ── Mobile viewport scroll tests ────────────────────────────────────────
    console.log('\n📱 Mobile scroll tests (375×667)\n');
    {
      const mobileViewport = { width: 375, height: 667 };
      const page = await browser.newPage({ viewport: mobileViewport });
      await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });

      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      assert(bodyHeight > mobileViewport.height, 'Mobile: page content exceeds viewport');

      const cardCount = await page.locator('.card').count();
      assert(cardCount === 100, `Mobile: grid contains 100 cards (found ${cardCount})`);

      // Touch-style scroll simulation via evaluate
      await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
      await page.waitForTimeout(300);
      const scrolled = await page.evaluate(() => window.scrollY);
      assert(scrolled >= 300, `Mobile: scroll works (scrollY=${scrolled})`);

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(300);
      const lastVisible = await page.evaluate(() => {
        const cards = document.querySelectorAll('.card');
        const last = cards[cards.length - 1];
        if (!last) return false;
        const rect = last.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      assert(lastVisible, 'Mobile: last card reachable by scrolling');

      await page.close();
    }

    // ── Mid-page card visibility test ───────────────────────────────────────
    console.log('\n🎯 Mid-page card visibility test\n');
    {
      const page = await browser.newPage({ viewport: VIEWPORT });
      await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });

      // Scroll card #50 into view and check it's visible
      const card50Visible = await page.evaluate(() => {
        const cards = document.querySelectorAll('.card');
        if (cards.length < 50) return false;
        cards[49].scrollIntoView({ behavior: 'instant', block: 'center' });
        const rect = cards[49].getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight;
      });
      await page.waitForTimeout(200);
      assert(card50Visible, 'Card #50 is visible after scrollIntoView');

      // Verify scroll position is non-trivial (we're somewhere in the middle)
      const midScroll = await page.evaluate(() => window.scrollY);
      assert(midScroll > 100, `Scrolled to mid-page for card #50 (scrollY=${midScroll})`);

      await page.close();
    }

  } finally {
    await browser.close();
    server.close();
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failures.length) {
    console.log('\n  Failures:');
    failures.forEach(f => console.log(`    ❌ ${f}`));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
