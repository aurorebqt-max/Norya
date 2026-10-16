import { Platform } from 'react-native';
import type { SpeechDriver } from '../domain/sourceCourse/readingAudio';

export async function readingSpeechDriver(): Promise<SpeechDriver> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.speechSynthesis) throw new Error('Lecture vocale indisponible dans ce navigateur.');
    const synth = window.speechSynthesis;
    let utterance: SpeechSynthesisUtterance | null = null;
    return {
      canPause: true,
      voices: async () => synth.getVoices().map(v => ({ id: v.voiceURI, name: v.name, language: v.lang, local: v.localService })),
      speak: (text, voiceId, rate, done, fail) => {
        const voice = synth.getVoices().find(v => v.voiceURI === voiceId && /^ro(?:[-_]|$)/i.test(v.lang) && v.localService);
        if (!voice) throw new Error('La voix roumaine locale choisie n’est plus disponible.');
        utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = rate;
        utterance.onend = done; utterance.onerror = e => fail(e.error); synth.speak(utterance);
      },
      stop: async () => { synth.cancel(); utterance = null; }, pause: async () => { synth.pause(); }, resume: async () => { synth.resume(); },
    };
  }
  const Speech = await import('expo-speech');
  return {
    canPause: Platform.OS !== 'android',
    voices: async () => (await Speech.getAvailableVoicesAsync()).map(v => ({ id: v.identifier, name: v.name, language: v.language, local: false })),
    speak: (text, voice, rate, done, fail) => Speech.speak(text, { voice, language: 'ro-RO', rate, onDone: done, onError: fail }),
    stop: Speech.stop, pause: Speech.pause, resume: Speech.resume,
  };
}
