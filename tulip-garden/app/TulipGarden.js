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
const DEFAULT_TULIP = `   _\n  (v)\n   |\n  \\|/`;

const MARKETPLACES = [
  {
    id: "ordinalsbot",
    name: "OrdinalsBot",
    url: "https://ordinalsbot.com",
    inscribeUrl: "https://token.ordinalsbot.com/products/inscriptions",
    parentChild: true,
    difficulty: "EASY",
    notes: "Best UI for parent-child. Upload file + metadata separately, P/C field built in.",
    status: "active",
  },
  {
    id: "unisat",
    name: "UniSat",
    url: "https://unisat.io",
    inscribeUrl: "https://unisat.io/inscribe",
    parentChild: true,
    difficulty: "EASY",
    notes: "Popular wallet + inscriber. Supports P/C. Good mobile experience.",
    status: "active",
  },
  {
    id: "gamma",
    name: "Gamma.io",
    url: "https://gamma.io",
    inscribeUrl: "https://gamma.io/inscribe",
    parentChild: true,
    difficulty: "EASY",
    notes: "Clean UI, launchpad-style. Good for collections and single inscriptions.",
    status: "active",
  },
  {
    id: "ordinalswallet",
    name: "Ordinals Wallet",
    url: "https://ordinalswallet.com",
    inscribeUrl: "https://ordinalswallet.com/inscribe",
    parentChild: false,
    difficulty: "MEDIUM",
    notes: "Primarily a marketplace + wallet. Limited inscribing features.",
    status: "active",
  },
  {
    id: "orddropz",
    name: "OrdDropz",
    url: "https://ord-dropz.xyz",
    inscribeUrl: "https://ord-dropz.xyz",
    parentChild: true,
    difficulty: "MEDIUM",
    notes: "Launchpad-focused. Good for collections with provenance handled at mint.",
    status: "active",
  },
  {
    id: "lifofifo",
    name: "Lifo / Fifo",
    url: "https://lifofifo.com",
    inscribeUrl: "https://lifofifo.com",
    parentChild: true,
    difficulty: "MEDIUM",
    notes: "Project and gallery-focused. Good for collection launches.",
    status: "active",
  },
  {
    id: "magiceden",
    name: "Magic Eden",
    url: "https://magiceden.io",
    inscribeUrl: null,
    parentChild: false,
    difficulty: "N/A",
    notes: "Sunsetting Ordinals support. Use other tools.",
    status: "sunset",
  },
  {
    id: "ord",
    name: "ord CLI",
    url: "https://github.com/ordinals/ord",
    inscribeUrl: "https://docs.ordinals.com",
    parentChild: true,
    difficulty: "ADVANCED",
    notes: "Official tool by Casey Rodarmor. Requires running your own Bitcoin node. Full control.",
    status: "active",
  },
];

const POLL_KEY = "tulip_garden_poll_vote";

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
      border: "1px solid #1a4a1a", padding: "16px", fontFamily: "'Courier New', monospace",
      transition: "all 0.6s ease", opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      background: "rgba(0, 255, 65, 0.03)", position: "relative",
    }}>
      <span style={{ position: "absolute", top: 4, left: 4, color: "#1a8a1a", fontSize: 10 }}>┌</span>
      <span style={{ position: "absolute", top: 4, right: 4, color: "#1a8a1a", fontSize: 10 }}>┐</span>
      <span style={{ position: "absolute", bottom: 4, left: 4, color: "#1a8a1a", fontSize: 10 }}>└</span>
      <span style={{ position: "absolute", bottom: 4, right: 4, color: "#1a8a1a", fontSize: 10 }}>┘</span>
      <div style={{ color: "#1a8a1a", fontSize: 10, marginBottom: 8, letterSpacing: 2 }}>
        TULIP #{tulipNum !== undefined ? String(tulipNum).padStart(3, "0") : String(index).padStart(3, "0")}
      </div>
      <pre style={{ color: "#39ff14", fontSize: 14, lineHeight: 1.2, margin: "0 0 12px 0", textShadow: "0 0 8px rgba(57,255,20,0.6)", minHeight: 60 }}>
        {content || MINI_TULIP}
      </pre>
      <div style={{ color: "#1a4a1a", fontSize: 10, marginBottom: 10 }}>{"⸜".repeat(12)}</div>
      {artist && <div style={{ color: "#39ff14", fontSize: 11, opacity: 0.7, marginBottom: 6 }}>ARTIST: <span style={{ color: "#7fff7f" }}>{artist}</span></div>}
      <a href={`${ORDINALS_BASE}/inscription/${id}`} target="_blank" rel="noopener noreferrer"
        style={{ color: "#1a8a1a", fontSize: 9, textDecoration: "none", wordBreak: "break-all", display: "block" }}>
        {shortId}
      </a>
    </div>
  );
}

