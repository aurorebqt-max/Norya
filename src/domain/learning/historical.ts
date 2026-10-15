import type { HistoricalRezidentiatCutoff } from '../../data/historicalResults';

export function historicallyReachedCutoffs(
  score: number,
  records: readonly HistoricalRezidentiatCutoff[],
) {
  if (!Number.isFinite(score) || score < 0) throw new Error('Le score doit être positif ou nul.');
  return records
    .filter(record => record.verification === 'verified' && record.domain === 'medicine'
      && record.lastScore !== undefined && record.lastScore <= score)
    .sort((a, b) => b.year - a.year || (a.lastScore ?? 0) - (b.lastScore ?? 0));
}
