import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { createFileOperationsService } from '@agentic-sdk/services/files/operations-and-upload';

const log = createLogger('FileUpload');
const fileOpsService = createFileOperationsService();

/**
 * POST /api/files/upload
 * Upload files to a directory, with optional archive extraction.
 *
 * FormData:
 * - files: File[] - files to upload
 * - targetPath: string - destination directory
 * - rootPath: string - root path for security validation
 * - decompress: 'true' | 'false' - whether to extract archives
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const targetPath = formData.get('targetPath') as string;
    const rootPath = formData.get('rootPath') as string;
    const decompress = formData.get('decompress') === 'true';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!targetPath || !rootPath) {
      return NextResponse.json({ error: 'targetPath and rootPath are required' }, { status: 400 });
    }

    // Convert File objects to buffers for the SDK service
    const fileData = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      }))
    );

    const results = await fileOpsService.uploadFiles(targetPath, rootPath, fileData, decompress);
    return NextResponse.json({ success: true, files: results });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Path traversal detected') {
        return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
      }
      if (error.message === 'Target directory not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === 'Target path is not a directory') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if ('code' in error && (error as NodeJS.ErrnoException).code === 'EACCES') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    log.error({ error }, 'Upload error');
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}
