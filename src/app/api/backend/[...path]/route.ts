import { NextRequest, NextResponse } from 'next/server';

const productionBackendOrigin = 'https://birjoy-backend.onrender.com';

function normalizeBaseUrl(value: string | undefined) {
  return value?.replace(/\/$/, '') || '';
}

function resolveBackendOrigin() {
  return (
    normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ||
    productionBackendOrigin
  );
}

function buildTargetUrl(pathSegments: string[], request: NextRequest) {
  const backendOrigin = resolveBackendOrigin();
  const targetPath = pathSegments.join('/');
  const targetUrl = new URL(`${backendOrigin}/api/${targetPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  return targetUrl;
}

function filterRequestHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);

  nextHeaders.delete('host');
  nextHeaders.delete('connection');
  nextHeaders.delete('content-length');
  nextHeaders.delete('accept-encoding');
  nextHeaders.delete('x-forwarded-host');
  nextHeaders.delete('x-forwarded-port');
  nextHeaders.delete('x-forwarded-proto');

  return nextHeaders;
}

function filterResponseHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);

  nextHeaders.delete('content-encoding');
  nextHeaders.delete('transfer-encoding');
  nextHeaders.delete('content-length');

  return nextHeaders;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path = [] } = await context.params;
  const targetUrl = buildTargetUrl(path, request);

  try {
    const body =
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: filterRequestHeaders(request.headers),
      body,
      cache: 'no-store',
      redirect: 'follow',
    });

    const responseHeaders = filterResponseHeaders(response.headers);
    const responseBody = await response.arrayBuffer();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'The backend request could not be completed.';

    return NextResponse.json(
      {
        message: `Backend proxy request failed: ${message}`,
      },
      {
        status: 502,
      }
    );
  }
}

export const dynamic = 'force-dynamic';

export { proxyRequest as GET };
export { proxyRequest as POST };
export { proxyRequest as PUT };
export { proxyRequest as PATCH };
export { proxyRequest as DELETE };
export { proxyRequest as OPTIONS };
