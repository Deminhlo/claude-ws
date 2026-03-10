'use client';

import { RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { Question } from '@/components/task/interactive-command/question-answer-utils';
import { isQuestionAnswered } from '@/components/task/interactive-command/question-answer-utils';

// -- Shared types for renderer props --

interface QuestionTabBarProps {
  questions: Question[];
  answers: Record<string, string | string[]>;
  currentQuestionIndex: number;
  showSubmitView: boolean;
  allAnswered: boolean;
  navigateToTab: (index: number) => void;
  onShowSubmit: () => void;
  submitLabel: string;
}

interface SubmitReviewViewProps {
  questions: Question[];
  answers: Record<string, string | string[]>;
  answeredCount: number;
  allAnswered: boolean;
  selectedIndex: number;
  navigateToTab: (index: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  labels: {
    reviewAnswers: string;
    notAllAnswered: string;
    readyToSubmit: string;
    submitAnswers: string;
    cancel: string;
  };
}

interface QuestionOptionsViewProps {
  currentQuestion: Question;
  allOptions: { label: string; description: string }[];
  selectedIndex: number;
  selectedMulti: Set<number>;
  existingCustom: string | null;
  answers: Record<string, string | string[]>;
  isTyping: boolean;
  customInput: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelectOption: (index: number) => void;
  onCustomInputChange: (value: string) => void;
  onMultiSubmit: () => void;
  labels: { typeYourAnswer: string };
}

// -- Components --

export function QuestionTabBar({
  questions,
  answers,
  currentQuestionIndex,
  showSubmitView,
  allAnswered,
  navigateToTab,
  onShowSubmit,
  submitLabel,
}: QuestionTabBarProps) {
  const hasMultiple = questions.length > 1;

  return (
    <div className="flex items-center gap-1 px-4 mb-3 overflow-x-auto">
      {hasMultiple && (
        <button
          onClick={() =>
            showSubmitView
              ? navigateToTab(questions.length - 1)
              : navigateToTab(currentQuestionIndex - 1)
          }
          disabled={!showSubmitView && currentQuestionIndex === 0}
          className={cn(
            'shrink-0 text-xs px-1',
            !showSubmitView && currentQuestionIndex === 0
              ? 'text-muted-foreground/30 cursor-default'
              : 'text-muted-foreground hover:text-foreground cursor-pointer'
          )}
        >
          &larr;
        </button>
      )}

      {questions.map((q, i) => {
        const isCurrent = i === currentQuestionIndex && !showSubmitView;
        const answered = isQuestionAnswered(questions, answers, i);
        return (
          <button
            key={i}
            onClick={() => navigateToTab(i)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer',
              isCurrent
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <span className="text-[10px]">{answered ? '\u2713' : '\u25A1'}</span>
            {q.header}
          </button>
        );
      })}

      <button
        onClick={onShowSubmit}
        className={cn(
          'shrink-0 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer',
          showSubmitView
            ? 'bg-primary/15 text-primary border border-primary/30'
            : allAnswered
              ? 'text-primary hover:bg-primary/15'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <span className="text-[10px]">{allAnswered ? '\u2713' : '\u25A1'}</span>
        {submitLabel}
      </button>

      {hasMultiple && (
        <button
          onClick={() => {
            if (showSubmitView) return;
            if (currentQuestionIndex < questions.length - 1) {
              navigateToTab(currentQuestionIndex + 1);
            } else {
              onShowSubmit();
            }
          }}
          disabled={showSubmitView}
          className={cn(
            'shrink-0 text-xs px-1',
            showSubmitView
              ? 'text-muted-foreground/30 cursor-default'
              : 'text-muted-foreground hover:text-foreground cursor-pointer'
          )}
        >
          &rarr;
        </button>
      )}
    </div>
  );
}

export function SubmitReviewView({
  questions,
  answers,
  answeredCount,
  allAnswered,
  selectedIndex,
  navigateToTab,
  onSubmit,
  onCancel,
  labels,
}: SubmitReviewViewProps) {
  return (
    <>
      <div className="px-4 mb-3">
        <p className="text-sm font-bold">{labels.reviewAnswers}</p>
      </div>

      {!allAnswered && (
        <div className="px-4 mb-3">
          <p className="text-sm text-yellow-500">{'\u26A0'} {labels.notAllAnswered}</p>
        </div>
      )}

      {answeredCount > 0 && (
        <div className="px-4 mb-4 space-y-2">
          {questions.map((q, i) => {
            const answer = answers[q.question];
            if (answer === undefined) return null;
            return (
              <button
                key={i}
                onClick={() => navigateToTab(i)}
                className="w-full text-left group"
              >
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-green-500 text-sm">{'\u25CF'}</span>
                  <div className="min-w-0">
                    <span className="text-sm text-muted-foreground">{q.question}</span>
                    <div className="text-sm text-foreground">
                      <span className="text-muted-foreground mr-1">&rarr;</span>
                      {String(answer)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="px-4 mb-3">
        <p className="text-sm text-muted-foreground">{labels.readyToSubmit}</p>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => { if (answeredCount > 0) onSubmit(); }}
          className={cn(
            'w-full flex items-start gap-3 px-4 py-2 text-left transition-colors',
            'hover:bg-muted/50',
            selectedIndex === 0 && 'bg-muted/30',
            answeredCount === 0 && 'opacity-50'
          )}
        >
          <span className="shrink-0 w-4 text-primary font-bold">
            {selectedIndex === 0 ? '\u203A' : ' '}
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">1.</span>
          <span className="text-sm font-medium">
            {labels.submitAnswers}
            {answeredCount > 0 ? ` (${answeredCount}/${questions.length})` : ''}
          </span>
        </button>
        <button
          onClick={onCancel}
          className={cn(
            'w-full flex items-start gap-3 px-4 py-2 text-left transition-colors',
            'hover:bg-muted/50',
            selectedIndex === 1 && 'bg-muted/30'
          )}
        >
          <span className="shrink-0 w-4 text-primary font-bold">
            {selectedIndex === 1 ? '\u203A' : ' '}
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">2.</span>
          <span className="text-sm font-medium">{labels.cancel}</span>
        </button>
      </div>
    </>
  );
}

export function QuestionOptionsView({
  currentQuestion,
  allOptions,
  selectedIndex,
  selectedMulti,
  existingCustom,
  answers,
  isTyping,
  customInput,
  inputRef,
  onSelectOption,
  onCustomInputChange,
  onMultiSubmit,
  labels,
}: QuestionOptionsViewProps) {
  const currentAnswer = answers[currentQuestion.question];

  return (
    <>
      <div className="px-4 mb-4">
        <p className="text-sm font-medium">{currentQuestion.question}</p>
      </div>

      <div className="space-y-1">
        {allOptions.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isChecked = selectedMulti.has(index);
          const isTypeOption = index === allOptions.length - 1;
          const isPreviousAnswer =
            currentAnswer !== undefined &&
            (isTypeOption
              ? existingCustom !== null
              : currentQuestion.options[index]?.label === String(currentAnswer));

          return (
            <button
              key={index}
              onClick={() => onSelectOption(index)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-2 text-left transition-colors',
                'hover:bg-muted/50',
                isSelected && 'bg-muted/30'
              )}
            >
              <span
                className={cn(
                  'shrink-0 w-4 font-bold',
                  isPreviousAnswer ? 'text-green-500' : 'text-primary'
                )}
              >
                {isSelected ? '\u203A' : ' '}
              </span>
              <span
                className={cn(
                  'shrink-0 text-sm',
                  isPreviousAnswer ? 'text-green-500' : 'text-muted-foreground'
                )}
              >
                {index + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {currentQuestion.multiSelect && !isTypeOption && (
                    <span
                      className={cn(
                        'size-4 border rounded flex items-center justify-center text-xs',
                        isChecked && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {isChecked && '\u2713'}
                    </span>
                  )}
                  <span
                    className={cn('text-sm font-medium', isPreviousAnswer && 'text-green-500')}
                  >
                    {option.label}
                  </span>
                </div>
                {option.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                    {option.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {isTyping && (
        <div className="px-4 mt-3">
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => onCustomInputChange(e.target.value)}
            placeholder={labels.typeYourAnswer}
            className="w-full px-3 py-2 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>
      )}

      {currentQuestion.multiSelect && selectedMulti.size > 0 && (
        <div className="px-4 mt-3">
          <button
            onClick={onMultiSubmit}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Submit ({selectedMulti.size} selected)
          </button>
        </div>
      )}
    </>
  );
}

export function FooterHint({ questionCount }: { questionCount: number }) {
  return (
    <div className="px-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
      <kbd className="px-1 bg-muted rounded">Enter</kbd> to select
      <span className="mx-2">&middot;</span>
      <kbd className="px-1 bg-muted rounded">&uarr;/&darr;</kbd> to navigate
      {questionCount > 1 && (
        <>
          <span className="mx-2">&middot;</span>
          <kbd className="px-1 bg-muted rounded">&larr;/&rarr;</kbd> switch question
        </>
      )}
      <span className="mx-2">&middot;</span>
      <kbd className="px-1 bg-muted rounded">Esc</kbd> to cancel
    </div>
  );
}
