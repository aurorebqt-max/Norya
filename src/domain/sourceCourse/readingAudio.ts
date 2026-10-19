import type { CourseItem, CourseStructure } from './courseStructure';
export type AudioChunk = { text: string; section: number; blockKey: string };
export type ReadingVoice = { id: string; name: string; language: string; local: boolean; quality?: 'enhanced' | 'default' };
export type SpeechDriver = {
  voices(): Promise<ReadingVoice[]>; canPause: boolean;
  speak(text: string, voice: string, rate: number, done: () => void, fail: (error: unknown) => void): void;
  stop(): Promise<void>; pause(): Promise<void>; resume(): Promise<void>;
};
/** Quality metadata first; name hints are only a fallback, never a language substitute. */
export function preferredVoices(voices: ReadingVoice[], language: 'ro' | 'fr'): ReadingVoice[] {
  const score = (v: ReadingVoice) => (v.quality === 'enhanced' ? 100 : 0) +
    (/neural|natural|premium|enhanced|amélior|haute qualité/i.test(`${v.name} ${v.id}`) ? 50 : 0);
  return voices.filter(v => v.language.toLowerCase().split(/[-_]/)[0] === language)
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}
export const romanianVoices = (voices: ReadingVoice[], localOnly = true) => voices.filter(v => /^ro(?:[-_]|$)/i.test(v.language) && (!localOnly || v.local));
export function splitSpeech(text: string, limit = 220): string[] {
  const chunks: string[] = []; let rest = text;
  while (rest.length) {
    let end = Math.min(limit, rest.length);
    if (end < rest.length) {
      const prefix = rest.slice(0, end);
      const boundary = Math.max(prefix.lastIndexOf('. '), prefix.lastIndexOf('; '), prefix.lastIndexOf('\n'));
      const space = prefix.lastIndexOf(' ');
      if (boundary > limit / 3) end = boundary + 1;
      else if (space > 0) end = space + 1;
      // Never cut a UTF-16 surrogate pair.
      if (/[\uD800-\uDBFF]/u.test(rest[end - 1])) end--;
    }
    chunks.push(rest.slice(0, end)); rest = rest.slice(end);
  }
  return chunks;
}
export function spokenText(item: CourseItem): string {
  if (item.presentation.hide || ['toc', 'bibliography', 'authors'].includes(item.kind ?? '') || item.part.role === 'page-header') return '';
  if (item.presentation.imageOnly || item.kind === 'table' || item.part.role === 'figure' || item.part.role === 'table') {
    // Only explicitly digital captions; source extraction inside an image is not a caption.
    return item.table ? [item.table.title, item.table.notes].filter(Boolean).join('\n') : '';
  }
  return item.presentation.text;
}
export function audioQueue(structure: CourseStructure, section?: number): AudioChunk[] {
  const groups = structure.sections.length ? structure.sections.map((s, i) => i === 0 ? [...structure.intro, ...s.items] : s.items) : [structure.intro];
  return groups.flatMap((items, index) => section !== undefined && index !== section ? [] : items.flatMap(item =>
    splitSpeech(spokenText(item)).filter(text => text.trim()).map(text => ({ text, section: index, blockKey: item.key }))));
}
export type AudioStatus = { state: 'idle' | 'playing' | 'paused'; index: number; total: number; section: number; error?: string };
export class ReadingAudioController {
  private generation = 0; private queue: AudioChunk[] = []; private index = 0; private replay = false;
  private state: AudioStatus['state'] = 'idle'; private voice = ''; private rate = 1;
  constructor(private driver: SpeechDriver, private changed: (status: AudioStatus) => void) {}
  private report(error?: string) { this.changed({ state: this.state, index: this.index, total: this.queue.length, section: this.queue[this.index]?.section ?? 0, error }); }
  async start(queue: AudioChunk[], voice: string, rate: number) {
    const token = ++this.generation; this.state = 'idle'; await this.driver.stop();
    if (token !== this.generation) return;
    this.queue = queue; this.index = 0; this.voice = voice; this.rate = rate; this.replay = false;
    this.state = queue.length ? 'playing' : 'idle'; this.report(queue.length ? undefined : 'Aucun texte numérique à lire.');
    this.speak(token);
  }
  private speak(token: number) {
    if (token !== this.generation || this.state !== 'playing') return;
    if (!this.queue[this.index]) { this.state = 'idle'; this.report(); return; }
    try { this.driver.speak(this.queue[this.index].text, this.voice, this.rate, () => {
      if (token !== this.generation) return;
      this.index++; this.report();
      if (this.state === 'paused') this.replay = true; else this.speak(token);
    }, error => { if (token === this.generation) { this.state = 'idle'; this.report(String(error)); } }); }
    catch (error) { this.state = 'idle'; this.report(String(error)); }
  }
  async pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.report();
    if (this.driver.canPause) { try { await this.driver.pause(); return; } catch { /* explicit bounded replay fallback */ } }
    this.generation++; this.replay = true; await this.driver.stop();
    this.report('Reprise au début du court passage en cours sur cet appareil.');
  }
  async resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing'; this.report();
    if (this.replay) { this.replay = false; this.speak(this.generation); }
    else { try { await this.driver.resume(); } catch (error) { this.state = 'paused'; this.report(String(error)); } }
  }
  async setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2, rate));
    if (this.state === 'playing') {
      const token = ++this.generation; await this.driver.stop();
      if (token !== this.generation) return;
      this.speak(token);
    }
    this.report();
  }

  async stop() { this.generation++; this.state = 'idle'; await this.driver.stop(); this.report(); }
  async section(delta: number) {
    const current = this.queue[this.index]?.section ?? 0;
    const sections = [...new Set(this.queue.map(c => c.section))];
    const next = sections[sections.indexOf(current) + delta];
    if (next === undefined) return;
    const token = ++this.generation; await this.driver.stop(); if (token !== this.generation) return;
    this.index = this.queue.findIndex(c => c.section === next); this.state = 'playing'; this.report(); this.speak(token);
  }
}
