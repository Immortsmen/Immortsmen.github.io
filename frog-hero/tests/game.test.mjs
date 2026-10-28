import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, CHAPTERS } from '../engine.mjs';

test('seven-chapter campaign advances through every wave, upgrade and camp to rescue', () => {
  const game = new Game(() => .6); game.start();
  let encounters = 0, camps = 0;
  while (game.mode !== 'won' && encounters < 30) {
    assert.equal(game.mode, 'playing');
    while (game.remaining > 0) game.spawn();
    for (const enemy of game.enemies) game.damage(enemy, 100000, true);
    game.update(.016);
    encounters++;
    if (game.mode === 'upgrade') {
      assert.equal(game.choices.length, 3);
      assert.equal(game.choose('invalid-upgrade'), false);
      assert.equal(game.choose(game.choices[0].id), true);
    }
    if (game.mode === 'shop') { camps++; assert.equal(game.shop('next'), true); }
  }
  assert.equal(camps, 6);
  assert.equal(encounters, CHAPTERS.reduce((sum, chapter) => sum + chapter.waves.length + (chapter.boss ? 1 : 0), 0));
  assert.equal(game.chapter, 6); assert.equal(game.mode, 'won'); assert.ok(game.kills > 200);
});

test('milk projectile collision kills target and grants energy and coins exactly once', () => {
  const game = new Game(() => .7); game.start(); game.remaining = 0;
  game.enemies = [{ id: 1, kind: 'guard', hp: 15, maxHp: 15, x: 480, y: 460, speed: 0, cooldown: 99, windup: 0, stun: 0 }];
  game.shoot();
  for (let step = 0; step < 30; step++) game.update(.016);
  assert.equal(game.kills, 1); assert.equal(game.coins, 3); assert.equal(game.mode, 'upgrade'); assert.ok(game.hero.energy >= 9);
});

test('guard reduces damage, invulnerability prevents repeated contact, pause freezes simulation', () => {
  const game = new Game(); game.start(); game.hero.invincible = 0; game.hero.guarding = true;
  game.hurt(20); assert.equal(game.hero.hp, 106);
  game.hurt(20); assert.equal(game.hero.hp, 106);
  game.pause(); const snapshot = JSON.stringify(game.checkpointData()); game.update(1, { right: true, fire: true });
  assert.equal(JSON.stringify(game.checkpointData()), snapshot);
  game.resume(); game.update(.05, { right: true }); assert.ok(game.hero.x > 350);
});

test('retry restores wave-entry inventory, upgrades and health; malformed saves are rejected', () => {
  const game = new Game(); game.start(); game.hero.upgrades.spread = 2; game.hero.cans = 3; game.wave = 1; game.enterWave();
  const save = structuredClone(game.checkpoint);
  game.hero.invincible = 0; game.hero.cans = 0; game.hurt(1000);
  assert.equal(game.mode, 'dead'); assert.equal(game.retry(), true);
  assert.equal(game.hero.cans, 3); assert.equal(game.hero.hp, 120); assert.equal(game.stacks('spread'), 2); assert.equal(game.wave, 1); assert.equal(game.deaths, 1);
  const restored = new Game(); assert.equal(restored.restore(save), true); assert.equal(restored.wave, 1);
  assert.equal(new Game().restore({ version: 1, chapter: 99 }), false);
  assert.equal(new Game().restore({ ...save, wave: -1 }), false);
  assert.equal(new Game().restore({ ...save, hero: { hp: NaN } }), false);
});

test('dash stocks recharge, laugh requires energy, cans cannot be consumed at full health', () => {
  const game = new Game(); game.start();
  assert.equal(game.action('laugh'), false); assert.equal(game.action('heal'), false);
  assert.equal(game.action('dash'), true); assert.equal(game.hero.dashStock, 1);
  assert.equal(game.action('dash'), false);
  game.spawnTimer = 1000;
  for (let step = 0; step < 80; step++) game.update(.05);
  assert.equal(game.hero.dashStock, 2);
  game.hero.energy = 100; assert.equal(game.action('laugh'), true); assert.equal(game.hero.energy, 0);
  game.hero.hp = 20; assert.equal(game.action('heal'), true); assert.equal(game.hero.hp, 120); assert.equal(game.hero.cans, 0);
});

test('shield blocks frontal milk while dash and area attacks bypass it; final laugh charges then releases once', () => {
  const game = new Game(); game.start();
  const shield = { kind: 'shield', id: 1, hp: 100, x: 500, y: 460, face: -1, windup: 0 };
  game.damage(shield, 20); assert.equal(shield.hp, 94); game.damage(shield, 20, true); assert.equal(shield.hp, 74);
  assert.equal(game.action('super'), false);
  game.chapter = 6; game.wave = 0; game.enterWave(); game.spawn();
  for (let tap = 0; tap < 20; tap++) assert.equal(game.action('super'), true);
  assert.equal(game.hero.superCharge, 100); assert.equal(game.hero.superUsed, false);
  assert.equal(game.action('super'), true); assert.equal(game.hero.superUsed, true);
  assert.equal(game.action('super'), false); assert.ok(game.enemies[0].hp < game.enemies[0].maxHp);
});

test('unassisted opening wave can be cleared with normal stats and automatic player shooting', () => {
  const game = new Game(() => .7); game.start();
  for (let step = 0; step < 6000 && game.mode === 'playing'; step++) {
    const target = game.nearest();
    game.update(1 / 60, { fire: true, right: target && target.x < game.hero.x + 140, left: target && target.x > game.hero.x && target.x < game.hero.x + 220 });
    if (game.hero.hp < 70) game.action('heal');
    if (game.hero.energy >= 100) game.action('laugh');
  }
  assert.equal(game.mode, 'upgrade'); assert.equal(game.kills, 5);
});
