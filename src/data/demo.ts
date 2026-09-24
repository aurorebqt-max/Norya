import { Profile, Session, StudyItem } from '../types';
export const DEMO_DATE = '2026-09-24';
export const EDN_DATE = '2027-10-18'; // Date illustrative, non officielle.
export const FIRST_PASS_DEADLINE = '2027-09-18';
export const profile: Profile = { name: 'Aurore', exam: 'EDN & ECOS', year: '2027', specialties: ['Ophtalmologie', 'Dermatologie'], hours: 2, days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'], goal: 'Avancer avec régularité' };
export const sessions: Session[] = [
 { id: 'cardio', title: 'Les fondamentaux en cardiologie', subject: 'Cardiologie', kind: 'Fiche & mémorisation', minutes: 30, icon: 'book-outline', color: '#EAF2E9' },
 { id: 'dermato', title: 'Un regard neuf sur la dermatologie', subject: 'Dermatologie', kind: '10 questions isolées', minutes: 20, icon: 'help-circle-outline', color: '#F7E8DA' },
 { id: 'audio', title: 'On révise vos points fragiles ?', subject: 'Révision des erreurs', kind: 'Podcast de consolidation', minutes: 15, icon: 'headset-outline', color: '#EDEBF7' },
];
export const items: StudyItem[] = [
 { id: 'cardio', title: 'Les fondamentaux en cardiologie', subject: 'Cardiologie', progress: 65, rank: 'A' },
 { id: 'dermato', title: 'Démarche en dermatologie', subject: 'Dermatologie', progress: 48, rank: 'A' },
 { id: 'ophta', title: 'Exploration en ophtalmologie', subject: 'Ophtalmologie', progress: 72, rank: 'B' },
 { id: 'neuro', title: 'Repères en neurologie', subject: 'Neurologie', progress: 32, rank: 'A' },
 { id: 'pneumo', title: 'Introduction à la pneumologie', subject: 'Pneumologie', progress: 20, rank: 'B' },
 { id: 'gastro', title: 'Repères en gastro-entérologie', subject: 'Gastro-entérologie', progress: 0, rank: 'A' },
];
export const errors = [ { id: 'e1', title: 'Identifier les mots clés de l’énoncé', subject: 'Cardiologie', count: 3 }, { id: 'e2', title: 'Hiérarchiser les informations', subject: 'Dermatologie', count: 2 }, { id: 'e3', title: 'Prendre le temps de relire', subject: 'Neurologie', count: 2 } ];
export const stats = { total: 367, completed: 124, mastery: 62, rankA: 68, rankB: 49, consolidated: 8 };
export const podcasts = [ { id: 'p1', title: 'La cardio, à tête reposée', subtitle: 'Les essentiels • Cardiologie', minutes: 12, color: '#DCE9D6' }, { id: 'p2', title: 'Vos erreurs, vos meilleurs alliés', subtitle: 'Votre révision personnalisée', minutes: 15, color: '#F2DECD' }, { id: 'p3', title: 'Un autre regard sur l’ophtalmo', subtitle: 'Les essentiels • Ophtalmologie', minutes: 10, color: '#E1DFF0' } ];
