import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { poolProjects } from '@/lib/db/schema';

type Context = {
  params: Promise<{ projectId: string; path?: string[] }>;
};

async function proxyToProject(request: NextRequest, context: Context) {
  const { projectId, path = [] } = await context.params;

  const project = await db.query.poolProjects.findFirst({
    where: eq(poolProjects.id, projectId),
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.status !== 'allocated' || !project.containerPort) {
    return NextResponse.json({ error: 'Project is not active' }, { status: 409 });
  }

  const upstreamPath = path.length > 0 ? `/${path.join('/')}` : '/';
  const upstreamUrl = new URL(`http://127.0.0.1:${project.containerPort}${upstreamPath}`);
  upstreamUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const shouldHaveBody = request.method !== 'GET' && request.method !== 'HEAD';
  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: shouldHaveBody ? request.body : undefined,
    duplex: shouldHaveBody ? 'half' : undefined,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: Context) {
  return proxyToProject(request, context);
}

export async function POST(request: NextRequest, context: Context) {
  return proxyToProject(request, context);
}

export async function PUT(request: NextRequest, context: Context) {
  return proxyToProject(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return proxyToProject(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return proxyToProject(request, context);
}

export async function OPTIONS(request: NextRequest, context: Context) {
  return proxyToProject(request, context);
}
