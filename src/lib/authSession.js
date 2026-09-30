import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'cecube_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const getSecret = () => process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.DATABASE_URL || process.env.DIRECT_URL || '';

export function attachAuthSession(response, { type, id }) {
  const secret = getSecret();
  if (!secret || !id || !['admin', 'employee'].includes(type)) return response;
  const payload = Buffer.from(JSON.stringify({ type, id: String(id), exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  response.cookies.set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export function readAuthSession(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = getSecret();
  if (!token || !secret) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let received;
  try { received = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.id || !['admin', 'employee'].includes(session.type) || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch { return null; }
}

export function clearAuthSession(response) {
  response.cookies.set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return response;
}
