'use client'

import { useState, useEffect, useCallback, useRef } from "react";

const PARENT_ID = "5d80c89b9beb2be790fcb2af9b5558d5965ef7bd1c45a0908222011ec8addadei0";
const ORDINALS_BASE = "https://ordinals.com";
const DEFAULT_COLOR = "#39ff14";

const HEADER_ART = `████████╗██╗   ██╗██╗     ██╗██████╗      ██████╗  █████╗ ██████╗ ██████╗ ███████╗███╗   ██╗
╚══██╔══╝██║   ██║██║     ██║██╔══██╗    ██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║
   ██║   ██║   ██║██║     ██║██████╔╝    ██║  ███╗███████║██████╔╝██║  ██║█████╗  ██╔██╗ ██║
   ██║   ██║   ██║██║     ██║██╔═══╝     ██║   ██║██╔══██║██╔══██╗██║  ██║██╔══╝  ██║╚██╗██║
   ██║   ╚██████╔╝███████╗██║██║         ╚██████╔╝██║  ██║██║  ██║██████╔╝███████╗██║ ╚████║
   ╚═╝    ╚═════╝ ╚══════╝╚═╝╚═╝          ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝`;

const MINI_TULIP = `   _\n  (v)\n   |\n  \\|/`;
const DEFAULT_TULIP = `   _\n  (v)\n   |\n  \\|/`;

const MARKETPLACES = [
  { id: "ordinalsbot", name: "OrdinalsBot", url: "https://ordinalsbot.com", inscribeUrl: "https://token.ordinalsbot.com/products/inscriptions", parentChild: true, difficulty: "EASY", notes: "Best UI for parent-child. Upload file + metadata separately, P/C field built in.", status: "active" },
  { id: "unisat", name: "UniSat", url: "https://unisat.io", inscribeUrl: "https://unisat.io/inscribe", parentChild: true, difficulty: "EASY", notes: "Popular wallet + inscriber. Supports P/C.", status: "active" },
  { id: "gamma", name: "Gamma.io", url: "https://gamma.io", inscribeUrl: "https://gamma.io/inscribe", parentChild: true, difficulty: "EASY", notes: "Clean UI, launchpad-style. Good for collections.", status: "active" },
  { id: "orddropz", name: "OrdDropz", url: "https://ord-dropz.xyz", inscribeUrl: "https://ord-dropz.xyz", parentChild: true, difficulty: "MEDIUM", notes: "Launchpad-focused. Good for collections with provenance handled at mint.", status: "active" },
  { id: "magiceden", name: "Magic Eden", url: "https://magiceden.io", inscribeUrl: null, parentChild: false, difficulty: "N/A", notes: "Sunsetting Ordinals support. Use other tools.", status: "sunset" },
  { id: "ord", name: "ord CLI", url: "https://github.com/ordinals/ord", inscribeUrl: "https://docs.ordinals.com", parentChild: true, difficulty: "ADVANCED", notes: "Official tool by Casey Rodarmor. Requires running your own Bitcoin node.", status: "active" },
];

const POLL_KEY = "tulip_garden_poll_vote";

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function ScanlineOverlay() {
  return <div style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999,background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)" }} />;
}

function Cursor() {
  const [vis,setVis] = useState(true);
  useEffect(()=>{ const t=setInterval(()=>setVis(v=>!v),530); return ()=>clearInterval(t); },[]);
  return <span style={{opacity:vis?1:0,color:"#39ff14"}}>█</span>;
}

function TulipCard({ id, index, content, artist, tulipNum, color, epitaph }) {
  const [visible,setVisible] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVisible(true),index*120); return ()=>clearTimeout(t); },[index]);
  const c = color || DEFAULT_COLOR;
  const rgb = hexToRgb(c);
  const shortId = id ? `${id.slice(0,8)}...${id.slice(-4)}` : "???";
  return (
    <div style={{ border:`1px solid ${c}40`, padding:"16px", fontFamily:"monospace", transition:"all 0.6s ease", opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)", background:`rgba(${rgb},0.04)`, position:"relative" }}>
      <span style={{position:"absolute",top:4,left:4,color:`${c}80`,fontSize:10}}>┌</span>
      <span style={{position:"absolute",top:4,right:4,color:`${c}80`,fontSize:10}}>┐</span>
      <span style={{position:"absolute",bottom:4,left:4,color:`${c}80`,fontSize:10}}>└</span>
      <span style={{position:"absolute",bottom:4,right:4,color:`${c}80`,fontSize:10}}>┘</span>
      <div style={{color:`${c}80`,fontSize:10,marginBottom:8,letterSpacing:2}}>TULIP #{tulipNum!==undefined?String(tulipNum).padStart(3,"0"):String(index).padStart(3,"0")}</div>
      <pre style={{color:c,fontSize:14,lineHeight:1.2,margin:"0 0 12px 0",textShadow:`0 0 8px rgba(${rgb},0.6)`,minHeight:60}}>{content||MINI_TULIP}</pre>
      <div style={{color:`${c}30`,fontSize:10,marginBottom:8}}>{"⸜".repeat(12)}</div>
      {artist && <div style={{color:c,fontSize:11,opacity:0.7,marginBottom:4}}>ARTIST: <span style={{opacity:1}}>{artist}</span></div>}
      {epitaph && <div style={{color:`${c}90`,fontSize:10,fontStyle:"italic",marginBottom:8}}>"{epitaph}"</div>}
      <a href={`${ORDINALS_BASE}/inscription/${id}`} target="_blank" rel="noopener noreferrer" style={{color:`${c}50`,fontSize:9,textDecoration:"none",wordBreak:"break-all",display:"block"}}>{shortId}</a>
    </div>
  );
}

