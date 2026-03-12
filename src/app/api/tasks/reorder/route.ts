import { NextRequest } from 'next/server';
import { proxyToSdk } from '@/lib/sdk-proxy-to-agentic-backend';

export async function PUT(req: NextRequest) { return proxyToSdk(req, 'PUT'); }
export async function POST(req: NextRequest) { return proxyToSdk(req, 'POST'); }

