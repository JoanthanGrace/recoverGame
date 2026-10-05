const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'recovergame-check-'));
const levels = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/levels.json'), 'utf8'));
for (const name of ['types', 'core/RecoverySession', 'GameRoot']) {
  const source = fs.readFileSync(path.join(root, `assets/scripts/${name}.ts`), 'utf8');
  const result = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true } });
  assert.equal(result.diagnostics.length, 0, `${name} syntax`);
  fs.mkdirSync(path.dirname(path.join(scratch, `${name}.js`)), { recursive: true });
  fs.writeFileSync(path.join(scratch, `${name}.js`), result.outputText);
}
const { RecoverySession } = require(path.join(scratch, 'core/RecoverySession.js'));
const typeIds = require(path.join(scratch, 'types.js'));
assert.equal(new Set(levels.map(level => level.id)).size, levels.length);
for (const level of levels) {
  assert.ok(['prd', 'extension'].includes(level.designSource)); assert.ok(level.knowledge);
  assert.ok(level.education.summary && level.education.cause && level.education.boundary);
  assert.ok(level.education.muscles.length >= 2);
  for (const muscle of level.education.muscles) assert.ok(muscle.name && muscle.location && muscle.function);
  assert.equal(level.education.actions.length, 2);
  if (level.id >= 3) {
    assert.equal(level.fitness, true); assert.ok(level.workTip);
    assert.ok(level.tools.every(tool => !['adjustChair','microBreak','alternatePosture','bringCloser','useTrolley','splitLoad'].includes(tool.id)));
    for (const action of level.education.actions) {
      assert.ok(action.art && action.steps.length >= 3 && action.principle && action.caution);
      assert.ok(fs.existsSync(path.join(root, 'assets/resources/art/' + action.art + '.png')));
    }
    for (const target of level.targets) assert.ok(level.education.actions.some(action => action.art === target.demoArt));
  }
  assert.ok(level.education.sources.length >= 2);
  for (const source of level.education.sources) assert.ok(source.title && /^https:\/\//.test(source.url));
  if (level.progressArt) assert.ok(fs.existsSync(path.join(root, `assets/resources/art/${level.progressArt}.png`)));
  for (const zone of level.zones) { assert.ok(Object.values(typeIds.ZoneType).includes(zone.id)); assert.ok(zone.clue && zone.wrong && zone.correct); }
  for (const tool of level.tools) assert.ok(Object.values(typeIds.ToolType).includes(tool.id));
  assert.equal(level.targets.reduce((score, target) => score + target.score, 0), 100);
  assert.equal(new Set(level.targets.map(target => target.zone)).size, level.targets.length);
  for (const tool of level.tools) if (tool.art) assert.ok(fs.existsSync(path.join(root, `assets/resources/art/${tool.art}.png`)));
  for (const art of [level.beforeArt, level.afterArt]) assert.ok(fs.existsSync(path.join(root, `assets/resources/art/${art}.png`)));
  for (const target of level.targets) {
    assert.ok(['relax', 'strengthen'].includes(target.successSound));
    const wav = fs.readFileSync(path.join(root, `assets/resources/audio/${target.successSound}.wav`)); assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.ok(wav.length > 44);
    assert.ok(level.tools.some(tool => tool.id === target.tool)); assert.ok(level.zones.some(zone => zone.id === target.zone));
  }
  for (const sequence of [level.targets, [...level.targets].reverse()]) {
    const session = new RecoverySession(level);
    assert.equal(session.drop(sequence[0].tool, null), 'outside');
    if (level.observeFirst) { assert.equal(session.drop(sequence[0].tool, sequence[0].zone), 'unobserved'); assert.equal(session.health, 0); }
    sequence.forEach((target, index) => {
      session.inspect(target.zone);
      const wrong = level.tools.find(tool => tool.id !== target.tool);
      assert.equal(session.drop(wrong.id, target.zone), 'wrong'); assert.equal(session.health, index * 50);
      assert.equal(session.drop(target.tool, target.zone), 'correct');
      assert.equal(session.drop(target.tool, target.zone), session.finished ? 'locked' : 'completed');
    });
    assert.equal(session.health, 100); assert.equal(session.completedCount, 2); assert.equal(session.finished, true);
    session.reset(); assert.equal(session.health, 0); assert.equal(session.finished, false); assert.equal(session.isObserved(sequence[0].zone), false);
  }
}
console.log('PASS: all five levels, education schema, clue gates, either order, wrong/outside/duplicate drops, reset, assets, TS syntax.');
if (!process.argv.includes('--browser')) process.exit(0);

(async () => {
  const { chromium } = require('playwright-core');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wav': 'audio/wav' };
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(filename, (error, data) => { response.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }); response.end(error ? 'Not found' : data); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, headless: true } : { channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const url = `http://127.0.0.1:${server.address().port}/preview/`;
    const imagesReady = () => page.waitForFunction(() => [...document.images].every(img => img.hidden || (img.complete && img.naturalWidth > 0)));
    const pick = async (tool, zone) => { await page.locator(`[data-tool="${tool}"]`).click(); await page.locator(`[data-zone="${zone}"]`).click(); };
    await page.goto(url); await page.locator('[data-tool="fasciaBall"]').waitFor(); await imagesReady();
    await pick('elasticBand', 'chest'); assert.equal(await page.locator('#score').textContent(), '0 / 2');
    await page.locator('#sound').click(); assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
    await pick('fasciaBall', 'chest'); await imagesReady();
    assert.equal(await page.locator('#percent').textContent(), '50%');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.progress-art')).opacity === '1');
    await page.screenshot({ path: path.join(scratch, 'level1-progress.png'), fullPage: true });
    await pick('elasticBand', 'back'); await page.waitForFunction(() => document.querySelector('#result').open);
    assert.equal(await page.locator('#percent').textContent(), '100%');
    await page.locator('#next').click(); await imagesReady();
    assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#percent').textContent(), '0%'); assert.equal(await page.locator('#level-title').textContent(), '久坐暂停键');
    assert.equal(await page.locator('.tool').count(), 3); assert.equal(await page.locator('.zone.unobserved').count(), 2);
    await page.screenshot({ path: path.join(scratch, 'level2-mobile.png'), fullPage: true });
    // Dragging to a hidden clue cannot bypass observation.
    const toolBox = await page.locator('[data-tool="walkBreak"]').boundingBox(); const zoneBox = await page.locator('[data-zone="sitting"]').boundingBox();
    await page.mouse.move(toolBox.x + toolBox.width / 2, toolBox.y + toolBox.height / 2); await page.mouse.down();
    await page.mouse.move(zoneBox.x + zoneBox.width / 2, zoneBox.y + zoneBox.height / 2, { steps: 12 }); await page.mouse.up();
    assert.equal(await page.locator('#score').textContent(), '0 / 2'); assert.equal(await page.locator('.zone.unobserved').count(), 2);
    await page.locator('#hint').click(); assert.equal(await page.locator('#hint-dialog').evaluate(el => el.open), true); await page.locator('#hint-dialog .primary').click();
    await page.locator('[data-zone="sitting"]').click(); await page.locator('[data-zone="screen"]').click();
    await pick('keepWorking', 'screen'); assert.equal(await page.locator('#score').textContent(), '0 / 2');
    await pick('walkBreak', 'screen'); assert.equal(await page.locator('#score').textContent(), '0 / 2');
    await pick('distanceBreak', 'screen'); assert.equal(await page.locator('#score').textContent(), '1 / 2');
    await page.locator('[data-zone="screen"]').click(); assert.equal(await page.locator('#score').textContent(), '1 / 2');
    await pick('walkBreak', 'sitting'); await page.waitForFunction(() => document.querySelector('#result').open);
    await page.screenshot({ path: path.join(scratch, 'level2-result.png'), fullPage: true });
    await page.locator('#replay').click(); assert.equal(await page.locator('.zone.unobserved').count(), 2); assert.equal(await page.locator('#score').textContent(), '0 / 2');
    await page.locator('[data-zone="sitting"]').click(); await page.locator('[data-zone="screen"]').click();
    await pick('walkBreak', 'sitting'); await pick('distanceBreak', 'screen');
    await page.locator('[data-level="0"]').click(); await page.waitForTimeout(1400); assert.equal(await page.locator('#result').evaluate(el => el.open), false); assert.equal(await page.locator('#score').textContent(), '0 / 2');
    await page.goto(url + '?level=2'); await page.locator('[data-tool="walkBreak"]').waitFor(); await imagesReady();
    assert.equal(await page.locator('#level-title').textContent(), '久坐暂停键');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width > 600 ? 1100 : 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
    }
    await page.screenshot({ path: path.join(scratch, 'level2-desktop.png'), fullPage: true });
    for (const level of levels) {
      await page.locator('[data-level="' + (level.id - 1) + '"]').click(); await imagesReady();
      await page.locator('#learn').click();
      assert.equal(await page.locator('#science').evaluate(el => el.open), true);
      assert.equal(await page.locator('#science-muscles article').count(), level.education.muscles.length);
      if (level.fitness) {
        assert.equal(await page.locator('#science-actions .action-demo').count(), 2);
        assert.equal(await page.locator('#science-actions ol li').count(), 6);
        assert.equal(await page.locator('#science-actions .principle').count(), 2);
        assert.equal(await page.locator('#science-actions .caution').count(), 2);
        assert.equal(await page.locator('#science-work-tip').textContent(), level.workTip);
      }
      assert.ok((await page.locator('#science-muscles').textContent()).includes(level.education.muscles[0].name));
      await page.locator('#science details:not(.work-tip) summary').click();
      assert.equal(await page.locator('#science-sources a').count(), level.education.sources.length);
      await page.locator('#science .primary').click();
      assert.equal(await page.locator('#score').textContent(), '0 / 2');
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: width > 600 ? 1100 : 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'level ' + level.id + ' overflow ' + width);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(scratch, 'level' + level.id + '-mobile.png'), fullPage: true });
      if (level.id < 3) {
        if (level.observeFirst) for (const zone of level.zones) await page.locator('[data-zone="' + zone.id + '"]').click();
        for (const target of level.targets) await pick(target.tool, target.zone);
        await page.waitForFunction(() => document.querySelector('#result').open); await page.locator('#next').click(); continue;
      }
      // A dragged action must not solve an unobserved clue.
      const first = level.targets[0];
      const box = await page.locator('[data-tool="' + first.tool + '"]').boundingBox();
      const targetBox = await page.locator('[data-zone="' + first.zone + '"]').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 }); await page.mouse.up();
      assert.equal(await page.locator('#score').textContent(), '0 / 2');
      for (const zone of level.zones) await page.locator('[data-zone="' + zone.id + '"]').click();
      await pick('keepWorking', first.zone); assert.equal(await page.locator('#score').textContent(), '0 / 2');
      // Pointer cancellation restores the tool without awarding progress.
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 - 40, { steps: 6 });
      await page.locator('[data-tool="' + first.tool + '"]').dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
      await page.mouse.up();
      assert.equal(await page.locator('.drag-ghost').count(), 0); assert.equal(await page.locator('#score').textContent(), '0 / 2');
      await page.waitForTimeout(20);
      for (const target of [...level.targets].reverse()) {
        await pick(target.tool, target.zone);
        const selector = (await page.locator('#percent').textContent()) === '50%' ? '.progress-art' : '.patient.after';
        assert.ok((await page.locator(selector).getAttribute('src')).endsWith(target.demoArt + '.png'));
      }
      assert.equal(await page.locator('#result-demos figure').count(), 2);
      await page.waitForFunction(() => document.querySelector('#result').open);
      await page.locator('#result-learn').click(); assert.equal(await page.locator('#science').evaluate(el => el.open), true);
      await page.locator('#science .primary').click(); assert.equal(await page.locator('#result').evaluate(el => el.open), true);
      await page.screenshot({ path: path.join(scratch, 'level' + level.id + '-result.png'), fullPage: true });
      await page.locator('#next').click();
      if (level.id === 5) {
        assert.equal(await page.locator('#collection').evaluate(el => el.open), true);
        assert.equal(await page.locator('#collection-cards .note-card').count(), 5);
        assert.ok((await page.locator('#collection-count').textContent()).includes('5 / 5'));
        await page.locator('#collection .primary').click();
      }
    }
    for (const id of [3,4,5]) {
      await page.goto(url + '?level=' + id); await page.locator('[data-tool="' + levels[id - 1].tools[0].id + '"]').waitFor();
      assert.equal(await page.locator('#level-title').textContent(), levels[id - 1].title);
    }
    const future = [...levels, { ...levels[0], id: 6, title: '配置扩展测试', shortTitle: '扩展测试' }];
    await page.route('**/assets/resources/data/levels.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(future) }));
    await page.goto(url + '?level=6'); await page.locator('[data-level="5"]').waitFor();
    assert.equal(await page.locator('.level-nav button').count(), 6);
    assert.equal(await page.locator('#level-title').textContent(), '配置扩展测试');
    await page.unroute('**/assets/resources/data/levels.json');
    assert.deepEqual(errors, []);
    console.log('PASS: browser five levels, learning cards, final collection, cancellation, images, hidden-clue drag gate, hint, distractor, wrong/correct choices, replay, switch during reveal, deep link, 320/390/1440px layouts, no script errors.');
    console.log('Screenshots: ' + scratch);
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
