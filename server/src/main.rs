use axum::{
    extract::{Path, State},
    http::{HeaderMap, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tower_http::cors::{Any, CorsLayer};

// --- App State ---

struct RateLimiter {
    requests: HashMap<String, Vec<Instant>>,
}

impl RateLimiter {
    fn new() -> Self {
        Self {
            requests: HashMap::new(),
        }
    }

    /// Returns true if the request is allowed within the window.
    fn check(&mut self, ip: &str, window_secs: u64, max_requests: usize) -> bool {
        let now = Instant::now();
        let cutoff = now - std::time::Duration::from_secs(window_secs);
        let entries = self.requests.entry(ip.to_string()).or_default();
        entries.retain(|t| *t > cutoff);
        if entries.len() >= max_requests {
            return false;
        }
        entries.push(now);
        true
    }
}

#[derive(Clone)]
struct AppState {
    db: Arc<Mutex<Connection>>,
    limiter: Arc<Mutex<RateLimiter>>,
}

// --- Error Handling ---

enum AppError {
    NotFound(String),
    BadRequest(String),
    RateLimited,
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, msg) = match self {
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m),
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            AppError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                "too many requests, try again later".to_string(),
            ),
            AppError::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, m),
        };
        (status, Json(serde_json::json!({"error": msg}))).into_response()
    }
}

// --- Constants ---

const POLL_OPTIONS: &[&str] = &["ordinalswallet", "unisat", "gamma", "trio", "orddropz", "satflow", "ordzaar", "magisat", "ordnet"];

// --- Database ---

fn init_db(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS tool_clicks (
            tool TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS poll_votes (
            id TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            text TEXT NOT NULL,
            ts INTEGER NOT NULL,
            likes INTEGER NOT NULL DEFAULT 0,
            dislikes INTEGER NOT NULL DEFAULT 0,
            parent_id INTEGER DEFAULT NULL
        );
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            desc TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL DEFAULT 'marketplace',
            ts INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS poll_voters (
            ip TEXT PRIMARY KEY,
            choice TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS comment_reactions (
            comment_id INTEGER NOT NULL,
            ip TEXT NOT NULL,
            reaction_type TEXT NOT NULL,
            ts INTEGER NOT NULL,
            PRIMARY KEY (comment_id, ip, reaction_type)
        );
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            link TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT 'general',
            ts INTEGER NOT NULL
        );",
    )
    .expect("failed to initialize database");

    // Migrations for existing databases
    let _ = conn.execute_batch(
        "ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT NULL;"
    );
}

// --- Helpers ---

fn extract_ip(headers: &HeaderMap) -> String {
    if let Some(v) = headers.get("fly-client-ip") {
        if let Ok(s) = v.to_str() {
            return s.trim().to_string();
        }
    }
    if let Some(v) = headers.get("x-forwarded-for") {
        if let Ok(s) = v.to_str() {
            if let Some(first) = s.split(',').next() {
                return first.trim().to_string();
            }
        }
    }
    "unknown".to_string()
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn get_all_votes(conn: &Connection) -> HashMap<String, i64> {
    let mut stmt = match conn.prepare("SELECT id, count FROM poll_votes") {
        Ok(s) => s,
        Err(_) => return HashMap::new(),
    };
    let rows = match stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    }) {
        Ok(r) => r,
        Err(_) => return HashMap::new(),
    };
    let mut map = HashMap::new();
    for row in rows.flatten() {
        map.insert(row.0, row.1);
    }
    map
}

fn check_rate_limit(
    state: &AppState,
    ip: &str,
    window_secs: u64,
    max_requests: usize,
) -> Result<(), AppError> {
    let mut limiter = state
        .limiter
        .lock()
        .map_err(|_| AppError::Internal("limiter lock failed".into()))?;
    if !limiter.check(ip, window_secs, max_requests) {
        return Err(AppError::RateLimited);
    }
    Ok(())
}

// --- Tool Clicks ---

