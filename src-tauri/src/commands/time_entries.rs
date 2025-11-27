use chrono::{Local, TimeZone};
use tauri::State;
use uuid::Uuid;

use crate::db::DbState;
use crate::models::{TimeEntry, TimeEntryWithDetails};

#[tauri::command]
pub fn start_tracking(state: State<DbState>, task_id: String) -> Result<TimeEntry, String> {
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
pub fn stop_tracking(state: State<DbState>) -> Result<Option<TimeEntryWithDetails>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Local::now().timestamp();

    // Get the active entry with details before stopping
    let mut stmt = conn
        .prepare(
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, n.content
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             LEFT JOIN notes n ON te.id = n.time_entry_id
             WHERE te.end_time IS NULL",
        )
        .map_err(|e| e.to_string())?;

    let entry: Option<TimeEntryWithDetails> = stmt
        .query_row([], |row| {
            Ok(TimeEntryWithDetails {
                id: row.get(0)?,
                task_id: row.get(1)?,
                task_name: row.get(2)?,
                project_id: row.get(3)?,
                project_name: row.get(4)?,
                project_color: row.get(5)?,
                start_time: row.get(6)?,
                end_time: Some(now),
                note: row.get(7)?,
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
pub fn get_active_entry(state: State<DbState>) -> Result<Option<TimeEntryWithDetails>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, te.end_time, n.content
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             LEFT JOIN notes n ON te.id = n.time_entry_id
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
                note: row.get(8)?,
            })
        })
        .ok();

    Ok(entry)
}

#[tauri::command]
pub fn get_today_entries(state: State<DbState>) -> Result<Vec<TimeEntryWithDetails>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get start of today (midnight)
    let today = Local::now().date_naive();
    let start_of_day = Local
        .from_local_datetime(&today.and_hms_opt(0, 0, 0).unwrap())
        .unwrap()
        .timestamp();

    let mut stmt = conn
        .prepare(
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, te.end_time, n.content
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             LEFT JOIN notes n ON te.id = n.time_entry_id
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
                note: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

#[tauri::command]
pub fn delete_time_entry(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    // Delete associated note first
    conn.execute("DELETE FROM notes WHERE time_entry_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    
    // Delete time entry
    conn.execute("DELETE FROM time_entries WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_time_entry(
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
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, te.end_time, n.content
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             LEFT JOIN notes n ON te.id = n.time_entry_id
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
                note: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(entry)
}

