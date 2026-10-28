import { CHAPTERS } from './engine.mjs';

const palettes = [
  ['#e8c4b1', '#fcdfab', '#aca8b2', '#8c9494', '#b4b388', '#7b9273'],
  ['#b9c6b0', '#e5d9a7', '#73988b', '#4a756e', '#61856a', '#385e55'],
  ['#b7b5c7', '#f4d3b2', '#8f8a9e', '#716a83', '#9e9a86', '#6b796d'],
  ['#8c93ae', '#d8c7bf', '#686c8d', '#4f5574', '#77748b', '#4a526b'],
  ['#a49aaf', '#e6c5ad', '#7b718d', '#514e6f', '#8b7b88', '#5d576c'],
  ['#706986', '#b09aa1', '#574d6a', '#3e3855', '#726275', '#493f57'],
  ['#4f426e', '#bc8ba0', '#49365f', '#302741', '#65516d', '#3c314d']
];
export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.time = 0; this.reduced = false; }
  ellipse(x, y, rx, ry, fill, stroke, width = 2) {
    const context = this.ctx;
    context.beginPath(); context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); context.fillStyle = fill; context.fill();
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = width; context.stroke(); }
  }
  shape(points, fill, stroke, width = 2) {
    const context = this.ctx; context.beginPath(); context.moveTo(...points[0]);
    for (const point of points.slice(1)) context.lineTo(...point);
    context.closePath(); context.fillStyle = fill; context.fill();
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = width; context.stroke(); }
  }
  line(points, stroke, width = 2) {
    const context = this.ctx; context.beginPath(); context.moveTo(...points[0]);
    for (const point of points.slice(1)) context.lineTo(...point);
    context.strokeStyle = stroke; context.lineWidth = width; context.lineCap = 'round'; context.lineJoin = 'round'; context.stroke();
  }
  round(x, y, width, height, radius, fill, stroke) {
    const context = this.ctx; context.beginPath(); context.roundRect(x, y, width, height, radius); context.fillStyle = fill; context.fill();
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 2; context.stroke(); }
  }
  text(text, x, y, size = 20, color = '#fff1ca', align = 'center') {
    const context = this.ctx; context.font = `600 ${size}px "Microsoft YaHei", sans-serif`; context.textAlign = align; context.fillStyle = color; context.fillText(text, x, y);
  }
  castle(x, y, scale = 1, dark = false) {
    const context = this.ctx; context.save(); context.translate(x, y); context.scale(scale, scale);
    const stone = dark ? '#514762' : '#b5a0ae'; const edge = dark ? '#39324b' : '#8d7f99';
    this.round(-100, -150, 200, 150, 4, stone, edge);
    for (const [position, height] of [[-125, 205], [-65, 245], [55, 275], [120, 195]]) {
      this.round(position - 20, -height, 40, height, 3, stone, edge);
      this.shape([[position - 30, -height], [position, -height - 65], [position + 30, -height]], dark ? '#4a315f' : '#736081', edge);
      this.round(position - 5, -height + 25, 10, 23, [6, 6, 0, 0], '#eacda0');
      this.line([[position, -height - 65], [position, -height - 92]], '#6d5a72', 2);
      this.shape([[position, -height - 90], [position + 26, -height - 83], [position, -height - 75]], '#b58b98');
    }
    this.round(-23, -70, 46, 70, [24, 24, 0, 0], '#66566e');
    for (let row = 0; row < 4; row++) for (let column = 0; column < 6; column++) this.line([[-96 + column * 32 + row % 2 * 12, -125 + row * 31], [-70 + column * 32 + row % 2 * 12, -125 + row * 31]], edge, 1);
    context.restore();
  }
  tree(x, y, scale, color) {
    const context = this.ctx; context.save(); context.translate(x, y); context.scale(scale, scale);
    this.shape([[-9, 0], [-5, -100], [4, -110], [12, 0]], '#6f655d');
    for (const [dx, dy, radius] of [[-28, -115, 45], [28, -120, 49], [0, -158, 48], [0, -92, 42]]) this.ellipse(dx, dy, radius, radius * .8, color);
    this.line([[0, -50], [-26, -108]], '#786d60', 3); this.line([[4, -72], [31, -121]], '#786d60', 3);
    context.restore();
  }
  house(x, y, scale, color = '#d2bea0') {
    const context = this.ctx; context.save(); context.translate(x, y); context.scale(scale, scale);
    this.round(-48, -70, 96, 70, 3, color, '#a18e83');
    this.shape([[-62, -67], [0, -120], [62, -67]], '#a27b79', '#896b70', 3);
    this.round(-10, -42, 22, 42, [12, 12, 0, 0], '#877672');
    this.round(-36, -48, 15, 18, 3, '#f9dda3'); this.round(23, -48, 15, 18, 3, '#f9dda3');
    context.restore();
  }
  background(chapter, title = false) {
    const context = this.ctx; const colors = palettes[chapter];
    const sky = context.createLinearGradient(0, 0, 0, 500); sky.addColorStop(0, colors[0]); sky.addColorStop(1, colors[1]);
    context.fillStyle = sky; context.fillRect(0, 0, 1280, 720);
    const glow = context.createRadialGradient(850, 150, 0, 850, 150, 290); glow.addColorStop(0, '#ffedc482'); glow.addColorStop(1, '#ffedc400'); context.fillStyle = glow; context.fillRect(500, 0, 780, 500);
    this.ellipse(850, 144, 48, 48, '#ffe8b1a0');
    for (let index = 0; index < 9; index++) {
      const horizontal = ((index * 187 + this.time * 2) % 1480) - 100;
      this.ellipse(horizontal, 70 + index % 3 * 44, 85, 12, '#fff1d828');
    }
    for (let layer = 0; layer < 3; layer++) {
      const points = [[-50, 470]];
      for (let index = 0; index <= 14; index++) points.push([index * 100 - 50, 230 + layer * 52 + Math.sin(index * 1.9 + layer * 3) * (70 - layer * 12)]);
      points.push([1350, 530]); this.shape(points, colors[layer + 2]);
    }
    this.castle(title ? 1020 : 1010, title ? 345 : 320, title ? .95 : .66, chapter > 3);
    if (chapter < 3) {
      this.tree(50, 410, 1.6, colors[5]); this.tree(1250, 410, 1.6, colors[5]);
      if (chapter === 0) { this.house(260, 382, 1.25); this.house(1030, 390, .8); this.house(1110, 408, 1); }
      if (chapter === 1) { for (const horizontal of [230, 430, 740, 1080]) this.tree(horizontal, 384, 1.1, colors[4]); }
    }
    if (chapter >= 4) {
      for (const horizontal of [40, 200, 1080, 1240]) {
        this.round(horizontal - 23, 80, 46, 333, 3, colors[3], '#ffffff12'); this.round(horizontal - 33, 87, 66, 20, 2, colors[4]); this.round(horizontal - 33, 390, 66, 24, 2, colors[4]);
        this.round(horizontal + 36, 210, 32, 105, 2, '#78506b');
        this.shape([[horizontal + 36, 310], [horizontal + 52, 333], [horizontal + 68, 310]], '#78506b');
      }
    }
    const ground = context.createLinearGradient(0, 360, 0, 720); ground.addColorStop(0, chapter > 3 ? '#8e7d87' : '#c4b99a'); ground.addColorStop(1, chapter > 3 ? '#51465f' : '#8e947d');
    this.shape([[0, 385], [1280, 385], [1280, 720], [0, 720]], ground);
    this.shape([[0, 422], [1280, 403], [1280, 570], [0, 594]], chapter > 2 ? '#a99a9a38' : '#e6cda466');
    for (let row = 0; row < 5; row++) for (let column = 0; column < 18; column++) {
      const horizontal = column * 80 + row % 2 * 40; const vertical = 430 + row * 40;
      if (chapter > 2) this.line([[horizontal, vertical], [horizontal + 66, vertical - 3]], '#352c421b', 2);
      else { this.ellipse(horizontal, vertical, 3, 1, '#6d765a55'); this.line([[horizontal + 24, vertical + 17], [horizontal + 27, vertical + 10], [horizontal + 29, vertical + 16]], '#78805c55', 1); }
    }
    if (chapter === 3) for (let index = 0; index < 10; index++) { const horizontal = index * 145; this.round(horizontal, 378, 15, 37, 2, '#62576e'); this.line([[horizontal, 390], [horizontal + 145, 390]], '#66596f', 5); }
    const foreground = context.createLinearGradient(0, 560, 0, 720); foreground.addColorStop(0, '#17152500'); foreground.addColorStop(1, '#171525e8'); context.fillStyle = foreground; context.fillRect(0, 560, 1280, 160);
    for (let index = 0; index < 24; index++) {
      const horizontal = index * 59 + Math.sin(this.time * .4 + index) * 10;
      const vertical = 130 + (index * 97 % 440) + Math.sin(this.time + index) * 18;
      this.ellipse(horizontal, vertical, index % 3 === 0 ? 2.5 : 1.4, 1.8, '#fff1c67a');
    }
  }
  frog(x, y, scale = 1, options = {}) {
    const context = this.ctx; const ink = '#665040';
    context.save(); context.translate(x, y); context.scale(scale * (options.face || 1), scale);
    const bob = options.moving && !this.reduced ? Math.sin(this.time * 15) * 4 : Math.sin(this.time * 2) * 2;
    this.ellipse(0, 3, 37, 10, '#251c3036'); context.translate(0, bob);
    if (options.dash) { for (let index = 1; index <= 3; index++) this.line([[-40 - index * 13, -35 + index * 15], [-70 - index * 22, -35 + index * 15]], '#ffe3a3', 3); }
    if (options.summon) { this.ellipse(0, -39, 59, 65, '#fff1a018'); this.ellipse(0, -39, 49, 59, '#fff1a025'); }
    this.shape([[-20, -53], [-49, -29], [-38, -7], [-6, -20]], '#b66e74', '#84565d', 2);
    this.ellipse(-22, -2, 20, 8, '#d6a33b', ink); this.ellipse(25, -2, 20, 8, '#e5b544', ink);
    this.ellipse(0, -37, 39, 45, options.flash ? '#fff3bf' : '#f3c750', ink, 2.5);
    this.ellipse(-19, -76, 14, 16, '#f3c750', ink); this.ellipse(19, -76, 14, 16, '#f3c750', ink);
    this.ellipse(0, -62, 33, 24, '#f8cf58');
    this.ellipse(3, -29, 27, 26, '#fff0ca');
    this.ellipse(-18, -76, 6, 8, '#fff8d9'); this.ellipse(20, -76, 6, 8, '#fff8d9');
    this.ellipse(-16, -76, 2.8, 4.5, '#3b3140'); this.ellipse(22, -76, 2.8, 4.5, '#3b3140');
    this.ellipse(-25, -58, 6, 3, '#e99d77'); this.ellipse(28, -58, 6, 3, '#e99d77');
    context.beginPath(); context.moveTo(-10, -58); context.quadraticCurveTo(4, -45, 17, -59); context.strokeStyle = ink; context.lineWidth = 2.8; context.stroke();
    this.ellipse(-32, -35, 10, 17, '#f3c750', ink); this.ellipse(35, -35, 10, 17, '#f3c750', ink);
    this.round(-26, -53, 52, 7, 3, '#8e6176'); this.ellipse(0, -49, 5, 5, '#fce9ac');
    if (options.guard) { this.ellipse(30, -42, 33, 47, '#b6e5ee3b', '#d8f7e9', 3); this.text('✦', 35, -31, 27, '#fff0bb'); }
    if (options.crown) this.shape([[-22, -92], [-26, -115], [-10, -105], [0, -122], [11, -105], [27, -115], [23, -92]], '#ffe795', ink);
    context.restore();
  }
  enemy(enemy) {
    const context = this.ctx;
    context.save(); context.translate(enemy.x, enemy.y); context.scale(enemy.boss ? 1.6 : 1, enemy.boss ? 1.6 : 1);
    const ink = '#3b3449';
    this.ellipse(0, 3, 28, 8, '#251c3036');
    if (enemy.windup > 0 && enemy.target) { context.save(); context.scale(enemy.boss ? 1 / 1.6 : 1, enemy.boss ? 1 / 1.6 : 1); this.ellipse(enemy.target.x - enemy.x, enemy.target.y - enemy.y, enemy.boss ? 120 : 65, enemy.boss ? 46 : 25, '#ff6d7740', '#ffb09e', 2); context.restore(); }
    const purple = enemy.flash > 0 ? '#ffe4b4' : enemy.boss ? '#79527f' : '#96839a';
    if (enemy.kind === 'penguin') {
      this.ellipse(0, -31, 29, 40, '#4d586d', ink); this.ellipse(0, -23, 20, 27, '#eee6ce');
      this.ellipse(-10, -47, 6, 7, '#fff4dc'); this.ellipse(10, -47, 6, 7, '#fff4dc'); this.shape([[-7, -39], [7, -39], [0, -32]], '#eeb45f');
      this.ellipse(-17, 0, 14, 5, '#eeb45f'); this.ellipse(17, 0, 14, 5, '#eeb45f');
    } else {
      this.ellipse(-11, -1, 12, 6, '#504556', ink); this.ellipse(13, -1, 12, 6, '#504556', ink);
      this.round(-23, -49, 46, 48, 12, purple, ink);
      this.ellipse(0, -57, 26, 25, enemy.kind === 'king' ? '#90729c' : '#c5b5b7', ink);
      if (enemy.kind === 'mage' || enemy.kind === 'marshal') {
        this.shape([[-32, -65], [-9, -111], [22, -68], [35, -61]], '#635276', ink);
        this.line([[29, -2], [35, -83]], '#8c715a', 4); this.ellipse(35, -87, 8, 10, '#c69fdd', '#ffe4cf');
      } else if (enemy.kind === 'dog') {
        this.shape([[-22, -67], [-33, -96], [-7, -77]], '#b4a6aa', ink); this.shape([[9, -77], [32, -97], [23, -63]], '#b4a6aa', ink);
        this.ellipse(5, -45, 16, 11, '#e0cdba'); this.ellipse(8, -49, 5, 4, ink);
      } else {
        this.shape([[-29, -57], [-23, -78], [0, -88], [23, -78], [29, -57]], '#727183', ink);
        this.line([[-26, -57], [26, -57]], '#b8b3bf', 3);
        if (enemy.kind === 'king') {
          this.shape([[-24, -79], [-30, -111], [-10, -99], [0, -119], [13, -99], [30, -111], [25, -79]], '#d6b26c', ink);
          this.shape([[-21, -43], [-46, 0], [42, 0], [20, -43]], '#623e6d', ink);
        }
      }
      this.line([[-14, -59], [-6, -56]], ink, 3); this.line([[8, -56], [16, -59]], ink, 3);
      if (['shield', 'dog', 'captain'].includes(enemy.kind)) { this.round(enemy.face * 22 - 14, -43, 28, 39, [5, 5, 14, 14], '#93929c', ink); this.line([[enemy.face * 22, -36], [enemy.face * 22, -15]], '#d2c7bf', 3); }
      else if (!['mage', 'marshal', 'king'].includes(enemy.kind)) this.line([[27, -18], [42, -58]], '#dfd5c8', 5);
    }
    if (enemy.windup > 0) this.text('!', 0, -105, 30, '#ffe19d');
    const width = enemy.boss ? 66 : 42;
    this.round(-width / 2, enemy.boss ? -130 : -98, width, 5, 2, '#31293970');
    this.round(-width / 2, enemy.boss ? -130 : -98, width * Math.max(0, enemy.hp / enemy.maxHp), 5, 2, '#dc8f9f');
    context.restore();
  }
  princess(x, y, scale = 1) {
    const context = this.ctx; context.save(); context.translate(x, y); context.scale(scale, scale);
    this.ellipse(0, 0, 26, 7, '#20142d33'); this.ellipse(0, -55, 27, 34, '#5e3e58', '#453346');
    this.shape([[-17, -39], [-35, -4], [33, -4], [17, -39]], '#e9a6b6', '#8c657c'); this.ellipse(0, -58, 20, 23, '#ffdcbb');
    this.shape([[-22, -65], [-25, -86], [-9, -77], [0, -94], [10, -78], [24, -86], [22, -65]], '#f6d88f', '#9b7d61');
    this.ellipse(-7, -58, 2, 3, '#53404c'); this.ellipse(8, -58, 2, 3, '#53404c'); this.line([[-4, -47], [0, -44], [5, -47]], '#b7747d', 2);
    context.restore();
  }
  render(game, delta) {
    this.time += this.reduced ? 0 : delta;
    const context = this.ctx; context.clearRect(0, 0, 1280, 720);
    const title = game.mode === 'title'; const chapter = title ? 0 : game.chapter || 0;
    this.background(chapter, title);
    if (title) {
      this.ellipse(920, 564, 230, 30, '#392d3420');
      this.frog(925, 554, 3.05, { crown: false, face: 1 }); this.princess(1120, 366, 1);
      this.text('✦', 758, 340, 32, '#fff1c4'); this.text('✧', 1086, 463, 27, '#fff1c4');
      const shade = context.createLinearGradient(0, 0, 900, 0); shade.addColorStop(0, '#f6e7ce'); shade.addColorStop(.55, '#f6e7ceeb'); shade.addColorStop(1, '#f6e7ce00'); context.fillStyle = shade; context.fillRect(0, 0, 1000, 720);
    } else {
      const actors = [...(game.enemies || []), { ...game.hero, kind: 'hero' }].sort((first, second) => first.y - second.y);
      for (const actor of actors) {
        if (actor.kind === 'hero') this.frog(actor.x, actor.y, 1, { face: actor.face, moving: actor.moving, guard: actor.guarding, dash: actor.dashTime > 0, summon: actor.summon > 0, flash: actor.invincible > 0 && Math.sin(this.time * 25) > 0 });
        else this.enemy(actor);
      }
      if (game.hero?.summon > 0) { this.ellipse(game.hero.x - 55, game.hero.y - 90 + Math.sin(this.time * 4) * 8, 21, 27, '#fff4d9', '#d9c696'); this.text('✦', game.hero.x - 55, game.hero.y - 82, 24, '#caa255'); }
      if (game.stacks('pot')) for (let index = 0; index < 2; index++) {
        const angle = this.time * 4 + index * Math.PI; this.ellipse(game.hero.x + Math.cos(angle) * 80, game.hero.y - 25 + Math.sin(angle) * 38, 17, 9, '#ccd8cb', '#82928c');
      }
      for (const projectile of game.projectiles || []) {
        this.ellipse(projectile.x, projectile.y - 39, projectile.friendly ? 12 : 10, projectile.friendly ? 9 : 10, projectile.friendly ? '#ffefd0' : '#d59cdd', projectile.friendly ? '#f7d982' : '#f7cbec');
        this.line([[projectile.x - Math.sign(projectile.vx) * 12, projectile.y - 39], [projectile.x - Math.sign(projectile.vx) * 28, projectile.y - 39]], projectile.friendly ? '#ffe8b66b' : '#ce9fe56b', 5);
      }
      for (const effect of game.effects || []) {
        context.save(); context.globalAlpha = Math.min(1, effect.life * 2);
        if (effect.kind === 'text') this.text(effect.text, effect.x, effect.y, effect.text.length > 4 ? 25 : 22, effect.color);
        if (effect.kind === 'ring') this.ellipse(effect.x, effect.y - 20, effect.radius * (1 - effect.life / effect.maxLife), effect.radius * .36 * (1 - effect.life / effect.maxLife), '#ffffff03', effect.color, 4);
        if (effect.kind === 'danger') { this.ellipse(effect.x, effect.y, effect.radius, effect.radius * .45, '#f36e8c35', '#ffb6c5', 3); this.text('!', effect.x, effect.y - 10, 26, '#ffd6c1'); }
        context.restore();
      }
      if (game.mode === 'won') { this.princess(760, 461, 1.2); this.frog(625, 468, 1.35, { crown: true }); }
    }
    if (!title) {
      const hudShade = context.createLinearGradient(0, 0, 0, 190); hudShade.addColorStop(0, '#261b3b9c'); hudShade.addColorStop(1, '#261b3b00'); context.fillStyle = hudShade; context.fillRect(0, 0, 1280, 190);
    }
    const vignette = context.createRadialGradient(640, 350, 200, 640, 350, 850); vignette.addColorStop(0, '#21162a00'); vignette.addColorStop(1, '#21162a55'); context.fillStyle = vignette; context.fillRect(0, 0, 1280, 720);
  }
}
