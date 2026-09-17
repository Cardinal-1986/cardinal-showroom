import { SB,BUCKET,headers,authorize,fail,mutationAllowed,objectPath } from './_visual-library.js';

// The Cardinal Experience snapshot this Showroom SERVES. Syncing a newer
// snapshot into Storage does not switch anyone over — that is deliberate, so a
// version can be uploaded and checked before anybody sees it. Bump this one
// line to flip, once the new version is synced and verified.
export const EXPERIENCE_VERSION='experience-v060';
const AREA_PREFIX={library:'library-v60/',experience:`${EXPERIENCE_VERSION}/`,upload:'uploaded/'};

const inlineTypes={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8'};

export default async function handler(req,res) {
  try {
    if(req.method==='DELETE' && req.query.action==='session') {
      if(!mutationAllowed(req,res)) return;
      res.setHeader('Set-Cookie','cv-library-session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
      return res.status(204).end();
    }
    const token=await authorize(req,res); if(!token) return;
    if(req.method==='POST' && req.query.action==='session') {
      if(!mutationAllowed(req,res)) return;
      res.setHeader('Set-Cookie',`cv-library-session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3000`);
      res.setHeader('Cache-Control','private, no-store');
      return res.status(200).json({ready:true});
    }
    if(req.method!=='GET') return fail(res,405,'Method not allowed.');
    const area=['experience','upload'].includes(req.query.area)?req.query.area:'library';
    const asset=String(req.query.asset || (area==='upload'?req.query.key:(area==='library'?'library.html':'index.html')) || '');
    const safe=objectPath(asset); if(!safe) return fail(res,400,'Invalid file path.');
    const key=AREA_PREFIX[area]+safe;
    const ext=asset.split('.').pop().toLowerCase();
    // Small application files keep their Showroom URL so relative imports resolve.
    // Large media goes straight from private Storage to the browser on demand.
    if(area!=='upload' && inlineTypes[ext] && !asset.toLowerCase().includes('resource-inventory.json')) {
      const source=await fetch(`${SB}/storage/v1/object/authenticated/${BUCKET}/${key}`,{headers:headers(token)});
      if(!source.ok) return fail(res,source.status===404?404:502,'This file has not been synced yet, or could not be opened.');
      if(Number(source.headers.get('content-length')||0)>4_000_000) return fail(res,413,'Open this large file as a download.');
      const data=await source.text();
      if(Buffer.byteLength(data)>4_000_000) return fail(res,413,'Open this large file as a download.');
      res.setHeader('Content-Type',inlineTypes[ext]);
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Cache-Control','private, no-store');
      return res.status(200).send(data);
    }
    const response=await fetch(`${SB}/storage/v1/object/sign/${BUCKET}/${key}`,{
      method:'POST',headers:headers(token,{'Content-Type':'application/json'}),body:JSON.stringify({expiresIn:120})
    });
    if(!response.ok) return fail(res,response.status===404?404:502,'This file could not be opened.');
    const result=await response.json();
    if(!result.signedURL?.startsWith('/object/sign/')) return fail(res,502,'Storage did not return a valid file link.');
    res.setHeader('Cache-Control','private, no-store');
    return res.redirect(302,SB+'/storage/v1'+result.signedURL);
  } catch { return fail(res,502,'The private workspace is temporarily unavailable.'); }
}
