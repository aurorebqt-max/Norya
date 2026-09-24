export type Session = { id: string; title: string; subject: string; kind: string; minutes: number; icon: 'book-outline' | 'help-circle-outline' | 'headset-outline'; color: string };
export type Profile = { name: string; exam: string; year: string; specialties: string[]; hours: number; days: string[]; goal: string };
export type StudyItem = { id: string; title: string; subject: string; progress: number; rank: string };
