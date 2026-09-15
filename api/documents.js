import {SB,headers,authorize,fail} from './_visual-library.js';
export default async function handler(req,res){
 try{const token=await authorize(req,res);if(!token)return;
  if(req.method!=='GET')return fail(res,405,'Upload documents through the Library form.');
  const r=await fetch(SB+'/rest/v1/visual_library_documents?select=document&order=created_at.desc&limit=1000',{headers:headers(token)});
  if(!r.ok)return fail(res,502,'Documents could not be loaded.');
  res.setHeader('Cache-Control','private, no-store');
  return res.status(200).json({documents:(await r.json()).map(x=>x.document)});
 }catch{return fail(res,502,'Documents are temporarily unavailable.');}
}
