use chrono::Local;
use tauri::State;
use uuid::Uuid;

use crate::db::DbState;
use crate::models::{Task, TaskWithProject};

#[tauri::command]
pub fn create_task(
    state: State<DbState>,
    project_id: String,
    name: String,
    description: Option<String>,
) -> Result<Task, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Local::now().timestamp();

    conn.execute(
        "INSERT INTO tasks (id, project_id, name, description, completed, completed_at, archived, archived_at, created_at) VALUES (?1, ?2, ?3, ?4, 0, NULL, 0, NULL, ?5)",
        (&id, &project_id, &name, &description, &created_at),
    )
    .map_err(|e| e.to_string())?;

    Ok(Task {
        id,
        project_id,
        name,
        description,
        completed: false,
        completed_at: None,
        archived: false,
        archived_at: None,
        created_at,
    })
}

#[tauri::command]
pub fn update_task(
    state: State<DbState>,
    id: String,
    name: String,
    description: Option<String>,
) -> Result<Task, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE tasks SET name = ?1, description = ?2 WHERE id = ?3",
        (&name, &description, &id),
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, project_id, name, description, completed, completed_at, archived, archived_at, created_at FROM tasks WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let task = stmt
        .query_row([&id], |row| {
            let completed: i32 = row.get(4)?;
            let archived: i32 = row.get(6)?;
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                completed: completed != 0,
                completed_at: row.get(5)?,
                archived: archived != 0,
                archived_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn delete_task(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Delete associated notes first
    conn.execute(
        "DELETE FROM notes WHERE time_entry_id IN (SELECT id FROM time_entries WHERE task_id = ?1)",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    // Delete associated time entries
    conn.execute("DELETE FROM time_entries WHERE task_id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Delete task
    conn.execute("DELETE FROM tasks WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_tasks(state: State<DbState>) -> Result<Vec<TaskWithProject>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.project_id, t.name, t.description, t.completed, t.completed_at, t.archived, t.archived_at, t.created_at, p.name, p.color
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             WHERE t.archived = 0
             ORDER BY t.completed ASC, t.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([], |row| {
            let completed: i32 = row.get(4)?;
            let archived: i32 = row.get(6)?;
            Ok(TaskWithProject {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                completed: completed != 0,
                completed_at: row.get(5)?,
                archived: archived != 0,
                archived_at: row.get(7)?,
                created_at: row.get(8)?,
                project_name: row.get(9)?,
                project_color: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn get_tasks_by_project(state: State<DbState>, project_id: String) -> Result<Vec<Task>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, project_id, name, description, completed, completed_at, archived, archived_at, created_at FROM tasks WHERE project_id = ?1 AND archived = 0 ORDER BY completed ASC, created_at DESC")
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([&project_id], |row| {
            let completed: i32 = row.get(4)?;
            let archived: i32 = row.get(6)?;
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                completed: completed != 0,
                completed_at: row.get(5)?,
                archived: archived != 0,
                archived_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn toggle_task_completed(state: State<DbState>, id: String) -> Result<TaskWithProject, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get current completion status
    let current_completed: i32 = conn
        .query_row("SELECT completed FROM tasks WHERE id = ?1", [&id], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;

    let new_completed = if current_completed == 0 { 1 } else { 0 };
    let completed_at: Option<i64> = if new_completed == 1 {
        Some(Local::now().timestamp())
    } else {
        None
    };

    conn.execute(
        "UPDATE tasks SET completed = ?1, completed_at = ?2 WHERE id = ?3",
        (&new_completed, &completed_at, &id),
    )
    .map_err(|e| e.to_string())?;

    // Return updated task with project info
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.project_id, t.name, t.description, t.completed, t.completed_at, t.archived, t.archived_at, t.created_at, p.name, p.color
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             WHERE t.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let task = stmt
        .query_row([&id], |row| {
            let completed: i32 = row.get(4)?;
            let archived: i32 = row.get(6)?;
            Ok(TaskWithProject {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                completed: completed != 0,
                completed_at: row.get(5)?,
                archived: archived != 0,
                archived_at: row.get(7)?,
                created_at: row.get(8)?,
                project_name: row.get(9)?,
                project_color: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn get_incomplete_tasks(state: State<DbState>) -> Result<Vec<TaskWithProject>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.project_id, t.name, t.description, t.completed, t.completed_at, t.archived, t.archived_at, t.created_at, p.name, p.color
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             WHERE t.completed = 0 AND t.archived = 0
             ORDER BY t.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([], |row| {
            let completed: i32 = row.get(4)?;
            let archived: i32 = row.get(6)?;
            Ok(TaskWithProject {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                completed: completed != 0,
                completed_at: row.get(5)?,
                archived: archived != 0,
                archived_at: row.get(7)?,
                created_at: row.get(8)?,
                project_name: row.get(9)?,
                project_color: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn archive_task(state: State<DbState>, id: String) -> Result<TaskWithProject, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let archived_at = Local::now().timestamp();

    conn.execute(
        "UPDATE tasks SET archived = 1, archived_at = ?1 WHERE id = ?2",
        (&archived_at, &id),
    )
    .map_err(|e| e.to_string())?;

    // Return updated task with project info
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.project_id, t.name, t.description, t.completed, t.completed_at, t.archived, t.archived_at, t.created_at, p.name, p.color
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             WHERE t.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let task = stmt
        .query_row([&id], |row| {
            let completed: i32 = row.get(4)?;
            let archived: i32 = row.get(6)?;
            Ok(TaskWithProject {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                completed: completed != 0,
                completed_at: row.get(5)?,
                archived: archived != 0,
                archived_at: row.get(7)?,
                created_at: row.get(8)?,
                project_name: row.get(9)?,
                project_color: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn unarchive_task(state: State<DbState>, id: String) -> Result<TaskWithProject, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE tasks SET archived = 0, archived_at = NULL WHERE id = ?1",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    // Return updated task with project info
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.project_id, t.name, t.description, t.completed, t.completed_at, t.archived, t.archived_at, t.created_at, p.name, p.color
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             WHERE t.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let task = stmt
        .query_row([&id], |row| {
            let completed: i32 = row.get(4)?;
            let archived: i32 = row.get(6)?;
            Ok(TaskWithProject {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                completed: completed != 0,
                completed_at: row.get(5)?,
                archived: archived != 0,
                archived_at: row.get(7)?,
                created_at: row.get(8)?,
                project_name: row.get(9)?,
                project_color: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn get_archived_tasks(state: State<DbState>) -> Result<Vec<TaskWithProject>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.project_id, t.name, t.description, t.completed, t.completed_at, t.archived, t.archived_at, t.created_at, p.name, p.color
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             WHERE t.archived = 1
             ORDER BY t.archived_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([], |row| {
            let completed: i32 = row.get(4)?;
            let archived: i32 = row.get(6)?;
            Ok(TaskWithProject {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                completed: completed != 0,
                completed_at: row.get(5)?,
                archived: archived != 0,
                archived_at: row.get(7)?,
                created_at: row.get(8)?,
                project_name: row.get(9)?,
                project_color: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}