function GrowingField({ tulips }) {
  return (
    <div style={{fontFamily:"monospace",padding:"20px 0",overflowX:"auto"}}>
      <style>{`@keyframes grow{from{opacity:0;transform:scaleY(0.2) translateY(20px);transform-origin:bottom}to{opacity:1;transform:scaleY(1) translateY(0);transform-origin:bottom}}`}</style>
      <div style={{display:"flex",alignItems:"flex-end",gap:6,minWidth:"max-content",padding:"0 20px"}}>
        {tulips.map((t,i)=>{
          const c = t.color||DEFAULT_COLOR;
          const rgb = hexToRgb(c);
          return (
            <div key={t.id||i} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <pre style={{color:c,fontSize:12,lineHeight:1.1,margin:0,textShadow:`0 0 6px rgba(${rgb},0.6)`,animation:`grow 0.8s ease ${i*0.15}s both`,whiteSpace:"pre"}}>{t.content||MINI_TULIP}</pre>
              <div style={{color:`${c}70`,fontSize:9,marginTop:2}}>#{t.tulipNum!==undefined?t.tulipNum:i}</div>
            </div>
          );
        })}
        {tulips.length===0 && <div style={{color:"#1a5a1a",fontSize:12}}>no blooms yet... be the first</div>}
      </div>
      <div style={{color:"#0d3d0d",fontSize:12,letterSpacing:2,marginTop:4,paddingLeft:20}}>{"⣿".repeat(Math.min(60,20+tulips.length*2))}</div>
    </div>
  );
}

