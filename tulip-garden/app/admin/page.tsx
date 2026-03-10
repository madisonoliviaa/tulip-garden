'use client'

import { useState, useEffect, useCallback } from "react"

const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || "https://tulip-garden-api.fly.dev/api"

interface Comment {
  id: number
  name: string
  text: string
  ts: number
  likes: number
  dislikes: number
}

interface Submission {
  id: number
  name: string
  url: string
  desc: string
  type: string
  ts: number
}

interface PollVoter {
  ip: string
  choice: string
}

interface AdminData {
  comments: Comment[]
  submissions: Submission[]
  poll_votes: Record<string, number>
  poll_voters: PollVoter[]
}

export default function AdminPage(): React.ReactElement {
  const [key, setKey] = useState<string>("")
  const [authed, setAuthed] = useState<boolean>(false)
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const mono: React.CSSProperties = { fontFamily: "monospace" }
  const bg = "rgb(5, 15, 5)"

  const fetchData = useCallback(() => {
    if (!key) return
    setLoading(true)
    setError("")
    fetch(`${API_BASE}/admin?key=${encodeURIComponent(key)}`)
      .then(r => {
        if (!r.ok) return r.json().then((e: { error?: string }) => { throw new Error(e.error || "unauthorized") })
        return r.json()
      })
      .then((d: AdminData) => {
        setData(d)
        setAuthed(true)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [key])

  const deleteComment = (id: number): void => {
    if (!confirm(`Delete comment #${id}?`)) return
    fetch(`${API_BASE}/admin/comments/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
      .then(r => {
        if (!r.ok) throw new Error("failed")
        return r.json()
      })
      .then(() => fetchData())
      .catch(() => setError("failed to delete comment"))
  }

  const deleteSubmission = (id: number): void => {
    if (!confirm(`Delete submission #${id}?`)) return
    fetch(`${API_BASE}/admin/submissions/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
      .then(r => {
        if (!r.ok) throw new Error("failed")
        return r.json()
      })
      .then(() => fetchData())
      .catch(() => setError("failed to delete submission"))
  }

  const resetPoll = (): void => {
    if (!confirm("Reset ALL poll votes? This cannot be undone.")) return
    fetch(`${API_BASE}/admin/poll/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
      .then(r => {
        if (!r.ok) throw new Error("failed")
        return r.json()
      })
      .then(() => fetchData())
      .catch(() => setError("failed to reset poll"))
  }

  const formatDate = (ts: number): string => {
    const d = new Date(ts)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
  }

  const cellStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom: "1px solid #1a3a1a",
    fontSize: 11,
    color: "#7fff7f",
    ...mono,
    textAlign: "left",
    verticalAlign: "top",
  }

  const headerStyle: React.CSSProperties = {
    ...cellStyle,
    color: "#39ff14",
    fontSize: 10,
    letterSpacing: 2,
    borderBottom: "2px solid #1a4a1a",
    fontWeight: "normal",
  }

  const btnStyle: React.CSSProperties = {
    ...mono,
    background: "transparent",
    border: "1px solid #4a1a1a",
    color: "#ff4444",
    padding: "3px 8px",
    cursor: "pointer",
    fontSize: 9,
    letterSpacing: 1,
  }

  if (!authed) {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ border: "1px solid #1a4a1a", padding: 40, background: "rgba(0,20,0,0.6)", maxWidth: 400, width: "100%" }}>
          <div style={{ color: "#39ff14", fontSize: 14, letterSpacing: 3, marginBottom: 24, textAlign: "center", ...mono }}>
            TULIP GARDEN ADMIN
          </div>
          <div style={{ color: "#1a6a1a", fontSize: 10, marginBottom: 16, textAlign: "center", ...mono }}>
            enter admin key to continue
          </div>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") fetchData() }}
            placeholder="admin key"
            style={{
              ...mono, background: "rgba(57,255,20,0.04)", border: "1px solid #1a4a1a",
              color: "#7fff7f", padding: "10px 14px", fontSize: 12, width: "100%",
              outline: "none", marginBottom: 12, boxSizing: "border-box",
            }}
          />
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              ...mono, background: "rgba(57,255,20,0.1)", border: "1px solid #39ff14",
              color: "#39ff14", padding: "10px 20px", cursor: "pointer", fontSize: 11,
              letterSpacing: 2, width: "100%", opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "..." : "LOGIN"}
          </button>
          {error && (
            <div style={{ color: "#ff4444", fontSize: 10, marginTop: 12, textAlign: "center", ...mono }}>
              ERR: {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", color: "#7fff7f", padding: "20px 30px", ...mono }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ color: "#39ff14", fontSize: 14, letterSpacing: 3 }}>TULIP GARDEN ADMIN</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={fetchData} style={{ ...mono, background: "transparent", border: "1px solid #1a4a1a", color: "#1a6a1a", padding: "6px 14px", cursor: "pointer", fontSize: 10, letterSpacing: 1 }}>
            ↻ REFRESH
          </button>
          <button onClick={() => { setAuthed(false); setData(null); setKey("") }} style={{ ...mono, background: "transparent", border: "1px solid #4a1a1a", color: "#ff4444", padding: "6px 14px", cursor: "pointer", fontSize: 10, letterSpacing: 1 }}>
            LOGOUT
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: "#ff4444", fontSize: 10, padding: "8px 12px", border: "1px solid #4a1a1a", background: "rgba(255,0,0,0.05)", marginBottom: 16 }}>
          ERR: {error}
        </div>
      )}

      {data && (
        <>
          {/* Comments */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 12 }}>
              COMMENTS ({data.comments.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #1a3a1a" }}>
                <thead>
                  <tr>
                    <th style={headerStyle}>ID</th>
                    <th style={headerStyle}>NAME</th>
                    <th style={headerStyle}>TEXT</th>
                    <th style={headerStyle}>DATE</th>
                    <th style={headerStyle}>LIKES</th>
                    <th style={headerStyle}>DISLIKES</th>
                    <th style={headerStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.comments.length === 0 && (
                    <tr><td colSpan={7} style={{ ...cellStyle, color: "#1a4a1a", textAlign: "center" }}>no comments</td></tr>
                  )}
                  {data.comments.map(c => (
                    <tr key={c.id}>
                      <td style={cellStyle}>{c.id}</td>
                      <td style={cellStyle}>{c.name || <span style={{ color: "#1a4a1a" }}>anon</span>}</td>
                      <td style={{ ...cellStyle, maxWidth: 300, wordBreak: "break-word" }}>{c.text}</td>
                      <td style={{ ...cellStyle, fontSize: 9, color: "#1a6a1a", whiteSpace: "nowrap" }}>{formatDate(c.ts)}</td>
                      <td style={cellStyle}>{c.likes}</td>
                      <td style={cellStyle}>{c.dislikes}</td>
                      <td style={cellStyle}>
                        <button onClick={() => deleteComment(c.id)} style={btnStyle}>DELETE</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submissions */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 12 }}>
              SUBMISSIONS ({data.submissions.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #1a3a1a" }}>
                <thead>
                  <tr>
                    <th style={headerStyle}>ID</th>
                    <th style={headerStyle}>NAME</th>
                    <th style={headerStyle}>URL</th>
                    <th style={headerStyle}>DESC</th>
                    <th style={headerStyle}>TYPE</th>
                    <th style={headerStyle}>DATE</th>
                    <th style={headerStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.length === 0 && (
                    <tr><td colSpan={7} style={{ ...cellStyle, color: "#1a4a1a", textAlign: "center" }}>no submissions</td></tr>
                  )}
                  {data.submissions.map(s => (
                    <tr key={s.id}>
                      <td style={cellStyle}>{s.id}</td>
                      <td style={cellStyle}>{s.name}</td>
                      <td style={{ ...cellStyle, maxWidth: 200, wordBreak: "break-all" }}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#39ff14", textDecoration: "none" }}>{s.url}</a>
                      </td>
                      <td style={{ ...cellStyle, maxWidth: 200 }}>{s.desc}</td>
                      <td style={cellStyle}>{s.type}</td>
                      <td style={{ ...cellStyle, fontSize: 9, color: "#1a6a1a", whiteSpace: "nowrap" }}>{formatDate(s.ts)}</td>
                      <td style={cellStyle}>
                        <button onClick={() => deleteSubmission(s.id)} style={btnStyle}>DELETE</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Poll */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <span style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2 }}>
                POLL VOTES ({Object.values(data.poll_votes).reduce((a, b) => a + b, 0)} total)
              </span>
              <button onClick={resetPoll} style={{ ...btnStyle, fontSize: 9 }}>RESET ALL VOTES</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #1a3a1a" }}>
                <thead>
                  <tr>
                    <th style={headerStyle}>OPTION</th>
                    <th style={headerStyle}>VOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.poll_votes).map(([option, count]) => (
                    <tr key={option}>
                      <td style={cellStyle}>{option}</td>
                      <td style={cellStyle}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Voters */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ color: "#39ff14", fontSize: 12, letterSpacing: 2, marginBottom: 12 }}>
              POLL VOTERS ({data.poll_voters.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #1a3a1a" }}>
                <thead>
                  <tr>
                    <th style={headerStyle}>IP</th>
                    <th style={headerStyle}>CHOICE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.poll_voters.length === 0 && (
                    <tr><td colSpan={2} style={{ ...cellStyle, color: "#1a4a1a", textAlign: "center" }}>no voters</td></tr>
                  )}
                  {data.poll_voters.map((v, i) => (
                    <tr key={i}>
                      <td style={{ ...cellStyle, color: "#1a6a1a" }}>{v.ip}</td>
                      <td style={cellStyle}>{v.choice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
