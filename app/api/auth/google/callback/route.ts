import { db } from '../../../../../lib/db';
import { issue } from '../../../../../lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const url = new URL(req.url), code = url.searchParams.get('code'), state = url.searchParams.get('state');
  const stored = req.cookies.get('google_oauth_state')?.value;
  if (!code || !state || state !== stored) return NextResponse.redirect(new URL('/login?error=google_state', url));
  try {
    const token = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: `${url.origin}/api/auth/google/callback`, grant_type: 'authorization_code' }) }).then((r) => r.json());
    if (!token.access_token) throw new Error('No Google access token');
    const profile = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } }).then((r) => r.json());
    if (!profile.sub || !profile.email) throw new Error('No Google profile');
    const user = await db.user.upsert({ where: { email: profile.email.toLowerCase() }, update: { googleId: profile.sub, name: profile.name || profile.email, avatarUrl: profile.picture, emailVerifiedAt: profile.email_verified ? new Date() : undefined }, create: { email: profile.email.toLowerCase(), googleId: profile.sub, name: profile.name || profile.email, avatarUrl: profile.picture, emailVerifiedAt: profile.email_verified ? new Date() : null, role: 'TENANT' } });
    const session = await issue(user);
    const res = NextResponse.redirect(new URL('/', url));
    res.cookies.set('singlerents_session', session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 604800, path: '/' });
    res.cookies.set('google_oauth_state', '', { expires: new Date(0), path: '/' });
    return res;
  } catch { return NextResponse.redirect(new URL('/login?error=google', url)); }
}