function GrowingField({ count }) {
  return (
    <div style={{ fontFamily: "'Courier New', monospace", padding: "20px 0", overflowX: "auto" }}>
      <style>{`@keyframes grow{from{opacity:0;transform:scaleY(0.2) translateY(20px);transform-origin:bottom}to{opacity:1;transform:scaleY(1) translateY(0);transform-origin:bottom}}`}</style>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, minWidth: "max-content", padding: "0 20px" }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <pre style={{ color: "#39ff14", fontSize: 12, lineHeight: 1.1, margin: 0, textShadow: "0 0 6px rgba(57,255,20,0.5)", animation: `grow 0.8s ease ${i * 0.15}s both` }}>{`   _\n  (v)\n   |\n  \\|/`}</pre>
            <div style={{ color: "#1a5a1a", fontSize: 9, marginTop: 2 }}>#{i}</div>
          </div>
        ))}
        {count === 0 && <div style={{ color: "#1a5a1a", fontSize: 12 }}>no blooms yet... be the first</div>}
      </div>
      <div style={{ color: "#0d3d0d", fontSize: 12, letterSpacing: 2, marginTop: 4, paddingLeft: 20 }}>{"⣿".repeat(Math.min(60, 20 + count * 2))}</div>
    </div>
  );
}

function TulipWorkshop({ nextTulipNum }) {
  const [tulipArt, setTulipArt] = useState(DEFAULT_TULIP);
  const [artistName, setArtistName] = useState("");
  const [tulipNum, setTulipNum] = useState(nextTulipNum);
  const [copied, setCopied] = useState("");
  useEffect(() => { setTulipNum(nextTulipNum); }, [nextTulipNum]);

  const jsonContent = JSON.stringify({ collection: "Tulip Garden", tulip_number: tulipNum, artist: artistName || "yourname" }, null, 2);

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(""), 2000); });
  };

  const mono = { fontFamily: "'Courier New', monospace" };
  const box = { border: "1px solid #1a4a1a", background: "rgba(57,255,20,0.03)" };
  const lbl = { color: "#1a8a1a", fontSize: 10, letterSpacing: 2, marginBottom: 8, display: "block" };
  const btn = (hi) => ({
    background: hi ? "rgba(57,255,20,0.12)" : "transparent",
    border: `1px solid ${hi ? "#39ff14" : "#1a4a1a"}`,
    color: hi ? "#39ff14" : "#1a6a1a",
    padding: "6px 12px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: 1,
  });

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>✦ TULIP WORKSHOP</div>
      <div style={{ color: "#1a6a1a", fontSize: 11, marginBottom: 16, lineHeight: 1.8 }}>
        Design your tulip and preview exactly how it renders on ordinals.com before spending sats.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <span style={lbl}>// DRAW YOUR TULIP (spaces only, no tabs)</span>
          <div style={box}>
            <textarea value={tulipArt} onChange={e => setTulipArt(e.target.value)} spellCheck={false}
              style={{ ...mono, width: "100%", height: 160, background: "transparent", color: "#39ff14", border: "none", padding: "12px", fontSize: 13, lineHeight: 1.4, resize: "vertical", outline: "none", whiteSpace: "pre", overflowWrap: "normal", overflow: "auto" }} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <button style={btn(false)} onClick={() => setTulipArt(DEFAULT_TULIP)}>↺ RESET</button>
            <button style={btn(false)} onClick={() => copy(tulipArt, "art")}>{copied === "art" ? "✓ COPIED" : "⎘ COPY"}</button>
            <button style={btn(true)} onClick={() => downloadFile(tulipArt, `tulip${tulipNum}.txt`)}>↓ tulip{tulipNum}.txt</button>
          </div>
        </div>
        <div>
          <span style={lbl}>// LIVE PREVIEW — exactly how ordinals.com renders it</span>
          <div style={{ ...box, padding: "16px", minHeight: 160, position: "relative" }}>
            <span style={{ position: "absolute", top: 4, left: 4, color: "#1a8a1a", fontSize: 9 }}>┌</span>
            <span style={{ position: "absolute", top: 4, right: 4, color: "#1a8a1a", fontSize: 9 }}>┐</span>
            <span style={{ position: "absolute", bottom: 4, left: 4, color: "#1a8a1a", fontSize: 9 }}>└</span>
            <span style={{ position: "absolute", bottom: 4, right: 4, color: "#1a8a1a", fontSize: 9 }}>┘</span>
            <div style={{ color: "#1a8a1a", fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>TULIP #{String(tulipNum).padStart(3, "0")}</div>
            <pre style={{ ...mono, color: "#39ff14", fontSize: 14, lineHeight: 1.3, margin: 0, textShadow: "0 0 8px rgba(57,255,20,0.6)", whiteSpace: "pre" }}>{tulipArt || " "}</pre>
            <div style={{ color: "#1a4a1a", fontSize: 10, marginTop: 8 }}>{"⸜".repeat(12)}</div>
            {artistName && <div style={{ color: "#7fff7f", fontSize: 10, marginTop: 4 }}>ARTIST: {artistName}</div>}
          </div>
          <div style={{ color: "#1a6a1a", fontSize: 10, marginTop: 6 }}>↑ this is exactly what people see on ordinals.com</div>
        </div>
      </div>
      <div style={{ ...box, padding: 16, marginBottom: 12 }}>
        <span style={lbl}>// GENERATE METADATA FILE</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: "#1a6a1a", fontSize: 10, marginBottom: 6 }}>ARTIST NAME</div>
            <input type="text" value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="yourname"
              style={{ ...mono, background: "rgba(57,255,20,0.04)", border: "1px solid #1a4a1a", color: "#39ff14", padding: "8px 10px", fontSize: 12, width: "100%", outline: "none" }} />
          </div>
          <div>
            <div style={{ color: "#1a6a1a", fontSize: 10, marginBottom: 6 }}>TULIP NUMBER <span style={{ color: "#0d4a0d" }}>(next: {nextTulipNum})</span></div>
            <input type="number" value={tulipNum} onChange={e => setTulipNum(parseInt(e.target.value) || 0)} min={0}
              style={{ ...mono, background: "rgba(57,255,20,0.04)", border: "1px solid #1a4a1a", color: "#39ff14", padding: "8px 10px", fontSize: 12, width: "100%", outline: "none" }} />
          </div>
        </div>
        <pre style={{ ...mono, background: "rgba(0,0,0,0.3)", border: "1px solid #0d3d0d", padding: "10px 14px", fontSize: 12, color: "#7fff7f", marginBottom: 10, lineHeight: 1.7 }}>{jsonContent}</pre>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn(false)} onClick={() => copy(jsonContent, "json")}>{copied === "json" ? "✓ COPIED" : "⎘ COPY JSON"}</button>
          <button style={btn(true)} onClick={() => downloadFile(jsonContent, `tulip${tulipNum}.json`)}>↓ tulip{tulipNum}.json</button>
        </div>
      </div>
      <div style={{ border: "1px solid #1a4a1a", background: "rgba(57,255,20,0.02)", padding: "12px 16px" }}>
        <div style={{ color: "#1a8a1a", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>// CHECKLIST BEFORE INSCRIBING</div>
        <div style={{ color: "#1a6a1a", fontSize: 11, lineHeight: 2.3, ...mono }}>
          ☐ Preview looks correct in the box above<br/>
          ☐ Spaces used (not tabs) — tabs will break alignment<br/>
          ☐ Both files downloaded: <span style={{ color: "#7fff7f" }}>tulip{tulipNum}.txt</span> and <span style={{ color: "#7fff7f" }}>tulip{tulipNum}.json</span><br/>
          ☐ Artist name filled in<br/>
          ☐ Tulip number confirmed against the current garden count
        </div>
      </div>
    </div>
  );
}

function MarketplacePoll() {
  const [votes, setVotes] = useState(() => {
    const initial = {};
    MARKETPLACES.filter(m => m.status === "active").forEach(m => { initial[m.id] = 0; });
    return initial;
  });
  const [userVote, setUserVote] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedVotes = localStorage.getItem("tg_poll_votes");
      const savedUserVote = localStorage.getItem(POLL_KEY);
      if (savedVotes) setVotes(JSON.parse(savedVotes));
      if (savedUserVote) setUserVote(savedUserVote);
    } catch {}
    setLoaded(true);
  }, []);

  const vote = (id) => {
    if (userVote) return;
    const newVotes = { ...votes, [id]: (votes[id] || 0) + 1 };
    setVotes(newVotes);
    setUserVote(id);
    try {
      localStorage.setItem("tg_poll_votes", JSON.stringify(newVotes));
      localStorage.setItem(POLL_KEY, id);
    } catch {}
  };

  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const activeMarkets = MARKETPLACES.filter(m => m.status === "active");
  const maxVotes = Math.max(...Object.values(votes), 1);

  const mono = { fontFamily: "'Courier New', monospace" };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>⬡ COMMUNITY POLL — WHICH TOOL DO YOU PREFER?</div>
      <div style={{ color: "#1a6a1a", fontSize: 11, marginBottom: 20, lineHeight: 1.8 }}>
        Vote for your favorite inscription tool. {total > 0 ? `${total} vote${total !== 1 ? "s" : ""} cast so far.` : "Be the first to vote."}
        {!userVote && loaded && <span style={{ color: "#1a4a1a" }}> · Your vote is stored locally on this device.</span>}
        {userVote && <span style={{ color: "#7fff7f" }}> · You voted for {MARKETPLACES.find(m => m.id === userVote)?.name}.</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activeMarkets.map(m => {
          const count = votes[m.id] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barWidth = total > 0 ? (count / maxVotes) * 100 : 0;
          const isWinner = count === maxVotes && count > 0;
          const voted = userVote === m.id;
          return (
            <div key={m.id} style={{ border: `1px solid ${voted ? "#39ff14" : "#1a4a1a"}`, padding: "12px 14px", background: voted ? "rgba(57,255,20,0.06)" : "rgba(57,255,20,0.02)", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <button
                  onClick={() => vote(m.id)}
                  disabled={!!userVote}
                  style={{
                    ...mono, background: voted ? "rgba(57,255,20,0.2)" : "transparent",
                    border: `1px solid ${voted ? "#39ff14" : "#1a4a1a"}`,
                    color: voted ? "#39ff14" : "#1a6a1a",
                    padding: "4px 10px", cursor: userVote ? "default" : "pointer", fontSize: 10, letterSpacing: 1, flexShrink: 0,
                  }}
                >
                  {voted ? "✓ VOTED" : "VOTE"}
                </button>
                <span style={{ color: voted ? "#39ff14" : "#7fff7f", fontSize: 12, ...mono }}>{m.name}</span>
                {isWinner && total > 0 && <span style={{ color: "#39ff14", fontSize: 9, letterSpacing: 2, marginLeft: "auto" }}>★ LEADING</span>}
                <span style={{ color: "#1a6a1a", fontSize: 11, marginLeft: isWinner ? 0 : "auto", ...mono }}>{count} · {pct}%</span>
              </div>
              <div style={{ height: 3, background: "#0d3d0d", marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${barWidth}%`, background: voted ? "#39ff14" : "#1a8a1a", transition: "width 0.5s ease" }} />
              </div>
              <div style={{ color: "#1a4a1a", fontSize: 10, ...mono }}>{m.notes}</div>
            </div>
          );
        })}
      </div>
      {userVote && (
        <button onClick={() => { setUserVote(null); try { localStorage.removeItem(POLL_KEY); } catch {} }}
          style={{ ...mono, background: "transparent", border: "1px solid #1a4a1a", color: "#1a4a1a", padding: "6px 12px", cursor: "pointer", fontSize: 10, marginTop: 12, letterSpacing: 1 }}>
          ↺ CHANGE VOTE
        </button>
      )}
    </div>
  );
}

function MarketplaceDirectory() {
  const mono = { fontFamily: "'Courier New', monospace" };
  const diffColor = { EASY: "#39ff14", MEDIUM: "#7fff7f", ADVANCED: "#ffaa00", "N/A": "#1a4a1a" };

  return (
    <div>
      <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 16 }}>⬡ INSCRIPTION TOOLS DIRECTORY</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {MARKETPLACES.map(m => (
          <div key={m.id} style={{
            border: `1px solid ${m.status === "sunset" ? "#2a1a1a" : "#1a4a1a"}`,
            padding: 14,
            background: m.status === "sunset" ? "rgba(40,0,0,0.3)" : "rgba(57,255,20,0.02)",
            opacity: m.status === "sunset" ? 0.6 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ color: m.status === "sunset" ? "#6a2a2a" : "#7fff7f", fontSize: 12, ...mono }}>{m.name}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {m.status === "sunset" && <span style={{ color: "#6a2a2a", fontSize: 9, border: "1px solid #4a1a1a", padding: "2px 6px", ...mono }}>SUNSET</span>}
                {m.parentChild && m.status !== "sunset" && <span style={{ color: "#39ff14", fontSize: 9, border: "1px solid #1a4a1a", padding: "2px 6px", ...mono }}>P/C ✓</span>}
                {m.difficulty !== "N/A" && <span style={{ color: diffColor[m.difficulty], fontSize: 9, border: `1px solid ${diffColor[m.difficulty]}40`, padding: "2px 6px", ...mono }}>{m.difficulty}</span>}
              </div>
            </div>
            <div style={{ color: "#1a6a1a", fontSize: 10, lineHeight: 1.7, marginBottom: 10, ...mono }}>{m.notes}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={m.url} target="_blank" rel="noopener noreferrer"
                style={{ color: "#1a6a1a", fontSize: 10, textDecoration: "none", border: "1px solid #1a3a1a", padding: "4px 8px", ...mono }}>
                → SITE
              </a>
              {m.inscribeUrl && m.status !== "sunset" && (
                <a href={m.inscribeUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#1a8a1a", fontSize: 10, textDecoration: "none", border: "1px solid #1a4a1a", padding: "4px 8px", ...mono }}>
                  → INSCRIBE
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ color: "#1a4a1a", fontSize: 10, marginTop: 12, ...mono }}>P/C = Parent-Child supported · Difficulty is for inscribing parent-child collections</div>
    </div>
  );
}

function OrdCliGuide() {
  const mono = { fontFamily: "'Courier New', monospace" };
  const code = {
    background: "rgba(0,0,0,0.4)", border: "1px solid #1a4a1a",
    padding: "10px 14px", fontSize: 11, color: "#7fff7f",
    display: "block", whiteSpace: "pre", overflowX: "auto", ...mono, lineHeight: 1.7, marginBottom: 16,
  };
  const [copied, setCopied] = useState("");
  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(""), 2000); });
  };

  return (
    <div>
      <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>⬡ ORD CLI — THE OFFICIAL WAY</div>
      <div style={{ color: "#1a6a1a", fontSize: 11, marginBottom: 20, lineHeight: 2 }}>
        The <span style={{ color: "#7fff7f" }}>ord</span> tool is the official software written by Casey Rodarmor.
        It runs on your own Bitcoin node — no third party involved. More complex to set up, but maximum control and privacy.
        Full docs: <a href="https://docs.ordinals.com" target="_blank" rel="noopener noreferrer" style={{ color: "#1a8a1a" }}>docs.ordinals.com</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        <div>
          <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>// REQUIREMENTS</div>
          <div style={{ color: "#1a6a1a", fontSize: 11, lineHeight: 2.3, marginBottom: 20 }}>
            · A fully synced Bitcoin node (bitcoind)<br/>
            · <span style={{ color: "#7fff7f" }}>ord</span> installed — <a href="https://github.com/ordinals/ord" target="_blank" rel="noopener noreferrer" style={{ color: "#1a8a1a" }}>github.com/ordinals/ord</a><br/>
            · ~600GB disk space for the blockchain<br/>
            · A wallet created with ord
          </div>

          <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>// INSTALL ORD</div>
          <pre style={code}>{`# macOS / Linux
curl --proto '=https' --tlsv1.2 -fsLS \\
  https://ordinals.com/install.sh | bash

# or via cargo (if you have Rust)
cargo install ord`}</pre>

          <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>// CREATE A WALLET</div>
          <pre style={code}>{`ord wallet create`}</pre>

          <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>// GET A RECEIVE ADDRESS</div>
          <pre style={code}>{`ord wallet receive`}</pre>
        </div>

        <div>
          <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>// INSCRIBE A CHILD TULIP</div>
          <div style={{ color: "#1a6a1a", fontSize: 11, lineHeight: 2, marginBottom: 10 }}>
            The <span style={{ color: "#7fff7f" }}>--parent</span> flag is what creates the parent-child link on-chain.
            Replace the parent ID with the Tulip Garden root inscription.
          </div>
          <pre style={code}>{`ord wallet inscribe \\
  --file tulip1.txt \\
  --parent ${PARENT_ID} \\
  --fee-rate 10`}</pre>

          <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>// WITH METADATA</div>
          <pre style={code}>{`ord wallet inscribe \\
  --file tulip1.txt \\
  --json-metadata tulip1.json \\
  --parent ${PARENT_ID} \\
  --fee-rate 10`}</pre>

          <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>// CHECK YOUR INSCRIPTIONS</div>
          <pre style={code}>{`ord wallet inscriptions`}</pre>

          <div style={{ border: "1px solid #1a4a1a", padding: 12, background: "rgba(57,255,20,0.02)" }}>
            <div style={{ color: "#1a8a1a", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>// NOTES</div>
            <div style={{ color: "#1a6a1a", fontSize: 10, lineHeight: 2, ...mono }}>
              · --fee-rate is in sat/vB — check mempool.space for current rates<br/>
              · --parent must be an inscription you own in the same wallet<br/>
              · Metadata file must be valid JSON<br/>
              · Your Bitcoin node must be fully synced before inscribing<br/>
              · Run ord server to browse your inscriptions locally
            </div>
          </div>
        </div>
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
  const [toolsSubTab, setToolsSubTab] = useState("poll");

  const fetchTulips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${ORDINALS_BASE}/r/children/${PARENT_ID}`);
      const data = await res.json();
      const fetchItem = async (id, i) => {
        try {
          const cr = await fetch(`${ORDINALS_BASE}/content/${id}`);
          const ct = cr.headers.get("content-type") || "";
          let content = "", artist = null, tulipNum = i;
          if (ct.includes("text")) {
            const text = await cr.text();
            try { const j = JSON.parse(text); artist = j.artist; tulipNum = j.tulip_number ?? i; }
            catch { content = text.trim(); }
          }
          return { id, content, artist, tulipNum };
        } catch { return { id, content: MINI_TULIP, artist: null, tulipNum: i }; }
      };
      let allIds = [...(data.ids || [])];
      if (data.more) {
        let page = 1;
        while (true) {
          const nd = await (await fetch(`${ORDINALS_BASE}/r/children/${PARENT_ID}/${page}`)).json();
          allIds = [...allIds, ...(nd.ids || [])];
          if (!nd.more) break; page++;
        }
      }
      const items = await Promise.all(allIds.map(fetchItem));
      setTulips(items.filter(t => t.content && !t.content.startsWith("{")));
      setLastRefresh(new Date());
      setError(null);
    } catch { setError("failed to reach ordinals.com — check connection"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTulips();
    const iv = setInterval(fetchTulips, 30000);
    return () => clearInterval(iv);
  }, [fetchTulips]);

  const nextTulipNum = tulips.length;

  const navBtn = (active) => ({
    padding: "10px 20px", background: active ? "rgba(57,255,20,0.1)" : "transparent",
    color: active ? "#39ff14" : "#1a6a1a", border: "none",
    borderRight: "1px solid #0d3d0d", borderBottom: active ? "2px solid #39ff14" : "2px solid transparent",
    cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: 2,
  });

  const subBtn = (active) => ({
    padding: "7px 14px", background: active ? "rgba(57,255,20,0.08)" : "transparent",
    color: active ? "#39ff14" : "#1a6a1a", border: `1px solid ${active ? "#1a8a1a" : "#0d3d0d"}`,
    cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: 1,
  });

  const codeBlock = {
    background: "rgba(57,255,20,0.04)", border: "1px solid #1a4a1a",
    padding: "10px 14px", margin: "8px 0", fontSize: 12, color: "#7fff7f",
    display: "block", whiteSpace: "pre", overflowX: "auto",
    fontFamily: "'Courier New', monospace", lineHeight: 1.7,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020a02", color: "#39ff14", fontFamily: "'Courier New', monospace" }}>
      <style>{`
        ::-webkit-scrollbar{width:6px;background:#020a02}
        ::-webkit-scrollbar-thumb{background:#1a4a1a}
        *{box-sizing:border-box}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        input[type=number]::-webkit-inner-spin-button{opacity:0.3}
        input::placeholder{color:#1a4a1a}
        a:hover{color:#39ff14 !important}
      `}</style>
      <ScanlineOverlay />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #0d3d0d", padding: "20px 24px 16px", background: "rgba(0,20,0,0.8)" }}>
        <pre style={{ fontSize: 5, lineHeight: 1.1, color: "#39ff14", textShadow: "0 0 12px rgba(57,255,20,0.4)", whiteSpace: "pre", overflow: "hidden", marginBottom: 16 }}>{HEADER_ART}</pre>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, color: "#1a8a1a", letterSpacing: 1 }}>
            A COLLABORATIVE ASCII GARDEN ON BITCOIN · ROOTED AT <span style={{ color: "#39ff14" }}>@</span> · CHILD OF ROGUE (1980)
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#1a6a1a" }}>{loading ? "SYNCING..." : `${tulips.length} BLOOM${tulips.length !== 1 ? "S" : ""}`}</span>
            <button onClick={fetchTulips} style={{ background: "transparent", border: "1px solid #39ff14", color: "#39ff14", padding: "8px 16px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: 2 }}>↺ REFRESH</button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 24px", background: "#00060a", borderBottom: "1px solid #0d3d0d", fontSize: 11, color: "#1a6a1a", letterSpacing: 1, flexWrap: "wrap", gap: 8 }}>
        <span>ORD://TULIP.GARDEN · PARENT: {PARENT_ID.slice(0,12)}...{PARENT_ID.slice(-8)}</span>
        <span>{lastRefresh ? `LAST SYNC: ${lastRefresh.toLocaleTimeString()}` : "SYNCING..."} · AUTO-REFRESH: 30s</span>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #0d3d0d", background: "#00060b", flexWrap: "wrap" }}>
        {[["garden","🌷 GARDEN"],["grow","🌱 GROWING FIELD"],["plant","✦ PLANT A TULIP"],["tools","⬡ TOOLS"]].map(([k,label]) => (
          <button key={k} style={navBtn(tab===k)} onClick={() => setTab(k)}>{label}</button>
        ))}
        <a href={`https://ordinals.com/inscription/${PARENT_ID}`} target="_blank" rel="noopener noreferrer"
          style={{ ...navBtn(false), textDecoration: "none", display: "flex", alignItems: "center" }}>↗ ORDINALS.COM</a>
      </div>

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
              <div style={{ color: "#1a6a1a", fontSize: 13, padding: 40, textAlign: "center" }}>THE SOIL IS READY. NO TULIPS YET. BE THE FIRST TO BLOOM. <Cursor /></div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: "#1a6a1a", marginBottom: 16, letterSpacing: 1 }}>// {tulips.length} INSCRIPTION{tulips.length !== 1 ? "S" : ""} FOUND UNDER PARENT @</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {tulips.map((t, i) => <TulipCard key={t.id} {...t} index={i} />)}
                </div>
              </>
            )}
          </>
        )}

        {tab === "grow" && (
          <>
            <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 3, marginBottom: 16, borderBottom: "1px solid #0d3d0d", paddingBottom: 8 }}>// GROWING FIELD — ALL BLOOMS IN SEQUENCE</div>
            <div style={{ color: "#1a6a1a", fontSize: 11, marginBottom: 20, lineHeight: 2 }}>Each tulip grows as it is inscribed. Total blooms: <span style={{ color: "#39ff14" }}>{tulips.length}</span></div>
            <div style={{ border: "1px solid #0d3d0d", background: "rgba(0,255,65,0.02)", padding: "20px 0", overflowX: "auto" }}>
              <GrowingField count={tulips.length} />
            </div>
            <div style={{ marginTop: 20, color: "#1a6a1a", fontSize: 11, lineHeight: 2 }}>
              <div>@ (root) → {PARENT_ID.slice(0,16)}...</div>
              {tulips.map((t, i) => (
                <div key={t.id} style={{ paddingLeft: 16 }}>
                  └── tulip #{t.tulipNum !== undefined ? t.tulipNum : i} {t.artist ? `[${t.artist}]` : ""} →{" "}
                  <a href={`https://ordinals.com/inscription/${t.id}`} target="_blank" rel="noopener noreferrer" style={{ color: "#1a8a1a", textDecoration: "none" }}>{t.id.slice(0,12)}...</a>
                </div>
              ))}
              {tulips.length === 0 && <div style={{ paddingLeft: 16 }}>└── (no children yet)</div>}
            </div>
          </>
        )}

        {tab === "plant" && (
          <>
            <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 3, marginBottom: 20, borderBottom: "1px solid #0d3d0d", paddingBottom: 8 }}>// PLANT A TULIP</div>
            <TulipWorkshop nextTulipNum={nextTulipNum} />
            <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 16, borderBottom: "1px solid #0d3d0d", paddingBottom: 8 }}>// STEP-BY-STEP INSTRUCTIONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>STEP 1 — CREATE YOUR FILES</div>
                  <div style={{ color: "#1a6a1a", fontSize: 11, lineHeight: 2.2 }}>
                    Use the workshop above. Download:<br/>
                    <span style={{ color: "#1a8a1a" }}>tulipN.txt</span> → your ASCII art<br/>
                    <span style={{ color: "#1a8a1a" }}>tulipN.json</span> → your metadata
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>STEP 2 — CHOOSE YOUR TOOL</div>
                  <div style={{ color: "#1a6a1a", fontSize: 11, lineHeight: 2.2, marginBottom: 10 }}>
                    Any tool that supports Parent-Child inscriptions works. Recommended:
                  </div>
                  {[
                    ["OrdinalsBot", "ordinalsbot.com", "Files + Metadata upload, P/C field built in"],
                    ["UniSat", "unisat.io/inscribe", "Popular wallet, P/C supported"],
                    ["Gamma", "gamma.io/inscribe", "Clean UI, good for collections"],
                    ["ord CLI", "docs.ordinals.com", "Advanced — see Tools tab"],
                  ].map(([name, url, note]) => (
                    <div key={name} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: "1px solid #1a4a1a" }}>
                      <a href={`https://${url}`} target="_blank" rel="noopener noreferrer" style={{ color: "#7fff7f", textDecoration: "none", fontSize: 11 }}>{name}</a>
                      <span style={{ color: "#1a4a1a", fontSize: 10 }}> · {note}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>STEP 3 — ATTACH TO PARENT</div>
                  <div style={{ color: "#1a6a1a", fontSize: 11, lineHeight: 2.4 }}>
                    In whichever tool you use, find the Parent-Child or Parent option and paste this ID:
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
                    ② Spaces only — tabs will break alignment<br/>
                    ③ Use a bc1p Taproot address for receive<br/>
                    ④ Tulip numbering is first-come first-serve<br/>
                    ⑤ collection must be exactly: <span style={{ color: "#39ff14" }}>"Tulip Garden"</span>
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>LINEAGE</div>
                  <pre style={codeBlock}>{`@ (parent inscription)\n└── tulip #0 (madison)\n└── tulip #1 (you?)\n└── tulip #N (...)\n\nInspired by:\n  game.tulip.farm — Casey Rodarmor\n  Rogue (1980) — the original dungeon\n\n"Goodbye, rogue..."`}</pre>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "tools" && (
          <>
            <div style={{ color: "#1a8a1a", fontSize: 11, letterSpacing: 3, marginBottom: 20, borderBottom: "1px solid #0d3d0d", paddingBottom: 8 }}>// TOOLS & MARKETPLACES</div>

            {/* Sub-nav */}
            <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {[["poll","⬡ COMMUNITY POLL"],["directory","⬡ DIRECTORY"],["ord","⬡ ORD CLI GUIDE"]].map(([k,label]) => (
                <button key={k} style={subBtn(toolsSubTab===k)} onClick={() => setToolsSubTab(k)}>{label}</button>
              ))}
            </div>

            {toolsSubTab === "poll" && <MarketplacePoll />}
            {toolsSubTab === "directory" && <MarketplaceDirectory />}
            {toolsSubTab === "ord" && <OrdCliGuide />}
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
