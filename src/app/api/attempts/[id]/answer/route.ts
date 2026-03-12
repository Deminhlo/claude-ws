import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAttemptService } from '@agentic-sdk/services/attempt/attempt-crud-and-logs';

const attemptService = createAttemptService(db);

// POST /api/attempts/[id]/answer - Save a user's answer to database
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { questions, answers } = body as { questions: unknown[]; answers: Record<string, string> };

    // Save the answer as an attempt log (with bold formatting for display)
    const answerText = Object.entries(answers)
      .map(([question, answer]) => `${question}: **${answer}**`)
      .join('\n');

    await attemptService.addLog(id, 'json', JSON.stringify({
      type: 'user_answer',
      questions,
      answers,
      displayText: `✓ You answered:\n${answerText}`
    }));

    console.log(`[answer] Saved answer for attempt ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving answer:', error);
    return NextResponse.json(
      { error: 'Failed to save answer' },
      { status: 500 }
    );
  }
}
