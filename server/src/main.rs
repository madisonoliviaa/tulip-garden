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

const POLL_OPTIONS: &[&str] = &["ordinalsbot", "unisat", "gamma", "orddropz", "ord"];

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
            dislikes INTEGER NOT NULL DEFAULT 0
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
        );",
    )
    .expect("failed to initialize database");
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
}

#[derive(Deserialize)]
struct NewComment {
    name: Option<String>,
    text: String,
}

async fn get_comments(State(state): State<AppState>) -> Result<Json<Vec<Comment>>, AppError> {
    let conn = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("db lock failed".into()))?;
    let mut stmt = conn
        .prepare("SELECT id, name, text, ts, likes, dislikes FROM comments ORDER BY ts DESC")
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
    conn.execute(
        "INSERT INTO comments (name, text, ts) VALUES (?1, ?2, ?3)",
        rusqlite::params![name, text, ts],
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
    }))
}

fn get_comment_by_id(conn: &Connection, id: i64) -> Result<Comment, AppError> {
    conn.query_row(
        "SELECT id, name, text, ts, likes, dislikes FROM comments WHERE id = ?1",
        [id],
        |row| {
            Ok(Comment {
                id: row.get(0)?,
                name: row.get(1)?,
                text: row.get(2)?,
                ts: row.get(3)?,
                likes: row.get(4)?,
                dislikes: row.get(5)?,
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
        .allow_methods([Method::GET, Method::POST])
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
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3002".to_string());
    let addr = format!("0.0.0.0:{port}");
    println!("listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
