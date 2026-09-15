import { createHash } from 'node:crypto';

export const SB = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
export const KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();
export const OWNER = '74ab4fdf-3e78-49a7-8e23-e841408a184d';
export const BUCKET = 'cardinal-visual-workspace';
const verified = new Map();

export function tokenFrom(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)cv-library-session=([^;]+)/);
  try {return match ? decodeURIComponent(match[1]) : '';} catch {return '';}
}

export function headers(token, extra={}) {
  return { apikey:KEY, Authorization:'Bearer '+token, ...extra };
}

export function fail(res,status,message) {
  res.setHeader('Cache-Control','private, no-store');
  return res.status(status).json({error:message});
}

export async function authorize(req,res) {
  const token=tokenFrom(req);
  if (!token) { fail(res,401,'Open this workspace from the Showroom after signing in.'); return null; }
  const digest=createHash('sha256').update(token).digest('hex');
  if ((verified.get(digest)||0)>Date.now()) return token;
  const response=await fetch(SB+'/auth/v1/user',{headers:headers(token)});
  if (!response.ok) { fail(res,401,'Your Library session expired. Reopen it from the Showroom.'); return null; }
  const user=await response.json();
  if (user.id!==OWNER) { fail(res,403,'This workspace is private to the owner.'); return null; }
  if(verified.size>100) verified.clear();
  verified.set(digest,Date.now()+15000);
  return token;
}

export function mutationAllowed(req,res) {
  const origin=req.headers.origin;
  const host=req.headers['x-forwarded-host'] || req.headers.host;
  if(origin) {try {if(new URL(origin).host!==host) throw new Error();}catch{fail(res,403,'Use the Showroom to save changes.');return false;}}
  return true;
}

export function objectPath(value) {
  if(typeof value!=='string' || !value || value.length>500 || value.includes('\\') || /[\x00-\x1f]/.test(value)) return null;
  const parts=value.split('/');
  if(parts.some(x=>!x || x==='.' || x==='..' || x.includes('%'))) return null;
  return parts.map(encodeURIComponent).join('/');
}
