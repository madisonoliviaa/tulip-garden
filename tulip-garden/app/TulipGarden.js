'use client'

import { useState, useEffect, useCallback } from "react";

const PARENT_ID = "5d80c89b9beb2be790fcb2af9b5558d5965ef7bd1c45a0908222011ec8addadei0";
const ORDINALS_BASE = "https://ordinals.com";

const HEADER_ART = `████████╗██╗   ██╗██╗     ██╗██████╗      ██████╗  █████╗ ██████╗ ██████╗ ███████╗███╗   ██╗
╚══██╔══╝██║   ██║██║     ██║██╔══██╗    ██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║
   ██║   ██║   ██║██║     ██║██████╔╝    ██║  ███╗███████║██████╔╝██║  ██║█████╗  ██╔██╗ ██║
   ██║   ██║   ██║██║     ██║██╔═══╝     ██║   ██║██╔══██║██╔══██╗██║  ██║██╔══╝  ██║╚██╗██║
   ██║   ╚██████╔╝███████╗██║██║         ╚██████╔╝██║  ██║██║  ██║██████╔╝███████╗██║ ╚████║
   ╚═╝    ╚═════╝ ╚══════╝╚═╝╚═╝          ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝`;

const MINI_TULIP = `   _\n  (v)\n   |\n  \\|/`;

function ScanlineOverlay() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 9999,
      background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
    }} />
  );
}

function Cursor() {
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVis(v => !v), 530);
    return () => clearInterval(t);
  }, []);
  return <span style={{ opacity: vis ? 1 : 0, color: "#39ff14" }}>█</span>;
}

function TulipCard({ id, index, content, artist, tulipNum }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 120);
    return () => clearTimeout(t);
  }, [index]);

  const shortId = id ? `${id.slice(0, 8)}...${id.slice(-4)}` : "???";

  return (
    <div style={{
      border: "1px solid #1a4a1a",
      padding: "16px",
      fontFamily: "'Courier New', monospace",
      transition: "all 0.6s ease",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      background: "rgba(0, 255, 65, 0.03)",
      position: "relative",
    }}>
      <span style={{ position: "absolute", top: 4, left: 4, color: "#1a8a1a", fontSize: 10 }}>┌</span>
      <span style={{ position: "absolute", top: 4, right: 4, color: "#1a8a1a", fontSize: 10 }}>┐</span>
      <span style={{ position: "absolute", bottom: 4, left: 4, color: "#1a8a1a", fontSize: 10 }}>└</span>
      <span style={{ position: "absolute", bottom: 4, right: 4, color: "#1a8a1a", fontSize: 10 }}>┘</span>

      <div style={{ color: "#1a8a1a", fontSize: 10, marginBottom: 8, letterSpacing: 2 }}>
        TULIP #{tulipNum !== undefined ? String(tulipNum).padStart(3, "0") : String(index).padStart(3, "0")}
      </div>

      <pre style={{
        color: "#39ff14",
        fontSize: 14,
        lineHeight: 1.2,
        margin: "0 0 12px 0",
        textShadow: "0 0 8px rgba(57,255,20,0.6)",
        minHeight: 60,
      }}>
        {content || MINI_TULIP}
      </pre>

      <div style={{ color: "#1a4a1a", fontSize: 10, marginBottom: 10 }}>{"⸜".repeat(12)}</div>

      {artist && (
        <div style={{ color: "#39ff14", fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
          ARTIST: <span style={{ color: "#7fff7f" }}>{artist}</span>
        </div>
      )}

      <a
        href={`${ORDINALS_BASE}/inscription/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#1a8a1a", fontSize: 9, textDecoration: "none", wordBreak: "break-all", display: "block" }}
      >
        {shortId}
      </a>
    </div>
  );
}

function GrowingField({ count }) {
  return (
    <div style={{ fontFamily: "'Courier New', monospace", padding: "20px 0", overflowX: "auto" }}>
      <style>{`
        @keyframes grow {
          from { opacity: 0; transform: scaleY(0.2) translateY(20px); transform-origin: bottom; }
          to { opacity: 1; transform: scaleY(1) translateY(0); transform-origin: bottom; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, minWidth: "max-content", padding: "0 20px" }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <pre style={{
              color: "#39ff14",
              fontSize: 12,
              lineHeight: 1.1,
              margin: 0,
              textShadow: "0 0 6px rgba(57,255,20,0.5)",
              animation: `grow 0.8s ease ${i * 0.15}s both`,
            }}>{`   _\n  (v)\n   |\n  \\|/`}</pre>
            <div style={{ color: "#1a5a1a", fontSize: 9, marginTop: 2 }}>#{i}</div>
          </div>
        ))}
        {count === 0 && (
          <div style={{ color: "#1a5a1a", fontFamily: "'Courier New', monospace", fontSize: 12 }}>
            no blooms yet... be the first
          </div>
        )}
      </div>
      <div style={{ color: "#0d3d0d", fontSize: 12, fontFamily: "'Courier New', monospace", letterSpacing: 2, marginTop: 4, paddingLeft: 20 }}>
        {"⣿".repeat(Math.min(60, 20 + count * 2))}
      </div>
    </div>
  );
}

