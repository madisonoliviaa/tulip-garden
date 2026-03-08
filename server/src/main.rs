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
use tower_http::cors::{Any, CorsLayer};

type Db = Arc<Mutex<Connection>>;

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
        );",
    )
    .expect("failed to initialize database");
}

async fn get_tool_clicks(State(db): State<Db>) -> Json<HashMap<String, i64>> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT tool, count FROM tool_clicks").unwrap();
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .unwrap();
    let mut map = HashMap::new();
    for row in rows {
        let (tool, count) = row.unwrap();
        map.insert(tool, count);
    }
    Json(map)
}

async fn post_tool_click(State(db): State<Db>, Path(tool): Path<String>) -> Json<i64> {
    let conn = db.lock().unwrap();
    conn.execute(
        "INSERT INTO tool_clicks (tool, count) VALUES (?1, 1)
         ON CONFLICT(tool) DO UPDATE SET count = count + 1",
        [&tool],
    )
    .unwrap();
    let count: i64 = conn
        .query_row(
            "SELECT count FROM tool_clicks WHERE tool = ?1",
            [&tool],
            |row| row.get(0),
        )
        .unwrap();
    Json(count)
}

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

fn get_all_votes(conn: &Connection) -> HashMap<String, i64> {
    let mut stmt = conn.prepare("SELECT id, count FROM poll_votes").unwrap();
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .unwrap();
    let mut map = HashMap::new();
    for row in rows {
        let (id, count) = row.unwrap();
        map.insert(id, count);
    }
    map
}

#[derive(Serialize)]
struct VoteResponse {
    votes: HashMap<String, i64>,
    your_vote: Option<String>,
    status: String,
}

async fn get_poll(State(db): State<Db>) -> Json<HashMap<String, i64>> {
    let conn = db.lock().unwrap();
    Json(get_all_votes(&conn))
}

async fn get_my_vote(State(db): State<Db>, headers: HeaderMap) -> Json<Option<String>> {
    let ip = extract_ip(&headers);
    let conn = db.lock().unwrap();
    let choice: Option<String> = conn
        .query_row(
            "SELECT choice FROM poll_voters WHERE ip = ?1",
            [&ip],
            |row| row.get(0),
        )
        .ok();
    Json(choice)
}

async fn post_poll_vote(
    State(db): State<Db>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let ip = extract_ip(&headers);
    let conn = db.lock().unwrap();

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
            (
                StatusCode::CONFLICT,
                Json(VoteResponse {
                    votes,
                    your_vote: Some(id),
                    status: "already_voted".to_string(),
                }),
            )
        }
        Some(ref old_choice) => {
            conn.execute(
                "UPDATE poll_votes SET count = MAX(count - 1, 0) WHERE id = ?1",
                [old_choice],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO poll_votes (id, count) VALUES (?1, 1)
                 ON CONFLICT(id) DO UPDATE SET count = count + 1",
                [&id],
            )
            .unwrap();
            conn.execute(
                "UPDATE poll_voters SET choice = ?1 WHERE ip = ?2",
                rusqlite::params![id, ip],
            )
            .unwrap();
            let votes = get_all_votes(&conn);
            (
                StatusCode::OK,
                Json(VoteResponse {
                    votes,
                    your_vote: Some(id),
                    status: "changed".to_string(),
                }),
            )
        }
        None => {
            conn.execute(
                "INSERT INTO poll_votes (id, count) VALUES (?1, 1)
                 ON CONFLICT(id) DO UPDATE SET count = count + 1",
                [&id],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO poll_voters (ip, choice) VALUES (?1, ?2)",
                rusqlite::params![ip, id],
            )
            .unwrap();
            let votes = get_all_votes(&conn);
            (
                StatusCode::OK,
                Json(VoteResponse {
                    votes,
                    your_vote: Some(id),
                    status: "voted".to_string(),
                }),
            )
        }
    }
}

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

async fn get_comments(State(db): State<Db>) -> Json<Vec<Comment>> {
    let conn = db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, text, ts, likes, dislikes FROM comments ORDER BY ts DESC")
        .unwrap();
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
        .unwrap();
    let comments: Vec<Comment> = rows.map(|r| r.unwrap()).collect();
    Json(comments)
}

async fn post_comment(State(db): State<Db>, Json(body): Json<NewComment>) -> Json<Comment> {
    let conn = db.lock().unwrap();
    let name = body.name.unwrap_or_default();
    let text = body.text;
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    conn.execute(
        "INSERT INTO comments (name, text, ts) VALUES (?1, ?2, ?3)",
        rusqlite::params![name, text, ts],
    )
    .unwrap();
    let id = conn.last_insert_rowid();
    Json(Comment {
        id,
        name,
        text,
        ts,
        likes: 0,
        dislikes: 0,
    })
}

async fn like_comment(State(db): State<Db>, Path(id): Path<i64>) -> Json<Comment> {
    let conn = db.lock().unwrap();
    conn.execute("UPDATE comments SET likes = likes + 1 WHERE id = ?1", [id])
        .unwrap();
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
    .map(Json)
    .unwrap()
}

async fn dislike_comment(State(db): State<Db>, Path(id): Path<i64>) -> Json<Comment> {
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE comments SET dislikes = dislikes + 1 WHERE id = ?1",
        [id],
    )
    .unwrap();
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
    .map(Json)
    .unwrap()
}

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

async fn get_submissions(State(db): State<Db>) -> Json<Vec<Submission>> {
    let conn = db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, url, desc, type, ts FROM submissions ORDER BY ts DESC")
        .unwrap();
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
        .unwrap();
    let submissions: Vec<Submission> = rows.map(|r| r.unwrap()).collect();
    Json(submissions)
}

async fn post_submission(
    State(db): State<Db>,
    Json(body): Json<NewSubmission>,
) -> Json<Submission> {
    let conn = db.lock().unwrap();
    let desc = body.desc.unwrap_or_default();
    let kind = body.kind.unwrap_or_else(|| "marketplace".to_string());
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    conn.execute(
        "INSERT INTO submissions (name, url, desc, type, ts) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![body.name, body.url, desc, kind, ts],
    )
    .unwrap();
    let id = conn.last_insert_rowid();
    Json(Submission {
        id,
        name: body.name,
        url: body.url,
        desc,
        kind,
        ts,
    })
}

#[tokio::main]
async fn main() {
    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "tulip_garden.db".to_string());
    let conn = Connection::open(&db_path).expect("failed to open database");
    init_db(&conn);
    let db: Db = Arc::new(Mutex::new(conn));

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
        .with_state(db);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3002".to_string());
    let addr = format!("0.0.0.0:{port}");
    println!("listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
