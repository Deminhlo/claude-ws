import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { getMimeType } from '@/lib/file-utils';
import { createUploadService } from '@agentic-sdk/services/attempt/attempt-file-upload-storage';

const uploadsDir = path.join(
  process.env.DATA_DIR || path.join(process.env.CLAUDE_WS_USER_CWD || process.cwd(), 'data'),
  'uploads'
);
const uploadService = createUploadService(db, uploadsDir);

// GET /api/uploads/[fileId] - Serve uploaded file by record ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    const record = await uploadService.getById(fileId);
    if (!record) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Try multiple possible paths for the file:
    // 1. Direct upload: data/uploads/[filename]
    // 2. Processed attachment: data/uploads/[attemptId]/[filename]
    const rootPath = path.join(uploadsDir, record.filename);
    const subDirPath = path.join(uploadsDir, record.attemptId, record.filename);

    let buffer: Buffer;
    let finalPath = '';

    try {
      // Prefer root path (direct uploads)
      buffer = await readFile(rootPath);
      finalPath = rootPath;
    } catch (e) {
      // Fallback to subdirectory (processed attachments)
      try {
        buffer = await readFile(subDirPath);
        finalPath = subDirPath;
      } catch (subDirError) {
        console.error(`File not found at ${rootPath} or ${subDirPath}`);
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
      }
    }

    const mimeType = record.mimeType || getMimeType(record.filename);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${record.originalName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to serve file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}

// DELETE /api/uploads/[fileId] - Delete an uploaded file record and its file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    const record = await uploadService.getById(fileId);
    if (!record) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await uploadService.remove(fileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
