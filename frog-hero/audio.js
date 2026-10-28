export class AudioPlayer {
  constructor() { this.muted = false; this.music = true; this.volume = .45; this.context = null; this.beat = 0; this.timer = 0; }
  unlock() {
    try {
      this.context ||= new (window.AudioContext || window.webkitAudioContext)();
      this.context.resume().catch(() => {});
    } catch { this.context = null; }
  }
  note(frequency, duration, type = 'sine', volume = .1, slide = 0) {
    if (!this.context || this.muted) return;
    const context = this.context; const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(slide, context.currentTime + duration);
    gain.gain.setValueAtTime(volume * this.volume, context.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
  }
  play(event) {
    if (event === 'shoot') this.note(540, .1, 'sine', .13, 820);
    if (event === 'kill') this.note(820, .16, 'triangle', .18, 1100);
    if (event === 'hurt') this.note(170, .2, 'triangle', .28, 70);
    if (event === 'dash') this.note(130, .24, 'sawtooth', .1, 510);
    if (event === 'laugh') { this.note(330, .7, 'triangle', .3, 660); this.note(495, .6, 'sine', .2, 990); }
    if (['heal', 'upgrade', 'won', 'summon'].includes(event)) { [0, 100, 200].forEach((delay, index) => setTimeout(() => this.note([523, 659, 784][index], .3, 'sine', .2), delay)); }
  }
  update(delta, active) {
    if (!this.music || !active || this.muted) return;
    this.timer -= delta;
    if (this.timer <= 0) { this.timer = .43; const melody = [262, 330, 392, 330, 294, 349, 440, 349, 262, 330, 392, 523, 440, 392, 330, 294]; this.note(melody[this.beat % melody.length], .65, 'sine', .065); if (this.beat % 4 === 0) this.note(this.beat % 8 ? 147 : 131, 1.4, 'triangle', .09); this.beat++; }
  }
}
