'use client'

import { useState, useEffect, useCallback, useRef } from "react";

interface InscriptionInfo {
  number: number | null;
  address: string | null;
  content_type: string | null;
  content_length: number | null;
  height: number | null;
  timestamp: number | null;
  fee: number | null;
  value: number | null;
  sat: number | null;
  charms: string[];
  output: string | null;
}

interface Tulip {
  id: string;
  content: string;
  artist: string | null;
  tulipNum: number;
  color: string | null;
  epitaph: string | null;
  inscription: InscriptionInfo | null;
}

interface Marketplace {
  id: string;
  name: string;
  url: string;
  type: "marketplace" | "tool" | "both";
}

interface Comment {
  id: string;
  name: string;
  text: string;
  ts: string;
  likes: number;
  dislikes: number;
}

interface Submission {
  id: string;
  name: string;
  url: string;
  desc: string;
  type: string;
  ts: string;
}

interface NewsPost {
  id: number;
  title: string;
  content: string;
  link: string;
  category: string;
  ts: number;
}

interface Terminal {
  id: number;
  type: "bash" | "ubuntu" | "restricted";
}

interface PanicLine {
  text: string;
  color?: string;
}

interface PanicConfig {
  text: string;
  delay: number;
  color?: string;
}

const PARENT_ID: string = "785d9b15a0b0cbd4c0e4a311311545934680e98976ce018f334b815a4cf0678bi0";
const ORDINALS_BASE: string = "https://ordinals.com";
const DEFAULT_COLOR: string = "#39ff14";
const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || "https://tulip-garden-api.fly.dev/api";

const HEADER_ART: string = `████████╗██╗   ██╗██╗     ██╗██████╗      ██████╗  █████╗ ██████╗ ██████╗ ███████╗███╗   ██╗
╚══██╔══╝██║   ██║██║     ██║██╔══██╗    ██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║
   ██║   ██║   ██║██║     ██║██████╔╝    ██║  ███╗███████║██████╔╝██║  ██║█████╗  ██╔██╗ ██║
   ██║   ██║   ██║██║     ██║██╔═══╝     ██║   ██║██╔══██║██╔══██╗██║  ██║██╔══╝  ██║╚██╗██║
   ██║   ╚██████╔╝███████╗██║██║         ╚██████╔╝██║  ██║██║  ██║██████╔╝███████╗██║ ╚████║
   ╚═╝    ╚═════╝ ╚══════╝╚═╝╚═╝          ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝`;

const MINI_TULIP: string = `   _\n  (v)\n   |\n  \\|/`;
const DEFAULT_TULIP: string = `   _\n  (v)\n   |\n  \\|/`;

const MARKETPLACES: Marketplace[] = [
  { id: "ordinalswallet", name: "Ordinals Wallet", url: "https://ordinalswallet.com", type: "marketplace" },
  { id: "unisat", name: "UniSat", url: "https://unisat.io", type: "both" },
  { id: "gamma", name: "Gamma", url: "https://gamma.io", type: "both" },
  { id: "trio", name: "Trio", url: "https://www.trio.xyz", type: "marketplace" },
  { id: "orddropz", name: "OrdDropz", url: "https://ord-dropz.xyz/secondary", type: "both" },
  { id: "satflow", name: "Satflow", url: "https://www.satflow.com", type: "marketplace" },
  { id: "ordzaar", name: "Ordzaar", url: "https://ordzaar.com", type: "both" },
  { id: "magisat", name: "Magisat", url: "https://magisat.io/collections", type: "marketplace" },
  { id: "ordinalsbot", name: "OrdinalsBot", url: "https://ordinalsbot.com/inscribe", type: "tool" },
  { id: "ord", name: "ord CLI", url: "https://github.com/ordinals/ord/releases/tag/0.27.0", type: "tool" },
];

const POLL_KEY: string = "tulip_garden_poll_vote";

function hexToRgb(hex: string): string {
  const r: number = parseInt(hex.slice(1,3),16), g: number = parseInt(hex.slice(3,5),16), b: number = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// Decode hex-encoded CBOR metadata from ordinals /r/metadata/<id> endpoint
function decodeCborHex(hex: string): Record<string, unknown> | null {
  try {
    const bytes = new Uint8Array((hex.match(/.{2}/g) || []).map(b => parseInt(b, 16)));
    let pos = 0;
    const readByte = (): number => bytes[pos++];
    const readLen = (ai: number): number => {
      if (ai < 24) return ai;
      if (ai === 24) return readByte();
      if (ai === 25) return (readByte() << 8) | readByte();
      if (ai === 26) return ((readByte() << 24) >>> 0) + (readByte() << 16) + (readByte() << 8) + readByte();
      return 0;
    };
    const readValue = (): unknown => {
      const b = readByte();
      const mt = b >> 5, ai = b & 0x1f;
      if (mt === 0) return readLen(ai);
      if (mt === 1) return -1 - readLen(ai);
      if (mt === 3) { const len = readLen(ai); const s = bytes.slice(pos, pos + len); pos += len; return new TextDecoder().decode(s); }
      if (mt === 4) { const len = readLen(ai); const a: unknown[] = []; for (let i = 0; i < len; i++) a.push(readValue()); return a; }
      if (mt === 5) { const len = readLen(ai); const o: Record<string, unknown> = {}; for (let i = 0; i < len; i++) { o[String(readValue())] = readValue(); } return o; }
      if (mt === 7) { if (ai === 20) return false; if (ai === 21) return true; if (ai === 22) return null; }
      return null;
    };
    const result = readValue();
    return (result && typeof result === 'object' && !Array.isArray(result)) ? result as Record<string, unknown> : null;
  } catch { return null; }
}


function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const check = (): void => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function ScanlineOverlay(): React.ReactElement {
  return <div style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999,background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)" }} />;
}

function Cursor(): React.ReactElement {
  const [vis,setVis] = useState<boolean>(true);
  useEffect(()=>{ const t=setInterval(()=>setVis(v=>!v),530); return ()=>clearInterval(t); },[]);
  return <span style={{opacity:vis?1:0,color:"#39ff14"}}>█</span>;
}

interface TulipCardProps {
  id: string;
  index: number;
  content: string;
  artist: string | null;
  tulipNum: number;
  color: string | null;
  epitaph: string | null;
}

function TulipCard({ id, index, content, artist, tulipNum, color, epitaph }: TulipCardProps): React.ReactElement {
  const [visible,setVisible] = useState<boolean>(false);
  useEffect(()=>{ const t=setTimeout(()=>setVisible(true),index*120); return ()=>clearTimeout(t); },[index]);
  const isEasterEgg: boolean = artist === "rodney" && color === "#efface" && epitaph === "Goodbye, rogue...";
  const derivedColor: string = id ? `#${id.slice(0,6)}` : DEFAULT_COLOR;
  const c: string = isEasterEgg ? "#FFD700" : (color || derivedColor);
  const rgb: string = hexToRgb(c);
  const shortId: string = id ? `${id.slice(0,8)}...${id.slice(-4)}` : "???";
  return (
    <div style={{ border:"1px solid #1a3a1a", padding:"16px", fontFamily:"monospace", transition:"all 0.6s ease", opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)", background:"transparent", position:"relative", overflow:"visible", ...(isEasterEgg ? {boxShadow:`0 0 20px rgba(${rgb},0.3)`,border:`1px solid ${c}40`} : {}) }}>
      <span style={{position:"absolute",top:4,left:4,color:"#1a4a1a",fontSize:10}}>┌</span>
      <span style={{position:"absolute",top:4,right:4,color:"#1a4a1a",fontSize:10}}>┐</span>
      <span style={{position:"absolute",bottom:4,left:4,color:"#1a4a1a",fontSize:10}}>└</span>
      <span style={{position:"absolute",bottom:4,right:4,color:"#1a4a1a",fontSize:10}}>┘</span>
      {isEasterEgg && <div style={{color:"#FFD700",fontSize:18,textAlign:"center",marginBottom:4,textShadow:"0 0 12px rgba(255,215,0,0.6)"}}>♛</div>}
      <div style={{color:"#1a6a1a",fontSize:10,marginBottom:8,letterSpacing:2}}>TULIP #{String(index).padStart(3,"0")}</div>
      <pre style={{color:c,fontSize:14,lineHeight:1.6,margin:"0 0 12px 0",paddingTop:4,textAlign:"left",whiteSpace:"pre",textShadow:`0 0 8px rgba(${rgb},0.6)`,minHeight:60,overflow:"auto"}}>{content||MINI_TULIP}</pre>
      <div style={{color:"#0d3d0d",fontSize:10,marginBottom:8}}>{"⸜".repeat(12)}</div>
      {artist && <div style={{color:"#1a6a1a",fontSize:11,marginBottom:4}}>ARTIST: <span style={{color:"#2a8a2a"}}>{artist}</span></div>}
      {epitaph && <div style={{color:"#1a5a1a",fontSize:10,fontStyle:"italic",marginBottom:8}}>"{epitaph}"</div>}
      {isEasterEgg && <div style={{color:"#FFD700",fontSize:10,letterSpacing:2,marginBottom:8,textShadow:"0 0 8px rgba(255,215,0,0.4)"}}>✦ FOUNDER OF YENDOR ✦</div>}
      <a href={`${ORDINALS_BASE}/inscription/${id}`} target="_blank" rel="noopener noreferrer" style={{color:"#1a4a1a",fontSize:9,textDecoration:"none",wordBreak:"break-all",display:"block"}}>{shortId}</a>
    </div>
  );
}

interface GrowingFieldProps {
  tulips: Tulip[];
  activeIndex: number;
  onActiveIndexChange: (i: number) => void;
}

function GrowingField({ tulips, activeIndex, onActiveIndexChange }: GrowingFieldProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const scrollToIndex = (i: number): void => {
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-tulip-index="${i}"]`) as HTMLElement | null;
    if (!el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const scrollLeft = container.scrollLeft + (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2);
    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
  };

  const handleScroll = (): void => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      let closestIndex = 0;
      let closestDist = Infinity;
      tulips.forEach((_: Tulip, i: number) => {
        const el = container.querySelector(`[data-tulip-index="${i}"]`) as HTMLElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - centerX);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      });
      if (closestIndex !== activeIndex) {
        onActiveIndexChange(closestIndex);
      }
    });
  };

  return (
    <div style={{fontFamily:"monospace",padding:"20px 0"}}>
      <style>{`@keyframes grow{from{opacity:0;transform:scaleY(0.2) translateY(20px);transform-origin:bottom}to{opacity:1;transform:scaleY(1) translateY(0);transform-origin:bottom}}`}</style>
      <div ref={scrollRef} onScroll={handleScroll} style={{display:"flex",alignItems:"flex-end",gap:12,overflowX:"auto",padding:"10px 40px",scrollBehavior:"auto"}}>
        {tulips.map((t: Tulip, i: number)=>{
          const isActive: boolean = i === activeIndex;
          const c: string = t.color||(t.id?`#${t.id.slice(0,6)}`:DEFAULT_COLOR);
          const rgb: string = hexToRgb(c);
          return (
            <div key={t.id||i} data-tulip-index={i} onClick={()=>{onActiveIndexChange(i);scrollToIndex(i);}} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",transition:"all 0.3s ease",transform:isActive?"scale(1.15)":"scale(1)",opacity:isActive?1:0.6,flexShrink:0}}>
              <pre style={{color:c,fontSize:12,lineHeight:1.1,margin:0,textShadow:`0 0 ${isActive?12:6}px rgba(${rgb},${isActive?0.9:0.4})`,animation:`grow 0.8s ease ${i*0.15}s both`,whiteSpace:"pre"}}>{t.content||MINI_TULIP}</pre>
              <div style={{color:isActive?c:`${c}50`,fontSize:9,marginTop:4,transition:"color 0.3s ease"}}>#{i}</div>
            </div>
          );
        })}
        {tulips.length===0 && <div style={{color:"#1a5a1a",fontSize:12}}>no blooms yet... be the first</div>}
      </div>
      <div style={{color:"#0d3d0d",fontSize:12,letterSpacing:2,marginTop:4,paddingLeft:20}}>{"⣿".repeat(Math.min(60,20+tulips.length*2))}</div>
    </div>
  );
}

