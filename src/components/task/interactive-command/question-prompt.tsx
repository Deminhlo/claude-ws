'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { Question } from '@/components/task/interactive-command/question-answer-utils';
import {
  getCustomAnswer,
  getAnsweredOptionIndex,
  getAnsweredCount,
  areAllAnswered,
} from '@/components/task/interactive-command/question-answer-utils';
import {
  QuestionTabBar,
  SubmitReviewView,
  QuestionOptionsView,
  FooterHint,
} from '@/components/task/interactive-command/question-renderer';

export type { Question, QuestionOption } from '@/components/task/interactive-command/question-answer-utils';

interface QuestionPromptProps {
  questions: Question[];
  onAnswer: (answers: Record<string, string | string[]>) => void;
  onCancel: () => void;
}

export function QuestionPrompt({ questions, onAnswer, onCancel }: QuestionPromptProps) {
  const t = useTranslations('task');
  const tChat = useTranslations('chat');
  const tCommon = useTranslations('common');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedMulti, setSelectedMulti] = useState<Set<number>>(new Set());
  const [customInput, setCustomInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showSubmitView, setShowSubmitView] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const existingCustom = getCustomAnswer(questions, answers, currentQuestionIndex);
  const typeOptionLabel = existingCustom ? `${existingCustom} (edit)` : t('typeSomething');
  const allOptions = [...currentQuestion.options, { label: typeOptionLabel, description: '' }];
  const isLastOption = selectedIndex === allOptions.length - 1;
  const allAnswered = areAllAnswered(questions, answers);
  const answeredCount = getAnsweredCount(questions, answers);

  const navigateToTab = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setShowSubmitView(false);
    setCurrentQuestionIndex(index);
    setSelectedIndex(getAnsweredOptionIndex(questions, answers, index));
    setSelectedMulti(new Set());
    const existing = getCustomAnswer(questions, answers, index);
    setCustomInput(existing ?? '');
    setIsTyping(false);
  };

  const handleSubmitAnswer = (answer: string | string[]) => {
    const answerValue = Array.isArray(answer) ? answer.join(', ') : answer;
    const newAnswers = { ...answers, [currentQuestion.question]: answerValue };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedIndex(0);
      setSelectedMulti(new Set());
      setCustomInput('');
      setIsTyping(false);
    } else if (questions.length === 1) {
      onAnswer(newAnswers);
    } else {
      setShowSubmitView(true);
      setSelectedIndex(0);
    }
  };

  const handleMultiSubmit = () => {
    if (selectedMulti.size === 0) return;
    const selectedLabels = Array.from(selectedMulti).map((i) => currentQuestion.options[i].label);
    handleSubmitAnswer(selectedLabels);
  };

  const enterTypingMode = () => {
    if (!customInput && existingCustom) {
      setCustomInput(existingCustom);
    }
    setIsTyping(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const toggleMultiSelect = (index: number) => {
    setSelectedMulti((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleShowSubmit = () => {
    setShowSubmitView(true);
    setSelectedIndex(0);
  };

  const handleSelectOption = (index: number) => {
    setSelectedIndex(index);
    const isTypeOption = index === allOptions.length - 1;
    if (isTypeOption) {
      enterTypingMode();
    } else if (currentQuestion.multiSelect) {
      toggleMultiSelect(index);
    } else {
      handleSubmitAnswer(currentQuestion.options[index].label);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsTyping(false);
          setCustomInput('');
        } else if (e.key === 'Enter' && customInput.trim()) {
          e.preventDefault();
          handleSubmitAnswer(customInput.trim());
        }
        return;
      }

      if (showSubmitView) {
        handleSubmitViewKeyDown(e);
        return;
      }

      handleQuestionViewKeyDown(e);
    };

    const handleSubmitViewKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToTab(questions.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex === 0 && answeredCount > 0) onAnswer(answers);
        else if (selectedIndex === 1) onCancel();
      } else if (e.key === '1') {
        e.preventDefault();
        if (answeredCount > 0) onAnswer(answers);
      } else if (e.key === '2') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    const handleQuestionViewKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToTab(currentQuestionIndex - 1);
        return;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentQuestionIndex < questions.length - 1) {
          navigateToTab(currentQuestionIndex + 1);
        } else {
          handleShowSubmit();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allOptions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isLastOption) {
          enterTypingMode();
        } else if (currentQuestion.multiSelect) {
          toggleMultiSelect(selectedIndex);
        } else {
          handleSubmitAnswer(currentQuestion.options[selectedIndex].label);
        }
      } else if (e.key === ' ' && currentQuestion.multiSelect && !isLastOption) {
        e.preventDefault();
        toggleMultiSelect(selectedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (/^[1-9]$/.test(e.key)) {
        const num = parseInt(e.key, 10) - 1;
        if (num < allOptions.length) {
          setSelectedIndex(num);
          if (num === allOptions.length - 1) {
            enterTypingMode();
          } else if (!currentQuestion.multiSelect) {
            handleSubmitAnswer(currentQuestion.options[num].label);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, isTyping, customInput, currentQuestion, allOptions.length, isLastOption, currentQuestionIndex, questions.length, allAnswered, answers, showSubmitView]);

  return (
    <div className="py-4">
      <QuestionTabBar
        questions={questions}
        answers={answers}
        currentQuestionIndex={currentQuestionIndex}
        showSubmitView={showSubmitView}
        allAnswered={allAnswered}
        navigateToTab={navigateToTab}
        onShowSubmit={handleShowSubmit}
        submitLabel={tCommon('submit')}
      />

      {showSubmitView ? (
        <SubmitReviewView
          questions={questions}
          answers={answers}
          answeredCount={answeredCount}
          allAnswered={allAnswered}
          selectedIndex={selectedIndex}
          navigateToTab={navigateToTab}
          onSubmit={() => onAnswer(answers)}
          onCancel={onCancel}
          labels={{
            reviewAnswers: t('reviewAnswers'),
            notAllAnswered: t('notAllAnswered'),
            readyToSubmit: t('readyToSubmit'),
            submitAnswers: t('submitAnswers'),
            cancel: tCommon('cancel'),
          }}
        />
      ) : (
        <QuestionOptionsView
          currentQuestion={currentQuestion}
          allOptions={allOptions}
          selectedIndex={selectedIndex}
          selectedMulti={selectedMulti}
          existingCustom={existingCustom}
          answers={answers}
          isTyping={isTyping}
          customInput={customInput}
          inputRef={inputRef}
          onSelectOption={handleSelectOption}
          onCustomInputChange={setCustomInput}
          onMultiSubmit={handleMultiSubmit}
          labels={{ typeYourAnswer: tChat('typeYourAnswer') }}
        />
      )}

      <FooterHint questionCount={questions.length} />
    </div>
  );
}
