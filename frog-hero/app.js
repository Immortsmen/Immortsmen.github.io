import { Game, CHAPTERS } from './engine.mjs';
import { Renderer } from './renderer.js';
import { AudioPlayer } from './audio.js';

const shell = document.querySelector('#game-shell');
const ui = document.querySelector('#interface');
const canvas = document.querySelector('#world');
const announcement = document.querySelector('#announcement');
const game = new Game();
const renderer = new Renderer(canvas);
const audio = new AudioPlayer();
const input = {};
const keyHolds = new Set();
const pointerHolds = new Map();
const SAVE_KEY = 'frog-hero-checkpoint-v1';
const SETTINGS_KEY = 'frog-hero-settings-v1';
let overlay = null;
let lastMode = '';
let lastTime = performance.now();
let hudTimer = 0;
let announcementTimer;
let saved;
let settings = { muted: false, music: true, volume: .45, reduced: false };
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }; } catch { saved = null; }
if (saved && !new Game().restore(saved)) saved = null;
Object.assign(audio, settings); renderer.reduced = settings.reduced;
const avatar = '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="37" rx="25" ry="24" fill="#f4cb59"/><circle cx="20" cy="18" r="10" fill="#f4cb59"/><circle cx="44" cy="18" r="10" fill="#f4cb59"/><circle cx="21" cy="18" r="3" fill="#493c48"/><circle cx="45" cy="18" r="3" fill="#493c48"/><ellipse cx="32" cy="46" rx="17" ry="12" fill="#fff0c6"/><path d="M24 30q9 9 18 0" fill="none" stroke="#685244" stroke-width="2.5" stroke-linecap="round"/></svg>';
const touch = document.createElement('div');
touch.className = 'touch-controls';
touch.innerHTML = '<div class="dpad"><button data-hold="up" aria-label="向上移动">↑</button><button data-hold="left" aria-label="向左移动">←</button><button data-hold="down" aria-label="向下移动">↓</button><button data-hold="right" aria-label="向右移动">→</button></div><div class="touch-actions"><button data-action="dash">冲撞</button><button data-action="laugh">大笑</button><button class="fire" data-hold="fire">奶球</button><button data-hold="guard">防御</button><button data-action="heal">回血</button></div>';
shell.append(touch);
const rotateHint = document.createElement('div'); rotateHint.className = 'rotate-hint'; rotateHint.textContent = '横屏体验更好 · 支持键盘与触屏'; document.body.append(rotateHint);
function resize() {
  const width = Math.min(innerWidth - (innerWidth > 600 ? 32 : 0), (innerHeight - (innerWidth > 600 ? 32 : 140)) * 16 / 9, 1600);
  shell.style.width = width + 'px'; shell.style.height = width * 9 / 16 + 'px'; ui.style.setProperty('--scale', width / 1280);
}
addEventListener('resize', resize); resize();
function saveSettings() { Object.assign(audio, settings); renderer.reduced = settings.reduced; try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {} }
function storeCheckpoint() {
  saved = game.checkpoint;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { notify('存档不可用，本局仍可继续'); }
}
function notify(message) { announcement.textContent = message; announcement.classList.add('show'); clearTimeout(announcementTimer); announcementTimer = setTimeout(() => announcement.classList.remove('show'), 2800); }
function time(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }
function resetInput() { keyHolds.clear(); pointerHolds.clear(); for (const key of Object.keys(input)) input[key] = false; }
function syncInput() { for (const key of ['left', 'right', 'up', 'down', 'fire', 'guard']) input[key] = keyHolds.has(key) || [...pointerHolds.values()].includes(key); }
function toolbar(title = false) { return `<div class="toolbar"><button class="icon-button" data-action="fullscreen" aria-label="全屏" title="全屏">⛶</button><button class="icon-button" data-action="${title ? 'settings' : 'mute'}" aria-label="${title ? '设置' : '切换静音'}" title="${title ? '设置' : '切换静音'}">${title ? '⚙' : settings.muted ? '♪̸' : '♪'}</button>${title ? '' : '<button class="icon-button" data-action="pause" aria-label="暂停游戏" title="暂停 · Esc">Ⅱ</button>'}</div>`; }
function skill(action, symbol, title, hint, extra = '') { return `<button class="skill ${extra}" ${['fire', 'guard'].includes(action) ? `data-hold="${action}"` : `data-action="${action}"`} aria-label="${title}" title="${hint}"><span class="symbol">${symbol}</span><span><b>${title}</b><small data-hint="${action}">${hint}</small></span><span class="charge" data-charge="${action}"></span></button>`; }
function titleMarkup() {
  return `<div class="title">${toolbar(true)}<div class="title-copy"><div class="eyebrow">THE LITTLE HERO · 七章营救之旅</div><h1>奶蛙<span>勇者</span></h1><p class="subtitle">一肚子勇气，一路笑出奇迹。<br>去城堡，把公主带回家。</p><button class="gold-button" data-action="start">准备好出发 <span>→</span></button>${saved ? `<button class="ghost-button" data-action="continue">继续冒险 · ${CHAPTERS[saved.chapter].name}</button>` : ''}<p class="tiny">✦ ${saved ? '你的营救故事，还在继续' : '你的第一次营救，即将开始'}</p></div><div class="title-seal">小小勇者<br>大大笑声</div><div class="title-footer"><div>键盘 / 触屏操作 <span> · </span> 进度自动保存</div><button data-action="help">冒险指南 ↗</button><span>独立绘制 · 玩法致敬版</span></div></div>`;
}
function hudMarkup() {
  return `${toolbar()}<div class="hud"><div class="avatar">${avatar}</div><div><div class="hero-label">奶蛙勇者 <span style="font-size:11px;color:#c5b6cb">✦ LV.${1 + Object.values(game.hero.upgrades).reduce((sum, value) => sum + value, 0)}</span></div><div class="hp-track" role="meter" aria-label="生命值" aria-valuemin="0" aria-valuemax="${game.hero.maxHp}"><div class="hp-fill" id="health-fill"></div></div><div class="stats-line"><span id="health-text"></span><span id="coin-text"></span></div></div></div><div class="chapter-hud"><div class="chapter-index">CHAPTER ${String(game.chapter + 1).padStart(2, '0')}</div><h2>${CHAPTERS[game.chapter].name}</h2><p id="wave-text"></p></div><div class="timer" id="timer"></div><div class="boss-hud" id="boss-hud" hidden><span id="boss-name"></span><div class="hp-track"><div class="hp-fill" id="boss-fill"></div></div></div><div class="dialogue"><b>豆公主的叮嘱</b><br>${['按住 F 发射奶球，红色预警亮起时记得走位。', '林间的对手更敏捷。试试奶蛋助阵！', '盾牌会挡住正面攻击，冲撞能突破防御。', '大招前有红色预警。绕开落点，再反击。', '补给币可以在每章结束后换取罐头。', '远离红色法阵，按住空格可以减少伤害。', '连点 R 积攒笑意，蓄满后按 Q 释放超级大笑！'][game.chapter]}</div><div class="combo" id="combo"></div><div class="bottom-bar"><div class="journey">${CHAPTERS.map((chapter, index) => `<div class="node ${index === game.chapter ? 'current' : index < game.chapter ? 'complete' : ''}"><i></i>${chapter.name}</div>`).join('')}</div><div class="skill-row"><div class="movement-help"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向键移动<br><kbd>Esc</kbd> 暂停 · <kbd>R</kbd> 最终战蓄力</div>${skill('summon', '✦', '奶蛋助阵', 'V · 强化 8 秒')}${skill('heal', '♡', '黄桃罐头', 'C · 回满生命')}${skill('dash', '≋', '肚皮冲撞', 'SHIFT · 2 / 2')}${skill('guard', '◈', '肚皮防御', '按住 SPACE')}${skill('laugh', '☺', '捧腹大笑', 'E · 攒满释放')}${game.chapter === 6 ? skill('super', '✺', '超级大笑', 'Q · 连点 R 蓄力') : ''}${skill('fire', '◎', '奶球连发', '按住 F', 'primary')}</div></div>`;
}
function panel(content, wide = false) { return `<div class="modal-scrim"><section class="panel ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${content}</section></div>`; }
function modalMarkup() {
  if (overlay === 'confirm') return panel('<div class="panel-mark">↻</div><div class="eyebrow">A NEW ADVENTURE</div><h2>重新出发？</h2><p>新的冒险会替换本机保存的进度。<br>也可以返回，继续未完成的营救。</p><button class="gold-button" data-action="new">确认重新开始</button><button class="ghost-button" data-action="close">返回</button>');
  if (overlay === 'settings') return panel(`<div class="eyebrow">MAKE YOURSELF COMFORTABLE</div><h2>声音与画面</h2><label class="setting-row">全部静音<input id="muted-setting" type="checkbox" ${settings.muted ? 'checked' : ''}></label><label class="setting-row">背景音乐<input id="music-setting" type="checkbox" ${settings.music ? 'checked' : ''}></label><label class="setting-row">音量<input id="volume-setting" aria-label="音量" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label class="setting-row">减少动态效果<input id="reduced-setting" type="checkbox" ${settings.reduced ? 'checked' : ''}></label><p class="panel-footnote">音乐和音效均为程序合成，首次点击后启用。</p><button class="ghost-button" data-action="close">返回冒险</button>`);
  if (overlay === 'help') return panel('<div class="eyebrow">THE ADVENTURER’S NOTEBOOK</div><h2>勇者冒险指南</h2><p>移动走位，奶球锁定最近的敌人。击退每波守卫后选择强化，<br>穿过七个区域，击败憋笑魔王，救出豆公主。</p><div class="control-grid"><span><b>WASD / ↑↓←→</b>移动</span><span><b>F</b>按住发射奶球</span><span><b>SPACE</b>按住防御减伤</span><span><b>SHIFT</b>肚皮冲撞 · 每 3.5 秒补充</span><span><b>E</b>满能量大笑，范围伤害</span><span><b>C</b>消耗黄桃罐头，回满血</span><span><b>V</b>奶蛋助阵 · 冷却 35 秒</span><span><b>R → Q</b>最终战连点蓄力，再放大笑</span></div><p class="panel-footnote">触屏使用左侧方向键和右侧技能键；横屏体验更佳。<br>每波开头保存检查点，失败后可免费重试。</p><button class="ghost-button" data-action="close">我准备好了</button>', true);
  if (game.mode === 'paused') return panel('<div class="panel-mark">Ⅱ</div><div class="eyebrow">TAKE A LITTLE BREATH</div><h2>勇者也需要歇一歇</h2><p>冒险在这里等你。<br>存档会从当前波入口恢复。</p><button class="gold-button" data-action="resume">继续营救 →</button><button class="ghost-button" data-action="settings">声音与画面</button><button class="ghost-button" data-action="home">暂离休息 · 返回标题</button>');
  if (game.mode === 'dead') return panel('<div class="panel-mark">…</div><div class="eyebrow">JUST A LITTLE STUMBLE</div><h2>只是肚子着地了</h2><p>勇气从来不会用完。<br>从本波入口重试，保留进入时的强化和补给。</p><button class="gold-button" data-action="retry">↻ 再闯一次</button><button class="ghost-button" data-action="home">返回标题</button><p class="panel-footnote">免费重试 · 无需观看广告</p>');
  if (game.mode === 'upgrade') return panel(`<div class="eyebrow">A LITTLE STRONGER, A LITTLE BRAVER</div><h2>笑意，正在变强</h2><p>守卫已击退，生命恢复 18。选一个强化，继续营救。</p><div class="cards">${game.choices.map(choice => `<button class="upgrade-card" data-upgrade="${choice.id}"><span class="upgrade-icon">${choice.icon}</span><b>${choice.name}</b><span>${choice.text}</span></button>`).join('')}</div><p class="panel-footnote">本次冒险持续生效 · 可叠加强化</p>`, true);
  if (game.mode === 'shop') return panel(`<div class="eyebrow">THE CAMPFIRE IS WARM</div><h2>下一站，${CHAPTERS[game.chapter + 1].name}</h2><p>整理行囊，再出发。当前补给币 <strong style="color:#f0ca8c">${game.coins}</strong></p><div class="shop-options"><button data-shop="heal" ${game.coins < 18 || game.hero.hp >= game.hero.maxHp ? 'disabled' : ''}>♡<b>补满生命</b><small>18 币 · ${Math.ceil(game.hero.hp)} / ${game.hero.maxHp}</small></button><button data-shop="can" ${game.coins < 24 ? 'disabled' : ''}>♧<b>黄桃罐头</b><small>24 币 · 已有 ${game.hero.cans} 个</small></button></div><button class="gold-button" data-shop="next">继续冒险 →</button><p class="panel-footnote">可以直接出发，无需购买补给。</p>`);
  if (game.mode === 'won') return panel(`<div class="panel-mark">♛</div><div class="eyebrow">AND THE WORLD LAUGHED AGAIN</div><h2>公主回家，笑声归来</h2><p>“原来最厉害的魔法，是一直没有放弃的你。”<br>七章营救完成。奶蛙勇者，今天也很了不起。</p><div class="score-grid"><div><strong>${time(game.clock)}</strong><span>营救用时</span></div><div><strong>${game.kills}</strong><span>击退守卫</span></div><div><strong>${game.bestCombo}</strong><span>最高连击</span></div></div><button class="gold-button" data-action="new">再救一次 →</button><button class="ghost-button" data-action="home">回到标题</button>`);
  return '';
}
function renderUI() {
  if (game.mode !== 'playing') resetInput();
  ui.innerHTML = (game.mode === 'title' ? titleMarkup() : hudMarkup()) + modalMarkup();
  touch.classList.toggle('active', game.mode === 'playing' && !overlay);
  lastMode = game.mode; updateHUD();
  const dialog = ui.querySelector('[role="dialog"]');
  if (dialog) requestAnimationFrame(() => dialog.querySelector('button:not(:disabled),input')?.focus({ preventScroll: true }));
}
function updateHUD() {
  if (game.mode === 'title' || !game.hero) return;
  const hero = game.hero;
  const setText = (id, text) => { const element = document.getElementById(id); if (element) element.textContent = text; };
  document.getElementById('health-fill').style.width = Math.max(0, hero.hp / hero.maxHp * 100) + '%';
  ui.querySelector('[role="meter"]').setAttribute('aria-valuenow', Math.ceil(hero.hp));
  setText('health-text', `${Math.ceil(hero.hp)} / ${hero.maxHp}`); setText('coin-text', `◉ ${game.coins}`); setText('timer', time(game.clock));
  setText('wave-text', game.bossWave ? '击败区域首领' : `击退守卫 · 第 ${game.wave + 1} / ${CHAPTERS[game.chapter].waves.length} 波`);
  const boss = game.enemies.find(enemy => enemy.boss);
  document.getElementById('boss-hud').hidden = !boss;
  if (boss) { setText('boss-name', game.bossName()); document.getElementById('boss-fill').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%'; }
  document.getElementById('combo').innerHTML = game.combo >= 3 ? `<strong>${game.combo}</strong><span>COMBO</span>` : '';
  const hints = { heal: `C · 剩余 ${hero.cans} 罐`, dash: `SHIFT · ${hero.dashStock} / 2`, laugh: hero.energy >= 100 ? 'E · 笑意已满！' : `E · 笑意 ${Math.floor(hero.energy)}%`, summon: hero.summon > 0 ? `强化中 · ${Math.ceil(hero.summon)}秒` : hero.summonCooldown > 0 ? `冷却 ${Math.ceil(hero.summonCooldown)}秒` : 'V · 点击召唤', super: hero.superUsed ? '守护已释放' : hero.superCharge < 100 ? `R · 蓄力 ${Math.round(hero.superCharge / 5)}/20` : 'Q · 蓄力已满' };
  for (const [action, hint] of Object.entries(hints)) { const element = ui.querySelector(`[data-hint="${action}"]`); if (element) element.textContent = hint; }
  const charges = { laugh: hero.energy, summon: (35 - hero.summonCooldown) / 35 * 100, dash: hero.dashStock / 2 * 100, super: hero.superCharge };
  for (const [action, value] of Object.entries(charges)) { const element = ui.querySelector(`[data-charge="${action}"]`); if (element) { element.style.width = value + '%'; element.parentElement.classList.toggle('ready', value >= 100); } }
}
function events() {
  for (const event of game.events.splice(0)) {
    if (event.type === 'checkpoint') storeCheckpoint();
    if (event.type === 'banner') notify(event.text);
    if (event.type === 'won') { saved = null; try { localStorage.removeItem(SAVE_KEY); } catch {} }
    audio.play(event.type);
  }
  if (lastMode !== game.mode) renderUI();
}
function doAction(action) {
  audio.unlock();
  if (action === 'start') { if (saved) overlay = 'confirm'; else { game.start(); overlay = null; } }
  else if (action === 'new') { game.start(); overlay = null; }
  else if (action === 'continue') { if (!game.restore(saved)) { saved = null; notify('存档已损坏，请重新出发'); } }
  else if (action === 'home') { game.mode = 'title'; overlay = null; }
  else if (action === 'pause') { if (game.mode === 'playing') game.pause(); else if (game.mode === 'paused' && !overlay) game.resume(); }
  else if (action === 'resume') game.resume();
  else if (action === 'retry') game.retry();
  else if (action === 'settings' || action === 'help') { game.pause(); overlay = action; }
  else if (action === 'close') overlay = null;
  else if (action === 'mute') { settings.muted = !settings.muted; saveSettings(); }
  else if (action === 'fullscreen') {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => notify('当前浏览器不支持退出全屏'));
    else if (shell.requestFullscreen) shell.requestFullscreen().catch(() => notify('当前浏览器不支持全屏'));
    else notify('当前浏览器不支持全屏');
  } else { if (!overlay) game.action(action); events(); updateHUD(); return; }
  resetInput(); events(); renderUI();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.action) doAction(button.dataset.action);
  else if (button.dataset.upgrade) { game.choose(button.dataset.upgrade); events(); renderUI(); }
  else if (button.dataset.shop) { game.shop(button.dataset.shop); events(); renderUI(); }
});
document.addEventListener('input', event => {
  const key = { 'muted-setting': 'muted', 'music-setting': 'music', 'volume-setting': 'volume', 'reduced-setting': 'reduced' }[event.target.id];
  if (key) { audio.unlock(); settings[key] = key === 'volume' ? Number(event.target.value) : event.target.checked; saveSettings(); }
});
document.addEventListener('pointerdown', event => {
  const button = event.target.closest('[data-hold]');
  if (!button || game.mode !== 'playing' || overlay) return;
  event.preventDefault(); audio.unlock(); button.setPointerCapture(event.pointerId); pointerHolds.set(event.pointerId, button.dataset.hold); syncInput(); button.classList.add('held');
  if (button.dataset.hold === 'fire' && game.hero.fire <= 0) game.shoot();
});
function releasePointer(event) { pointerHolds.delete(event.pointerId); syncInput(); event.target.closest('[data-hold]')?.classList.remove('held'); }
document.addEventListener('pointerup', releasePointer); document.addEventListener('pointercancel', releasePointer); document.addEventListener('lostpointercapture', releasePointer);
const moveKeys = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyF: 'fire', Space: 'guard' };
const actionKeys = { ShiftLeft: 'dash', ShiftRight: 'dash', KeyE: 'laugh', KeyC: 'heal', KeyV: 'summon', KeyQ: 'super', KeyR: 'super' };
document.addEventListener('keydown', event => {
  if (event.code === 'Tab' && ui.querySelector('[role="dialog"]')) {
    const focusables = [...ui.querySelectorAll('[role="dialog"] button:not(:disabled),[role="dialog"] input')];
    const first = focusables[0], last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (event.code === 'Escape') { event.preventDefault(); if (overlay) { overlay = null; renderUI(); } else doAction('pause'); return; }
  if (event.target.matches('input,select,textarea') || game.mode !== 'playing' || overlay) return;
  if (moveKeys[event.code]) { event.preventDefault(); keyHolds.add(moveKeys[event.code]); syncInput(); audio.unlock(); }
  if (actionKeys[event.code]) { event.preventDefault(); if (!event.repeat) doAction(actionKeys[event.code]); }
});
document.addEventListener('keyup', event => { if (moveKeys[event.code]) { keyHolds.delete(moveKeys[event.code]); syncInput(); } });
addEventListener('blur', () => { resetInput(); if (game.pause()) renderUI(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (game.pause()) renderUI(); } });
function frame(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000, .05); lastTime = timestamp;
  game.update(delta, input); events(); renderer.render(game, delta); audio.update(delta, game.mode === 'playing' || game.mode === 'title');
  hudTimer += delta; if (hudTimer > .1) { hudTimer = 0; updateHUD(); }
  requestAnimationFrame(frame);
}
renderUI(); requestAnimationFrame(frame);