async fn get_tool_clicks(
    State(state): State<AppState>,
) -> Result<Json<HashMap<String, i64>>, AppError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let mut stmt = conn
        .prepare("SELECT tool, count FROM tool_clicks")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let mut map = HashMap::new();
    for row in rows.flatten() {
        map.insert(row.0, row.1);
    }
    Ok(Json(map))
}

async fn post_tool_click(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(tool): Path<String>,
) -> Result<Json<i64>, AppError> {
    // Validation
    if tool.len() > 50 {
        return Err(AppError::BadRequest("tool name too long".into()));
    }

    // Rate limit: 10 per 10s
    let ip = extract_ip(&headers);
    check_rate_limit(&state, &ip, 10, 10)?;

    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    conn.execute(
        "INSERT INTO tool_clicks (tool, count) VALUES (?1, 1)
         ON CONFLICT(tool) DO UPDATE SET count = count + 1",
        [&tool],
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;
    let count: i64 = conn
        .query_row(
            "SELECT count FROM tool_clicks WHERE tool = ?1",
            [&tool],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(Json(count))
}

// --- Poll ---

#[derive(Serialize)]
struct VoteResponse {
    votes: HashMap<String, i64>,
    your_vote: Option<String>,
    status: String,
}

async fn get_poll(State(state): State<AppState>) -> Result<Json<HashMap<String, i64>>, AppError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    Ok(Json(get_all_votes(&conn)))
}

async fn get_my_vote(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Option<String>>, AppError> {
    let ip = extract_ip(&headers);
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let choice: Option<String> = conn
        .query_row(
            "SELECT choice FROM poll_voters WHERE ip = ?1",
            [&ip],
            |row| row.get(0),
        )
        .ok();
    Ok(Json(choice))
}

async fn post_poll_vote(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    // Validation: poll option must be in allowlist
    if !POLL_OPTIONS.contains(&id.as_str()) {
        return Err(AppError::BadRequest("invalid poll option".into()));
    }

    let ip = extract_ip(&headers);

    // Rate limit: 5 per 60s
    check_rate_limit(&state, &ip, 60, 5)?;

    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;

    let existing: Option<String> = conn
        .query_row(
            "SELECT choice FROM poll_voters WHERE ip = ?1",
            [&ip],
            |row| row.get(0),
        )
        .ok();

    match existing {
        Some(ref old_choice) if old_choice == &id => {
            let votes = get_all_votes(&conn);
            Ok((
                StatusCode::CONFLICT,
                Json(VoteResponse {
                    votes,
                    your_vote: Some(id),
                    status: "already_voted".to_string(),
                }),
            ))
        }
        Some(ref old_choice) => {
            conn.execute(
                "UPDATE poll_votes SET count = MAX(count - 1, 0) WHERE id = ?1",
                [old_choice],
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;
            conn.execute(
                "INSERT INTO poll_votes (id, count) VALUES (?1, 1)
                 ON CONFLICT(id) DO UPDATE SET count = count + 1",
                [&id],
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;
            conn.execute(
                "UPDATE poll_voters SET choice = ?1 WHERE ip = ?2",
                rusqlite::params![id, ip],
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;
            let votes = get_all_votes(&conn);
            Ok((
                StatusCode::OK,
                Json(VoteResponse {
                    votes,
                    your_vote: Some(id),
                    status: "changed".to_string(),
                }),
            ))
        }
        None => {
            conn.execute(
                "INSERT INTO poll_votes (id, count) VALUES (?1, 1)
                 ON CONFLICT(id) DO UPDATE SET count = count + 1",
                [&id],
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;
            conn.execute(
                "INSERT INTO poll_voters (ip, choice) VALUES (?1, ?2)",
                rusqlite::params![ip, id],
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;
            let votes = get_all_votes(&conn);
            Ok((
                StatusCode::OK,
                Json(VoteResponse {
                    votes,
                    your_vote: Some(id),
                    status: "voted".to_string(),
                }),
            ))
        }
    }
}

// --- Comments ---

#[derive(Serialize)]
struct Comment {
    id: i64,
    name: String,
    text: String,
    ts: i64,
    likes: i64,
    dislikes: i64,
    parent_id: Option<i64>,
}

#[derive(Deserialize)]
struct NewComment {
    name: Option<String>,
    text: String,
    parent_id: Option<i64>,
}

async fn get_comments(State(state): State<AppState>) -> Result<Json<Vec<Comment>>, AppError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let mut stmt = conn
        .prepare("SELECT id, name, text, ts, likes, dislikes, parent_id FROM comments ORDER BY ts DESC")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Comment {
                id: row.get(0)?,
                name: row.get(1)?,
                text: row.get(2)?,
                ts: row.get(3)?,
                likes: row.get(4)?,
                dislikes: row.get(5)?,
                parent_id: row.get(6)?,
            })
        })
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let comments: Vec<Comment> = rows.flatten().collect();
    Ok(Json(comments))
}

async fn post_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<NewComment>,
) -> Result<Json<Comment>, AppError> {
    // Validation
    let name = body.name.unwrap_or_default().trim().to_string();
    let text = body.text.trim().to_string();

    if text.is_empty() {
        return Err(AppError::BadRequest("comment text is required".into()));
    }
    if text.len() > 500 {
        return Err(AppError::BadRequest(
            "comment too long (max 500 chars)".into(),
        ));
    }
    if name.len() > 50 {
        return Err(AppError::BadRequest("name too long (max 50 chars)".into()));
    }

    // Rate limit: 5 per 60s
    let ip = extract_ip(&headers);
    check_rate_limit(&state, &ip, 60, 5)?;

    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let ts = now_ms();
    let parent_id = body.parent_id;
    conn.execute(
        "INSERT INTO comments (name, text, ts, parent_id) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![name, text, ts, parent_id],
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;
    let id = conn.last_insert_rowid();
    Ok(Json(Comment {
        id,
        name,
        text,
        ts,
        likes: 0,
        dislikes: 0,
        parent_id,
    }))
}

fn get_comment_by_id(conn: &Connection, id: i64) -> Result<Comment, AppError> {
    conn.query_row(
        "SELECT id, name, text, ts, likes, dislikes, parent_id FROM comments WHERE id = ?1",
        [id],
        |row| {
            Ok(Comment {
                id: row.get(0)?,
                name: row.get(1)?,
                text: row.get(2)?,
                ts: row.get(3)?,
                likes: row.get(4)?,
                dislikes: row.get(5)?,
                parent_id: row.get(6)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound(format!("comment {} not found", id)))
}

async fn like_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<Json<Comment>, AppError> {
    let ip = extract_ip(&headers);

    // Rate limit: 20 per 60s
    check_rate_limit(&state, &ip, 60, 20)?;

    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;

    // Check if comment exists
    let _ = get_comment_by_id(&conn, id)?;

    // IP-based dedup
    let already: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM comment_reactions WHERE comment_id=?1 AND ip=?2 AND reaction_type='like'",
            rusqlite::params![id, ip],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if already {
        return Err(AppError::BadRequest("already liked".into()));
    }

    // Record reaction
    conn.execute(
        "INSERT INTO comment_reactions (comment_id, ip, reaction_type, ts) VALUES (?1, ?2, 'like', ?3)",
        rusqlite::params![id, ip, now_ms()],
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;

    // Increment
    conn.execute(
        "UPDATE comments SET likes = likes + 1 WHERE id = ?1",
        [id],
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(get_comment_by_id(&conn, id)?))
}

async fn dislike_comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<Json<Comment>, AppError> {
    let ip = extract_ip(&headers);

    // Rate limit: 20 per 60s
    check_rate_limit(&state, &ip, 60, 20)?;

    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;

    // Check if comment exists
    let _ = get_comment_by_id(&conn, id)?;

    // IP-based dedup
    let already: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM comment_reactions WHERE comment_id=?1 AND ip=?2 AND reaction_type='dislike'",
            rusqlite::params![id, ip],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if already {
        return Err(AppError::BadRequest("already disliked".into()));
    }

    // Record reaction
    conn.execute(
        "INSERT INTO comment_reactions (comment_id, ip, reaction_type, ts) VALUES (?1, ?2, 'dislike', ?3)",
        rusqlite::params![id, ip, now_ms()],
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;

    // Increment
    conn.execute(
        "UPDATE comments SET dislikes = dislikes + 1 WHERE id = ?1",
        [id],
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(get_comment_by_id(&conn, id)?))
}

// --- Submissions ---

#[derive(Serialize)]
struct Submission {
    id: i64,
    name: String,
    url: String,
    desc: String,
    #[serde(rename = "type")]
    kind: String,
    ts: i64,
}

#[derive(Deserialize)]
struct NewSubmission {
    name: String,
    url: String,
    desc: Option<String>,
    #[serde(rename = "type")]
    kind: Option<String>,
}

async fn get_submissions(
    State(state): State<AppState>,
) -> Result<Json<Vec<Submission>>, AppError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let mut stmt = conn
        .prepare("SELECT id, name, url, desc, type, ts FROM submissions ORDER BY ts DESC")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Submission {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                desc: row.get(3)?,
                kind: row.get(4)?,
                ts: row.get(5)?,
            })
        })
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let submissions: Vec<Submission> = rows.flatten().collect();
    Ok(Json(submissions))
}

async fn post_submission(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<NewSubmission>,
) -> Result<Json<Submission>, AppError> {
    // Validation
    let name = body.name.trim().to_string();
    let url = body.url.trim().to_string();
    let desc = body.desc.unwrap_or_default().trim().to_string();
    let kind = body.kind.unwrap_or_else(|| "marketplace".to_string());

    if name.is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    if name.len() > 100 {
        return Err(AppError::BadRequest(
            "name too long (max 100 chars)".into(),
        ));
    }
    if url.is_empty() {
        return Err(AppError::BadRequest("url is required".into()));
    }
    if url.len() > 500 {
        return Err(AppError::BadRequest("url too long (max 500 chars)".into()));
    }
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(AppError::BadRequest(
            "url must start with http:// or https://".into(),
        ));
    }
    if desc.len() > 300 {
        return Err(AppError::BadRequest(
            "description too long (max 300 chars)".into(),
        ));
    }
    if !["marketplace", "tool", "other"].contains(&kind.as_str()) {
        return Err(AppError::BadRequest(
            "type must be marketplace, tool, or other".into(),
        ));
    }

    // Rate limit: 3 per 60s
    let ip = extract_ip(&headers);
    check_rate_limit(&state, &ip, 60, 3)?;

    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let ts = now_ms();
    conn.execute(
        "INSERT INTO submissions (name, url, desc, type, ts) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![name, url, desc, kind, ts],
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;
    let id = conn.last_insert_rowid();
    Ok(Json(Submission {
        id,
        name,
        url,
        desc,
        kind,
        ts,
    }))
}

// --- News ---

#[derive(Serialize)]
struct NewsPost {
    id: i64,
    title: String,
    content: String,
    link: String,
    category: String,
    ts: i64,
}

#[derive(Deserialize)]
struct NewsQuery {
    limit: Option<i64>,
}

async fn get_news(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<NewsQuery>,
) -> Result<Json<Vec<NewsPost>>, AppError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let limit = query.limit.unwrap_or(1000);
    let mut stmt = conn
        .prepare("SELECT id, title, content, link, category, ts FROM news ORDER BY ts DESC LIMIT ?1")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let rows = stmt
        .query_map([limit], |row| {
            Ok(NewsPost {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                link: row.get(3)?,
                category: row.get(4)?,
                ts: row.get(5)?,
            })
        })
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let posts: Vec<NewsPost> = rows.flatten().collect();
    Ok(Json(posts))
}

// --- Admin ---

#[derive(Deserialize)]
struct AdminQuery {
    key: Option<String>,
}

#[derive(Serialize)]
struct AdminData {
    comments: Vec<Comment>,
    submissions: Vec<Submission>,
    poll_votes: HashMap<String, i64>,
    poll_voters: Vec<PollVoter>,
    news: Vec<NewsPost>,
}

#[derive(Serialize)]
struct PollVoter {
    ip: String,
    choice: String,
}

fn check_admin_key(key: &Option<String>) -> Result<(), AppError> {
    let admin_key = std::env::var("ADMIN_KEY").unwrap_or_else(|_| "tulip-admin-2026".to_string());
    match key {
        Some(k) if k == &admin_key => Ok(()),
        _ => Err(AppError::BadRequest("invalid admin key".into())),
    }
}

async fn admin_data(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<AdminQuery>,
) -> Result<Json<AdminData>, AppError> {
    check_admin_key(&query.key)?;

    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;

    // Comments
    let mut stmt = conn
        .prepare("SELECT id, name, text, ts, likes, dislikes, parent_id FROM comments ORDER BY ts DESC")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let comments: Vec<Comment> = stmt
        .query_map([], |row| {
            Ok(Comment {
                id: row.get(0)?,
                name: row.get(1)?,
                text: row.get(2)?,
                ts: row.get(3)?,
                likes: row.get(4)?,
                dislikes: row.get(5)?,
                parent_id: row.get(6)?,
            })
        })
        .map_err(|e| AppError::Internal(e.to_string()))?
        .flatten()
        .collect();

    // Submissions
    let mut stmt2 = conn
        .prepare("SELECT id, name, url, desc, type, ts FROM submissions ORDER BY ts DESC")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let submissions: Vec<Submission> = stmt2
        .query_map([], |row| {
            Ok(Submission {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                desc: row.get(3)?,
                kind: row.get(4)?,
                ts: row.get(5)?,
            })
        })
        .map_err(|e| AppError::Internal(e.to_string()))?
        .flatten()
        .collect();

    // Poll votes
    let poll_votes = get_all_votes(&conn);

    // Poll voters
    let mut stmt3 = conn
        .prepare("SELECT ip, choice FROM poll_voters")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let poll_voters: Vec<PollVoter> = stmt3
        .query_map([], |row| {
            Ok(PollVoter {
                ip: row.get(0)?,
                choice: row.get(1)?,
            })
        })
        .map_err(|e| AppError::Internal(e.to_string()))?
        .flatten()
        .collect();

    // News
    let mut stmt4 = conn
        .prepare("SELECT id, title, content, link, category, ts FROM news ORDER BY ts DESC")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let news: Vec<NewsPost> = stmt4
        .query_map([], |row| {
            Ok(NewsPost {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                link: row.get(3)?,
                category: row.get(4)?,
                ts: row.get(5)?,
            })
        })
        .map_err(|e| AppError::Internal(e.to_string()))?
        .flatten()
        .collect();

    Ok(Json(AdminData {
        comments,
        submissions,
        poll_votes,
        poll_voters,
        news,
    }))
}

#[derive(Deserialize)]
struct AdminDeleteBody {
    key: String,
}

async fn delete_comment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(body): Json<AdminDeleteBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    check_admin_key(&Some(body.key))?;
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let rows = conn
        .execute("DELETE FROM comments WHERE id = ?1", [id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if rows == 0 {
        return Err(AppError::NotFound("comment not found".into()));
    }
    // Clean up reactions too
    let _ = conn.execute("DELETE FROM comment_reactions WHERE comment_id = ?1", [id]);
    Ok(Json(serde_json::json!({"deleted": id})))
}

async fn delete_submission(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(body): Json<AdminDeleteBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    check_admin_key(&Some(body.key))?;
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let rows = conn
        .execute("DELETE FROM submissions WHERE id = ?1", [id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if rows == 0 {
        return Err(AppError::NotFound("submission not found".into()));
    }
    Ok(Json(serde_json::json!({"deleted": id})))
}

async fn delete_poll_voter(
    State(state): State<AppState>,
    Json(body): Json<AdminDeleteBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    check_admin_key(&Some(body.key.clone()))?;
    // Reset all poll data
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    conn.execute("DELETE FROM poll_voters", [])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    conn.execute("DELETE FROM poll_votes", [])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(Json(serde_json::json!({"status": "poll reset"})))
}

#[derive(Deserialize)]
struct AdminNewNews {
    key: String,
    title: String,
    content: String,
    link: Option<String>,
    category: Option<String>,
}

async fn admin_create_news(
    State(state): State<AppState>,
    Json(body): Json<AdminNewNews>,
) -> Result<Json<NewsPost>, AppError> {
    check_admin_key(&Some(body.key))?;

    let title = body.title.trim().to_string();
    let content = body.content.trim().to_string();
    let link = body.link.unwrap_or_default().trim().to_string();
    let category = body.category.unwrap_or_else(|| "general".to_string());

    if title.is_empty() {
        return Err(AppError::BadRequest("title is required".into()));
    }
    if title.len() > 200 {
        return Err(AppError::BadRequest("title too long (max 200 chars)".into()));
    }
    if content.is_empty() {
        return Err(AppError::BadRequest("content is required".into()));
    }
    if content.len() > 10000 {
        return Err(AppError::BadRequest("content too long (max 10000 chars)".into()));
    }
    if link.len() > 500 {
        return Err(AppError::BadRequest("link too long (max 500 chars)".into()));
    }
    if !link.is_empty() && !link.starts_with("http://") && !link.starts_with("https://") {
        return Err(AppError::BadRequest("link must start with http:// or https://".into()));
    }
    if !["release", "controversy", "general", "update"].contains(&category.as_str()) {
        return Err(AppError::BadRequest(
            "category must be release, controversy, general, or update".into(),
        ));
    }

    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let ts = now_ms();
    conn.execute(
        "INSERT INTO news (title, content, link, category, ts) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![title, content, link, category, ts],
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;
    let id = conn.last_insert_rowid();
    Ok(Json(NewsPost {
        id,
        title,
        content,
        link,
        category,
        ts,
    }))
}

async fn admin_delete_news(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(body): Json<AdminDeleteBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    check_admin_key(&Some(body.key))?;
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let rows = conn
        .execute("DELETE FROM news WHERE id = ?1", [id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if rows == 0 {
        return Err(AppError::NotFound("news post not found".into()));
    }
    Ok(Json(serde_json::json!({"deleted": id})))
}

// --- Main ---

#[tokio::main]
async fn main() {
    let db_path =
        std::env::var("DATABASE_PATH").unwrap_or_else(|_| "tulip_garden.db".to_string());
    let conn = Connection::open(&db_path).expect("failed to open database");
    init_db(&conn);

    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
        limiter: Arc::new(Mutex::new(RateLimiter::new())),
    };

    // Spawn rate limiter cleanup task (every 5 minutes, prune entries older than 2 minutes)
    let limiter_clone = state.limiter.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(300)).await;
            if let Ok(mut limiter) = limiter_clone.lock() {
                let cutoff = Instant::now() - std::time::Duration::from_secs(120);
                limiter.requests.retain(|_, v| {
                    v.retain(|t| *t > cutoff);
                    !v.is_empty()
                });
            }
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::DELETE])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/tool-clicks", get(get_tool_clicks))
        .route("/api/tool-clicks/{tool}", post(post_tool_click))
        .route("/api/poll", get(get_poll))
        .route("/api/poll/my-vote", get(get_my_vote))
        .route("/api/poll/{id}", post(post_poll_vote))
        .route("/api/comments", get(get_comments).post(post_comment))
        .route("/api/comments/{id}/like", post(like_comment))
        .route("/api/comments/{id}/dislike", post(dislike_comment))
        .route(
            "/api/submissions",
            get(get_submissions).post(post_submission),
        )
        .route("/api/news", get(get_news))
        .route("/api/admin", get(admin_data))
        .route("/api/admin/comments/{id}", axum::routing::delete(delete_comment))
        .route("/api/admin/submissions/{id}", axum::routing::delete(delete_submission))
        .route("/api/admin/poll/reset", post(delete_poll_voter))
        .route("/api/admin/news", post(admin_create_news))
        .route("/api/admin/news/{id}", axum::routing::delete(admin_delete_news))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3002".to_string());
    let addr = format!("0.0.0.0:{port}");
    println!("listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
