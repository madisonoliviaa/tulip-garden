"use client";
import { useState, useEffect } from "react";

const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || "https://tulip-garden-api.fly.dev/api";
const POLL_KEY: string = "tulip_garden_poll_vote";

interface PollMarketplace {
  id: string;
  name: string;
}

const MARKETPLACES: PollMarketplace[] = [
  { id: "ordinalsbot", name: "OrdinalsBot" },
  { id: "unisat", name: "UniSat" },
  { id: "gamma", name: "Gamma.io" },
  { id: "orddropz", name: "OrdDropz" },
  { id: "ord", name: "ord CLI" },
];

export default function PollPage(): React.ReactElement | null {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch(`${API_BASE}/poll`).then(r => r.json()).then(setVotes).catch(() => {});
    fetch(`${API_BASE}/poll/my-vote`)
      .then(r => r.json())
      .then((serverVote: string | null) => {
        if (serverVote) {
          setUserVote(serverVote);
          try { localStorage.setItem(POLL_KEY, serverVote); } catch {}
        } else {
          try {
            const uv = localStorage.getItem(POLL_KEY);
            if (uv) setUserVote(uv);
          } catch {}
        }
      })
      .catch(() => {
        try {
          const uv = localStorage.getItem(POLL_KEY);
          if (uv) setUserVote(uv);
        } catch {}
      })
      .finally(() => setLoaded(true));
  }, []);

  const vote = (id: string): void => {
    if (userVote) return;
    fetch(`${API_BASE}/poll/${encodeURIComponent(id)}`, { method: "POST" })
      .then(r => r.json())
      .then((data: { votes: Record<string, number>; your_vote: string | null; status: string }) => {
        setVotes(data.votes);
        if (data.your_vote) {
          setUserVote(data.your_vote);
          try { localStorage.setItem(POLL_KEY, data.your_vote); } catch {}
        }
      })
      .catch(() => {});
  };

  const total: number = Object.values(votes).reduce((a: number, b: number) => a + b, 0);
  const maxVotes: number = Math.max(...Object.values(votes), 1);
  const mono: React.CSSProperties = { fontFamily: "monospace" };

  const share = (): void => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!loaded) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 520, border: "1px solid #1a4a1a", background: "rgba(0,20,0,0.95)", padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ color: "#39ff14", fontSize: 20, letterSpacing: 6, ...mono }}>TULIP GARDEN</div>
          <div style={{ color: "#1a4a1a", fontSize: 10, letterSpacing: 3, marginTop: 6, ...mono }}>tulip.garden</div>
          <div style={{ width: 40, height: 1, background: "#1a4a1a", margin: "16px auto" }} />
          <div style={{ color: "#1a6a1a", fontSize: 11, letterSpacing: 2, ...mono }}>COMMUNITY POLL</div>
        </div>

        <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 8, ...mono }}>WHICH TOOL DO YOU PREFER?</div>
        <div style={{ color: "#1a6a1a", fontSize: 11, marginBottom: 20, lineHeight: 1.8, ...mono }}>
          {total > 0 ? `${total} vote${total !== 1 ? "s" : ""} cast.` : "Be the first to vote."}
          {userVote && <span style={{ color: "#7fff7f" }}> You voted for {MARKETPLACES.find(m => m.id === userVote)?.name}.</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MARKETPLACES.map((m: PollMarketplace) => {
            const count: number = votes[m.id] || 0;
            const pct: number = total > 0 ? Math.round((count / total) * 100) : 0;
            const barWidth: number = total > 0 ? (count / maxVotes) * 100 : 0;
            const voted: boolean = userVote === m.id;
            return (
              <div key={m.id} style={{ border: `1px solid ${voted ? "#39ff14" : "#1a4a1a"}`, padding: "12px 14px", background: voted ? "rgba(57,255,20,0.06)" : "rgba(57,255,20,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <button onClick={() => vote(m.id)} disabled={!!userVote} style={{ ...mono, background: voted ? "rgba(57,255,20,0.2)" : "transparent", border: `1px solid ${voted ? "#39ff14" : "#1a4a1a"}`, color: voted ? "#39ff14" : "#1a6a1a", padding: "4px 10px", cursor: userVote ? "default" : "pointer", fontSize: 10, letterSpacing: 1, flexShrink: 0 }}>
                    {voted ? "✓ VOTED" : "VOTE"}
                  </button>
                  <span style={{ color: voted ? "#39ff14" : "#7fff7f", fontSize: 12, ...mono }}>{m.name}</span>
                  <span style={{ color: "#1a6a1a", fontSize: 11, marginLeft: "auto", ...mono }}>{count} · {pct}%</span>
                </div>
                <div style={{ height: 3, background: "#0d3d0d" }}>
                  <div style={{ height: "100%", width: `${barWidth}%`, background: voted ? "#39ff14" : "#1a8a1a", transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        {userVote && (
          <button onClick={() => { setUserVote(null); try { localStorage.removeItem(POLL_KEY); } catch {} fetch(`${API_BASE}/poll`).then(r => r.json()).then(setVotes).catch(() => {}); }} style={{ ...mono, background: "transparent", border: "1px solid #1a4a1a", color: "#1a4a1a", padding: "6px 12px", cursor: "pointer", fontSize: 10, marginTop: 12, letterSpacing: 1 }}>
            ↺ CHANGE VOTE
          </button>
        )}

        <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
          <button onClick={share} style={{ ...mono, background: "transparent", border: "1px solid #39ff14", color: "#39ff14", padding: "8px 20px", cursor: "pointer", fontSize: 11, letterSpacing: 2 }}>
            {copied ? "✓ COPIED" : "SHARE"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, color: "#0d3d0d", fontSize: 9, letterSpacing: 2, ...mono }}>
          PARENT-CHILD PROVENANCE ON BITCOIN
        </div>
      </div>
    </div>
  );
}
