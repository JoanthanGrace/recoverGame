'use strict';
let levels = [];
let levelIndex = 0;
const completed = new Set();
const observed = new Set();
let tools = [];
let zones = [];
const stage = document.querySelector('.stage');
const feedback = document.querySelector('#feedback');
const result = document.querySelector('#result');
const hintDialog = document.querySelector('#hint-dialog');
const science = document.querySelector('#science');
const anatomyDialog = document.querySelector('#anatomy-dialog');
const collection = document.querySelector('#collection');
const finishedLevels = new Set();
let selected = null;
let drag = null;
let settleTimer = null;
let completeSoundTimer = null;
let suppressClick = false;
let shareGeneration = 0;
const current = () => levels[levelIndex];
const artPath = name => `../assets/resources/art/${name}.png`;
const setText = (selector, value) => { document.querySelector(selector).textContent = value; };
const isBlocked = () => !levels.length || completed.size === current().targets.length || result.open || hintDialog.open || science.open || anatomyDialog.open || collection.open;

function say(text, kind = '') { feedback.textContent = text; feedback.className = 'feedback ' + kind; }
function select(tool) {
  selected = tool;
  tools.forEach(button => { const active = button.dataset.tool === tool; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
}
function updateZone(button) {
  const zone = current().zones.find(item => item.id === button.dataset.zone);
  const hidden = current().observeFirst && !observed.has(zone.id);
  const done = completed.has(zone.id);
  button.classList.toggle('unobserved', hidden);
  button.classList.toggle('done', done);
  button.querySelector('b').textContent = hidden ? (zone.side === 'back' ? '线索 A' : '线索 B') : zone.title;
  button.querySelector('small').textContent = done ? '已完成' : hidden ? '点击观察' : zone.detail;
  button.setAttribute('aria-label', hidden ? '未观察的线索，点击查看' : `${zone.title}，${done ? '已完成' : zone.detail}`);
}
function drop(tool, zoneId) {
  if (isBlocked()) return;
  if (!zoneId) { say('没有放到目标上，再试一次。'); return; }
  if (completed.has(zoneId)) { say('这个目标已经完成了，试试另一个。'); return; }
  if (current().observeFirst && !observed.has(zoneId)) { say('先点开这条线索，了解情况再选行动。'); return; }
  const zone = current().zones.find(item => item.id === zoneId);
  const target = current().targets.find(item => item.zone === zoneId && item.tool === tool);
  if (!target) {
    window.recoveryAudio.play('wrong');
    say(zone.wrong, 'wrong');
    stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); return;
  }
  window.recoveryAudio.play(target.successSound || 'strengthen');
  completed.add(zoneId);
  if (target.demoArt) {
    const preview = document.querySelector('.progress-art');
    preview.src = artPath(target.demoArt); preview.alt = zone.title + ' · 动作示意'; preview.hidden = false;
    stage.classList.add('has-progress');
    const after = document.querySelector('.patient.after'); after.src = artPath(target.demoArt); after.alt = preview.alt;
  }
  updateZone(zones.find(button => button.dataset.zone === zoneId));
  const toolButton = tools.find(button => button.dataset.tool === tool);
  // Disable a tool only when every target using it has been completed.
  if (current().targets.filter(item => item.tool === tool).every(item => completed.has(item.zone))) {
    toolButton.classList.add('used'); toolButton.disabled = true;
  }
  select(null);
  setText('#score', `${completed.size} / ${current().targets.length}`);
  const score = current().targets.filter(item => completed.has(item.zone)).reduce((sum, item) => sum + item.score, 0);
  document.querySelector('#fill').style.width = `${score}%`;
  setText('#percent', `${score}%`);
  stage.classList.toggle('half', completed.size === 1);
  say(zone.correct, 'correct');
  setText('#status', completed.size < current().targets.length ? '方向对了，再完成一项' : '今天的科普目标完成');
  if (completed.size === current().targets.length) {
    finishedLevels.add(current().id); updateCampaign();
    stage.classList.add('recovered');
    // A hint opened during the reveal must not leave stacked modal dialogs.
    hintDialog.close();
    completeSoundTimer = setTimeout(() => window.recoveryAudio.play('complete'), 450);
    settleTimer = setTimeout(() => { settleTimer = null; result.showModal(); }, 1300);
  }
}
function endDrag(cancelled = false, event) {
  if (!drag) return;
  const previous = drag;
  if (event && event.pointerId !== previous.pointerId) return;
  previous.ghost?.remove(); zones.forEach(zone => zone.classList.remove('hover')); drag = null;
  if (previous.moved) {
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    if (!cancelled && event) drop(previous.tool, zoneAt(event.clientX, event.clientY)?.dataset.zone || null);
  }
}
function zoneAt(x, y) {
  return zones.find(zone => { const rect = zone.getBoundingClientRect(); return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom; });
}
function bindTool(button) {
  button.addEventListener('click', () => { if (!suppressClick && !isBlocked()) select(button.dataset.tool); });
  button.addEventListener('pointerdown', event => {
    if (drag || isBlocked() || button.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    select(button.dataset.tool);
    drag = { tool: button.dataset.tool, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, ghost: null };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
    if (!drag.ghost) {
      const visual = button.querySelector('img, .work-icon');
      drag.ghost = visual.cloneNode(true); drag.ghost.classList.add('drag-ghost'); drag.ghost.setAttribute('aria-hidden', 'true'); document.body.append(drag.ghost);
    }
    drag.moved = true; drag.ghost.style.left = `${event.clientX}px`; drag.ghost.style.top = `${event.clientY}px`;
    const target = zoneAt(event.clientX, event.clientY); zones.forEach(zone => zone.classList.toggle('hover', zone === target && !completed.has(zone.dataset.zone)));
  });
  button.addEventListener('pointerup', event => endDrag(false, event));
  button.addEventListener('pointercancel', event => endDrag(true, event));
  button.addEventListener('lostpointercapture', event => endDrag(true, event));
}
function showLevel(index, scroll = true) {
  clearTimeout(settleTimer); clearTimeout(completeSoundTimer); window.recoveryAudio.stopAll(); endDrag(true); shareGeneration++;
  settleTimer = null;
  document.documentElement.classList.add('switching');
  levelIndex = index; completed.clear(); observed.clear(); selected = null;
  anatomyDialog.close(); result.close(); hintDialog.close(); science.close(); collection.close();
  const level = current();
  stage.classList.remove('half', 'recovered', 'shake'); stage.classList.toggle('habits', level.observeFirst);
  stage.classList.toggle('has-progress', Boolean(level.progressArt));
  stage.classList.toggle('work-scene', level.id >= 3);
  stage.classList.toggle('fitness-scene', Boolean(level.fitness));
  const progressImage = document.querySelector('.progress-art');
  progressImage.hidden = !level.progressArt;
  if (level.progressArt) { progressImage.src = artPath(level.progressArt); progressImage.alt = level.progressAlt || '完成第一项目标'; } else progressImage.removeAttribute('src');
  document.title = `打工人康复指南 · ${level.title}`;
  setText('#case-number', `CASE ${String(level.id).padStart(3, '0')}`); setText('#room', level.room);
  setText('#level-title', level.title); setText('#subtitle', level.subtitle); setText('#story', level.story);
  setText('#status', level.status); setText('.patient-name', level.patientName); setText('#dock-title', level.dockTitle);
  for (const [selector, name, alt] of [['.patient.before', level.beforeArt, level.beforeAlt], ['.patient.after', level.afterArt, level.afterAlt], ['.result-art .before', level.beforeArt, level.beforeAlt], ['.result-art .after', level.afterArt, level.afterAlt]]) {
    const img = document.querySelector(selector); img.src = artPath(name); img.alt = alt;
  }
  const targetContainer = document.querySelector('#targets'); targetContainer.replaceChildren();
  for (const zone of level.zones) {
    const button = document.createElement('button'); button.className = `zone ${zone.side}`; button.dataset.zone = zone.id; button.style.setProperty('--zone-color', zone.color);
    button.innerHTML = '<span class="zone-dot"></span><b></b><small></small>';
    targetContainer.append(button); updateZone(button);
    button.addEventListener('click', () => {
      if (isBlocked() || drag) return;
      if (level.observeFirst && !observed.has(zone.id)) {
        observed.add(zone.id); updateZone(button); say(zone.clue); select(null); return;
      }
      if (selected) drop(selected, zone.id); else say(level.observeFirst ? zone.clue : '先在工具箱里选一件工具。');
    });
  }
  zones = [...targetContainer.children];
  const toolContainer = document.querySelector('.tools'); toolContainer.replaceChildren(); toolContainer.classList.toggle('three-tools', level.tools.length === 3);
  for (const tool of level.tools) {
    const button = document.createElement('button'); button.className = 'tool'; button.dataset.tool = tool.id; button.setAttribute('aria-pressed', 'false');
    if (tool.art) { const img = document.createElement('img'); img.src = artPath(tool.art); img.alt = ''; button.append(img); }
    else { const icon = document.createElement('span'); icon.className = level.id >= 3 ? 'work-icon repeat-icon' : 'work-icon'; icon.setAttribute('aria-hidden', 'true'); if (level.id >= 3) icon.textContent = '↻'; button.append(icon); }
    const copy = document.createElement('div'); const title = document.createElement('b'); title.textContent = tool.title; const detail = document.createElement('small'); detail.textContent = tool.detail; copy.append(title, detail); button.append(copy);
    const badge = document.createElement('span'); badge.className = 'tool-action'; badge.textContent = tool.action; button.append(badge);
    toolContainer.append(button); bindTool(button);
  }
  tools = [...toolContainer.children];
  setText('#hint-title', level.hintTitle); setText('#hint-text', level.hintText);
  setText('#result-title', level.resultTitle); setText('#result-text', level.resultText); setText('#result-note', level.resultNote);
  result.classList.toggle('fitness-result', Boolean(level.fitness));
  const demos = document.querySelector('#result-demos'); demos.replaceChildren();
  if (level.fitness) level.education.actions.forEach(action => {
    const card = document.createElement('figure'); const img = document.createElement('img'); img.src = artPath(action.art); img.alt = action.title + '示意';
    const caption = document.createElement('figcaption'); caption.textContent = action.title; card.append(img, caption); demos.append(card);
  });
  setText('#replay', '再玩本关'); setText('#score', `0 / ${level.targets.length}`); setText('#share-feedback', '');
  document.querySelector('#fill').style.width = '0%'; setText('#percent', '0%'); say(level.instruction);
  const next = document.querySelector('#next'); next.textContent = index < levels.length - 1 ? `下一关 · ${levels[index + 1].title}` : '查看我的学习总结';
  updateCampaign();
  document.querySelectorAll('[data-level]').forEach(button => { const active = Number(button.dataset.level) === index; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  void stage.offsetWidth;
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('switching')));
  if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
}
document.querySelector('#hint').addEventListener('click', () => {
  if (isBlocked()) return;
  endDrag(true); hintDialog.showModal(); document.querySelector('#hint').setAttribute('aria-expanded', 'true');
});
hintDialog.addEventListener('close', () => document.querySelector('#hint').setAttribute('aria-expanded', 'false'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('#replay').addEventListener('click', () => showLevel(levelIndex));
document.querySelector('#next').addEventListener('click', () => {
  if (levelIndex < levels.length - 1) { showLevel(levelIndex + 1); return; }
  result.close(); showCollection();
});
function updateCampaign() {
  setText('#campaign-count', `已完成 ${finishedLevels.size} / ${levels.length} 个场景 · 点击回顾`);
  document.querySelectorAll('[data-level]').forEach(button => button.classList.toggle('visited', finishedLevels.has(levels[Number(button.dataset.level)].id)));
}
function showScience(level = current()) {
  if (!level) return;
  endDrag(true); select(null);
  const data = level.education;
  setText('#science-title', level.shortTitle + (level.fitness ? ' · 肌肉与健身' : ' · 工作与肌肉'));
  setText('#science-summary', data.summary); setText('#science-cause', data.cause); setText('#science-boundary', data.boundary);
  for (const [selector, rows, title, description] of [
    ['#science-muscles', data.muscles, item => item.name, item => `${item.location}。${item.function}`],
    ['#science-actions', data.actions, item => item.title, item => item.description],
  ]) {
    const container = document.querySelector(selector); container.replaceChildren();
    rows.forEach(item => {
      const card = document.createElement('article'); const heading = document.createElement('h4'); heading.textContent = title(item); const copy = document.createElement('p'); copy.textContent = description(item); card.append(heading, copy);
      if (item.anatomy) {
        const figure = document.createElement('figure'); figure.className = 'muscle-anatomy';
        const button = document.createElement('button'); button.className = 'anatomy-preview'; button.setAttribute('aria-label', '放大查看' + item.name + '解剖位置示意');
        const img = document.createElement('img'); img.src = artPath(item.anatomy.art); img.alt = item.name + ' · ' + item.anatomy.view + '解剖位置示意';
        const tag = document.createElement('span'); tag.textContent = item.anatomy.view + ' · 点图放大'; button.append(img, tag);
        button.addEventListener('click', () => showAnatomy(item));
        const legend = document.createElement('div'); legend.className = 'anatomy-legend'; renderLegend(legend, item.anatomy.legend);
        const caption = document.createElement('figcaption'); caption.textContent = item.anatomy.caption;
        figure.append(button, legend, caption); card.append(figure);
      }
      if (item.art) { const img = document.createElement('img'); img.className = 'action-demo'; img.src = artPath(item.art); img.alt = item.title + '动作示意'; card.append(img); }
      if (item.steps) { const list = document.createElement('ol'); item.steps.forEach(step => { const li = document.createElement('li'); li.textContent = step; list.append(li); }); card.append(list); }
      for (const [key, label] of [['principle', '小知识'], ['caution', '注意']]) if (item[key]) { const p = document.createElement('p'); p.className = key; p.textContent = label + '：' + item[key]; card.append(p); }
      container.append(card);
    });
  }
  const container = document.querySelector('#science-sources'); container.replaceChildren();
  const workTip = document.querySelector('#science-work-tip'); workTip.hidden = !level.workTip; workTip.closest('details').hidden = !level.workTip; workTip.textContent = level.workTip || '';
  data.sources.forEach(source => {
    if (!/^https:\/\//.test(source.url)) return;
    const link = document.createElement('a'); link.href = source.url; link.textContent = source.title + ' ↗'; link.target = '_blank'; link.rel = 'noopener noreferrer'; container.append(link);
  });
  science.querySelectorAll('details').forEach(detail => { detail.open = false; }); science.showModal(); science.scrollTop = 0;
}
function renderLegend(container, items) {
  container.replaceChildren();
  items.forEach(item => { const chip = document.createElement('span'); const dot = document.createElement('i'); dot.style.backgroundColor = item.color; dot.setAttribute('aria-hidden', 'true'); chip.append(dot, document.createTextNode(item.name)); container.append(chip); });
}
function showAnatomy(muscle) {
  const data = muscle.anatomy;
  setText('#anatomy-title', muscle.name); setText('#anatomy-view', data.view); setText('#anatomy-caption', data.caption);
  const img = document.querySelector('#anatomy-image'); img.src = artPath(data.art); img.alt = muscle.name + ' · ' + data.view; img.hidden = false;
  renderLegend(document.querySelector('#anatomy-legend'), data.legend);
  const source = document.querySelector('#anatomy-source'); source.hidden = !/^https:\/\//.test(data.source); if (!source.hidden) source.href = data.source;
  anatomyDialog.showModal(); anatomyDialog.scrollTop = 0;
}
function showCollection() {
  endDrag(true);
  setText('#collection-count', `你已完成 ${finishedLevels.size} / ${levels.length} 个工作场景。放松、拉伸与主动练习各有作用；认识肌肉，不追痛、不硬撑。`);
  const container = document.querySelector('#collection-cards'); container.replaceChildren();
  levels.forEach(level => {
    const button = document.createElement('button'); button.className = 'note-card';
    const heading = document.createElement('b'); heading.textContent = `${finishedLevels.has(level.id) ? '✓' : '○'} ${level.id}. ${level.shortTitle}`;
    const copy = document.createElement('span'); copy.textContent = level.education.summary;
    button.append(heading, copy); button.addEventListener('click', () => showScience(level)); container.append(button);
  });
  collection.showModal(); collection.scrollTop = 0;
}
document.querySelector('#learn').addEventListener('click', () => { if (levels.length && !settleTimer && !hintDialog.open && !result.open && !science.open && !collection.open) showScience(); });
document.querySelector('#result-learn').addEventListener('click', () => showScience());
document.querySelector('#campaign-count').addEventListener('click', () => { if (levels.length && !settleTimer && !result.open && !science.open && !hintDialog.open && !collection.open) showCollection(); });
function buildNavigation() {
  const nav = document.querySelector('.level-nav'); nav.replaceChildren();
  levels.forEach((level, index) => {
    const button = document.createElement('button'); button.dataset.level = String(index);
    button.textContent = `${String(level.id).padStart(2, '0')} · ${level.shortTitle || level.title}`;
    button.addEventListener('click', () => showLevel(index)); nav.append(button);
  });
}
document.querySelector('#share').addEventListener('click', async () => {
  const message = document.querySelector('#share-feedback'); const generation = shareGeneration;
  const title = current().shareTitle; const text = current().stageTip;
  const local = ['localhost', '127.0.0.1', ''].includes(location.hostname) || location.protocol === 'file:';
  const url = new URL(location.href); url.searchParams.set('level', String(current().id));
  try {
    if (!local && navigator.share) { await navigator.share({ title, text, url: url.href }); if (generation === shareGeneration) message.textContent = '分享面板已打开。'; }
    else if (navigator.clipboard) { await navigator.clipboard.writeText(local ? `${title}\n${text}` : `${title}\n${url.href}`); if (generation === shareGeneration) message.textContent = local ? '科普文案已复制。本地试玩地址不能分享给朋友。' : '链接已复制，可以发给朋友。'; }
    else { message.textContent = '当前浏览器不支持分享，请使用：' + title; }
  } catch (error) { if (generation === shareGeneration) message.textContent = error.name === 'AbortError' ? '已取消分享。' : '当前环境分享不可用，请稍后再试。'; }
});
window.addEventListener('blur', () => endDrag(true));
(async () => {
  try {
    const response = await fetch('../assets/resources/data/levels.json'); if (!response.ok) throw new Error('Level load failed'); levels = await response.json(); buildNavigation();
    const requested = Number(new URL(location.href).searchParams.get('level')); const index = levels.findIndex(level => level.id === requested);
    showLevel(index >= 0 ? index : 0, false);
    if (new URL(location.href).searchParams.get('learn') === 'muscles') {
      showScience(); document.querySelector('#science-muscles').scrollIntoView({ block: 'start' });
    }
  } catch { say('关卡加载失败，请通过本地服务器打开试玩页，然后刷新。', 'wrong'); }
})();