export default function TulipGarden() {
  const [tulips, setTulips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tab, setTab] = useState("garden");

  const fetchTulips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${ORDINALS_BASE}/r/children/${PARENT_ID}`);
      const data = await res.json();

      const fetchItem = async (id, i) => {
        try {
          const contentRes = await fetch(`${ORDINALS_BASE}/content/${id}`);
          const contentType = contentRes.headers.get("content-type") || "";
          let content = "", artist = null, tulipNum = i;
          if (contentType.includes("text")) {
            const text = await contentRes.text();
            try {
              const json = JSON.parse(text);
              artist = json.artist;
              tulipNum = json.tulip_number !== undefined ? json.tulip_number : i;
            } catch {
              content = text.trim();
            }
          }
          return { id, content, artist, tulipNum };
        } catch {
          return { id, content: MINI_TULIP, artist: null, tulipNum: i };
        }
      };

      let allIds = [...(data.ids || [])];
      if (data.more) {
        let page = 1;
        while (true) {
          const next = await fetch(`${ORDINALS_BASE}/r/children/${PARENT_ID}/${page}`);
          const nextData = await next.json();
          allIds = [...allIds, ...(nextData.ids || [])];
          if (!nextData.more) break;
          page++;
        }
      }

      const items = await Promise.all(allIds.map(fetchItem));
      setTulips(items.filter(t => t.content && !t.content.startsWith("{")));
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError("failed to reach ordinals.com — check connection");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTulips();
    const interval = setInterval(fetchTulips, 30000);
    return () => clearInterval(interval);
  }, [fetchTulips]);

  const navBtn = (active) => ({
    padding: "10px 20px",
    background: active ? "rgba(57,255,20,0.1)" : "transparent",
    color: active ? "#39ff14" : "#1a6a1a",
    border: "none",
    borderRight: "1px solid #0d3d0d",
    borderBottom: active ? "2px solid #39ff14" : "2px solid transparent",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    letterSpacing: 2,
  });

  const codeBlock = {
    background: "rgba(57,255,20,0.04)",
    border: "1px solid #1a4a1a",
    padding: "10px 14px",
    margin: "8px 0",
    fontSize: 12,
    color: "#7fff7f",
    display: "block",
    whiteSpace: "pre",
    overflowX: "auto",
    fontFamily: "'Courier New', monospace",
    lineHeight: 1.7,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020a02", color: "#39ff14", fontFamily: "'Courier New', monospace" }}>
      <style>{`
        ::-webkit-scrollbar { width: 6px; background: #020a02; }
        ::-webkit-scrollbar-thumb { background: #1a4a1a; }
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
      <ScanlineOverlay />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #0d3d0d", padding: "20px 24px 16px", background: "rgba(0,20,0,0.8)" }}>
        <pre style={{
          fontSize: 5, lineHeight: 1.1, color: "#39ff14",
          textShadow: "0 0 12px rgba(57,255,20,0.4)",
          whiteSpace: "pre", overflow: "hidden", marginBottom: 16,
        }}>{HEADER_ART}</pre>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, color: "#1a8a1a", letterSpacing: 1 }}>
            A COLLABORATIVE ASCII GARDEN ON BITCOIN · ROOTED AT <span style={{ color: "#39ff14" }}>@</span> · CHILD OF ROGUE (1980)
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#1a6a1a" }}>
              {loading ? "SYNCING..." : `${tulips.length} BLOOM${tulips.length !== 1 ? "S" : ""}`}
            </span>
            <button
              onClick={fetchTulips}
              style={{ background: "transparent", border: "1px solid #39ff14", color: "#39ff14", padding: "8px 16px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: 2 }}
            >
              ↺ REFRESH
            </button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 24px", background: "#00060a", borderBottom: "1px solid #0d3d0d", fontSize: 11, color: "#1a6a1a", letterSpacing: 1, flexWrap: "wrap", gap: 8 }}>
        <span>ORD://TULIP.GARDEN · PARENT: {PARENT_ID.slice(0,12)}...{PARENT_ID.slice(-8)}</span>
        <span>{lastRefresh ? `LAST SYNC: ${lastRefresh.toLocaleTimeString()}` : "SYNCING..."} · AUTO-REFRESH: 30s</span>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #0d3d0d", background: "#00060b" }}>
        {[["garden", "🌷 GARDEN"], ["grow", "🌱 GROWING FIELD"], ["plant", "✦ PLANT A TULIP"]].map(([k, label]) => (
          <button key={k} style={navBtn(tab === k)} onClick={() => setTab(k)}>{label}</button>
        ))}
        <a
          href={`https://ordinals.com/inscription/${PARENT_ID}`}
          target="_blank" rel="noopener noreferrer"
          style={{ ...navBtn(false), textDecoration: "none", display: "flex", alignItems: "center" }}
        >↗ ORDINALS.COM</a>
      </div>

      {/* Content */}
      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>

        {tab === "garden" && (
          <>
            {error && <div style={{ color: "#ff4444", fontSize: 12, marginBottom: 16, border: "1px solid #440000", padding: 12 }}>ERROR: {error}</div>}
            {loading && tulips.length === 0 ? (
              <div style={{ color: "#1a6a1a", fontSize: 13, padding: 40, textAlign: "center" }}>
                <pre style={{ display: "inline-block", textAlign: "left", textShadow: "0 0 8px rgba(57,255,20,0.4)", fontSize: 30, marginBottom: 16 }}>{`   _\n  (v)\n   |\n  \\|/`}</pre>
                <div>FETCHING GARDEN DATA... <Cursor /></div>
              </div>
            ) : tulips.length === 0 ? (
              <div style={{ color: "#1a6a1a", fontSize: 13, padding: 40, textAlign: "center" }}>
                THE SOIL IS READY. NO TULIPS YET. BE THE FIRST TO BLOOM. <Cursor />
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: "#1a6a1a", marginBottom: 16, letterSpacing: 1 }}>
                  // {tulips.length} INSCRIPTION{tulips.length !== 1 ? "S" : ""} FOUND UNDER PARENT @
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {tulips.map((t, i) => <TulipCard key={t.id} {...t} index={i} />)}
                </div>
              </>
            )}
          </>
        )}

        {tab === "grow" && (
          <>
            <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 3, marginBottom: 16, borderBottom: "1px solid #0d3d0d", paddingBottom: 8 }}>
              // GROWING FIELD — ALL BLOOMS IN SEQUENCE
            </div>
            <div style={{ color: "#1a6a1a", fontSize: 11, marginBottom: 20, lineHeight: 2 }}>
              Each tulip grows as it is inscribed. Total blooms: <span style={{ color: "#39ff14" }}>{tulips.length}</span>
            </div>
            <div style={{ border: "1px solid #0d3d0d", background: "rgba(0,255,65,0.02)", padding: "20px 0", overflowX: "auto" }}>
              <GrowingField count={tulips.length} />
            </div>
            <div style={{ marginTop: 20, color: "#1a6a1a", fontSize: 11, lineHeight: 2 }}>
              <div>@ (root) → {PARENT_ID.slice(0,16)}...</div>
              {tulips.map((t, i) => (
                <div key={t.id} style={{ paddingLeft: 16 }}>
                  └── tulip #{t.tulipNum !== undefined ? t.tulipNum : i} {t.artist ? `[${t.artist}]` : ""} →{" "}
                  <a href={`https://ordinals.com/inscription/${t.id}`} target="_blank" rel="noopener noreferrer" style={{ color: "#1a8a1a", textDecoration: "none" }}>
                    {t.id.slice(0,12)}...
                  </a>
                </div>
              ))}
              {tulips.length === 0 && <div style={{ paddingLeft: 16 }}>└── (no children yet)</div>}
            </div>
          </>
        )}

        {tab === "plant" && (
          <>
            <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 3, marginBottom: 20, borderBottom: "1px solid #0d3d0d", paddingBottom: 8 }}>
              // HOW TO PLANT A TULIP
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <div>
                {[
                  ["STEP 1 — CREATE YOUR TULIP FILE", "Create a .txt file with ASCII tulip art. Keep it small and monospace-friendly. Example (tulip1.txt):", `   _\n  (v)\n   |\n  \\|/`],
                  ["STEP 2 — CREATE METADATA FILE", `Create a matching .json file (tulip1.json).\nSave as UTF-8, "All Files" type on Windows:`, `{\n  "collection": "Tulip Garden",\n  "tulip_number": 1,\n  "artist": "yourname"\n}`],
                ].map(([title, desc, code]) => (
                  <div key={title} style={{ marginBottom: 24 }}>
                    <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>{title}</div>
                    <div style={{ color: "#1a8a1a", fontSize: 11, lineHeight: 2, marginBottom: 8 }}>{desc}</div>
                    <pre style={codeBlock}>{code}</pre>
                  </div>
                ))}

                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>STEP 3 — INSCRIBE ON ORDINALSBOT</div>
                  <div style={{ color: "#1a8a1a", fontSize: 11, lineHeight: 2.4 }}>
                    · Upload tulip file in <span style={{ color: "#7fff7f" }}>Files</span> section<br/>
                    · Upload JSON in <span style={{ color: "#7fff7f" }}>Metadata</span> section<br/>
                    · Enable <span style={{ color: "#7fff7f" }}>Parent-Child Linking</span><br/>
                    · Paste parent ID below<br/>
                    · Use a <span style={{ color: "#7fff7f" }}>bc1p</span> Taproot address
                  </div>
                  <div style={{ background: "rgba(57,255,20,0.04)", border: "1px solid #1a4a1a", padding: "8px 12px", fontSize: 10, color: "#7fff7f", wordBreak: "break-all", marginTop: 8, fontFamily: "monospace" }}>
                    {PARENT_ID}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>GARDEN RULES</div>
                  <div style={{ color: "#1a8a1a", fontSize: 11, lineHeight: 2.4 }}>
                    ① ASCII tulips only · monospace characters<br/>
                    ② Use a bc1p Taproot address for receive<br/>
                    ③ Tulip numbering is first-come first-serve<br/>
                    ④ collection must be exactly: <span style={{ color: "#39ff14" }}>"Tulip Garden"</span>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>LINEAGE</div>
                  <pre style={codeBlock}>{`@ (parent inscription)\n└── tulip #0 (madison)\n└── tulip #1 (you?)\n└── tulip #N (...)\n\nInspired by:\n  game.tulip.farm — Casey Rodarmor\n  Rogue (1980) — the original dungeon\n\n"Goodbye, rogue..."`}</pre>
                </div>

                <div>
                  <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>LINKS</div>
                  {[
                    ["View parent on ordinals.com", `https://ordinals.com/inscription/${PARENT_ID}`],
                    ["OrdinalsBot — inscribe here", "https://ordinalsbot.com"],
                    ["game.tulip.farm", "https://game.tulip.farm"],
                    ["Ordinals docs", "https://docs.ordinals.com"],
                  ].map(([label, url]) => (
                    <div key={url} style={{ marginBottom: 8 }}>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#1a8a1a", textDecoration: "none", fontSize: 11 }}>
                        → {label}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid #0d3d0d", padding: "16px 24px", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#0d3d0d", letterSpacing: 1, flexWrap: "wrap", gap: 8 }}>
        <span>TULIP GARDEN · BITCOIN ORDINALS · PARENT: {PARENT_ID}</span>
        <span>ROOTED AT @ · CHILD OF ROGUE (1980)</span>
      </div>
    </div>
  );
}
