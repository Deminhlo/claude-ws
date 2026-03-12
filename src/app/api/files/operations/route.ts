import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { createFileOperationsService } from '@agentic-sdk/services/files/operations-and-upload';

const log = createLogger('FileOperations');
const fileOpsService = createFileOperationsService();

/**
 * Map SDK error messages to appropriate HTTP status codes.
 */
function mapError(error: unknown): NextResponse {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg === 'Path traversal detected' || msg === 'Root path outside home directory') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }
    if (msg === 'Path not found' || msg === 'Parent directory not found' || msg === 'File not found') {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === 'Already exists') {
      return NextResponse.json({ error: 'A file or folder with that name already exists' }, { status: 409 });
    }
    if (msg === 'Parent path is not a directory') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg === 'Invalid name') {
      return NextResponse.json({ error: 'Invalid name. Cannot contain path separators or ..' }, { status: 400 });
    }
    if ('code' in error && (error as NodeJS.ErrnoException).code === 'EACCES') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/**
 * DELETE /api/files/operations
 * Delete a file or folder recursively.
 * Body: { path: string, rootPath: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { path: targetPath, rootPath } = await request.json();

    if (!targetPath || !rootPath) {
      return NextResponse.json({ error: 'path and rootPath required' }, { status: 400 });
    }

    await fileOpsService.deleteFileOrDir(targetPath, rootPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, 'Delete error');
    return mapError(error);
  }
}

/**
 * POST /api/files/operations
 * Download a file or folder (directories returned as ZIP).
 * Body: { path: string, rootPath: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { path: targetPath, rootPath } = await request.json();

    if (!targetPath || !rootPath) {
      return NextResponse.json({ error: 'path and rootPath required' }, { status: 400 });
    }

    const { buffer, filename, contentType } = await fileOpsService.downloadFileOrDir(targetPath, rootPath);

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    log.error({ error }, 'Download error');
    return mapError(error);
  }
}

/**
 * PATCH /api/files/operations
 * Create a new file or folder.
 * Body: { parentPath: string, rootPath: string, name: string, type: 'file' | 'folder' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { parentPath, rootPath, name, type } = await request.json();

    if (!parentPath || !rootPath || !name || !type) {
      return NextResponse.json({ error: 'parentPath, rootPath, name, and type required' }, { status: 400 });
    }

    if (type !== 'file' && type !== 'folder') {
      return NextResponse.json({ error: 'type must be "file" or "folder"' }, { status: 400 });
    }

    const newPath = await fileOpsService.createFileOrDir(parentPath, rootPath, name, type);
    return NextResponse.json({ success: true, path: newPath });
  } catch (error) {
    log.error({ error }, 'Create error');
    return mapError(error);
  }
}

/**
 * PUT /api/files/operations
 * Rename a file or folder.
 * Body: { path: string, rootPath: string, newName: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const { path: targetPath, rootPath, newName } = await request.json();

    if (!targetPath || !rootPath || !newName) {
      return NextResponse.json({ error: 'path, rootPath, and newName required' }, { status: 400 });
    }

    const newPath = await fileOpsService.renameFileOrDir(targetPath, rootPath, newName);
    return NextResponse.json({ success: true, newPath });
  } catch (error) {
    log.error({ error }, 'Rename error');
    return mapError(error);
  }
}
