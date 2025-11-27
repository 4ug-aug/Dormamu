use chrono::Local;
use tauri::State;
use uuid::Uuid;

use crate::db::DbState;
use crate::models::Project;

#[tauri::command]
pub fn create_project(state: State<DbState>, name: String, color: String) -> Result<Project, String> {
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
pub fn update_project(
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
pub fn delete_project(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Delete associated notes first
    conn.execute(
        "DELETE FROM notes WHERE time_entry_id IN (
            SELECT te.id FROM time_entries te 
            JOIN tasks t ON te.task_id = t.id 
            WHERE t.project_id = ?1
        )",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    // Delete associated time entries
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
pub fn get_projects(state: State<DbState>) -> Result<Vec<Project>, String> {
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

