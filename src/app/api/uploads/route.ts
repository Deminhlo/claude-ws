import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/db';
import { createUploadService } from '@agentic-sdk/services/attempt/attempt-file-upload-storage';

const uploadsDir = path.join(
  process.env.DATA_DIR || path.join(process.env.CLAUDE_WS_USER_CWD || process.cwd(), 'data'),
  'uploads'
);
const uploadService = createUploadService(db, uploadsDir);

// GET /api/uploads?attemptId=xxx - List uploaded files for an attempt
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId required' }, { status: 400 });
    }

    const files = await uploadService.list(attemptId);
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Failed to list uploads:', error);
    return NextResponse.json({ error: 'Failed to list uploads' }, { status: 500 });
  }
}

// POST /api/uploads - Upload a file for an attempt
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const attemptId = formData.get('attemptId') as string;
    const file = formData.get('file') as File;

    if (!attemptId || !file) {
      return NextResponse.json({ error: 'attemptId and file are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const record = await uploadService.save(attemptId, {
      filename: file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
