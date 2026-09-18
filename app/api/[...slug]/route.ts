import { NextRequest } from 'next/server';
import { handleDynamicProtectedRequest } from '@/lib/services/dynamicRouteHandler';
import { createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';

interface RouteContext {
  params: Promise<{ slug: string[] }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return handleDynamicProtectedRequest(req, slug);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return handleDynamicProtectedRequest(req, slug);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return handleDynamicProtectedRequest(req, slug);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return handleDynamicProtectedRequest(req, slug);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return handleDynamicProtectedRequest(req, slug);
}

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}
