import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/visual-library.js';
import records from '../api/library-records.js';
import {OWNER,objectPath} from '../api/_visual-library.js';
import {EXPERIENCE_VERSION} from '../api/visual-library.js';
import fs from 'node:fs';
function res(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(b){this.body=b;return this;},send(b){this.body=b;return this;},end(){return this;},redirect(c,url){this.code=c;this.url=url;return this;}};}
test('private files reject anonymous access before any storage request',async()=>{let calls=0;global.fetch=async()=>{calls++;throw Error();};const r=res();await handler({headers:{},query:{area:'experience',asset:'index.html'},method:'GET'},r);assert.equal(r.code,401);assert.equal(calls,0);});
test('a signed-in staff account does not gain owner access',async()=>{global.fetch=async()=>new Response(JSON.stringify({id:'another-account'}));const r=res();await handler({headers:{authorization:'Bearer other'},query:{},method:'GET'},r);assert.equal(r.code,403);});
test('encoded and traversing paths are rejected',()=>{for(const p of ['../secret','a/../secret','a\\secret','a/%2e%2e/x','/absolute','a//b'])assert.equal(objectPath(p),null);assert.equal(objectPath('models/House 13.glb'),'models/House%2013.glb');});
test('cross-origin cookie session changes are rejected',async()=>{global.fetch=async()=>new Response(JSON.stringify({id:OWNER}));const r=res();await handler({headers:{authorization:'Bearer owner-origin',host:'showroom.test',origin:'https://elsewhere.test'},query:{action:'session'},method:'POST'},r);assert.equal(r.code,403);});
test('owner receives a private short-lived media redirect',async()=>{global.fetch=async url=>new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:OWNER}:{signedURL:'/object/sign/private/model.glb?token=temporary'}));const r=res();await handler({headers:{authorization:'Bearer owner-media'},query:{area:'experience',asset:'model.glb'},method:'GET'},r);assert.equal(r.code,302);assert.match(r.headers['Cache-Control'],/no-store/);assert.match(r.url,/\/storage\/v1\/object\/sign\//);});
test('stale edits return conflict instead of overwriting a newer revision',async()=>{global.fetch=async url=>new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:OWNER}:[]));const r=res();await records({headers:{authorization:'Bearer owner-edit',host:'showroom.test'},query:{},method:'PATCH',body:{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',revision:1,record_id:'test',title:'Original',body:'Text'}},r);assert.equal(r.code,409);});

// The served snapshot version and the storage key it builds must not drift
// apart: a typo in the prefix reads as "nothing has been synced yet", which
// looks exactly like a deploy that has not happened.
test('the experience area is served from the declared snapshot version',async()=>{let key='';global.fetch=async url=>{const u=String(url);if(u.includes('/auth/v1/user'))return new Response(JSON.stringify({id:OWNER}));key=u;return new Response(JSON.stringify({signedURL:'/object/sign/private/model.glb?token=temporary'}));};const r=res();await handler({headers:{authorization:'Bearer owner-version'},query:{area:'experience',asset:'model.glb'},method:'GET'},r);assert.match(EXPERIENCE_VERSION,/^experience-v\d{3}$/);assert.ok(key.includes(`/${EXPERIENCE_VERSION}/model.glb`),`storage key ${key} does not use ${EXPERIENCE_VERSION}`);});

// The sync gate is deliberately version-agnostic while the server above is
// pinned, so a new snapshot can be uploaded and checked BEFORE anyone is
// switched onto it. It must still refuse every other prefix. Read from the
// shipped file rather than a copy, so this cannot pass against stale source.
test('the workspace sync gate accepts any experience version and nothing else',()=>{
  const src=fs.readFileSync(new URL('../workspace.js',import.meta.url),'utf8');
  const literal=src.match(/if\(!(\/\^\(.*?\/)\.test\(f\.path\)/);
  assert.ok(literal,'could not find the sync path gate in workspace.js');
  const gate=new RegExp(literal[1].slice(1,-1));
  for(const ok of ['library-v60/library.html','experience-v054/index.html','experience-v057/index.html','experience-v112/models/a.glb'])
    assert.ok(gate.test(ok),`gate should accept ${ok}`);
  for(const no of ['uploaded/secret.pdf','secret/x','experience-v57/x','experience-vabc/x','experience-v0571/x','experience-v054','../experience-v054/x'])
    assert.ok(!gate.test(no),`gate should reject ${no}`);
  assert.ok(gate.test(`${EXPERIENCE_VERSION}/index.html`),'gate must accept the version actually being served');
});