function TimelineMode({ tulips }) {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState("in"); // "in" | "hold" | "out"
  const timerRef = useRef(null);

  useEffect(() => {
    if (tulips.length === 0) return;
    const cycle = () => {
      setPhase("in");
      timerRef.current = setTimeout(() => {
        setPhase("hold");
        timerRef.current = setTimeout(() => {
          setPhase("out");
          timerRef.current = setTimeout(() => {
            setCurrent(c => (c + 1) % tulips.length);
          }, 1200);
        }, 4000);
      }, 1200);
    };
    cycle();
    return () => clearTimeout(timerRef.current);
  }, [current, tulips.length]);

  if (tulips.length === 0) return (
    <div style={{textAlign:"center",color:"#1a6a1a",padding:60,fontFamily:"monospace"}}>THE SOIL IS READY. NO TULIPS YET. <Cursor /></div>
  );

  const t = tulips[current];
  const c = t.color || DEFAULT_COLOR;
  const rgb = hexToRgb(c);
  const opacity = phase === "hold" ? 1 : 0;
  const translateY = phase === "hold" ? 0 : phase === "in" ? 30 : -30;

  return (
    <div style={{minHeight:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"monospace",position:"relative",overflow:"hidden"}}>
      {/* Ambient glow */}
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,rgba(${rgb},0.06) 0%,transparent 70%)`,transition:"background 1.2s ease",pointerEvents:"none"}} />

      <div style={{transition:"opacity 1.2s ease, transform 1.2s ease",opacity,transform:`translateY(${translateY}px)`,textAlign:"center",zIndex:1,padding:"0 40px",maxWidth:500}}>
        {/* Tulip number */}
        <div style={{color:`${c}60`,fontSize:11,letterSpacing:4,marginBottom:20}}>
          TULIP #{t.tulipNum!==undefined?String(t.tulipNum).padStart(3,"0"):String(current).padStart(3,"0")} · {current+1} OF {tulips.length}
        </div>

        {/* The art */}
        <pre style={{color:c,fontSize:18,lineHeight:1.3,margin:"0 auto 24px",display:"inline-block",textAlign:"left",textShadow:`0 0 20px rgba(${rgb},0.8)`,whiteSpace:"pre"}}>
          {t.content || MINI_TULIP}
        </pre>

        {/* Divider */}
        <div style={{color:`${c}30`,fontSize:12,margin:"0 0 20px",letterSpacing:3}}>{"— ⸻ —"}</div>

        {/* Artist */}
        {t.artist && (
          <div style={{color:`${c}90`,fontSize:13,letterSpacing:2,marginBottom:12}}>{t.artist}</div>
        )}

        {/* Epitaph */}
        {t.epitaph && (
          <div style={{color:c,fontSize:12,fontStyle:"italic",lineHeight:1.8,marginBottom:16,opacity:0.85}}>
            "{t.epitaph}"
          </div>
        )}

        {/* Timestamp-style inscription ID */}
        <div style={{color:`${c}30`,fontSize:9,letterSpacing:1,marginTop:8}}>
          <a href={`${ORDINALS_BASE}/inscription/${t.id}`} target="_blank" rel="noopener noreferrer" style={{color:`${c}30`,textDecoration:"none"}}>{t.id?.slice(0,16)}...</a>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{position:"absolute",bottom:20,display:"flex",gap:8}}>
        {tulips.map((_,i)=>(
          <div key={i} onClick={()=>{clearTimeout(timerRef.current);setCurrent(i);}} style={{width:i===current?20:6,height:6,background:i===current?(tulips[i].color||DEFAULT_COLOR):"#1a4a1a",borderRadius:3,cursor:"pointer",transition:"all 0.4s ease"}} />
        ))}
      </div>

      {/* Manual nav */}
      <div style={{position:"absolute",bottom:20,right:24,display:"flex",gap:8}}>
        <button onClick={()=>{clearTimeout(timerRef.current);setCurrent(c=>(c-1+tulips.length)%tulips.length);}} style={{background:"transparent",border:"1px solid #1a4a1a",color:"#1a6a1a",padding:"4px 10px",cursor:"pointer",fontFamily:"monospace",fontSize:11}}>◀</button>
        <button onClick={()=>{clearTimeout(timerRef.current);setCurrent(c=>(c+1)%tulips.length);}} style={{background:"transparent",border:"1px solid #1a4a1a",color:"#1a6a1a",padding:"4px 10px",cursor:"pointer",fontFamily:"monospace",fontSize:11}}>▶</button>
      </div>
    </div>
  );
}

function TulipWorkshop({ nextTulipNum }) {
  const [tulipArt,setTulipArt] = useState(DEFAULT_TULIP);
  const [artistName,setArtistName] = useState("");
  const [tulipNum,setTulipNum] = useState(nextTulipNum);
  const [epitaph,setEpitaph] = useState("");
  const [color,setColor] = useState("#39ff14");
  const [copied,setCopied] = useState("");
  useEffect(()=>{setTulipNum(nextTulipNum);},[nextTulipNum]);

  const jsonContent = JSON.stringify({
    collection:"Tulip Garden",
    tulip_number:tulipNum,
    artist:artistName||"yourname",
    ...(color&&color!=="#39ff14"?{color}:{}),
    ...(epitaph?{epitaph}:{}),
  },null,2);

  const downloadFile=(content,filename)=>{
    const blob=new Blob([content],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=filename;a.click();
    URL.revokeObjectURL(url);
  };

  const copy=(text,label)=>{
    navigator.clipboard.writeText(text).then(()=>{setCopied(label);setTimeout(()=>setCopied(""),2000);});
  };

  const mono={fontFamily:"monospace"};
  const box={border:"1px solid #1a4a1a",background:"rgba(57,255,20,0.03)"};
  const lbl={color:"#1a8a1a",fontSize:10,letterSpacing:2,marginBottom:8,display:"block"};
  const btn=(hi)=>({background:hi?"rgba(57,255,20,0.12)":"transparent",border:`1px solid ${hi?"#39ff14":"#1a4a1a"}`,color:hi?"#39ff14":"#1a6a1a",padding:"6px 12px",cursor:"pointer",...mono,fontSize:10,letterSpacing:1});

  const previewColor = color || DEFAULT_COLOR;
  const previewRgb = hexToRgb(previewColor);

  return (
    <div style={{marginBottom:36}}>
      <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:8}}>✦ TULIP WORKSHOP</div>
      <div style={{color:"#1a6a1a",fontSize:11,marginBottom:16,lineHeight:1.8}}>Design your tulip and preview exactly how it renders before spending sats.</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        {/* Editor */}
        <div>
          <span style={lbl}>// DRAW YOUR TULIP (spaces only)</span>
          <div style={box}>
            <textarea value={tulipArt} onChange={e=>setTulipArt(e.target.value)} spellCheck={false}
              style={{...mono,width:"100%",height:160,background:"transparent",color:"#39ff14",border:"none",padding:"12px",fontSize:13,lineHeight:1.4,resize:"vertical",outline:"none",whiteSpace:"pre",overflowWrap:"normal",overflow:"auto"}} />
          </div>
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            <button style={btn(false)} onClick={()=>setTulipArt(DEFAULT_TULIP)}>↺ RESET</button>
            <button style={btn(false)} onClick={()=>copy(tulipArt,"art")}>{copied==="art"?"✓ COPIED":"⎘ COPY"}</button>
            <button style={btn(true)} onClick={()=>downloadFile(tulipArt,`tulip${tulipNum}.txt`)}>↓ tulip{tulipNum}.txt</button>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <span style={lbl}>// LIVE PREVIEW</span>
          <div style={{border:`1px solid ${previewColor}40`,padding:"16px",minHeight:160,position:"relative",background:`rgba(${previewRgb},0.03)`}}>
            <span style={{position:"absolute",top:4,left:4,color:`${previewColor}60`,fontSize:9}}>┌</span>
            <span style={{position:"absolute",top:4,right:4,color:`${previewColor}60`,fontSize:9}}>┐</span>
            <span style={{position:"absolute",bottom:4,left:4,color:`${previewColor}60`,fontSize:9}}>└</span>
            <span style={{position:"absolute",bottom:4,right:4,color:`${previewColor}60`,fontSize:9}}>┘</span>
            <div style={{color:`${previewColor}70`,fontSize:9,letterSpacing:2,marginBottom:8}}>TULIP #{String(tulipNum).padStart(3,"0")}</div>
            <pre style={{...mono,color:previewColor,fontSize:14,lineHeight:1.3,margin:0,textShadow:`0 0 8px rgba(${previewRgb},0.6)`,whiteSpace:"pre"}}>{tulipArt||" "}</pre>
            <div style={{color:`${previewColor}30`,fontSize:10,marginTop:8}}>{"⸜".repeat(12)}</div>
            {artistName&&<div style={{color:`${previewColor}90`,fontSize:10,marginTop:4}}>{artistName}</div>}
            {epitaph&&<div style={{color:`${previewColor}70`,fontSize:10,fontStyle:"italic",marginTop:4}}>"{epitaph}"</div>}
          </div>
          <div style={{color:"#1a6a1a",fontSize:10,marginTop:6}}>↑ live preview with your chosen color</div>
        </div>
      </div>

      {/* Metadata fields */}
      <div style={{...box,padding:16,marginBottom:12}}>
        <span style={lbl}>// GENERATE METADATA FILE</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <div style={{color:"#1a6a1a",fontSize:10,marginBottom:6}}>ARTIST NAME</div>
            <input type="text" value={artistName} onChange={e=>setArtistName(e.target.value)} placeholder="yourname"
              style={{...mono,background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",color:"#39ff14",padding:"8px 10px",fontSize:12,width:"100%",outline:"none"}} />
          </div>
          <div>
            <div style={{color:"#1a6a1a",fontSize:10,marginBottom:6}}>TULIP NUMBER <span style={{color:"#0d4a0d"}}>(next: {nextTulipNum})</span></div>
            <input type="number" value={tulipNum} onChange={e=>setTulipNum(parseInt(e.target.value)||0)} min={0}
              style={{...mono,background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",color:"#39ff14",padding:"8px 10px",fontSize:12,width:"100%",outline:"none"}} />
          </div>
        </div>

        {/* Color picker */}
        <div style={{marginBottom:12}}>
          <div style={{color:"#1a6a1a",fontSize:10,marginBottom:6}}>FLOWER COLOR <span style={{color:"#0d4a0d"}}>(optional — hex code)</span></div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)}
              style={{width:40,height:36,border:"1px solid #1a4a1a",background:"transparent",cursor:"pointer",padding:2}} />
            <input type="text" value={color} onChange={e=>setColor(e.target.value)} placeholder="#39ff14"
              style={{...mono,background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",color,padding:"8px 10px",fontSize:12,width:120,outline:"none"}} />
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["#ff6b9d","#00d4ff","#ffaa00","#a855f7","#ff4444","#39ff14","#ffffff"].map(c=>(
                <div key={c} onClick={()=>setColor(c)} style={{width:20,height:20,background:c,cursor:"pointer",border:color===c?"2px solid white":"1px solid #1a4a1a",borderRadius:2}} />
              ))}
            </div>
          </div>
        </div>

        {/* Epitaph */}
        <div style={{marginBottom:14}}>
          <div style={{color:"#1a6a1a",fontSize:10,marginBottom:6}}>EPITAPH <span style={{color:"#0d4a0d"}}>(optional — your words, forever on Bitcoin)</span></div>
          <input type="text" value={epitaph} onChange={e=>setEpitaph(e.target.value)} placeholder="here bloomed a builder"
            style={{...mono,background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",color:"#7fff7f",padding:"8px 10px",fontSize:12,width:"100%",outline:"none",fontStyle:"italic"}} />
        </div>

        <pre style={{...mono,background:"rgba(0,0,0,0.3)",border:"1px solid #0d3d0d",padding:"10px 14px",fontSize:12,color:"#7fff7f",marginBottom:10,lineHeight:1.7}}>{jsonContent}</pre>
        <div style={{display:"flex",gap:8}}>
          <button style={btn(false)} onClick={()=>copy(jsonContent,"json")}>{copied==="json"?"✓ COPIED":"⎘ COPY JSON"}</button>
          <button style={btn(true)} onClick={()=>downloadFile(jsonContent,`tulip${tulipNum}.json`)}>↓ tulip{tulipNum}.json</button>
        </div>
      </div>

      <div style={{border:"1px solid #1a4a1a",background:"rgba(57,255,20,0.02)",padding:"12px 16px"}}>
        <div style={{color:"#1a8a1a",fontSize:10,letterSpacing:2,marginBottom:6}}>// CHECKLIST BEFORE INSCRIBING</div>
        <div style={{color:"#1a6a1a",fontSize:11,lineHeight:2.3,...mono}}>
          ☐ Preview looks correct above<br/>
          ☐ Spaces used (not tabs)<br/>
          ☐ Both files downloaded: <span style={{color:"#7fff7f"}}>tulip{tulipNum}.txt</span> and <span style={{color:"#7fff7f"}}>tulip{tulipNum}.json</span><br/>
          ☐ Artist name + epitaph filled in (optional but forever)<br/>
          ☐ Tulip number confirmed
        </div>
      </div>
    </div>
  );
}

function MarketplacePoll() {
  const [votes,setVotes] = useState(()=>{const i={};MARKETPLACES.filter(m=>m.status==="active").forEach(m=>{i[m.id]=0;});return i;});
  const [userVote,setUserVote] = useState(null);
  const [loaded,setLoaded] = useState(false);
  useEffect(()=>{
    try{
      const sv=localStorage.getItem("tg_poll_votes");
      const uv=localStorage.getItem(POLL_KEY);
      if(sv)setVotes(JSON.parse(sv));
      if(uv)setUserVote(uv);
    }catch{}
    setLoaded(true);
  },[]);
  const vote=(id)=>{
    if(userVote)return;
    const nv={...votes,[id]:(votes[id]||0)+1};
    setVotes(nv);setUserVote(id);
    try{localStorage.setItem("tg_poll_votes",JSON.stringify(nv));localStorage.setItem(POLL_KEY,id);}catch{}
  };
  const total=Object.values(votes).reduce((a,b)=>a+b,0);
  const activeMarkets=MARKETPLACES.filter(m=>m.status==="active");
  const maxVotes=Math.max(...Object.values(votes),1);
  const mono={fontFamily:"monospace"};
  return (
    <div style={{marginBottom:32}}>
      <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:8}}>⬡ COMMUNITY POLL — WHICH TOOL DO YOU PREFER?</div>
      <div style={{color:"#1a6a1a",fontSize:11,marginBottom:20,lineHeight:1.8}}>
        {total>0?`${total} vote${total!==1?"s":""} cast.`:"Be the first to vote."}
        {userVote&&<span style={{color:"#7fff7f"}}> You voted for {MARKETPLACES.find(m=>m.id===userVote)?.name}.</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {activeMarkets.map(m=>{
          const count=votes[m.id]||0;
          const pct=total>0?Math.round((count/total)*100):0;
          const barWidth=total>0?(count/maxVotes)*100:0;
          const voted=userVote===m.id;
          return (
            <div key={m.id} style={{border:`1px solid ${voted?"#39ff14":"#1a4a1a"}`,padding:"12px 14px",background:voted?"rgba(57,255,20,0.06)":"rgba(57,255,20,0.02)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                <button onClick={()=>vote(m.id)} disabled={!!userVote} style={{...mono,background:voted?"rgba(57,255,20,0.2)":"transparent",border:`1px solid ${voted?"#39ff14":"#1a4a1a"}`,color:voted?"#39ff14":"#1a6a1a",padding:"4px 10px",cursor:userVote?"default":"pointer",fontSize:10,letterSpacing:1,flexShrink:0}}>
                  {voted?"✓ VOTED":"VOTE"}
                </button>
                <span style={{color:voted?"#39ff14":"#7fff7f",fontSize:12,...mono}}>{m.name}</span>
                <span style={{color:"#1a6a1a",fontSize:11,marginLeft:"auto",...mono}}>{count} · {pct}%</span>
              </div>
              <div style={{height:3,background:"#0d3d0d",marginBottom:6}}>
                <div style={{height:"100%",width:`${barWidth}%`,background:voted?"#39ff14":"#1a8a1a",transition:"width 0.5s ease"}} />
              </div>
              <div style={{color:"#1a4a1a",fontSize:10,...mono}}>{m.notes}</div>
            </div>
          );
        })}
      </div>
      {userVote&&<button onClick={()=>{setUserVote(null);try{localStorage.removeItem(POLL_KEY);}catch{}}} style={{...mono,background:"transparent",border:"1px solid #1a4a1a",color:"#1a4a1a",padding:"6px 12px",cursor:"pointer",fontSize:10,marginTop:12,letterSpacing:1}}>↺ CHANGE VOTE</button>}
    </div>
  );
}

function MarketplaceDirectory() {
  const mono={fontFamily:"monospace"};
  const diffColor={EASY:"#39ff14",MEDIUM:"#7fff7f",ADVANCED:"#ffaa00","N/A":"#1a4a1a"};
  return (
    <div>
      <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:16}}>⬡ INSCRIPTION TOOLS DIRECTORY</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {MARKETPLACES.map(m=>(
          <div key={m.id} style={{border:`1px solid ${m.status==="sunset"?"#2a1a1a":"#1a4a1a"}`,padding:14,background:m.status==="sunset"?"rgba(40,0,0,0.3)":"rgba(57,255,20,0.02)",opacity:m.status==="sunset"?0.6:1}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
              <div style={{color:m.status==="sunset"?"#6a2a2a":"#7fff7f",fontSize:12,...mono}}>{m.name}</div>
              <div style={{display:"flex",gap:6}}>
                {m.status==="sunset"&&<span style={{color:"#6a2a2a",fontSize:9,border:"1px solid #4a1a1a",padding:"2px 6px",...mono}}>SUNSET</span>}
                {m.parentChild&&m.status!=="sunset"&&<span style={{color:"#39ff14",fontSize:9,border:"1px solid #1a4a1a",padding:"2px 6px",...mono}}>P/C ✓</span>}
                {m.difficulty!=="N/A"&&<span style={{color:diffColor[m.difficulty],fontSize:9,border:`1px solid ${diffColor[m.difficulty]}40`,padding:"2px 6px",...mono}}>{m.difficulty}</span>}
              </div>
            </div>
            <div style={{color:"#1a6a1a",fontSize:10,lineHeight:1.7,marginBottom:10,...mono}}>{m.notes}</div>
            <div style={{display:"flex",gap:8}}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" style={{color:"#1a6a1a",fontSize:10,textDecoration:"none",border:"1px solid #1a3a1a",padding:"4px 8px",...mono}}>→ SITE</a>
              {m.inscribeUrl&&m.status!=="sunset"&&<a href={m.inscribeUrl} target="_blank" rel="noopener noreferrer" style={{color:"#1a8a1a",fontSize:10,textDecoration:"none",border:"1px solid #1a4a1a",padding:"4px 8px",...mono}}>→ INSCRIBE</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdCliGuide() {
  const mono={fontFamily:"monospace"};
  const code={background:"rgba(0,0,0,0.4)",border:"1px solid #1a4a1a",padding:"10px 14px",fontSize:11,color:"#7fff7f",display:"block",whiteSpace:"pre",overflowX:"auto",...mono,lineHeight:1.7,marginBottom:16};
  return (
    <div>
      <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:8}}>⬡ ORD CLI — THE OFFICIAL WAY</div>
      <div style={{color:"#1a6a1a",fontSize:11,marginBottom:20,lineHeight:2}}>
        The <span style={{color:"#7fff7f"}}>ord</span> tool is written by Casey Rodarmor. Runs on your own Bitcoin node — no third party.
        Full docs: <a href="https://docs.ordinals.com" target="_blank" rel="noopener noreferrer" style={{color:"#1a8a1a"}}>docs.ordinals.com</a>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24}}>
        <div>
          <div style={{color:"#1a8a1a",fontSize:11,letterSpacing:2,marginBottom:10}}>// INSTALL</div>
          <pre style={code}>{`curl --proto '=https' --tlsv1.2 -fsLS \\\n  https://ordinals.com/install.sh | bash\n\n# or via cargo\ncargo install ord`}</pre>
          <div style={{color:"#1a8a1a",fontSize:11,letterSpacing:2,marginBottom:10}}>// CREATE WALLET + ADDRESS</div>
          <pre style={code}>{`ord wallet create\nord wallet receive`}</pre>
        </div>
        <div>
          <div style={{color:"#1a8a1a",fontSize:11,letterSpacing:2,marginBottom:10}}>// INSCRIBE A CHILD TULIP</div>
          <pre style={code}>{`ord wallet inscribe \\\n  --file tulip1.txt \\\n  --json-metadata tulip1.json \\\n  --parent ${PARENT_ID.slice(0,20)}... \\\n  --fee-rate 10`}</pre>
          <div style={{border:"1px solid #1a4a1a",padding:12,background:"rgba(57,255,20,0.02)"}}>
            <div style={{color:"#1a8a1a",fontSize:10,letterSpacing:2,marginBottom:6}}>// NOTES</div>
            <div style={{color:"#1a6a1a",fontSize:10,lineHeight:2,...mono}}>
              · --fee-rate in sat/vB — check mempool.space<br/>
              · --parent must be in the same wallet<br/>
              · Bitcoin node must be fully synced<br/>
              · ~600GB disk space required
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TulipGarden() {
  const [tulips,setTulips] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [lastRefresh,setLastRefresh] = useState(null);
  const [tab,setTab] = useState("garden");
  const [gardenView,setGardenView] = useState("grid"); // grid | grow | timeline
  const [toolsSubTab,setToolsSubTab] = useState("poll");

  const fetchTulips = useCallback(async()=>{
    try{
      setLoading(true);
      const res=await fetch(`${ORDINALS_BASE}/r/children/${PARENT_ID}`);
      const data=await res.json();
      const fetchItem=async(id,i)=>{
        try{
          const cr=await fetch(`${ORDINALS_BASE}/content/${id}`);
          const ct=cr.headers.get("content-type")||"";
          let content="",artist=null,tulipNum=i,color=null,epitaph=null;
          if(ct.includes("text")){
            const text=await cr.text();
            try{
              const j=JSON.parse(text);
              artist=j.artist;
              tulipNum=j.tulip_number??i;
              color=j.color||null;
              epitaph=j.epitaph||null;
            }catch{content=text.trim();}
          }
          return{id,content,artist,tulipNum,color,epitaph};
        }catch{return{id,content:MINI_TULIP,artist:null,tulipNum:i,color:null,epitaph:null};}
      };
      let allIds=[...(data.ids||[])];
      if(data.more){
        let page=1;
        while(true){
          const nd=await(await fetch(`${ORDINALS_BASE}/r/children/${PARENT_ID}/${page}`)).json();
          allIds=[...allIds,...(nd.ids||[])];
          if(!nd.more)break;page++;
        }
      }
      const items=await Promise.all(allIds.map(fetchItem));
      setTulips(items.filter(t=>t.content&&!t.content.startsWith("{")));
      setLastRefresh(new Date());
      setError(null);
    }catch{setError("failed to reach ordinals.com — check connection");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    fetchTulips();
    const iv=setInterval(fetchTulips,30000);
    return()=>clearInterval(iv);
  },[fetchTulips]);

  const nextTulipNum=tulips.length;

  const navBtn=(active)=>({
    padding:"10px 20px",background:active?"rgba(57,255,20,0.1)":"transparent",
    color:active?"#39ff14":"#1a6a1a",border:"none",
    borderRight:"1px solid #0d3d0d",borderBottom:active?"2px solid #39ff14":"2px solid transparent",
    cursor:"pointer",fontFamily:"monospace",fontSize:12,letterSpacing:2,
  });

  const subBtn=(active,color)=>({
    padding:"7px 14px",background:active?`rgba(57,255,20,0.08)`:"transparent",
    color:active?"#39ff14":"#1a6a1a",border:`1px solid ${active?"#1a8a1a":"#0d3d0d"}`,
    cursor:"pointer",fontFamily:"monospace",fontSize:10,letterSpacing:1,
  });

  const codeBlock={background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",padding:"10px 14px",margin:"8px 0",fontSize:12,color:"#7fff7f",display:"block",whiteSpace:"pre",overflowX:"auto",fontFamily:"monospace",lineHeight:1.7};

  return (
    <div style={{minHeight:"100vh",background:"#020a02",color:"#39ff14",fontFamily:"monospace"}}>
      <style>{`
        ::-webkit-scrollbar{width:6px;background:#020a02}
        ::-webkit-scrollbar-thumb{background:#1a4a1a}
        *{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button{opacity:0.3}
        input::placeholder{color:#1a4a1a}
        a:hover{opacity:0.8}
      `}</style>
      <ScanlineOverlay />

      {/* Header */}
      <div style={{borderBottom:"1px solid #0d3d0d",padding:"20px 24px 16px",background:"rgba(0,20,0,0.8)"}}>
        <pre style={{fontSize:5,lineHeight:1.1,color:"#39ff14",textShadow:"0 0 12px rgba(57,255,20,0.4)",whiteSpace:"pre",overflow:"hidden",marginBottom:16}}>{HEADER_ART}</pre>
        <div style={{display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{fontSize:11,color:"#1a8a1a",letterSpacing:1}}>
            A COLLABORATIVE ASCII GARDEN ON BITCOIN · ROOTED AT <span style={{color:"#39ff14"}}>@</span> · CHILD OF ROGUE (1980)
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:11,color:"#1a6a1a"}}>{loading?"SYNCING...":`${tulips.length} BLOOM${tulips.length!==1?"S":""}`}</span>
            <button onClick={fetchTulips} style={{background:"transparent",border:"1px solid #39ff14",color:"#39ff14",padding:"8px 16px",cursor:"pointer",fontFamily:"monospace",fontSize:11,letterSpacing:2}}>↺ REFRESH</button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{display:"flex",justifyContent:"space-between",padding:"8px 24px",background:"#00060a",borderBottom:"1px solid #0d3d0d",fontSize:11,color:"#1a6a1a",letterSpacing:1,flexWrap:"wrap",gap:8}}>
        <span>ORD://TULIP.GARDEN · PARENT: {PARENT_ID.slice(0,12)}...{PARENT_ID.slice(-8)}</span>
        <span>{lastRefresh?`LAST SYNC: ${lastRefresh.toLocaleTimeString()}`:"SYNCING..."} · AUTO-REFRESH: 30s</span>
      </div>

      {/* Nav */}
      <div style={{display:"flex",borderBottom:"1px solid #0d3d0d",background:"#00060b",flexWrap:"wrap"}}>
        {[["garden","🌷 GARDEN"],["plant","✦ PLANT A TULIP"],["tools","⬡ TOOLS"]].map(([k,label])=>(
          <button key={k} style={navBtn(tab===k)} onClick={()=>setTab(k)}>{label}</button>
        ))}
        <a href={`https://ordinals.com/inscription/${PARENT_ID}`} target="_blank" rel="noopener noreferrer"
          style={{...navBtn(false),textDecoration:"none",display:"flex",alignItems:"center"}}>↗ ORDINALS.COM</a>
      </div>

      <div style={{padding:"24px",maxWidth:1200,margin:"0 auto"}}>

        {tab==="garden"&&(
          <>
            {/* Garden view switcher */}
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              {[["grid","⊞ GARDEN"],["grow","⊳ GROWING FIELD"],["timeline","◈ TIMELINE"]].map(([k,label])=>(
                <button key={k} style={subBtn(gardenView===k)} onClick={()=>setGardenView(k)}>{label}</button>
              ))}
            </div>

            {error&&<div style={{color:"#ff4444",fontSize:12,marginBottom:16,border:"1px solid #440000",padding:12}}>ERROR: {error}</div>}

            {loading&&tulips.length===0?(
              <div style={{color:"#1a6a1a",fontSize:13,padding:40,textAlign:"center"}}>
                <pre style={{display:"inline-block",textAlign:"left",textShadow:"0 0 8px rgba(57,255,20,0.4)",fontSize:30,marginBottom:16}}>{MINI_TULIP}</pre>
                <div>FETCHING GARDEN DATA... <Cursor /></div>
              </div>
            ):tulips.length===0?(
              <div style={{color:"#1a6a1a",fontSize:13,padding:40,textAlign:"center"}}>THE SOIL IS READY. NO TULIPS YET. BE THE FIRST TO BLOOM. <Cursor /></div>
            ):(
              <>
                {gardenView==="grid"&&(
                  <>
                    <div style={{fontSize:11,color:"#1a6a1a",marginBottom:16,letterSpacing:1}}>// {tulips.length} INSCRIPTION{tulips.length!==1?"S":""} FOUND UNDER PARENT @</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
                      {tulips.map((t,i)=><TulipCard key={t.id} {...t} index={i} />)}
                    </div>
                  </>
                )}
                {gardenView==="grow"&&(
                  <>
                    <div style={{color:"#1a6a1a",fontSize:11,marginBottom:20,lineHeight:2}}>Total blooms: <span style={{color:"#39ff14"}}>{tulips.length}</span></div>
                    <div style={{border:"1px solid #0d3d0d",background:"rgba(0,255,65,0.02)",padding:"20px 0",overflowX:"auto"}}>
                      <GrowingField tulips={tulips} />
                    </div>
                    <div style={{marginTop:20,color:"#1a6a1a",fontSize:11,lineHeight:2}}>
                      <div>@ (root) → {PARENT_ID.slice(0,16)}...</div>
                      {tulips.map((t,i)=>(
                        <div key={t.id} style={{paddingLeft:16}}>
                          <span style={{color:t.color||DEFAULT_COLOR}}>└──</span> tulip #{t.tulipNum!==undefined?t.tulipNum:i} {t.artist?`[${t.artist}]`:""} →{" "}
                          <a href={`https://ordinals.com/inscription/${t.id}`} target="_blank" rel="noopener noreferrer" style={{color:"#1a8a1a",textDecoration:"none"}}>{t.id.slice(0,12)}...</a>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {gardenView==="timeline"&&<TimelineMode tulips={tulips} />}
              </>
            )}
          </>
        )}

        {tab==="plant"&&(
          <>
            <div style={{color:"#1a8a1a",fontSize:11,letterSpacing:3,marginBottom:20,borderBottom:"1px solid #0d3d0d",paddingBottom:8}}>// PLANT A TULIP</div>
            <TulipWorkshop nextTulipNum={nextTulipNum} />
            <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:16,borderBottom:"1px solid #0d3d0d",paddingBottom:8}}>// INSTRUCTIONS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24}}>
              <div>
                <div style={{marginBottom:24}}>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>STEP 1 — CREATE YOUR FILES</div>
                  <div style={{color:"#1a6a1a",fontSize:11,lineHeight:2.2}}>Use the workshop above. Download your <span style={{color:"#1a8a1a"}}>tulipN.txt</span> and <span style={{color:"#1a8a1a"}}>tulipN.json</span>.</div>
                </div>
                <div style={{marginBottom:24}}>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>STEP 2 — CHOOSE YOUR TOOL</div>
                  {[["OrdinalsBot","ordinalsbot.com"],["UniSat","unisat.io/inscribe"],["Gamma","gamma.io/inscribe"],["OrdDropz","ord-dropz.xyz"],["ord CLI","docs.ordinals.com"]].map(([name,url])=>(
                    <div key={name} style={{marginBottom:6,paddingLeft:8,borderLeft:"1px solid #1a4a1a"}}>
                      <a href={`https://${url}`} target="_blank" rel="noopener noreferrer" style={{color:"#7fff7f",textDecoration:"none",fontSize:11}}>{name}</a>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>STEP 3 — PASTE PARENT ID</div>
                  <div style={{background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",padding:"8px 12px",fontSize:10,color:"#7fff7f",wordBreak:"break-all",fontFamily:"monospace"}}>{PARENT_ID}</div>
                </div>
              </div>
              <div>
                <div style={{marginBottom:24}}>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>RULES</div>
                  <div style={{color:"#1a8a1a",fontSize:11,lineHeight:2.4}}>
                    ① ASCII .txt files only<br/>
                    ② Spaces not tabs<br/>
                    ③ bc1p Taproot address<br/>
                    ④ collection: <span style={{color:"#39ff14"}}>"Tulip Garden"</span><br/>
                    ⑤ color + epitaph optional but permanent
                  </div>
                </div>
                <div style={{marginBottom:24}}>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>LINEAGE</div>
                  <pre style={codeBlock}>{`@ (parent)\n└── tulip #0 (madison)\n└── tulip #1 (you?)\n\nInspired by game.tulip.farm\nand Rogue (1980)\n\n"Goodbye, rogue..."`}</pre>
                </div>
              </div>
            </div>
          </>
        )}

        {tab==="tools"&&(
          <>
            <div style={{color:"#1a8a1a",fontSize:11,letterSpacing:3,marginBottom:20,borderBottom:"1px solid #0d3d0d",paddingBottom:8}}>// TOOLS & MARKETPLACES</div>
            <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
              {[["poll","⬡ COMMUNITY POLL"],["directory","⬡ DIRECTORY"],["ord","⬡ ORD CLI"]].map(([k,label])=>(
                <button key={k} style={subBtn(toolsSubTab===k)} onClick={()=>setToolsSubTab(k)}>{label}</button>
              ))}
            </div>
            {toolsSubTab==="poll"&&<MarketplacePoll />}
            {toolsSubTab==="directory"&&<MarketplaceDirectory />}
            {toolsSubTab==="ord"&&<OrdCliGuide />}
          </>
        )}
      </div>

      <div style={{borderTop:"1px solid #0d3d0d",padding:"16px 24px",display:"flex",justifyContent:"space-between",fontSize:10,color:"#0d3d0d",letterSpacing:1,flexWrap:"wrap",gap:8}}>
        <span>TULIP GARDEN · BITCOIN ORDINALS · PARENT: {PARENT_ID}</span>
        <span>ROOTED AT @ · CHILD OF ROGUE (1980)</span>
      </div>
    </div>
  );
}
