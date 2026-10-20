import { Platform } from 'react-native';
import type { SpeechDriver, ReadingVoice } from '../domain/sourceCourse/readingAudio';

export async function readingSpeechDriver(language: 'ro' | 'fr' = 'ro'): Promise<SpeechDriver> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.speechSynthesis) throw new Error('Lecture vocale indisponible dans ce navigateur.');
    const synth = window.speechSynthesis;
    let utterance: SpeechSynthesisUtterance | null = null;
    return {
      canPause: true,
      voices: async () => {
        if (!synth.getVoices().length) await new Promise<void>(resolve => {
          const done = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', done); resolve(); };
          const timer = setTimeout(done, 1200);
          synth.addEventListener('voiceschanged', done);
          if (synth.getVoices().length) done();
        });
        return synth.getVoices().map(v => ({ id: v.voiceURI, name: v.name, language: v.lang, local: v.localService }));
      },
      speak: (text, voiceId, rate, done, fail) => {
        const voice = synth.getVoices().find(v => v.voiceURI === voiceId && v.lang.toLowerCase().split(/[-_]/)[0] === language);
        // Les évènements « canceled » de Safari peuvent venir du précédent énoncé.
        // Ne jamais confondre cette annulation normale avec l'échec du nouvel énoncé.
        if (utterance) { utterance.onend = null; utterance.onerror = null; }
        if (synth.speaking || synth.pending) synth.cancel();
        const next = new SpeechSynthesisUtterance(text);
        utterance = next;
        if (voice) next.voice = voice;
        next.lang = voice?.lang ?? (language === 'ro' ? 'ro-RO' : 'fr-FR');
        next.rate = rate;
        next.onend = () => { if (utterance === next) done(); };
        next.onerror = e => {
          if (utterance !== next) return;
          if (e.error !== 'canceled' && e.error !== 'interrupted') fail(e.error);
        };
        // Safari iOS exige parfois speak() directement lors du geste utilisateur.
        // Aucun délai artificiel : il ferait perdre l'activation audio.
        if (synth.paused) synth.resume();
        synth.speak(next);
      },
      stop: async () => { synth.cancel(); utterance = null; }, pause: async () => { synth.pause(); }, resume: async () => { synth.resume(); },
    };
  }
  const Speech = await import('expo-speech');
  let available: ReadingVoice[] = [];
  return {
    canPause: Platform.OS !== 'android',
    voices: async () => available = (await Speech.getAvailableVoicesAsync()).map(v => ({ id: v.identifier, name: v.name, language: v.language, local: false, quality: v.quality === Speech.VoiceQuality.Enhanced ? 'enhanced' as const : 'default' as const })),
    speak: (text, voice, rate, done, fail) => {
      const selected = available.find(v => v.id === voice && v.language.toLowerCase().split(/[-_]/)[0] === language);
      if (!selected) throw new Error('Voix compatible indisponible.');
      Speech.speak(text, { voice, language: selected.language, rate, onDone: done, onError: fail });
    },
    stop: Speech.stop, pause: Speech.pause, resume: Speech.resume,
  };
}
