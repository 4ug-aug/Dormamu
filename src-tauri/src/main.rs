// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{Datelike, Local, TimeZone};
use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

// Database state wrapper
struct DbState(Mutex<Connection>);

// Data models
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeEntry {
    pub id: String,
    pub task_id: String,
    pub start_time: i64,
    pub end_time: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeEntryWithDetails {
    pub id: String,
    pub task_id: String,
    pub task_name: String,
    pub project_id: String,
    pub project_name: String,
    pub project_color: String,
    pub start_time: i64,
    pub end_time: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskWithProject {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub created_at: i64,
    pub project_name: String,
    pub project_color: String,
}

// Initialize database with schema
fn init_database(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS time_entries (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    Ok(())
}

// Project commands
#[tauri::command]
fn create_project(state: State<DbState>, name: String, color: String) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Local::now().timestamp();

    conn.execute(
        "INSERT INTO projects (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
        (&id, &name, &color, &created_at),
    )
    .map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        name,
        color,
        created_at,
    })
}

#[tauri::command]
fn update_project(
    state: State<DbState>,
    id: String,
    name: String,
    color: String,
) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE projects SET name = ?1, color = ?2 WHERE id = ?3",
        (&name, &color, &id),
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, color, created_at FROM projects WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let project = stmt
        .query_row([&id], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
fn delete_project(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Delete associated time entries first
    conn.execute(
        "DELETE FROM time_entries WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?1)",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    // Delete associated tasks
    conn.execute("DELETE FROM tasks WHERE project_id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Delete project
    conn.execute("DELETE FROM projects WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_projects(state: State<DbState>) -> Result<Vec<Project>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, color, created_at FROM projects ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(projects)
}

// Task commands
#[tauri::command]
fn create_task(state: State<DbState>, project_id: String, name: String) -> Result<Task, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Local::now().timestamp();

    conn.execute(
        "INSERT INTO tasks (id, project_id, name, created_at) VALUES (?1, ?2, ?3, ?4)",
        (&id, &project_id, &name, &created_at),
    )
    .map_err(|e| e.to_string())?;

    Ok(Task {
        id,
        project_id,
        name,
        created_at,
    })
}

#[tauri::command]
fn update_task(state: State<DbState>, id: String, name: String) -> Result<Task, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute("UPDATE tasks SET name = ?1 WHERE id = ?2", (&name, &id))
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, project_id, name, created_at FROM tasks WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let task = stmt
        .query_row([&id], |row| {
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
fn delete_task(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Delete associated time entries first
    conn.execute("DELETE FROM time_entries WHERE task_id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Delete task
    conn.execute("DELETE FROM tasks WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_tasks(state: State<DbState>) -> Result<Vec<TaskWithProject>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.project_id, t.name, t.created_at, p.name, p.color
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             ORDER BY t.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([], |row| {
            Ok(TaskWithProject {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
                project_name: row.get(4)?,
                project_color: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
fn get_tasks_by_project(
    state: State<DbState>,
    project_id: String,
) -> Result<Vec<Task>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, project_id, name, created_at FROM tasks WHERE project_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([&project_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

// Time tracking commands
#[tauri::command]
fn start_tracking(state: State<DbState>, task_id: String) -> Result<TimeEntry, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // First, stop any active tracking
    let now = Local::now().timestamp();
    conn.execute(
        "UPDATE time_entries SET end_time = ?1 WHERE end_time IS NULL",
        [&now],
    )
    .map_err(|e| e.to_string())?;

    // Create new time entry
    let id = Uuid::new_v4().to_string();
    let start_time = now;

    conn.execute(
        "INSERT INTO time_entries (id, task_id, start_time, end_time) VALUES (?1, ?2, ?3, NULL)",
        (&id, &task_id, &start_time),
    )
    .map_err(|e| e.to_string())?;

    Ok(TimeEntry {
        id,
        task_id,
        start_time,
        end_time: None,
    })
}

#[tauri::command]
fn stop_tracking(state: State<DbState>) -> Result<Option<TimeEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Local::now().timestamp();

    // Get the active entry before stopping
    let mut stmt = conn
        .prepare("SELECT id, task_id, start_time FROM time_entries WHERE end_time IS NULL")
        .map_err(|e| e.to_string())?;

    let entry: Option<TimeEntry> = stmt
        .query_row([], |row| {
            Ok(TimeEntry {
                id: row.get(0)?,
                task_id: row.get(1)?,
                start_time: row.get(2)?,
                end_time: Some(now),
            })
        })
        .ok();

    // Stop tracking
    conn.execute(
        "UPDATE time_entries SET end_time = ?1 WHERE end_time IS NULL",
        [&now],
    )
    .map_err(|e| e.to_string())?;

    Ok(entry)
}

#[tauri::command]
fn get_active_entry(state: State<DbState>) -> Result<Option<TimeEntryWithDetails>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, te.end_time
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             WHERE te.end_time IS NULL",
        )
        .map_err(|e| e.to_string())?;

    let entry = stmt
        .query_row([], |row| {
            Ok(TimeEntryWithDetails {
                id: row.get(0)?,
                task_id: row.get(1)?,
                task_name: row.get(2)?,
                project_id: row.get(3)?,
                project_name: row.get(4)?,
                project_color: row.get(5)?,
                start_time: row.get(6)?,
                end_time: row.get(7)?,
            })
        })
        .ok();

    Ok(entry)
}

#[tauri::command]
fn get_today_entries(state: State<DbState>) -> Result<Vec<TimeEntryWithDetails>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get start of today (midnight)
    let today = Local::now().date_naive();
    let start_of_day = Local
        .from_local_datetime(&today.and_hms_opt(0, 0, 0).unwrap())
        .unwrap()
        .timestamp();

    let mut stmt = conn
        .prepare(
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, te.end_time
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             WHERE te.start_time >= ?1
             ORDER BY te.start_time DESC",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map([&start_of_day], |row| {
            Ok(TimeEntryWithDetails {
                id: row.get(0)?,
                task_id: row.get(1)?,
                task_name: row.get(2)?,
                project_id: row.get(3)?,
                project_name: row.get(4)?,
                project_color: row.get(5)?,
                start_time: row.get(6)?,
                end_time: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

#[tauri::command]
fn delete_time_entry(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM time_entries WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_time_entry(
    state: State<DbState>,
    id: String,
    start_time: i64,
    end_time: Option<i64>,
) -> Result<TimeEntryWithDetails, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE time_entries SET start_time = ?1, end_time = ?2 WHERE id = ?3",
        (&start_time, &end_time, &id),
    )
    .map_err(|e| e.to_string())?;

    // Return the updated entry with details
    let mut stmt = conn
        .prepare(
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, te.end_time
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             WHERE te.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let entry = stmt
        .query_row([&id], |row| {
            Ok(TimeEntryWithDetails {
                id: row.get(0)?,
                task_id: row.get(1)?,
                task_name: row.get(2)?,
                project_id: row.get(3)?,
                project_name: row.get(4)?,
                project_color: row.get(5)?,
                start_time: row.get(6)?,
                end_time: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(entry)
}

// Dashboard commands
#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_time: i64,
    pub this_month_time: i64,
    pub avg_daily_time: i64,
    pub total_entries: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedEntries {
    pub entries: Vec<TimeEntryWithDetails>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChartDataPoint {
    pub date: String,
    pub project_id: String,
    pub project_name: String,
    pub project_color: String,
    pub duration: i64,
}

#[tauri::command]
fn get_stats(state: State<DbState>) -> Result<DashboardStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Local::now().timestamp();

    // Get start of this month
    let today = Local::now().date_naive();
    let start_of_month = Local
        .from_local_datetime(&today.with_day(1).unwrap().and_hms_opt(0, 0, 0).unwrap())
        .unwrap()
        .timestamp();

    // Total time (all completed entries)
    let total_time: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(COALESCE(end_time, ?1) - start_time), 0) FROM time_entries",
            [&now],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // This month's time
    let this_month_time: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(COALESCE(end_time, ?1) - start_time), 0) FROM time_entries WHERE start_time >= ?2",
            [&now, &start_of_month],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Get first entry date for average calculation
    let first_entry_date: Option<i64> = conn
        .query_row(
            "SELECT MIN(start_time) FROM time_entries",
            [],
            |row| row.get(0),
        )
        .ok();

    // Calculate average daily time
    let avg_daily_time = if let Some(first_date) = first_entry_date {
        let days = ((now - first_date) / 86400).max(1);
        total_time / days
    } else {
        0
    };

    // Total entries count
    let total_entries: i64 = conn
        .query_row("SELECT COUNT(*) FROM time_entries", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(DashboardStats {
        total_time,
        this_month_time,
        avg_daily_time,
        total_entries,
    })
}

#[tauri::command]
fn get_all_entries(
    state: State<DbState>,
    page: i64,
    per_page: i64,
) -> Result<PaginatedEntries, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let offset = (page - 1) * per_page;

    // Get total count
    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM time_entries", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // Get paginated entries
    let mut stmt = conn
        .prepare(
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, te.end_time
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             ORDER BY te.start_time DESC
             LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map([&per_page, &offset], |row| {
            Ok(TimeEntryWithDetails {
                id: row.get(0)?,
                task_id: row.get(1)?,
                task_name: row.get(2)?,
                project_id: row.get(3)?,
                project_name: row.get(4)?,
                project_color: row.get(5)?,
                start_time: row.get(6)?,
                end_time: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(PaginatedEntries {
        entries,
        total,
        page,
        per_page,
    })
}

#[tauri::command]
fn get_entries_by_range(
    state: State<DbState>,
    start_timestamp: i64,
    end_timestamp: i64,
) -> Result<Vec<ChartDataPoint>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Local::now().timestamp();

    // Get entries grouped by date and project
    let mut stmt = conn
        .prepare(
            "SELECT 
                date(te.start_time, 'unixepoch', 'localtime') as date,
                p.id as project_id,
                p.name as project_name,
                p.color as project_color,
                SUM(COALESCE(te.end_time, ?1) - te.start_time) as duration
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             WHERE te.start_time >= ?2 AND te.start_time <= ?3
             GROUP BY date, p.id
             ORDER BY date ASC, p.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let data_points = stmt
        .query_map([&now, &start_timestamp, &end_timestamp], |row| {
            Ok(ChartDataPoint {
                date: row.get(0)?,
                project_id: row.get(1)?,
                project_name: row.get(2)?,
                project_color: row.get(3)?,
                duration: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(data_points)
}

fn main() {
    // Create database connection
    let app_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    
    std::fs::create_dir_all(&app_dir).ok();
    
    let db_path = app_dir.join("dormamu.db");
    let conn = Connection::open(&db_path).expect("Failed to open database");

    // Initialize database schema
    init_database(&conn).expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            create_project,
            update_project,
            delete_project,
            get_projects,
            create_task,
            update_task,
            delete_task,
            get_tasks,
            get_tasks_by_project,
            start_tracking,
            stop_tracking,
            get_active_entry,
            get_today_entries,
            delete_time_entry,
            update_time_entry,
            get_stats,
            get_all_entries,
            get_entries_by_range,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
