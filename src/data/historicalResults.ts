export type HistoricalRezidentiatCutoff = {
  year: number;
  domain: 'medicine';
  specialty: string;
  universityCenter: string;
  lastScore?: number;
  lastRank?: number;
  availableSeats?: number;
  availablePositions?: number;
  sourceUrl: string;
  collectedOn: string;
  verification: 'verified' | 'needs-review';
};

/** No verified Ministry cutoff file is currently available in the local dataset. */
export const historicalRezidentiatCutoffs: HistoricalRezidentiatCutoff[] = [];
