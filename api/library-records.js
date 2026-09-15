import { SB,headers,authorize,fail,mutationAllowed } from './_visual-library.js';
const kinds=new Set(['progress','finding','decision','resource','handoff']);

export default async function handler(req,res) {
  try {
    const token=await authorize(req,res); if(!token) return;
    res.setHeader('Cache-Control','private, no-store');
    if(req.method==='GET') {
      if(req.query.history){
        if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(req.query.history)) return fail(res,400,'Invalid record.');
        const r=await fetch(SB+'/rest/v1/visual_library_entry_history?select=revision,snapshot,saved_at&entry_id=eq.'+req.query.history+'&order=revision.desc&limit=100',{headers:headers(token)});
        if(!r.ok) return fail(res,502,'Revisions could not be loaded.');
        return res.status(200).json({history:await r.json()});
      }
      let query='?select=*&order=updated_at.desc&limit=200';
      if(req.query.record) query+='&record_id=eq.'+encodeURIComponent(String(req.query.record));
      const result=await fetch(SB+'/rest/v1/visual_library_entries'+query,{headers:headers(token)});
      if(!result.ok) return fail(res,502,'The shared records could not be loaded.');
      return res.status(200).json({entries:await result.json()});
    }
    if(!['POST','PATCH'].includes(req.method)) return fail(res,405,'Method not allowed.');
    if(!mutationAllowed(req,res)) return;
    const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const data={record_id:String(input?.record_id||'WORLD-CARDINAL-WAY').trim(),title:String(input?.title||'').trim(),body:String(input?.body||'').trim(),kind:input?.kind||'progress',recorded_by:String(input?.recorded_by||'Owner').trim()};
    if(!data.title || data.title.length>200 || !data.body || data.body.length>50000 || !data.record_id || data.record_id.length>120 || !data.recorded_by || data.recorded_by.length>80 || !kinds.has(data.kind)) return fail(res,400,'Add a title and note within the displayed limits.');
    let query='';
    if(req.method==='PATCH') {
      if(!/^[a-f0-9-]{36}$/i.test(input?.id||'') || !Number.isInteger(input?.revision) || input.revision<1) return fail(res,400,'The record version is missing. Reload it before editing.');
      query='?id=eq.'+input.id+'&revision=eq.'+input.revision;
    }
    const result=await fetch(SB+'/rest/v1/visual_library_entries'+query,{method:req.method,headers:headers(token,{'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(data)});
    if(!result.ok) return fail(res,502,'The record could not be saved. Your text is still here.');
    const entries=await result.json();
    if(!entries.length) return fail(res,409,'Someone updated this record. Reload it before saving your revision.');
    return res.status(req.method==='POST'?201:200).json({entry:entries[0]});
  } catch { return fail(res,502,'The shared records are temporarily unavailable.'); }
}
