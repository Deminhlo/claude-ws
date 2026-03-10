export interface QuestionOption {
  label: string;
  description: string;
}

export interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

/**
 * Check if a question at the given index has been answered.
 */
export function isQuestionAnswered(
  questions: Question[],
  answers: Record<string, string | string[]>,
  index: number
): boolean {
  return answers[questions[index].question] !== undefined;
}

/**
 * Get the custom (non-predefined) answer for a question, or null if
 * the answer matches a predefined option or is missing.
 */
export function getCustomAnswer(
  questions: Question[],
  answers: Record<string, string | string[]>,
  questionIndex: number
): string | null {
  const q = questions[questionIndex];
  const answer = answers[q.question];
  if (answer === undefined) return null;
  const answerStr = String(answer);
  const isPredefOption = q.options.some((opt) => opt.label === answerStr);
  return isPredefOption ? null : answerStr;
}

/**
 * Find the option index that matches a stored answer for a question.
 * Returns the "Type something" option index (last) for custom answers,
 * or 0 if the question is unanswered.
 */
export function getAnsweredOptionIndex(
  questions: Question[],
  answers: Record<string, string | string[]>,
  questionIndex: number
): number {
  const q = questions[questionIndex];
  const answer = answers[q.question];
  if (answer === undefined) return 0;
  const answerStr = String(answer);
  const predefinedIndex = q.options.findIndex((opt) => opt.label === answerStr);
  if (predefinedIndex !== -1) return predefinedIndex;
  // Custom answer points to the "Type something" option (last one)
  return q.options.length;
}

/**
 * Count how many questions have been answered.
 */
export function getAnsweredCount(
  questions: Question[],
  answers: Record<string, string | string[]>
): number {
  return questions.filter((q) => answers[q.question] !== undefined).length;
}

/**
 * Check if all questions have been answered.
 */
export function areAllAnswered(
  questions: Question[],
  answers: Record<string, string | string[]>
): boolean {
  return questions.every((q) => answers[q.question] !== undefined);
}