interface MetadataPanelProps {
  tulip: Tulip | undefined;
  index: number;
  total: number;
}

function MetadataPanel({ tulip, index, total }: MetadataPanelProps): React.ReactElement {
  if (!tulip) return (
    <div style={{fontFamily:"monospace",color:"#1a6a1a",fontSize:11,padding:20,textAlign:"center"}}>NO TULIP SELECTED</div>
  );

  const derivedColor: string = tulip.id ? `#${tulip.id.slice(0,6)}` : DEFAULT_COLOR;
  const c: string = tulip.color || derivedColor;
  const rgb: string = hexToRgb(c);

  const labelStyle: React.CSSProperties = {color:"#1a6a1a",fontSize:10,letterSpacing:2,width:80,flexShrink:0};
  const valueStyle: React.CSSProperties = {color:"#7fff7f",fontSize:11,fontFamily:"monospace"};
  const dimStyle: React.CSSProperties = {...valueStyle,color:"#1a8a1a",fontSize:10,wordBreak:"break-all" as const};
  const rowStyle: React.CSSProperties = {display:"flex",alignItems:"flex-start",gap:12,padding:"6px 0",borderBottom:"1px solid #0a2a0a"};

  // Only show provenance + user-inscribed metadata (artist, color, epitaph)
  const rows: {label: string; node: React.ReactNode}[] = [];
  rows.push({label:"PARENT", node: <a href={`${ORDINALS_BASE}/inscription/${PARENT_ID}`} target="_blank" rel="noopener noreferrer" style={{...dimStyle,textDecoration:"none"}}>{PARENT_ID}</a>});
  rows.push({label:"CHILD", node: <a href={`${ORDINALS_BASE}/inscription/${tulip.id}`} target="_blank" rel="noopener noreferrer" style={{...dimStyle,textDecoration:"none"}}>{tulip.id || "???"}</a>});
  if(tulip.artist) rows.push({label:"ARTIST", node: <span style={valueStyle}>{tulip.artist}</span>});
  if(tulip.color) rows.push({label:"COLOR", node: <span style={{...valueStyle,color:c,display:"flex",alignItems:"center",gap:8}}>{tulip.color.toUpperCase()} <span style={{display:"inline-block",width:12,height:12,background:c,border:"1px solid #1a4a1a",borderRadius:2,flexShrink:0}} /></span>});
  if(tulip.epitaph) rows.push({label:"EPITAPH", node: <span style={{...valueStyle,fontStyle:"italic"}}>{`\u201C${tulip.epitaph}\u201D`}</span>});

  return (
    <div style={{fontFamily:"monospace",border:"1px solid #1a4a1a",background:"rgba(0,20,0,0.4)",padding:20,position:"relative"}}>
      <span style={{position:"absolute",top:4,left:6,color:"#1a4a1a",fontSize:10}}>┌</span>
      <span style={{position:"absolute",top:4,right:6,color:"#1a4a1a",fontSize:10}}>┐</span>
      <span style={{position:"absolute",bottom:4,left:6,color:"#1a4a1a",fontSize:10}}>└</span>
      <span style={{position:"absolute",bottom:4,right:6,color:"#1a4a1a",fontSize:10}}>┘</span>

      <div style={{color:c,fontSize:11,letterSpacing:3,marginBottom:16,textShadow:`0 0 8px rgba(${rgb},0.4)`}}>
        TULIP #{String(index).padStart(3,"0")} · {index+1} OF {total}
      </div>
      <div style={{height:1,background:"#1a4a1a",marginBottom:12}} />

      {rows.map((row, ri) => (
        <div key={row.label} style={{...rowStyle, borderBottom: ri === rows.length - 1 ? "none" : "1px solid #0a2a0a"}}>
          <span style={labelStyle}>{row.label}</span>
          {row.node}
        </div>
      ))}
    </div>
  );
}

interface TulipDisplayProps {
  tulip: Tulip | undefined;
  index: number;
  total: number;
}

function TulipDisplay({ tulip, index }: TulipDisplayProps): React.ReactElement {
  const [fadeKey, setFadeKey] = useState<number>(0);

  useEffect(() => {
    setFadeKey(k => k + 1);
  }, [index]);

  if (!tulip) return (
    <div style={{textAlign:"center",color:"#1a6a1a",padding:60,fontFamily:"monospace"}}>THE SOIL IS READY. NO TULIPS YET. <Cursor /></div>
  );

  const c: string = tulip.color || (tulip.id ? `#${tulip.id.slice(0,6)}` : DEFAULT_COLOR);
  const rgb: string = hexToRgb(c);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"monospace",position:"relative",padding:"40px 20px",minHeight:280}}>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,rgba(${rgb},0.08) 0%,transparent 70%)`,transition:"background 0.8s ease",pointerEvents:"none"}} />

      <div key={fadeKey} style={{textAlign:"center",zIndex:1,animation:"tulipFadeIn 0.3s ease",width:"100%"}}>
        <style>{`@keyframes tulipFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <pre style={{color:c,fontSize:20,lineHeight:1.3,margin:"0 auto 20px",display:"inline-block",textAlign:"left",textShadow:`0 0 16px rgba(${rgb},0.7)`,whiteSpace:"pre"}}>
{tulip.content || MINI_TULIP}
        </pre>

        <div style={{color:`${c}30`,fontSize:12,letterSpacing:3}}>{"— ⸻ —"}</div>
      </div>
    </div>
  );
}

function TimelineView({ tulips }: { tulips: Tulip[] }): React.ReactElement {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  if (tulips.length === 0) return (
    <div style={{textAlign:"center",color:"#1a6a1a",padding:60,fontFamily:"monospace"}}>THE SOIL IS READY. NO TULIPS YET. BE THE FIRST TO BLOOM. <Cursor /></div>
  );

  const activeTulip: Tulip | undefined = tulips[activeIndex];

  return (
    <>
      <div style={{color:"#1a6a1a",fontSize:11,marginBottom:12,lineHeight:2,fontFamily:"monospace"}}>Total blooms: <span style={{color:"#39ff14"}}>{tulips.length}</span></div>
      <div style={{border:"1px solid #0d3d0d",background:"rgba(0,255,65,0.02)"}}>
        <GrowingField tulips={tulips} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex} />
      </div>
      <div style={{marginTop:20}}>
        <MetadataPanel tulip={activeTulip} index={activeIndex} total={tulips.length} />
      </div>
      <div style={{marginTop:20}}>
        <TulipDisplay tulip={activeTulip} index={activeIndex} total={tulips.length} />
      </div>
    </>
  );
}

interface TheMachineProps {
  nextTulipNum: number;
}

