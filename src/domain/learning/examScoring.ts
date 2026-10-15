export type RomanianQuestionKind = 'single' | 'multiple';

export function scoreRomanianQuestion(
  kind: RomanianQuestionKind,
  correctAnswers: number[],
  selected: number[],
  choiceCount = 5,
) {
  if (
    choiceCount !== 5 ||
    new Set(correctAnswers).size !== correctAnswers.length ||
    new Set(selected).size !== selected.length ||
    [...correctAnswers, ...selected].some(value => !Number.isInteger(value) || value < 0 || value >= choiceCount)
  ) throw new Error('Structure ou sélection QCM invalide.');

  const maxScore = kind === 'single' ? 4 : 5;
  const expectedCountValid = kind === 'single'
    ? correctAnswers.length === 1
    : correctAnswers.length >= 2 && correctAnswers.length <= 4;
  const selectedCountValid = kind === 'single'
    ? selected.length === 1
    : selected.length >= 2 && selected.length <= 4;

  if (!expectedCountValid || !selectedCountValid) return { score: 0, maxScore, correct: false, valid: false };
  const correct = correctAnswers.length === selected.length && correctAnswers.every(value => selected.includes(value));
  if (kind === 'single') return { score: correct ? 4 : 0, maxScore, correct, valid: true };

  const score = Array.from({ length: choiceCount }, (_, index) =>
    Number(correctAnswers.includes(index) === selected.includes(index)),
  ).reduce((sum, value) => sum + value, 0);
  return { score, maxScore, correct, valid: true };
}

export const romanianExamBlueprint = {
  questions: 200,
  simpleQuestions: 50,
  multipleQuestions: 150,
  minutes: 240,
  theoreticalMaximum: 950,
  passingRule: '60% of the maximum score achieved nationally in the candidate’s domain; not a fixed 60% of 950.',
} as const;
