"use client";

import { useEffect, useState } from "react";

interface Definition {
  persona?: "formal" | "casual" | "technical"; name: string; welcome: string; instructions: string; accent: string;
  position: "left" | "right"; fallback: string; temperature: number; max_tokens: number;
  starters: string[]; rules: string[]; chunks: {title:string; text:string; thumbnail?:string}[];
}
interface Entry { id:string; name:string }
const initial: Definition = {name:"My assistant", welcome:"How can I help?", instructions:"Answer clearly using the supplied knowledge.", accent:"#e6e4f0", position:"right", fallback:"Please try again or contact support.", temperature:0.3, max_tokens:600, starters:[], rules:[], chunks:[]};
async function api<T>(path:string, method="GET", value?:unknown): Promise<T> {
  const response = await fetch("/api/studio"+path, {method, cache:"no-store", headers:{"Content-Type":"application/json"}, body:value === undefined ? undefined : JSON.stringify(value)});
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not complete the request. Check the configuration.");
  return data as T;
}
export default function Studio() {
  const [entries,list]=useState<Entry[]>([]), [id,select]=useState(""), [cfg,set]=useState(initial);
  const [message,ask]=useState(""), [answer,reply]=useState(""), [notice,status]=useState(""), [busy,lock]=useState(false);
  const [raw,code]=useState<string|null>(null), [key,showKey]=useState("");
  useEffect(()=>{api<Entry[]>("").then(list).catch(e=>status(String(e)))},[]);
  async function run(task:()=>Promise<void>) {lock(true);status("");try{await task()}catch(e){status(e instanceof Error?e.message:String(e))}finally{lock(false)}}
  function update<K extends keyof Definition>(field:K,value:Definition[K]){set({...cfg,[field]:value})}
  async function save(){
    const data:unknown=raw===null?cfg:JSON.parse(raw);
    const item=await api<{id:string}>(id?"/"+id:"",id?"PUT":"POST",data);
    select(item.id);set(await api<Definition>("/"+item.id));code(null);list(await api<Entry[]>(""));return item.id;
  }
  async function ingest(files: File[]) {
    const failures: string[] = [];
    for (const file of files) {
      try {
      if (file.size > 2000000) throw Error("Choose files smaller than 2 MB");
      const content = await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onerror=()=>reject(Error("Unable to read file"));
        reader.onload=()=>resolve(String(reader.result).split(",")[1] ?? "");
        reader.readAsDataURL(file);
      });
      const chunks = await api<Definition["chunks"]>("/import","POST",{filename:file.name,content});
      set(previous => ({...previous, chunks:[...previous.chunks,...chunks]}));
      } catch (error) { failures.push(file.name + ": " + (error instanceof Error ? error.message : "Import failed")); }
    }

    if (failures.length) throw Error(failures.join("; "));
  }
  const [skillURL,setSkillURL]=useState("");
  const field="w-full rounded-lg bg-[#1c1c21] p-3 text-sm";
  const button="rounded-lg bg-[#1c1c21] px-3 py-2 text-sm";
  return <main className="min-h-screen bg-[#0c0c0e] p-4 text-[#f4f3f8] sm:p-8" style={{fontFamily:"'Plus Jakarta Sans','Google Sans',sans-serif",fontStyle:"normal"}}>
    <a href="/">← Chat and Agent</a><h1 className="my-5 text-2xl font-semibold">Make Your Own Assistant</h1>
    <fieldset disabled={busy} className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl bg-[#141417] p-4">
        <select aria-label="Assistant" className={field} value={id} onChange={e=>{const value=e.target.value;void run(async()=>{const next=value?await api<Definition>("/"+value):initial;select(value);set(next);code(null);showKey("");reply("")})}}>
          <option value="">New assistant</option>{entries.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button className={button} onClick={()=>code(raw===null?JSON.stringify(cfg,null,2):null)}>{raw===null?"Edit JSON":"Discard JSON edits"}</button>
        {raw!==null?<textarea aria-label="Assistant configuration JSON" className={field} rows={22} value={raw} onChange={e=>code(e.target.value)}/>:<>
          {(["name","welcome","instructions","fallback"] as const).map(k=><label className="block capitalize" key={k}>{k}<textarea className={field} rows={k==="instructions"?3:1} value={cfg[k]} onChange={e=>update(k,e.target.value)}/></label>)}
          <label className="block">Assistant persona<select className={field} value={cfg.persona || "formal"} onChange={e=>update("persona",e.target.value as Definition["persona"])}><option value="formal">Formal</option><option value="casual">Casual</option><option value="technical">Technical</option></select></label>
          <label>Widget accent <input type="color" value={cfg.accent} onChange={e=>update("accent",e.target.value)}/></label>
          <label className="block">Conversation starters (one per line)<textarea className={field} value={cfg.starters.join("\n")} onChange={e=>update("starters",e.target.value.split("\n"))}/></label>
          <label className="block">Behavior rules and skills (one per line)<textarea className={field} value={cfg.rules.join("\n")} onChange={e=>update("rules",e.target.value.split("\n"))}/></label>
          <label className="block">Import skill instructions from GitHub
            <input className={field} type="url" placeholder="https://raw.githubusercontent.com/owner/repo/ref/SKILL.md" value={skillURL} onChange={e=>setSkillURL(e.target.value)}/></label>
          <button className={button} onClick={()=>void run(async()=>{
            const url=new URL(skillURL);
            if(url.origin!=="https://raw.githubusercontent.com" || !url.pathname.endsWith(".md")) throw Error("Use a public raw GitHub Markdown URL.");
            const response=await fetch(url,{credentials:"omit",redirect:"error",signal:AbortSignal.timeout(10000)});
            if(!response.ok) throw Error("Could not read skill.");
            const body=await response.blob();
            if(body.size>8000) throw Error("Skill must fit within 8,000 bytes.");
            const text=await body.text();const merged=[cfg.instructions,text].filter(Boolean).join("\n").trim();if(merged.length>8000) throw Error("Shorten the existing instructions before importing this skill.");update("instructions",merged);status("Review the imported instructions before saving.");
          })}>Import instructions</button>
          <label className="block">Temperature {cfg.temperature}<input type="range" min="0" max="2" step=".1" value={cfg.temperature} onChange={e=>update("temperature",Number(e.target.value))}/></label>
          <label className="block">Response token budget<input type="number" min="32" max="4096" className={field} value={cfg.max_tokens} onChange={e=>update("max_tokens",Number(e.target.value))}/></label>
          <h2>Knowledge</h2>
          <label className="block rounded-lg bg-[#1c1c21] p-4" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)void run(()=>ingest(Array.from(e.dataTransfer.files)))}}>
            Drop documents here or choose files
            <input type="file" accept=".txt,.md,.csv,.xlsx,.pdf,.docx,.png,.jpg,.jpeg,.webp" multiple onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value="";void run(()=>ingest(files))}}/>
          </label>
          {cfg.chunks.map((c,i)=><div key={i}><strong>{c.title}</strong>{c.thumbnail && <img src={"data:image/jpeg;base64,"+c.thumbnail} alt={c.title} className="my-2 max-h-36 max-w-full rounded-lg"/>}<textarea className={field} aria-label={c.title} value={c.text} onChange={e=>update("chunks",cfg.chunks.map((x,j)=>j===i?{...c,text:e.target.value}:x))}/>
          <button className={button} disabled={!i} onClick={()=>{const items=[...cfg.chunks];[items[i-1],items[i]]=[items[i]!,items[i-1]!];update("chunks",items)}}>Move up</button> <button className={button} onClick={()=>update("chunks",cfg.chunks.filter((_,j)=>i!==j))}>Remove</button></div>)}
        </>}
        <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>void run(async()=>{await save();status("Saved")})}>Save assistant</button>
        <button className={button} onClick={()=>void run(async()=>{const blob=new Blob([JSON.stringify(raw===null?cfg:JSON.parse(raw),null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="assistant.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)})}>Export JSON</button>
        {id&&<button className={button} onClick={()=>void run(async()=>{if(!confirm("Replace the existing chat API key?"))return;showKey((await api<{key:string}>("/"+id+"/key","POST")).key)})}>Generate chat key</button>}
        {id&&<button className={button} onClick={()=>void run(async()=>{if(!confirm("Revoke chat API access for this assistant?"))return;await api("/"+id+"/key","DELETE");showKey("");status("Chat key revoked")})}>Revoke chat key</button>}
        {id&&<button className={button} onClick={()=>void run(async()=>{if(!confirm("Delete this assistant and its knowledge?"))return;await api("/"+id,"DELETE");select("");set(initial);code(null);reply("");showKey("");list(await api<Entry[]>(""))})}>Delete assistant</button>}</div>
        {key&&<code className="block break-all">{key}</code>}
      </section>
      <section className="lg:sticky lg:top-6 self-start space-y-4 rounded-xl bg-[#141417] p-4"><h2 style={{color:cfg.accent}}>{cfg.name}</h2><p>{cfg.welcome}</p>
        {cfg.starters.map((s,i)=><button key={i} className={button} onClick={()=>ask(s)}>{s}</button>)}
        <textarea aria-label="Sandbox question" className={field} value={message} onChange={e=>ask(e.target.value)}/>
        <button className={button} disabled={!message.trim()} onClick={()=>void run(async()=>{const active=await save();const result=await api<{answer:string;sources:string[]}>("/"+active+"/chat","POST",{message});reply([result.answer,...result.sources].join("\n"))})}>Save and test</button><p className="whitespace-pre-wrap" aria-live="polite">{answer}</p></section>
    </fieldset><p role="status" className="mt-3">{busy?"Working…":notice}</p></main>;
}