function TheMachine({ nextTulipNum }: TheMachineProps): React.ReactElement {
  const [tulipArt, setTulipArt] = useState<string>(DEFAULT_TULIP);
  const [artistName, setArtistName] = useState<string>("");
  const [epitaph, setEpitaph] = useState<string>("");
  const [color, setColor] = useState<string>("#39ff14");
  const [copied, setCopied] = useState<string>("");
  const [fileMenuOpen, setFileMenuOpen] = useState<boolean>(false);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<number | null>(null);
  const [ubuntuUnlocked, setUbuntuUnlocked] = useState<boolean>(() => {
    try { return localStorage.getItem("tg_ubuntu_unlocked") === "true"; } catch { return false; }
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile: boolean = useIsMobile();
  const cols: string = isMobile ? "1fr" : "1fr 1fr";
  const activeId: number | null = activeTerminalId && terminals.find(t => t.id === activeTerminalId) ? activeTerminalId : (terminals.length > 0 ? terminals[terminals.length - 1].id : null);

  const jsonContent: string = JSON.stringify({
    collection: "Tulip Garden",
    artist: artistName || "yourname",
    ...(color && color !== "#39ff14" ? { color } : {}),
    ...(epitaph ? { epitaph } : {}),
  }, null, 2);

  const downloadFile = (content: string, filename: string): void => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url: string = URL.createObjectURL(blob);
    const a: HTMLAnchorElement = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = (text: string, label: string): void => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(""), 2000); });
  };

  const addTerminal = (type: "bash" | "ubuntu" | "restricted"): void => {
    const id: number = Date.now();
    setTerminals(t => [...t, { id, type }]);
    setActiveTerminalId(id);
    setFileMenuOpen(false);
  };

  const closeTerminal = (id: number): void => {
    setTerminals(t => t.filter(x => x.id !== id));
    setActiveTerminalId(prev => prev === id ? null : prev);
  };

  useEffect(() => {
    const handler = (e: MouseEvent): void => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setFileMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const mono: React.CSSProperties = { fontFamily: "monospace" };
  const previewColor: string = color || DEFAULT_COLOR;
  const previewRgb: string = hexToRgb(previewColor);

  const menuBarStyle: React.CSSProperties = { display: "flex", alignItems: "center", background: "#0d1a0d", borderBottom: "1px solid #1a4a1a", padding: "0 8px", height: 32, gap: 4, position: "relative" };
  const menuItemStyle: React.CSSProperties = { color: "#7fff7f", fontSize: 11, padding: "4px 10px", cursor: "pointer", background: "transparent", border: "none", fontFamily: "monospace", letterSpacing: 1 };
  const dropdownStyle: React.CSSProperties = { position: "absolute", top: 32, left: 0, background: "#0d1a0d", border: "1px solid #1a4a1a", zIndex: 100, minWidth: 200 };
  const dropdownItemStyle: React.CSSProperties = { display: "block", width: "100%", padding: "8px 16px", color: "#7fff7f", fontSize: 11, cursor: "pointer", background: "transparent", border: "none", textAlign: "left", fontFamily: "monospace", letterSpacing: 1 };

  return (
    <div style={{ marginBottom: 36, border: "1px solid #39ff1440", background: "#020a02", boxShadow: "0 0 10px rgba(57,255,20,0.15), 0 0 30px rgba(57,255,20,0.06), inset 0 0 15px rgba(57,255,20,0.03)" }}>
      <div style={{ background: "#061006", borderBottom: "1px solid #0d3d0d", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#1a8a1a", fontSize: 10, letterSpacing: 3, ...mono }}>THE MACHINE</span>
        <span style={{ color: "#0d3d0d", fontSize: 10, ...mono }}>tulip.txt — editor</span>
      </div>

      <div style={menuBarStyle} ref={menuRef}>
        <div style={{ position: "relative" }}>
          <button style={{ ...menuItemStyle, background: fileMenuOpen ? "rgba(57,255,20,0.1)" : "transparent" }}
            onClick={() => setFileMenuOpen(f => !f)}>
            File ▾
          </button>
          {fileMenuOpen && (
            <div style={dropdownStyle}>
              <button style={dropdownItemStyle} onClick={() => { downloadFile(tulipArt, "tulip.txt"); setFileMenuOpen(false); }}>
                💾 Save tulip.txt
              </button>
              <button style={dropdownItemStyle} onClick={() => { downloadFile(jsonContent, "tulip.json"); setFileMenuOpen(false); }}>
                💾 Save tulip.json
              </button>
              <div style={{ borderTop: "1px solid #1a4a1a", margin: "4px 0" }} />
              <button style={dropdownItemStyle} onClick={() => addTerminal("bash")}>
                ⬡ New Bash Terminal
              </button>
              {ubuntuUnlocked ? (
                <button style={dropdownItemStyle} onClick={() => addTerminal("ubuntu")}>
                  ⬡ New Ubuntu Terminal
                </button>
              ) : (
                <button style={{...dropdownItemStyle, color: "#1a4a1a"}} onClick={() => addTerminal("restricted")}>
                  ⬡ [RESTRICTED]
                </button>
              )}
            </div>
          )}
        </div>
        <span style={{ color: "#0d3d0d", fontSize: 10, marginLeft: "auto", ...mono }}>tulip-garden — editor</span>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ color: "#1a8a1a", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>// tulip.txt — draw your flower (spaces only, no tabs)</div>
            <textarea value={tulipArt} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTulipArt(e.target.value)} spellCheck={false}
              style={{ ...mono, width: "100%", height: 180, background: "rgba(0,0,0,0.4)", color: "#39ff14", border: "1px solid #1a4a1a", padding: "12px", fontSize: 13, lineHeight: 1.4, resize: "vertical", outline: "none", whiteSpace: "pre", overflowWrap: "normal", overflow: "auto" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <button onClick={() => setTulipArt(DEFAULT_TULIP)} style={{ ...mono, background: "transparent", border: "1px solid #1a4a1a", color: "#1a6a1a", padding: "5px 10px", cursor: "pointer", fontSize: 10 }}>↺ reset</button>
              <button onClick={() => copy(tulipArt, "art")} style={{ ...mono, background: "transparent", border: "1px solid #1a4a1a", color: "#1a6a1a", padding: "5px 10px", cursor: "pointer", fontSize: 10 }}>{copied === "art" ? "✓ copied" : "⎘ copy"}</button>
            </div>
          </div>

          <div>
            <div style={{ color: "#1a8a1a", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>// live preview — ordinals.com rendering</div>
            <div style={{ border: `1px solid ${previewColor}40`, padding: 16, minHeight: 180, position: "relative", background: `rgba(${previewRgb},0.03)` }}>
              <span style={{ position: "absolute", top: 4, left: 4, color: `${previewColor}60`, fontSize: 9 }}>┌</span>
              <span style={{ position: "absolute", top: 4, right: 4, color: `${previewColor}60`, fontSize: 9 }}>┐</span>
              <span style={{ position: "absolute", bottom: 4, left: 4, color: `${previewColor}60`, fontSize: 9 }}>└</span>
              <span style={{ position: "absolute", bottom: 4, right: 4, color: `${previewColor}60`, fontSize: 9 }}>┘</span>
              <div style={{ color: `${previewColor}60`, fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>TULIP #??? — assigned at inscription</div>
              <pre style={{ ...mono, color: previewColor, fontSize: 14, lineHeight: 1.3, margin: 0, textShadow: `0 0 8px rgba(${previewRgb},0.6)`, whiteSpace: "pre" }}>{tulipArt || " "}</pre>
              <div style={{ color: `${previewColor}30`, fontSize: 10, marginTop: 8 }}>{"⸜".repeat(12)}</div>
              {artistName && <div style={{ color: `${previewColor}90`, fontSize: 10, marginTop: 4 }}>{artistName}</div>}
              {epitaph && <div style={{ color: `${previewColor}70`, fontSize: 10, fontStyle: "italic", marginTop: 4 }}>"{epitaph}"</div>}
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #1a4a1a", padding: 14, marginBottom: 12, background: "rgba(0,0,0,0.2)" }}>
          <div style={{ color: "#1a8a1a", fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>// tulip.json — metadata</div>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ color: "#1a6a1a", fontSize: 10, marginBottom: 5 }}>artist</div>
              <input type="text" value={artistName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArtistName(e.target.value)} placeholder="yourname"
                style={{ ...mono, background: "rgba(57,255,20,0.04)", border: "1px solid #1a4a1a", color: "#39ff14", padding: "7px 10px", fontSize: 12, width: "100%", outline: "none" }} />
            </div>
            <div>
              <div style={{ color: "#1a6a1a", fontSize: 10, marginBottom: 5 }}>color <span style={{ color: "#0d4a0d" }}>(optional — or leave blank to <a href="https://docs.ordinals.com/inscriptions/metadata.html" target="_blank" rel="noopener noreferrer" style={{ color: "#0d4a0d", textDecoration: "none" }}>unidentify</a>)</span></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="color" value={color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                  style={{ width: 34, height: 32, border: "1px solid #1a4a1a", background: "transparent", cursor: "pointer", padding: 1 }} />
                <input type="text" value={color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)} placeholder="#39ff14"
                  style={{ ...mono, background: "rgba(57,255,20,0.04)", border: "1px solid #1a4a1a", color, padding: "7px 10px", fontSize: 12, width: 110, outline: "none" }} />
                <div style={{ display: "flex", gap: 4 }}>
                  {["#ff6b9d", "#00d4ff", "#ffaa00", "#a855f7", "#39ff14", "#ffffff"].map((c: string) => (
                    <div key={c} onClick={() => setColor(c)} style={{ width: 18, height: 18, background: c, cursor: "pointer", border: color === c ? "2px solid white" : "1px solid #1a4a1a", borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#1a6a1a", fontSize: 10, marginBottom: 5 }}>epitaph <span style={{ color: "#0d4a0d" }}>(optional — your words, forever on Bitcoin)</span></div>
            <input type="text" value={epitaph} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEpitaph(e.target.value)} placeholder="here bloomed a builder"
              style={{ ...mono, background: "rgba(57,255,20,0.04)", border: "1px solid #1a4a1a", color: "#7fff7f", padding: "7px 10px", fontSize: 12, width: "100%", outline: "none", fontStyle: "italic" }} />
          </div>
          <pre style={{ ...mono, background: "rgba(0,0,0,0.4)", border: "1px solid #0d3d0d", padding: "10px 14px", fontSize: 11, color: "#7fff7f", marginBottom: 10, lineHeight: 1.7 }}>{jsonContent}</pre>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => copy(jsonContent, "json")} style={{ ...mono, background: "transparent", border: "1px solid #1a4a1a", color: "#1a6a1a", padding: "5px 10px", cursor: "pointer", fontSize: 10 }}>{copied === "json" ? "✓ copied" : "⎘ copy json"}</button>
          </div>
        </div>

        <div style={{ border: "1px solid #1a4a1a", padding: "10px 14px", background: "rgba(0,0,0,0.1)" }}>
          <div style={{ color: "#1a8a1a", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>// checklist</div>
          <div style={{ color: "#1a6a1a", fontSize: 11, lineHeight: 2.2, ...mono }}>
            ☐ Preview matches your vision<br />
            ☐ Spaces used — not tabs<br />
            ☐ Files saved via File → Save<br />
            ☐ Artist name + epitaph filled (optional but permanent)<br />
            ☐ Tulip number auto-assigned by inscription order
          </div>
        </div>
      </div>

      <div id="build-info" style={{visibility:"hidden", opacity:0.25, color:"#39ff14", fontSize:10, fontFamily:"monospace", padding:"4px 16px", borderTop:"1px solid #0d3d0d", letterSpacing:2}}>
        Ubuntu 22.04.3 LTS &mdash; build: 0x4B1D
      </div>

      {terminals.length > 0 && (
        <div style={{ borderTop: "1px solid #39ff1430" }}>
          <div style={{ display: "flex", background: "#0d1a0d" }}>
            {terminals.map((term: Terminal) => (
              <div key={term.id}
                onClick={() => setActiveTerminalId(term.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 14px",
                  cursor: "pointer",
                  background: activeId === term.id ? "#020a02" : "transparent",
                  borderRight: "1px solid #1a4a1a",
                  borderBottom: activeId === term.id ? "1px solid #020a02" : "1px solid #1a4a1a",
                  color: activeId === term.id ? "#39ff14" : "#1a6a1a",
                  fontSize: 10, fontFamily: "monospace", letterSpacing: 2
                }}>
                <span>{term.type === "bash" ? "BASH" : term.type === "ubuntu" ? "UBUNTU" : "RESTRICTED"}</span>
                <button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); closeTerminal(term.id); }}
                  style={{ background: "transparent", border: "none", color: activeId === term.id ? "#39ff1480" : "#0d3d0d", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
          {terminals.map((term: Terminal) => (
            activeId === term.id && (
              <div key={term.id}>
                {term.type === "bash" ? (
                  <BashTerminal onClose={() => closeTerminal(term.id)} noHeader />
                ) : term.type === "ubuntu" ? (
                  <UbuntuTerminal onClose={() => closeTerminal(term.id)} noHeader />
                ) : (
                  <RestrictedTerminal onUnlock={() => {
                    setUbuntuUnlocked(true);
                    try { localStorage.setItem("tg_ubuntu_unlocked", "true"); } catch {}
                    closeTerminal(term.id);
                  }} />
                )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

interface BashTerminalProps {
  onClose: () => void;
  noHeader?: boolean;
}

function BashTerminal({ onClose, noHeader }: BashTerminalProps): React.ReactElement {
  const [lines, setLines] = useState<string[]>(["bash-5.2$ "]);
  const [input, setInput] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const mono: React.CSSProperties = { fontFamily: "monospace" };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== "Enter") return;
    const cmd: string = input.trim();
    const newLines: string[] = [...lines.slice(0, -1), `bash-5.2$ ${cmd}`];

    const printfMatch: RegExpMatchArray | null = cmd.match(/^printf\s+"?%x\\n"?\s+(\d+)$/);
    if (printfMatch) {
      const num: number = parseInt(printfMatch[1]);
      const hex: string = num.toString(16);
      newLines.push(hex);
    } else if (cmd === "") {
    } else if (cmd.startsWith("printf")) {
      newLines.push(`printf: invalid format — try: printf "%x\n" 672274793`);
    } else {
      newLines.push(`bash: ${cmd.split(" ")[0]}: command not found`);
    }

    newLines.push("bash-5.2$ ");
    setLines(newLines);
    setInput("");
  };

  return (
    <div style={{ background: "#020a02", ...mono }}>
      {!noHeader && (
        <div style={{ background: "#0d1a0d", borderBottom: "1px solid #1a4a1a", padding: "4px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#1a6a1a", fontSize: 10, letterSpacing: 2 }}>BASH</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#1a6a1a", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
        </div>
      )}
      <div style={{ padding: "10px 14px", height: 180, overflowY: "auto", fontSize: 12, color: "#39ff14" }}>
        {lines.map((l: string, i: number) => (
          <div key={i}>{i === lines.length - 1 ? (
            <span>
              {l}
              <input value={input} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} onKeyDown={handleKey} autoFocus
                style={{ background: "transparent", border: "none", outline: "none", color: "#39ff14", fontSize: 12, fontFamily: "monospace", width: "60%" }} />
            </span>
          ) : l}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

interface UbuntuTerminalProps {
  onClose: () => void;
  noHeader?: boolean;
}

function UbuntuTerminal({ onClose, noHeader }: UbuntuTerminalProps): React.ReactElement {
  const [stage, setStage] = useState<"login" | "password" | "root" | "done">("login");
  const [lines, setLines] = useState<string[]>(["Ubuntu 22.04.3 LTS tulip-garden tty1", "", "tulip-garden login: "]);
  const [input, setInput] = useState<string>("");
  const [showInput, setShowInput] = useState<boolean>(true);
  const [kernelPanic, setKernelPanic] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mono: React.CSSProperties = { fontFamily: "monospace" };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines, kernelPanic]);

  const addLine = (line: string): void => setLines(l => [...l, line]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== "Enter") return;
    const cmd: string = input.trim();
    setInput("");

    if (stage === "login") {
      setLines(l => [...l.slice(0, -1), `tulip-garden login: ${cmd}`, "Password: "]);
      if (cmd === "root") {
        setStage("password");
      } else {
        setTimeout(() => {
          setLines(l => [...l, "Login incorrect", "", "tulip-garden login: "]);
        }, 800);
        setStage("login");
      }
      return;
    }

    if (stage === "password") {
      setLines(l => [...l.slice(0, -1), "Password: "]);
      if (cmd === "@") {
        setTimeout(() => {
          setLines(l => [...l,
            "",
            "Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic x86_64)",
            "",
            "Last login: " + new Date().toUTCString(),
            "",
            "root@tulip-garden:~# "
          ]);
          setStage("root");
        }, 600);
      } else {
        setTimeout(() => {
          setLines(l => [...l, "", "Login incorrect", "", "tulip-garden login: "]);
          setStage("login");
        }, 800);
      }
      return;
    }

    if (stage === "root") {
      setLines(l => [...l.slice(0, -1), `root@tulip-garden:~# ${cmd}`]);

      const printfMatch: RegExpMatchArray | null = cmd.match(/printf\s+"?%x\\n"?\s+(\d+)/);
      if (printfMatch) {
        const num: number = parseInt(printfMatch[1]);
        setLines(l => [...l, num.toString(16), "", "root@tulip-garden:~# "]);
        return;
      }

      const rebootMatch: boolean = cmd.includes("0xFEE1DEAD") && cmd.includes("0x28121969");
      if (rebootMatch) {
        setShowInput(false);
        setKernelPanic(true);
        return;
      }

      setLines(l => [...l,
        `bash: ${cmd.split("(")[0].trim()}: Permission denied`,
        "hint: this machine only reboots.",
        "",
        "root@tulip-garden:~# "
      ]);
    }
  };

  if (kernelPanic) {
    return (
      <div style={{ background: "#020a02", ...mono }}>
        {!noHeader && (
          <div style={{ background: "#0d1a0d", borderBottom: "1px solid #1a4a1a", padding: "4px 12px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#ff4444", fontSize: 10, letterSpacing: 2 }}>UBUNTU — KERNEL PANIC</span>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#1a6a1a", cursor: "pointer", fontSize: 14 }}>×</button>
          </div>
        )}
        <KernelPanicAnimation onDone={() => { setKernelPanic(false); setStage("login"); setLines(["Ubuntu 22.04.3 LTS tulip-garden tty1", "", "tulip-garden login: "]); setShowInput(true); }} />
      </div>
    );
  }

  return (
    <div style={{ background: "#020a02", ...mono }}>
      {!noHeader && (
        <div style={{ background: "#0d1a0d", borderBottom: "1px solid #1a4a1a", padding: "4px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#1a6a1a", fontSize: 10, letterSpacing: 2 }}>UBUNTU 22.04.3 LTS</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#1a6a1a", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
        </div>
      )}
      <div style={{ padding: "10px 14px", height: 220, overflowY: "auto", fontSize: 12, color: "#39ff14" }}>
        {lines.map((l: string, i: number) => (
          <div key={i} style={{ color: i < 3 ? "#1a8a1a" : "#39ff14" }}>
            {i === lines.length - 1 && showInput ? (
              <span>
                {l}
                <input value={input} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} onKeyDown={handleKey} autoFocus
                  style={{ background: "transparent", border: "none", outline: "none", color: "#39ff14", fontSize: 12, fontFamily: "monospace", width: "60%", ...(stage === "password" ? { WebkitTextSecurity: "disc" } as React.CSSProperties : {}) }} />
              </span>
            ) : l}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

interface KernelPanicAnimationProps {
  onDone: () => void;
}

function KernelPanicAnimation({ onDone }: KernelPanicAnimationProps): React.ReactElement {
  const [lines, setLines] = useState<PanicLine[]>([]);
  const mono: React.CSSProperties = { fontFamily: "monospace" };

  const panicLines: PanicConfig[] = [
    { text: "", delay: 0 },
    { text: "[    0.000000] KERNEL PANIC — not syncing", delay: 100 },
    { text: "[    0.000001] magic value accepted: 0xFEE1DEAD", delay: 400 },
    { text: "[    0.000002] magic2 verified: 0x28121969", delay: 700 },
    { text: "[    0.000003] CR0: 0x4B1D", delay: 1000 },
    { text: "[    0.000004] process: tulip (pid: 0)", delay: 1300 },
    { text: "[    0.000005] CPU: 0 PID: 0 Comm: tulip Not tainted", delay: 1600 },
    { text: "[    0.000006] ...", delay: 1900 },
    { text: "[    0.000007] ...", delay: 2100 },
    { text: "[    0.000008] memory fault at 0xefface", delay: 2400, color: "#ff4444" },
    { text: "[    0.000009] system halted.", delay: 2800 },
    { text: "", delay: 3200 },
    { text: "awaiting reboot...", delay: 3600 },
  ];

  useEffect(() => {
    panicLines.forEach(({ text, delay, color }: PanicConfig) => {
      setTimeout(() => {
        setLines(l => [...l, { text, color }]);
      }, delay);
    });
    setTimeout(onDone, 7000);
  }, []);

  return (
    <div style={{ padding: "14px", height: 260, overflowY: "auto", fontSize: 12, ...mono }}>
      {lines.map((l: PanicLine, i: number) => (
        <div key={i} style={{ color: l.color || (l.text.includes("0xefface") ? "#ff4444" : "#39ff14"), marginBottom: 2 }}>{l.text}</div>
      ))}
    </div>
  );
}

interface RestrictedTerminalProps {
  onUnlock: () => void;
}

function RestrictedTerminal({ onUnlock }: RestrictedTerminalProps): React.ReactElement {
  const [input, setInput] = useState<string>("");
  const [lines, setLines] = useState<string[]>(["ACCESS LOCKED", "this terminal requires authorization.", "", "password: "]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mono: React.CSSProperties = { fontFamily: "monospace" };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== "Enter") return;
    const pwd: string = input;
    setInput("");
    if (pwd === "0x4B1D") {
      setLines(l => [...l.slice(0, -1), "password: ••••••", "", "ACCESS GRANTED — unlocking..."]);
      setTimeout(() => onUnlock(), 800);
    } else {
      setLines(l => [...l.slice(0, -1), "password: ••••••", "ACCESS DENIED — incorrect password", "", "password: "]);
    }
  };

  return (
    <div style={{ background: "#020a02", ...mono }} onClick={() => inputRef.current?.focus()}>
      <div style={{ padding: "10px 14px", height: 180, overflowY: "auto", fontSize: 12 }}>
        {lines.map((l: string, i: number) => (
          <div key={i} style={{
            color: l.startsWith("ACCESS DENIED") ? "#ff4444" : l.startsWith("ACCESS GRANTED") ? "#39ff14" : l === "ACCESS LOCKED" ? "#1a4a1a" : "#1a8a1a"
          }}>
            {i === lines.length - 1 && l === "password: " ? (
              <span>
                <span style={{ color: "#1a8a1a" }}>{l}</span>
                <input ref={inputRef} value={input} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} onKeyDown={handleKey} autoFocus
                  style={{ background: "transparent", border: "none", outline: "none", color: "#39ff14", fontSize: 12, fontFamily: "monospace", width: "50%", WebkitTextSecurity: "disc", caretColor: "#39ff14" } as React.CSSProperties} />
              </span>
            ) : l}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}


const TOOLS: [string, string][] = [["OrdinalsBot","ordinalsbot.com"],["UniSat","unisat.io/inscribe"],["Gamma","gamma.io/inscribe"],["OrdDropz","ord-dropz.xyz"],["ord CLI","docs.ordinals.com"]];
function ToolChooser(): React.ReactElement {
  const [clicks, setClicks] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch(`${API_BASE}/tool-clicks`).then(r => r.json()).then(setClicks).catch(() => {});
  }, []);
  const total: number = Object.values(clicks).reduce((a: number, b: number) => a + b, 0);
  const handleClick = (name: string): void => {
    setClicks(prev => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
    fetch(`${API_BASE}/tool-clicks/${encodeURIComponent(name)}`, { method: "POST" }).catch(() => {});
  };
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>STEP 2 — CHOOSE YOUR TOOL</div>
      {TOOLS.map(([name, url]: [string, string]) => {
        const count: number = clicks[name] || 0;
        const pct: number = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={name} style={{ marginBottom: 6, paddingLeft: 8, borderLeft: "1px solid #1a4a1a", display: "flex", alignItems: "center", gap: 8 }}>
            <a href={`https://${url}`} target="_blank" rel="noopener noreferrer" onClick={() => handleClick(name)} style={{ color: "#7fff7f", textDecoration: "none", fontSize: 11 }}>{name}</a>
            {count > 0 && <span style={{ color: "#1a4a1a", fontSize: 9 }}>{count} click{count !== 1 ? "s" : ""} · {pct}%</span>}
          </div>
        );
      })}
      {total > 0 && <div style={{ color: "#1a4a1a", fontSize: 9, marginTop: 8 }}>{total} total clicks</div>}
    </div>
  );
}

function MarketplacePoll(): React.ReactElement {
  const [votes,setVotes] = useState<Record<string, number>>({});
  const [userVote,setUserVote] = useState<string | null>(null);
  const [loaded,setLoaded] = useState<boolean>(false);
  const [newsPosts,setNewsPosts] = useState<NewsPost[]>([]);
  useEffect(()=>{
    fetch(`${API_BASE}/poll`).then(r=>r.json()).then(setVotes).catch(()=>{});
    fetch(`${API_BASE}/poll/my-vote`)
      .then(r=>r.json())
      .then((serverVote: string | null)=>{
        if(serverVote){
          setUserVote(serverVote);
          try{localStorage.setItem(POLL_KEY,serverVote);}catch{}
        }else{
          try{const uv=localStorage.getItem(POLL_KEY);if(uv)setUserVote(uv);}catch{}
        }
      })
      .catch(()=>{
        try{const uv=localStorage.getItem(POLL_KEY);if(uv)setUserVote(uv);}catch{}
      })
      .finally(()=>setLoaded(true));
  },[]);
  const vote=(id: string): void=>{
    if(userVote===id)return;
    fetch(`${API_BASE}/poll/${encodeURIComponent(id)}`,{method:"POST"})
      .then(r=>r.json())
      .then((data: {votes:Record<string,number>;your_vote:string|null;status:string})=>{
        setVotes(data.votes);
        if(data.your_vote){
          setUserVote(data.your_vote);
          try{localStorage.setItem(POLL_KEY,data.your_vote);}catch{}
        }
      })
      .catch(()=>{});
  };
  const total: number=Object.values(votes).reduce((a: number,b: number)=>a+b,0);
  const maxVotes: number=Math.max(...Object.values(votes),1);
  const mono: React.CSSProperties={fontFamily:"monospace"};

  const [comments,setComments] = useState<Comment[]>([]);
  const [commentText,setCommentText] = useState<string>("");
  const [commentName,setCommentName] = useState<string>("");
  const [commentError,setCommentError] = useState<string>("");
  const [isCommenting,setIsCommenting] = useState<boolean>(false);
  const [likedComments,setLikedComments] = useState<Record<string, boolean>>(()=>{try{return JSON.parse(localStorage.getItem("tg_comment_reactions")||"{}");} catch{return{};}});
  useEffect(()=>{fetch(`${API_BASE}/comments`).then(r=>r.json()).then(setComments).catch(()=>{});},[]);
  useEffect(()=>{fetch(`${API_BASE}/news?limit=2`).then(r=>r.json()).then(setNewsPosts).catch(()=>{});},[]);
  const addComment=(): void=>{
    setCommentError("");
    const text=commentText.trim();
    const name=commentName.trim();
    if(!text){setCommentError("ERR: comment text required");return;}
    if(text.length>500){setCommentError("ERR: comment too long (max 500)");return;}
    if(name.length>50){setCommentError("ERR: name too long (max 50)");return;}
    setIsCommenting(true);
    fetch(`${API_BASE}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name||null,text})})
      .then(r=>{if(!r.ok)return r.json().then((e:{error?:string})=>{throw new Error(e.error||"failed")});return r.json();})
      .then((c: Comment)=>{setComments(prev=>[c,...prev]);setCommentText("");})
      .catch((e: Error)=>setCommentError(`ERR: ${e.message}`))
      .finally(()=>setIsCommenting(false));
  };
  const reactComment=(id: string,type: "like" | "dislike"): void=>{
    if(likedComments[`${id}_${type}`])return;
    fetch(`${API_BASE}/comments/${id}/${type}`,{method:"POST"}).then(r=>{
      if(!r.ok)throw new Error("failed");return r.json();
    }).then((updated: Comment)=>{
      setComments(prev=>prev.map(c=>c.id===updated.id?updated:c));
      const nr: Record<string, boolean>={...likedComments,[`${id}_${type}`]:true};
      setLikedComments(nr);
      try{localStorage.setItem("tg_comment_reactions",JSON.stringify(nr));}catch{}
    }).catch(()=>{});
  };

  const [submitName,setSubmitName] = useState<string>("");
  const [submitUrl,setSubmitUrl] = useState<string>("");
  const [submitDesc,setSubmitDesc] = useState<string>("");
  const [submitType,setSubmitType] = useState<string>("marketplace");
  const [submitted,setSubmitted] = useState<boolean>(false);
  const [submitError,setSubmitError] = useState<string>("");
  const [isSubmitting,setIsSubmitting] = useState<boolean>(false);
  const submitTool=(): void=>{
    setSubmitError("");
    const name=submitName.trim();
    const url=submitUrl.trim();
    const desc=submitDesc.trim();
    if(!name){setSubmitError("ERR: name required");return;}
    if(!url){setSubmitError("ERR: url required");return;}
    if(!/^https?:\/\/.+/.test(url)){setSubmitError("ERR: url must start with http:// or https://");return;}
    if(name.length>100){setSubmitError("ERR: name too long (max 100)");return;}
    if(url.length>500){setSubmitError("ERR: url too long (max 500)");return;}
    if(desc.length>300){setSubmitError("ERR: description too long (max 300)");return;}
    setIsSubmitting(true);
    fetch(`${API_BASE}/submissions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,url,desc,type:submitType})})
      .then(r=>{if(!r.ok)return r.json().then((e:{error?:string})=>{throw new Error(e.error||"failed")});return r.json();})
      .then(()=>{setSubmitName("");setSubmitUrl("");setSubmitDesc("");setSubmitType("marketplace");setSubmitted(true);setTimeout(()=>setSubmitted(false),3000);})
      .catch((e: Error)=>setSubmitError(`ERR: ${e.message}`))
      .finally(()=>setIsSubmitting(false));
  };

  const inputStyle: React.CSSProperties={...mono,background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",color:"#7fff7f",padding:"7px 10px",fontSize:11,width:"100%",outline:"none"};

  return (
    <div style={{marginBottom:32}}>
      <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:4}}>⬡ POLL — WEEKLY MARKETPLACE SENTIMENT</div>
      <div style={{color:"#0d3d0d",fontSize:9,letterSpacing:1,marginBottom:12,fontStyle:"italic"}}>*results posted every thursday*</div>
      <div style={{color:"#1a6a1a",fontSize:11,marginBottom:20,lineHeight:1.8}}>
        {total>0?`${total} vote${total!==1?"s":""} cast.`:"Be the first to vote."}
        {userVote&&<span style={{color:"#7fff7f"}}> You voted for {MARKETPLACES.find(m=>m.id===userVote)?.name}.</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {MARKETPLACES.filter(m=>m.type!=="tool").map((m: Marketplace)=>{
          const count: number=votes[m.id]||0;
          const pct: number=total>0?Math.round((count/total)*100):0;
          const barWidth: number=total>0?(count/maxVotes)*100:0;
          const voted: boolean=userVote===m.id;
          return (
            <div key={m.id} style={{border:`1px solid ${voted?"#39ff14":"#1a4a1a"}`,padding:"12px 14px",background:voted?"rgba(57,255,20,0.06)":"rgba(57,255,20,0.02)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                <button onClick={()=>vote(m.id)} disabled={voted} style={{...mono,background:voted?"rgba(57,255,20,0.2)":"transparent",border:`1px solid ${voted?"#39ff14":"#1a4a1a"}`,color:voted?"#39ff14":"#1a6a1a",padding:"4px 10px",cursor:voted?"default":"pointer",fontSize:10,letterSpacing:1,flexShrink:0}}>
                  {voted?"✓ VOTED":"VOTE"}
                </button>
                <span style={{color:voted?"#39ff14":"#7fff7f",fontSize:12,...mono}}>{m.name}</span>
                <span style={{color:"#1a6a1a",fontSize:11,marginLeft:"auto",...mono}}>{count} · {pct}%</span>
              </div>
              <div style={{height:3,background:"#0d3d0d"}}>
                <div style={{height:"100%",width:`${barWidth}%`,background:voted?"#39ff14":"#1a8a1a",transition:"width 0.5s ease"}} />
              </div>
            </div>
          );
        })}
      </div>
      {userVote&&<div style={{color:"#1a4a1a",fontSize:10,marginTop:8,...mono}}>click another option to change your vote</div>}

      <div style={{marginTop:32,borderTop:"1px solid #0d3d0d",paddingTop:24}}>
        <AnalyticsPlaceholder />
      </div>

      <div style={{marginTop:32,borderTop:"1px solid #0d3d0d",paddingTop:24}}>
        <NewsSection posts={newsPosts} limit={2} />
      </div>

      <div style={{marginTop:32,borderTop:"1px solid #0d3d0d",paddingTop:20}}>
        <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:16}}>⬡ COMMENTS || SUGGESTIONS</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {comments.length===0&&<div style={{color:"#1a4a1a",fontSize:11,...mono}}>No comments yet. Be the first.</div>}
          {comments.map((c: Comment, i: number)=>(
            <div key={i} style={{border:"1px solid #1a4a1a",padding:"10px 12px",background:"rgba(57,255,20,0.02)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:"#7fff7f",fontSize:11,...mono}}>{c.name}</span>
                <span style={{color:"#1a4a1a",fontSize:9,...mono}}>{new Date(c.ts).toLocaleDateString()} {new Date(c.ts).toLocaleTimeString()}</span>
              </div>
              <div style={{color:"#1a6a1a",fontSize:11,lineHeight:1.6,...mono}}>{c.text}</div>
              <div style={{display:"flex",gap:12,marginTop:6}}>
                <button onClick={()=>reactComment(c.id,"like")} disabled={likedComments[`${c.id}_like`]} style={{...mono,background:"transparent",border:"none",color:likedComments[`${c.id}_like`]?"#39ff14":"#1a4a1a",cursor:likedComments[`${c.id}_like`]?"default":"pointer",fontSize:10,padding:0}}>♥ {c.likes||0}</button>
                <button onClick={()=>reactComment(c.id,"dislike")} disabled={likedComments[`${c.id}_dislike`]} style={{...mono,background:"transparent",border:"none",color:likedComments[`${c.id}_dislike`]?"#ff4444":"#1a4a1a",cursor:likedComments[`${c.id}_dislike`]?"default":"pointer",fontSize:10,padding:0}}>▼ {c.dislikes||0}</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input value={commentName} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setCommentName(e.target.value)} placeholder="name (optional)" maxLength={50} style={{...inputStyle,width:"30%"}} />
          <input value={commentText} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setCommentText(e.target.value)} placeholder="leave a comment..." maxLength={500} style={inputStyle} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>)=>{if(e.key==="Enter")addComment();}} />
          <button onClick={addComment} disabled={isCommenting} style={{...mono,background:"transparent",border:"1px solid #1a4a1a",color:"#1a6a1a",padding:"7px 14px",cursor:isCommenting?"default":"pointer",fontSize:10,letterSpacing:1,flexShrink:0,opacity:isCommenting?0.5:1}}>{isCommenting?"...":"POST"}</button>
        </div>
        {commentError&&<div style={{color:"#ff4444",fontSize:10,fontFamily:"monospace",padding:"4px 8px",border:"1px solid #441a1a",background:"rgba(255,0,0,0.05)",marginBottom:8}}>{commentError}</div>}
      </div>

      <div style={{marginTop:32,borderTop:"1px solid #0d3d0d",paddingTop:20}}>
        <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:8}}>⬡ SUBMIT A TOOL OR MARKETPLACE</div>
        <div style={{color:"#1a4a1a",fontSize:10,marginBottom:16,...mono}}>Submissions reviewed before being added to the directory.</div>
        {submitted?(
          <div style={{color:"#39ff14",fontSize:12,padding:20,border:"1px solid #1a4a1a",textAlign:"center",...mono}}>✓ Thank you! Your submission has been recorded.</div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <input value={submitName} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setSubmitName(e.target.value)} placeholder="tool/marketplace name *" maxLength={100} style={inputStyle} />
            <input value={submitUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setSubmitUrl(e.target.value)} placeholder="url *" maxLength={500} style={inputStyle} />
            <input value={submitDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setSubmitDesc(e.target.value)} placeholder="short description" maxLength={300} style={inputStyle} />
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:"#1a6a1a",fontSize:10,...mono}}>TYPE:</span>
              {["marketplace","tool","other"].map((t: string)=>(
                <button key={t} onClick={()=>setSubmitType(t)} style={{...mono,background:submitType===t?"rgba(57,255,20,0.1)":"transparent",border:`1px solid ${submitType===t?"#39ff14":"#1a4a1a"}`,color:submitType===t?"#39ff14":"#1a6a1a",padding:"4px 10px",cursor:"pointer",fontSize:10,letterSpacing:1}}>{t.toUpperCase()}</button>
              ))}
            </div>
            {submitError&&<div style={{color:"#ff4444",fontSize:10,fontFamily:"monospace",padding:"4px 8px",border:"1px solid #441a1a",background:"rgba(255,0,0,0.05)"}}>{submitError}</div>}
            <button onClick={submitTool} disabled={isSubmitting} style={{...mono,background:"transparent",border:"1px solid #1a4a1a",color:"#1a6a1a",padding:"8px 14px",cursor:isSubmitting?"default":"pointer",fontSize:10,letterSpacing:1,alignSelf:"flex-start",marginTop:4,opacity:isSubmitting?0.5:1}}>{isSubmitting?"...":"SUBMIT"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketplaceDirectory(): React.ReactElement {
  const mono: React.CSSProperties={fontFamily:"monospace"};
  const mkts: Marketplace[]=MARKETPLACES.filter(m=>m.type==="marketplace");
  const tools: Marketplace[]=MARKETPLACES.filter(m=>m.type==="tool");
  const both: Marketplace[]=MARKETPLACES.filter(m=>m.type==="both");
  const linkStyle: React.CSSProperties={color:"#7fff7f",fontSize:12,textDecoration:"none",border:"1px solid #1a4a1a",padding:"10px 14px",background:"rgba(57,255,20,0.02)",display:"block",...mono};
  const sectionTitle=(text: string): React.ReactElement=><div style={{color:"#1a8a1a",fontSize:10,letterSpacing:2,marginBottom:8,marginTop:24}}>{text}</div>;
  return (
    <div>
      <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:8}}>⬡ MARKETPLACE / TOOLS LINKS</div>
      {sectionTitle("// MARKETPLACES")}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {mkts.map((m: Marketplace)=>(<a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>→ {m.name}</a>))}
      </div>
      {sectionTitle("// TOOLS")}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {tools.map((m: Marketplace)=>(<a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>→ {m.name}</a>))}
      </div>
      {sectionTitle("// BOTH (MARKETPLACE + TOOL)")}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {both.map((m: Marketplace)=>(<a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>→ {m.name}</a>))}
      </div>
    </div>
  );
}

function AnalyticsPlaceholder(): React.ReactElement {
  const bars = [
    {label:"MON",h:35},{label:"TUE",h:52},{label:"WED",h:44},{label:"THU",h:68},{label:"FRI",h:61},{label:"SAT",h:38},{label:"SUN",h:29},
    {label:"MON",h:45},{label:"TUE",h:58},{label:"WED",h:72},{label:"THU",h:55},{label:"FRI",h:40},{label:"SAT",h:33},{label:"SUN",h:48},
  ];
  return (
    <div>
      <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:4}}>⬡ ANALYTICS — ON-CHAIN DATA</div>
      <div style={{color:"#0d3d0d",fontSize:9,letterSpacing:1,marginBottom:20,fontStyle:"italic"}}>*powered by dune analytics*</div>
      <div style={{position:"relative",border:"1px solid #0d2d0d",padding:"24px 16px 16px",background:"rgba(0,0,0,0.2)",opacity:0.4,filter:"blur(0.5px)"}}>
        <div style={{color:"#1a4a1a",fontSize:9,letterSpacing:1,marginBottom:12}}>DAILY INSCRIPTION VOLUME (BTC)</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:3,height:90,marginBottom:8}}>
          {bars.map((b,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:"100%",height:b.h,background:"linear-gradient(to top, #0d3d0d, #1a6a1a)",borderTop:"1px solid #1a4a1a"}} />
              <div style={{fontSize:6,color:"#0d3d0d",letterSpacing:0.5}}>{b.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #0d2d0d",paddingTop:8,fontSize:8,color:"#0d3d0d"}}>
          <span>↳ 14D RANGE</span>
          <span>AVG: 0.00 BTC</span>
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:-60,position:"relative",zIndex:2}}>
        <div style={{color:"#1a6a1a",fontSize:14,letterSpacing:3,fontFamily:"monospace"}}>⬡ COMING SOON</div>
        <div style={{color:"#0d3d0d",fontSize:10,marginTop:6,fontFamily:"monospace"}}>live on-chain analytics · marketplace volume · inscription trends</div>
      </div>
      <div style={{height:30}} />
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[]=[];
  let remaining=text;
  let key=0;
  while(remaining.length>0){
    const boldMatch=remaining.match(/\*\*(.+?)\*\*/);
    const linkMatch=remaining.match(/\[(.+?)\]\((.+?)\)/);
    const boldIdx=boldMatch?remaining.indexOf(boldMatch[0]):Infinity;
    const linkIdx=linkMatch?remaining.indexOf(linkMatch[0]):Infinity;
    if(boldIdx===Infinity&&linkIdx===Infinity){parts.push(remaining);break;}
    if(boldIdx<=linkIdx&&boldMatch){
      if(boldIdx>0)parts.push(remaining.slice(0,boldIdx));
      parts.push(<span key={key++} style={{color:"#39ff14"}}>{boldMatch[1]}</span>);
      remaining=remaining.slice(boldIdx+boldMatch[0].length);
    }else if(linkMatch){
      if(linkIdx>0)parts.push(remaining.slice(0,linkIdx));
      parts.push(<a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{color:"#1a8a1a",textDecoration:"none"}}>{linkMatch[1]}</a>);
      remaining=remaining.slice(linkIdx+linkMatch[0].length);
    }
  }
  return parts.length===1?parts[0]:<>{parts}</>;
}

function SimpleMarkdown({content}:{content:string}): React.ReactElement {
  const mono: React.CSSProperties={fontFamily:"monospace"};
  const lines=content.split("\n");
  const elements: React.ReactElement[]=[];
  let i=0;
  while(i<lines.length){
    const line=lines[i];
    if(line.startsWith("## ")){
      elements.push(<div key={i} style={{color:"#7fff7f",fontSize:10,letterSpacing:1,marginBottom:6,marginTop:i>0?12:0,...mono}}>{line.slice(3)}</div>);
      i++;continue;
    }
    if(line.match(/^[-*] /)){
      elements.push(<div key={i} style={{color:"#1a6a1a",fontSize:11,lineHeight:1.8,...mono,paddingLeft:12}}>· {renderInline(line.slice(2))}</div>);
      i++;continue;
    }
    if(line.trim()===""){i++;continue;}
    elements.push(<p key={i} style={{margin:"0 0 10px 0"}}>{renderInline(line)}</p>);
    i++;
  }
  return <>{elements}</>;
}

function NewsSection({posts,limit}:{posts:NewsPost[];limit?:number}): React.ReactElement {
  const mono: React.CSSProperties={fontFamily:"monospace"};
  const displayed=limit?posts.slice(0,limit):posts;
  const formatMonth=(ts:number):string=>{const d=new Date(ts);return `${d.toLocaleString("default",{month:"long"}).toUpperCase()} ${d.getFullYear()}`;};
  if(displayed.length===0){
    return (
      <div>
        <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:4}}>⬡ NEWS</div>
        <div style={{color:"#1a4a1a",fontSize:11,...mono}}>No news yet. Check back soon.</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:4}}>⬡ NEWS</div>
      <div style={{color:"#0d3d0d",fontSize:9,letterSpacing:1,marginBottom:20,fontStyle:"italic"}}>*latest updates from the ordinals ecosystem*</div>
      {displayed.map((post:NewsPost)=>(
        <div key={post.id} style={{border:"1px solid #1a4a1a",padding:"16px",background:"rgba(57,255,20,0.02)",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{color:"#39ff14",fontSize:11,letterSpacing:1,...mono}}>{post.title}</span>
            <span style={{color:"#0d3d0d",fontSize:9,...mono}}>{formatMonth(post.ts)}</span>
          </div>
          {post.link&&<a href={post.link} target="_blank" rel="noopener noreferrer" style={{color:"#1a8a1a",fontSize:10,textDecoration:"none",display:"block",marginBottom:14,...mono}}>↗ {post.link.replace(/^https?:\/\//,"")}</a>}
          <div style={{color:"#1a6a1a",fontSize:11,lineHeight:1.8,...mono}}>
            <SimpleMarkdown content={post.content} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsTab(): React.ReactElement {
  const [posts,setPosts]=useState<NewsPost[]>([]);
  const [loading,setLoading]=useState<boolean>(true);
  useEffect(()=>{
    fetch(`${API_BASE}/news`).then(r=>r.json()).then(setPosts).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  if(loading)return <div style={{color:"#1a6a1a",fontSize:11,fontFamily:"monospace"}}>LOADING NEWS...</div>;
  return <NewsSection posts={posts} />;
}

function OrdCliGuide(): React.ReactElement {
  const mono: React.CSSProperties={fontFamily:"monospace"};
  const code: React.CSSProperties={background:"rgba(0,0,0,0.4)",border:"1px solid #1a4a1a",padding:"10px 14px",fontSize:11,color:"#7fff7f",display:"block",whiteSpace:"pre",overflowX:"auto",...mono,lineHeight:1.7,marginBottom:16};
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

export default function TulipGarden(): React.ReactElement {
  const [tulips,setTulips] = useState<Tulip[]>([]);
  const [loading,setLoading] = useState<boolean>(true);
  const [error,setError] = useState<string | null>(null);
  const [lastRefresh,setLastRefresh] = useState<Date | null>(null);
  const [tab,setTab] = useState<string>("tools");
  const [gardenView,setGardenView] = useState<string>("about");
  const [toolsSubTab,setToolsSubTab] = useState<string>("poll");

  const fetchTulips = useCallback(async(): Promise<void>=>{
    try{
      setLoading(true);
      const res: Response=await fetch(`${ORDINALS_BASE}/r/children/${PARENT_ID}`);
      const data: { ids?: string[]; more?: boolean }=await res.json();
      const fetchItem=async(id: string, i: number): Promise<Tulip>=>{
        try{
          const cr: Response=await fetch(`${ORDINALS_BASE}/content/${id}`);
          const ct: string=cr.headers.get("content-type")||"";
          let content: string="",artist: string | null=null,tulipNum: number=i,color: string | null=null,epitaph: string | null=null;
          if(ct.includes("text")){
            const text: string=await cr.text();
            try{
              const j: Record<string, string>=JSON.parse(text);
              artist=j.artist||null;
              color=j.color||null;
              epitaph=j.epitaph||null;
              content=j.content||j.art||j.tulip||j.ascii||j.body||j.text||"";
            }catch{
              content=text.replace(/\r/g,"").replace(/[ \t]+$/gm,"").replace(/^\n+|\n+$/g,"");
            }
          }
          // Also fetch CBOR metadata attached to the inscription (artist, color, epitaph, collection, etc.)
          try{
            const mr: Response=await fetch(`${ORDINALS_BASE}/r/metadata/${id}`);
            if(mr.ok){
              const raw = await mr.json();
              // /r/metadata/ returns hex-encoded CBOR — decode it
              const meta = (typeof raw === 'string') ? decodeCborHex(raw) : (typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : null);
              if(meta){
                if(!artist && meta.artist) artist=String(meta.artist);
                if(!color && meta.color) color=String(meta.color);
                if(!epitaph && meta.epitaph) epitaph=String(meta.epitaph);
                if(meta.tulip_number != null) tulipNum=Number(meta.tulip_number);
              }
            }
          }catch{}
          // Fetch inscription properties (number, address, height, timestamp, etc.)
          let inscription: InscriptionInfo | null = null;
          try{
            const ir: Response=await fetch(`${ORDINALS_BASE}/r/inscription/${id}`);
            if(ir.ok){
              const info = await ir.json();
              inscription = {
                number: info.number ?? null,
                address: info.address ?? null,
                content_type: info.content_type ?? null,
                content_length: info.content_length ?? null,
                height: info.height ?? null,
                timestamp: info.timestamp ?? null,
                fee: info.fee ?? null,
                value: info.value ?? null,
                sat: info.sat ?? null,
                charms: Array.isArray(info.charms) ? info.charms : [],
                output: info.output ?? null,
              };
            }
          }catch{}
          return{id,content,artist,tulipNum,color,epitaph,inscription};
        }catch{return{id,content:MINI_TULIP,artist:null,tulipNum:i,color:null,epitaph:null,inscription:null};}
      };
      let allIds: string[]=[...(data.ids||[])];
      if(data.more){
        let page: number=1;
        while(true){
          const nd: { ids?: string[]; more?: boolean }=await(await fetch(`${ORDINALS_BASE}/r/children/${PARENT_ID}/${page}`)).json();
          allIds=[...allIds,...(nd.ids||[])];
          if(!nd.more)break;page++;
        }
      }
      const items: Tulip[]=await Promise.all(allIds.map(fetchItem));
      setTulips(items.filter(t=>t.content&&!t.content.trimStart().startsWith("{")));
      setLastRefresh(new Date());
      setError(null);
    }catch{setError("failed to reach ordinals.com — check connection");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    fetchTulips();
    const iv: ReturnType<typeof setInterval>=setInterval(fetchTulips,30000);
    return()=>clearInterval(iv);
  },[fetchTulips]);

  const nextTulipNum: number=tulips.length;

  const navBtn=(active: boolean): React.CSSProperties=>({
    padding:"10px 20px",background:active?"rgba(57,255,20,0.1)":"transparent",
    color:active?"#39ff14":"#1a6a1a",border:"none",
    borderRight:"1px solid #0d3d0d",borderBottom:active?"2px solid #39ff14":"2px solid transparent",
    cursor:"pointer",fontFamily:"monospace",fontSize:12,letterSpacing:2,
  });

  const subBtn=(active: boolean, color?: string): React.CSSProperties=>({
    padding:"7px 14px",background:active?`rgba(57,255,20,0.08)`:"transparent",
    color:active?"#39ff14":"#1a6a1a",border:`1px solid ${active?"#1a8a1a":"#0d3d0d"}`,
    cursor:"pointer",fontFamily:"monospace",fontSize:10,letterSpacing:1,
  });

  const codeBlock: React.CSSProperties={background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",padding:"10px 14px",margin:"8px 0",fontSize:12,color:"#7fff7f",display:"block",whiteSpace:"pre",overflowX:"auto",fontFamily:"monospace",lineHeight:1.7};

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
      <div dangerouslySetInnerHTML={{__html:"<!-- 0xFEE1DEAD -->"}} />
      <div dangerouslySetInnerHTML={{__html:'<!-- printf "%x\\n" -->'}} />

      <div style={{borderBottom:"1px solid #0d3d0d",padding:"20px 24px 16px",background:"rgba(0,20,0,0.8)"}}>
        <pre style={{fontSize:5,lineHeight:1.1,color:"#39ff14",textShadow:"0 0 12px rgba(57,255,20,0.4)",whiteSpace:"pre",overflow:"hidden",marginBottom:16}}>{HEADER_ART}</pre>
        <div style={{display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{fontSize:11,color:"#1a8a1a",letterSpacing:1}}>
            A COLLABORATIVE ASCII GARDEN ON BITCOIN · ROOTED AT <span style={{color:"#39ff14"}}>@</span> · INSPIRED BY <a href="https://game.tulip.farm" target="_blank" rel="noopener noreferrer" style={{color:"#1a8a1a",textDecoration:"none"}}>GAME.TULIP.FARM</a>
          </div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 24px",background:"#00060a",borderBottom:"1px solid #0d3d0d",fontSize:11,color:"#1a6a1a",letterSpacing:1,flexWrap:"wrap",gap:8}}>
        <span>Ordinals Tools and Marketplace aggregator, helping builders and collectors find what they need in one place.</span>
      </div>

      <div style={{display:"flex",borderBottom:"1px solid #0d3d0d",background:"#00060b",flexWrap:"wrap"}}>
        {([["tools","⬡ TOOLS"],["garden","🌷 GARDEN"],["plant","✦ PLANT A TULIP"]] as [string, string][]).map(([k,label]: [string, string])=>(
          <button key={k} style={navBtn(tab===k)} onClick={()=>setTab(k)}>{label}</button>
        ))}
        <a href={`https://ordinals.com/inscription/${PARENT_ID}`} target="_blank" rel="noopener noreferrer"
          style={{...navBtn(false),textDecoration:"none",display:"flex",alignItems:"center"}}>↗ ORDINALS.COM</a>
        <span style={{marginLeft:"auto",padding:"10px 16px",fontSize:11,color:"#1a6a1a",letterSpacing:1}}>{loading?"SYNCING...":`${tulips.length} TULIP${tulips.length!==1?"S":""}`} · {lastRefresh?`LAST SYNC: ${lastRefresh.toLocaleTimeString()}`:"SYNCING..."}</span>
      </div>

      <div style={{padding:"24px",maxWidth:1200,margin:"0 auto"}}>

        {tab==="garden"&&(
          <>
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              {([["about","⧫ ABOUT"],["grid","⊞ GARDEN"],["grow","⊳ TIMELINE"]] as [string, string][]).map(([k,label]: [string, string])=>(
                <button key={k} style={subBtn(gardenView===k)} onClick={()=>setGardenView(k)}>{label}</button>
              ))}
            </div>

            {gardenView==="about"&&(
              <div style={{maxWidth:700}}>
                <div style={{marginBottom:32}}>
                  <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:12}}>// WHAT IS TULIP GARDEN?</div>
                  <div style={{color:"#1a6a1a",fontSize:11,lineHeight:2.2,fontFamily:"monospace"}}>
                    Tulip Garden is a collaborative ASCII art collection on Bitcoin Ordinals, inspired by Casey Rodarmor{"'"}s <a href="https://game.tulip.farm" target="_blank" rel="noopener noreferrer" style={{color:"#1a8a1a",textDecoration:"none"}}>game.tulip.farm</a> — a roguelike dungeon crawler where <span style={{color:"#39ff14"}}>@</span> is the hero, and the entire world is made of ASCII text characters. A roguelike is a subgenre of RPG that takes inspiration from the original 1980 game <span style={{color:"#39ff14"}}>Rogue</span>, a high-fantasy role playing game where you navigate the {'"'}Dungeons of Doom{'"'} to retrieve the Amulet of Yendor. It was one of the first dungeon-crawling games ever made, where everything — the player, enemies, walls, treasure — was rendered as ASCII on a terminal screen. Tulip Garden carries that spirit onto Bitcoin.<br/><br/>
                    Every tulip is permanently inscribed on-chain as a child of the <span style={{color:"#39ff14"}}>@</span> parent inscription. Anyone can plant a tulip — design your ASCII art, choose your color and epitaph — a final permadeath message — and inscribe it as a child of the root. Your tulip lives on Bitcoin forever. The site pulls children of <span style={{color:"#39ff14"}}>@</span> directly from the chain as they are inscribed and renders them in a dynamic timeline.<br/><br/>
                    One of the goals of Tulip Garden is to teach how parent-child provenance works in practice — not just explain it, but give you the tools to do it yourself. The site also aggregates community thoughts on the evolving landscape of Ordinals marketplaces and tools, helping builders and collectors find what they need in one place.
                  </div>
                </div>

                <div style={{marginBottom:32}}>
                  <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:12}}>// WHAT IS PARENT-CHILD PROVENANCE?</div>
                  <div style={{color:"#1a6a1a",fontSize:11,lineHeight:2.2,fontFamily:"monospace"}}>
                    Bitcoin Ordinals supports parent-child relationships between inscriptions. A child inscription is permanently linked on-chain to its parent — this relationship is embedded in the Bitcoin transaction itself. This proves authenticity: if an inscription is not a child of <span style={{color:"#39ff14"}}>@</span>, it is not a real Tulip Garden tulip. No off-chain database, no API dependency, no trust required. The proof is in the chain.<br/><br/>
                    Official docs: <a href="https://docs.ordinals.com" target="_blank" rel="noopener noreferrer" style={{color:"#39ff14"}}>docs.ordinals.com</a><br/><br/>
                    Our parent: <a href={`https://ordinals.com/inscription/${PARENT_ID}`} target="_blank" rel="noopener noreferrer" style={{color:"#39ff14",wordBreak:"break-all"}}>{PARENT_ID}</a>
                  </div>
                </div>

              </div>
            )}

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
                      {tulips.map((t: Tulip, i: number)=><TulipCard key={t.id} {...t} index={i} />)}
                    </div>
                  </>
                )}
                {gardenView==="grow"&&(
                  <TimelineView tulips={tulips} />
                )}
              </>
            )}
          </>
        )}

        {tab==="plant"&&(
          <>
            <div style={{color:"#1a8a1a",fontSize:11,letterSpacing:3,marginBottom:20,borderBottom:"1px solid #0d3d0d",paddingBottom:8}}>// PLANT A TULIP</div>
            <TheMachine nextTulipNum={nextTulipNum} />
            <div style={{color:"#39ff14",fontSize:12,letterSpacing:2,marginBottom:16,borderBottom:"1px solid #0d3d0d",paddingBottom:8}}>// INSTRUCTIONS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24}}>
              <div>
                <div style={{marginBottom:24}}>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>STEP 1 — CREATE YOUR FILES</div>
                  <div style={{color:"#1a6a1a",fontSize:11,lineHeight:2.2}}>Design your tulip using <span style={{color:"#1a8a1a"}}>THE MACHINE</span> above, or create your files manually using any plain text editor (Notepad, VS Code, TextEdit in plain text mode). Save as <span style={{color:"#1a8a1a"}}>tulipN.txt</span> and <span style={{color:"#1a8a1a"}}>tulipN.json</span>.</div>
                </div>
                <ToolChooser />
                <div>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>PARENT ID</div>
                  <div style={{background:"rgba(57,255,20,0.04)",border:"1px solid #1a4a1a",padding:"8px 12px",fontSize:10,color:"#7fff7f",wordBreak:"break-all",fontFamily:"monospace"}}>{PARENT_ID}</div>
                </div>
              </div>
              <div>
                <div style={{marginBottom:24}}>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>RULES</div>
                  <div style={{color:"#1a8a1a",fontSize:11,lineHeight:2.4}}>
                    ① ASCII .txt files only<br/>
                    ② Spaces not tabs<br/>
                    ③ .txt and .json must share the same name (e.g. <span style={{color:"#39ff14"}}>tulip1.txt</span> + <span style={{color:"#39ff14"}}>tulip1.json</span>)<br/>
                    ④ collection: <span style={{color:"#39ff14"}}>"Tulip Garden"</span><br/>
                    ⑤ color + epitaph optional but permanent
                  </div>
                </div>
                <div style={{marginBottom:24}}>
                  <div style={{color:"#39ff14",fontSize:12,marginBottom:8,letterSpacing:1}}>LINEAGE</div>
                  <pre style={codeBlock}>{`@ (parent)\n└── tulip #0 (madison)\n└── tulip #1 (you?)`}</pre>
                </div>
              </div>
            </div>
          </>
        )}

        {tab==="tools"&&(
          <>
            <div style={{color:"#1a8a1a",fontSize:11,letterSpacing:3,marginBottom:20,borderBottom:"1px solid #0d3d0d",paddingBottom:8}}>// TOOLS & MARKETPLACES</div>
            <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
              {([["poll","⬡ SENTIMENT POLL"],["news","⬡ NEWS"],["directory","⬡ LINKS"],["ord","⬡ ORD CLI"]] as [string, string][]).map(([k,label]: [string, string])=>(
                <button key={k} style={subBtn(toolsSubTab===k)} onClick={()=>setToolsSubTab(k)}>{label}</button>
              ))}
            </div>
            {toolsSubTab==="poll"&&<MarketplacePoll />}
            {toolsSubTab==="news"&&<NewsTab />}
            {toolsSubTab==="directory"&&<MarketplaceDirectory />}
            {toolsSubTab==="ord"&&<OrdCliGuide />}
          </>
        )}
      </div>

      <div style={{borderTop:"1px solid #0d3d0d",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:10,color:"#0d3d0d",letterSpacing:1,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <span>TULIP GARDEN · BITCOIN ORDINALS</span>
          <span style={{whiteSpace:"nowrap"}}>PARENT: {PARENT_ID}</span>
          <span>ROOTED AT @ · INSPIRED BY <a href="https://game.tulip.farm" target="_blank" rel="noopener noreferrer" style={{color:"#0d3d0d",textDecoration:"none"}}>GAME.TULIP.FARM</a> & ROGUE (1980)</span>
        </div>
        <img src="/acc-logo.png" alt="Anyone Can Cook Productions" style={{width:72,height:72,borderRadius:"50%",opacity:0.7}} />
      </div>
    </div>
  );
}
