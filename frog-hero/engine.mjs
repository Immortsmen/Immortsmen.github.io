export const CHAPTERS = [
  { name: '奶笑村', subtitle: '风吹麦浪，勇者出发', theme: 'village', waves: [5, 8], boss: null },
  { name: '咕嘎小径', subtitle: '林间藏着不太安静的秘密', theme: 'forest', waves: [7, 11], boss: 'penguin' },
  { name: '刀盾山道', subtitle: '绕过盾牌，找到破绽', theme: 'mountain', waves: [9, 13, 17], boss: 'dog' },
  { name: '风暴断桥', subtitle: '雷鸣之下，别停下脚步', theme: 'bridge', waves: [10, 14, 18], boss: 'captain' },
  { name: '禁声堡垒', subtitle: '用笑声敲开沉重的城门', theme: 'courtyard', waves: [11, 16, 21], boss: 'general' },
  { name: '肃静大殿', subtitle: '红色法阵之外，才是安全的地方', theme: 'hall', waves: [12, 17, 23], boss: 'marshal' },
  { name: '无声王座', subtitle: '最后一战，把笑声还给世界', theme: 'throne', waves: [], boss: 'king' }
];
export const UPGRADES = [
  { id: 'auto', icon: '◎', name: '自动奶球', text: '自动瞄准附近敌人，解放攻击键。' },
  { id: 'spread', icon: '✦', name: '哈哈三连', text: '奶球增加两道散射，每道造成 65% 伤害。' },
  { id: 'rapid', icon: 'ϟ', name: '根本停不下来', text: '攻击间隔缩短 25%。' },
  { id: 'pierce', icon: '➶', name: '笑穿全场', text: '奶球多穿透两名敌人，伤害提升 15%。' },
  { id: 'vitality', icon: '♥', name: '奶盾体魄', text: '生命上限增加 25，并恢复 40 生命。' },
  { id: 'defense', icon: '◈', name: '肚皮护盾', text: '防御额外减伤 15%，移动速度增加 8%。' },
  { id: 'laugh', icon: '☺', name: '笑到地动山摇', text: '大笑范围扩大 70，伤害增加 45。' },
  { id: 'pot', icon: '◉', name: '护体锅盖', text: '两片锅盖环绕身边，击退近身敌人。' },
  { id: 'recovery', icon: '♡', name: '黄桃补给', text: '获得一个回满血的黄桃罐头。' },
  { id: 'dash', icon: '≋', name: '肚皮地震', text: '肚皮冲撞伤害提升 40，并产生震波。' }
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (first, second) => Math.hypot(first.x - second.x, (first.y - second.y) * 1.4);
export class Game {
  constructor(random = Math.random) { this.random = random; this.mode = 'title'; this.events = []; this.effects = []; this.clock = 0; this.checkpoint = null; }
  start() {
    this.chapter = 0; this.wave = 0; this.clock = 0; this.kills = 0; this.coins = 0; this.combo = 0; this.bestCombo = 0; this.deaths = 0;
    this.hero = { x: 350, y: 460, hp: 120, maxHp: 120, face: 1, energy: 0, cans: 1, upgrades: {}, fire: 0, invincible: 1.5, dashTime: 0, dashStock: 2, dashRecharge: 0, summon: 0, summonCooldown: 0, superCharge: 0, superUsed: false };
    this.enterWave();
  }
  stacks(id) { return this.hero.upgrades[id] || 0; }
  event(type, detail = {}) { this.events.push({ type, ...detail }); }
  checkpointData() {
    return { version: 1, chapter: this.chapter, wave: this.wave, clock: this.clock, kills: this.kills, coins: this.coins, bestCombo: this.bestCombo, deaths: this.deaths, hero: structuredClone(this.hero) };
  }
  restore(data) {
    if (!data || data.version !== 1 || !Number.isInteger(data.chapter) || !CHAPTERS[data.chapter] || !Number.isInteger(data.wave) || data.wave < 0 || data.wave > CHAPTERS[data.chapter].waves.length || !data.hero || !Number.isFinite(data.hero.hp) || !Number.isFinite(data.hero.maxHp) || data.hero.maxHp < 1 || data.hero.hp < 1 || !data.hero.upgrades) return false;
    Object.assign(this, { chapter: data.chapter, wave: data.wave, clock: data.clock || 0, kills: data.kills || 0, coins: data.coins || 0, bestCombo: data.bestCombo || 0, deaths: data.deaths || 0, hero: structuredClone(data.hero), combo: 0 });
    this.enterWave(); return true;
  }
  enterWave() {
    this.mode = 'playing'; this.enemies = []; this.projectiles = []; this.effects = []; this.spawnTimer = 0.5; this.waveClock = 0; this.cleared = false; this.comboTimer = 0;
    Object.assign(this.hero, { x: 350, y: 460, invincible: 2, fire: 0, dashTime: 0, guarding: false, summon: 0 });
    const chapter = CHAPTERS[this.chapter];
    this.bossWave = this.wave >= chapter.waves.length;
    this.remaining = this.bossWave ? 1 : chapter.waves[this.wave];
    this.checkpoint = this.checkpointData();
    this.event('checkpoint');
    this.event('banner', { text: this.bossWave ? '强敌来袭 · ' + this.bossName() : `${chapter.name} · 第 ${this.wave + 1} 波` });
  }
  bossName() { return { penguin: '凑企鹅', dog: '刀盾狗', captain: '铁桶队长', general: '裂甲将军', marshal: '缄默大将军', king: '憋笑魔王' }[CHAPTERS[this.chapter].boss] || ''; }
  spawn() {
    const boss = this.bossWave;
    const kind = boss ? CHAPTERS[this.chapter].boss : this.chapter > 0 && this.random() < .22 ? 'mage' : this.chapter > 1 && this.random() < .28 ? 'shield' : 'guard';
    const hp = boss ? 240 + this.chapter * 105 : 27 + this.chapter * 7;
    const side = this.random() > .2;
    this.enemies.push({ id: ++this.nextId || (this.nextId = 1), kind, boss, x: side ? 1170 : 90, y: 360 + this.random() * 200, hp, maxHp: hp, face: side ? -1 : 1, speed: boss ? 64 : 50 + this.chapter * 4, cooldown: 1 + this.random(), windup: 0, flash: 0, stun: 0, phase: 0 });
    this.remaining--;
  }
  nearest() { return this.enemies.filter(enemy => enemy.hp > 0).sort((first, second) => distance(first, this.hero) - distance(second, this.hero))[0]; }
  shoot() {
    const hero = this.hero;
    const target = this.nearest();
    const angle = target ? Math.atan2(target.y - hero.y, target.x - hero.x) : hero.face > 0 ? 0 : Math.PI;
    const spread = this.stacks('spread') ? [-.16, 0, .16] : [0];
    for (const offset of spread) this.projectiles.push({ x: hero.x + Math.cos(angle) * 35, y: hero.y, vx: Math.cos(angle + offset) * 650, vy: Math.sin(angle + offset) * 650, life: 1.9, friendly: true, damage: (18 + this.stacks('pierce') * 3 + (hero.summon > 0 ? 17 : 0)) * (offset ? .65 : 1), pierce: this.stacks('pierce') * 2, hit: [] });
    hero.fire = .26 * Math.pow(.75, this.stacks('rapid')) * (hero.summon > 0 ? .6 : 1);
    this.event('shoot');
  }
  effect(text, x, y, color = '#ffe295') { this.effects.push({ text, x, y, life: .9, maxLife: .9, color, kind: 'text' }); }
  ring(x, y, radius, color) { this.effects.push({ x, y, radius, life: .6, maxLife: .6, color, kind: 'ring' }); }
  damage(enemy, amount, bypass = false) {
    if (enemy.hp <= 0) return;
    if (!bypass && ['shield', 'dog', 'captain'].includes(enemy.kind) && (this.hero.x - enemy.x) * enemy.face > 0 && enemy.windup <= 0) amount *= .3;
    enemy.hp -= amount; enemy.flash = .12; enemy.stun = .12;
    this.hero.energy = clamp(this.hero.energy + 3, 0, 100);
    this.effect(String(Math.round(amount)), enemy.x, enemy.y - (enemy.boss ? 100 : 60));
    if (enemy.hp <= 0) {
      this.kills++; this.coins += enemy.boss ? 20 : 3; this.combo++; this.comboTimer = 3.5;
      this.bestCombo = Math.max(this.combo, this.bestCombo);
      this.ring(enemy.x, enemy.y, 50, '#ffe6a5');
      this.hero.energy = Math.min(100, this.hero.energy + 6);
      this.event('kill');
    }
  }
  hurt(amount) {
    const hero = this.hero;
    if (hero.invincible > 0 || hero.dashTime > 0 || this.mode !== 'playing') return;
    const reduction = hero.guarding ? Math.min(.85, .3 + this.stacks('defense') * .15) : 0;
    hero.hp = Math.max(0, hero.hp - amount * (1 - reduction)); hero.invincible = .65;
    this.effect(hero.guarding ? '格挡' : '-' + Math.round(amount), hero.x, hero.y - 100, hero.guarding ? '#b5e6ef' : '#ff9c9c');
    this.event('hurt');
    if (!hero.hp) { this.mode = 'dead'; this.deaths++; this.event('dead'); }
  }
  action(action) {
    if (this.mode !== 'playing') return false;
    const hero = this.hero;
    if (action === 'dash' && hero.dashStock > 0 && hero.dashTime <= 0) {
      hero.dashStock--; hero.dashTime = .32; hero.dashHit = []; this.event('dash'); return true;
    }
    if (action === 'laugh' && hero.energy >= 100) {
      hero.energy = 0;
      const radius = 260 + this.stacks('laugh') * 70;
      this.ring(hero.x, hero.y, radius, '#ffe18e'); this.effect('哈哈哈哈！', hero.x, hero.y - 130);
      for (const enemy of this.enemies) if (distance(hero, enemy) < radius) { this.damage(enemy, 85 + this.stacks('laugh') * 45, true); enemy.stun = 1.5; }
      this.event('laugh'); return true;
    }
    if (action === 'heal' && hero.cans > 0 && hero.hp < hero.maxHp) {
      hero.cans--; hero.hp = hero.maxHp; this.ring(hero.x, hero.y, 100, '#bbefa2'); this.effect('生命回满', hero.x, hero.y - 100, '#bbefa2'); this.event('heal'); return true;
    }
    if (action === 'summon' && hero.summonCooldown <= 0) {
      hero.summon = 8; hero.summonCooldown = 35; hero.invincible = 2; this.effect('奶蛋助阵！', hero.x, hero.y - 130); this.event('summon'); return true;
    }
    if (action === 'super' && this.chapter === 6 && !hero.superUsed) {
      if (hero.superCharge < 100) { hero.superCharge = Math.min(100, hero.superCharge + 5); return true; }
      hero.superUsed = true; hero.invincible = 5; this.ring(hero.x, hero.y, 1300, '#fff2b3');
      for (const enemy of this.enemies) this.damage(enemy, 650, true);
      this.effect('把笑声还给世界！', 640, 280); this.event('laugh'); return true;
    }
    return false;
  }
  update(delta, input = {}) {
    if (this.mode !== 'playing') return;
    const elapsed = clamp(delta, 0, .05);
    this.clock += elapsed; this.waveClock += elapsed; this.comboTimer -= elapsed;
    if (this.comboTimer <= 0) this.combo = 0;
    const hero = this.hero;
    for (const key of ['fire', 'invincible', 'summon', 'summonCooldown', 'dashTime']) hero[key] = Math.max(0, (hero[key] || 0) - elapsed);
    hero.energy = Math.min(100, hero.energy + elapsed * 1.8);
    hero.guarding = Boolean(input.guard);
    let horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let vertical = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (horizontal) hero.face = horizontal;
    const length = Math.hypot(horizontal, vertical) || 1;
    const speed = 235 * (1 + this.stacks('defense') * .08) * (hero.guarding ? .45 : 1);
    if (hero.dashTime > 0) { horizontal = hero.face; vertical = 0; }
    hero.x = clamp(hero.x + horizontal / length * (hero.dashTime > 0 ? 900 : speed) * elapsed, 65, 1215);
    hero.y = clamp(hero.y + vertical / length * speed * .72 * elapsed, 335, 568);
    hero.moving = Boolean(horizontal || vertical);
    if (hero.dashStock < 2) { hero.dashRecharge += elapsed; if (hero.dashRecharge >= 3.5) { hero.dashStock++; hero.dashRecharge = 0; } }
    if ((input.fire || this.stacks('auto') || hero.summon > 0) && hero.fire <= 0 && !hero.guarding) this.shoot();
    this.spawnTimer -= elapsed;
    if (this.remaining > 0 && this.spawnTimer <= 0 && this.enemies.length < 7) { this.spawn(); this.spawnTimer = .7; }
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.flash = Math.max(0, enemy.flash - elapsed); enemy.stun = Math.max(0, enemy.stun - elapsed);
      if (hero.dashTime > 0 && distance(hero, enemy) < 90 && !hero.dashHit.includes(enemy.id)) { hero.dashHit.push(enemy.id); this.damage(enemy, 60 + this.stacks('dash') * 40, true); }
      if (this.stacks('pot') && distance(hero, enemy) < 100) { enemy.potTick = (enemy.potTick || 0) - elapsed; if (enemy.potTick <= 0) { this.damage(enemy, 12 * this.stacks('pot'), true); enemy.potTick = .5; } }
      if (enemy.stun > 0 || enemy.hp <= 0) continue;
      enemy.face = hero.x > enemy.x ? 1 : -1;
      enemy.cooldown -= elapsed;
      const separation = distance(hero, enemy);
      if (enemy.windup > 0) {
        enemy.windup -= elapsed;
        if (enemy.windup <= 0) {
          if (enemy.kind === 'mage' || enemy.kind === 'marshal' || enemy.kind === 'king') {
            const angle = Math.atan2(hero.y - enemy.y, hero.x - enemy.x);
            for (const offset of enemy.boss ? [-.22, 0, .22] : [0]) this.projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle + offset) * 260, vy: Math.sin(angle + offset) * 260, life: 4, friendly: false, damage: enemy.boss ? 19 : 10 });
            if (enemy.boss && enemy.phase++ % 2 === 0) this.effects.push({ kind: 'danger', x: hero.x, y: hero.y, radius: 115, life: 1.2, maxLife: 1.2, fired: false });
          } else if (distance(hero, enemy.target) < (enemy.boss ? 140 : 80) && separation < (enemy.boss ? 230 : 130)) this.hurt(enemy.boss ? 23 : 10);
          this.ring(enemy.target.x, enemy.target.y, enemy.boss ? 120 : 60, '#ff8d91');
          enemy.cooldown = enemy.boss ? 1.2 : 1.7;
        }
      } else if (enemy.cooldown <= 0 && (separation < (enemy.boss ? 160 : 75) || ['mage', 'marshal', 'king'].includes(enemy.kind))) {
        enemy.windup = enemy.boss ? .85 : .6; enemy.target = { x: hero.x, y: hero.y };
      } else if (separation > (enemy.kind === 'mage' ? 260 : 58)) {
        const angle = Math.atan2((hero.y - enemy.y) * 1.4, hero.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * elapsed; enemy.y = clamp(enemy.y + Math.sin(angle) * enemy.speed * elapsed * .65, 335, 568);
      }
    }
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * elapsed; projectile.y += projectile.vy * elapsed; projectile.life -= elapsed;
      if (projectile.friendly) {
        for (const enemy of this.enemies) if (enemy.hp > 0 && !projectile.hit.includes(enemy.id) && distance(projectile, enemy) < (enemy.boss ? 57 : 35)) {
          projectile.hit.push(enemy.id); this.damage(enemy, projectile.damage); if (projectile.hit.length > projectile.pierce) { projectile.life = 0; break; }
        }
      } else if (distance(projectile, hero) < 37) { this.hurt(projectile.damage); projectile.life = 0; }
    }
    for (const effect of this.effects) {
      effect.life -= elapsed;
      if (effect.kind === 'text') effect.y -= elapsed * 35;
      if (effect.kind === 'danger' && effect.life <= 0 && !effect.fired) { effect.fired = true; if (distance(effect, hero) < effect.radius) this.hurt(28); }
    }
    this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
    this.projectiles = this.projectiles.filter(projectile => projectile.life > 0 && projectile.x > -50 && projectile.x < 1330);
    this.effects = this.effects.filter(effect => effect.life > 0);
    if (this.mode === 'playing' && !this.remaining && !this.enemies.length && !this.cleared) this.clearWave();
  }
  clearWave() {
    this.cleared = true; this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 18); this.hero.dashStock = 2;
    if (this.chapter === 6) { this.mode = 'won'; this.event('won'); return; }
    this.mode = 'upgrade';
    const pool = UPGRADES.filter(upgrade => upgrade.id !== 'auto' || !this.stacks('auto'));
    this.choices = [...pool].sort(() => this.random() - .5).slice(0, 3);
    if (this.chapter === 0 && this.wave === 0 && !this.stacks('auto')) this.choices[0] = UPGRADES[0];
    this.event('upgrade');
  }
  choose(id) {
    if (this.mode !== 'upgrade' || !this.choices.some(choice => choice.id === id)) return false;
    this.hero.upgrades[id] = this.stacks(id) + 1;
    if (id === 'vitality') { this.hero.maxHp += 25; this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 40); }
    if (id === 'recovery') this.hero.cans++;
    const chapter = CHAPTERS[this.chapter];
    if (this.bossWave || (!chapter.boss && this.wave === chapter.waves.length - 1)) { this.mode = 'shop'; this.event('shop'); }
    else { this.wave++; this.enterWave(); }
    return true;
  }
  shop(item) {
    if (this.mode !== 'shop') return false;
    if (item === 'heal') { if (this.coins < 18 || this.hero.hp >= this.hero.maxHp) return false; this.coins -= 18; this.hero.hp = this.hero.maxHp; return true; }
    if (item === 'can') { if (this.coins < 24) return false; this.coins -= 24; this.hero.cans++; return true; }
    if (item === 'next') { this.chapter++; this.wave = 0; this.enterWave(); return true; }
    return false;
  }
  retry() { if (this.mode !== 'dead') return false; const deaths = this.deaths; this.restore(this.checkpoint); this.deaths = deaths; this.checkpoint.deaths = deaths; return true; }
  pause() { if (this.mode === 'playing') { this.mode = 'paused'; return true; } return false; }
  resume() { if (this.mode === 'paused') this.mode = 'playing'; }
}
