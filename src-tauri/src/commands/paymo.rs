use chrono::Local;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::db::DbState;
use crate::models::Project;

// Paymo API response structures
#[derive(Debug, Deserialize)]
struct PaymoProjectsResponse {
    projects: Vec<PaymoProject>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymoProject {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub active: bool,
}

// Paymo Task structure
#[derive(Debug, Deserialize)]
struct PaymoTasksResponse {
    tasks: Vec<PaymoTask>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymoTask {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub project_id: i64,
    pub complete: bool,
}

/// Fetches projects from Paymo API using the provided API key
#[tauri::command]
pub fn fetch_paymo_projects(api_key: String) -> Result<Vec<PaymoProject>, String> {
    let client = Client::new();

    let response = client
        .get("https://app.paymoapp.com/api/projects")
        .basic_auth(&api_key, Some("x")) // API key as username, any text as password
        .header("Accept", "application/json")
        .send()
        .map_err(|e| format!("Failed to connect to Paymo: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Paymo API error: {} - Check your API key",
            response.status()
        ));
    }

    let data: PaymoProjectsResponse = response
        .json()
        .map_err(|e| format!("Failed to parse Paymo response: {}", e))?;

    // Filter to active projects only
    Ok(data.projects.into_iter().filter(|p| p.active).collect())
}

/// Fetches tasks from Paymo API for specific projects
#[tauri::command]
pub fn fetch_paymo_tasks(api_key: String, project_ids: Vec<i64>) -> Result<Vec<PaymoTask>, String> {
    let client = Client::new();
    let mut all_tasks: Vec<PaymoTask> = Vec::new();

    for project_id in project_ids {
        let url = format!(
            "https://app.paymoapp.com/api/tasks?where=project_id={}",
            project_id
        );

        let response = client
            .get(&url)
            .basic_auth(&api_key, Some("x"))
            .header("Accept", "application/json")
            .send()
            .map_err(|e| format!("Failed to fetch tasks: {}", e))?;

        if response.status().is_success() {
            if let Ok(data) = response.json::<PaymoTasksResponse>() {
                // Filter to incomplete tasks only
                all_tasks.extend(data.tasks.into_iter().filter(|t| !t.complete));
            }
        }
    }

    Ok(all_tasks)
}

/// Imports selected Paymo projects into local database
#[tauri::command]
pub fn import_paymo_projects(
    state: State<DbState>,
    projects: Vec<PaymoProject>,
) -> Result<Vec<Project>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut imported: Vec<Project> = Vec::new();

    for paymo_project in projects {
        let id = Uuid::new_v4().to_string();
        let created_at = Local::now().timestamp();
        
        // Normalize color (Paymo uses #RRGGBB format already)
        let color = if paymo_project.color.starts_with('#') {
            paymo_project.color.clone()
        } else {
            format!("#{}", paymo_project.color)
        };

        conn.execute(
            "INSERT INTO projects (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
            (&id, &paymo_project.name, &color, &created_at),
        )
        .map_err(|e| e.to_string())?;

        imported.push(Project {
            id,
            name: paymo_project.name,
            color,
            created_at,
        });
    }

    Ok(imported)
}

/// Import data for task import - includes project info to create if needed
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymoTaskImport {
    pub task: PaymoTask,
    pub project: PaymoProject,
}

/// Imports selected Paymo tasks into local database, creating projects if needed
#[tauri::command]
pub fn import_paymo_tasks(
    state: State<DbState>,
    task_imports: Vec<PaymoTaskImport>,
) -> Result<i32, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut imported_count = 0;

    // Track which local project IDs we've created for each Paymo project ID
    let mut project_map: std::collections::HashMap<i64, String> = std::collections::HashMap::new();

    for import in task_imports {
        // Get or create local project for this task
        let local_project_id = if let Some(id) = project_map.get(&import.project.id) {
            id.clone()
        } else {
            // Check if project already exists by name
            let existing: Option<String> = conn
                .query_row(
                    "SELECT id FROM projects WHERE name = ?1",
                    [&import.project.name],
                    |row| row.get(0),
                )
                .ok();

            let project_id = if let Some(id) = existing {
                id
            } else {
                // Create new project
                let id = Uuid::new_v4().to_string();
                let created_at = Local::now().timestamp();
                let color = if import.project.color.starts_with('#') {
                    import.project.color.clone()
                } else {
                    format!("#{}", import.project.color)
                };

                conn.execute(
                    "INSERT INTO projects (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
                    (&id, &import.project.name, &color, &created_at),
                )
                .map_err(|e| e.to_string())?;

                id
            };

            project_map.insert(import.project.id, project_id.clone());
            project_id
        };

        // Create the task with paymo_task_id for sync support
        let task_id = Uuid::new_v4().to_string();
        let created_at = Local::now().timestamp();

        conn.execute(
            "INSERT INTO tasks (id, project_id, name, description, completed, created_at, paymo_task_id) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)",
            (&task_id, &local_project_id, &import.task.name, &import.task.description, &created_at, &import.task.id),
        )
        .map_err(|e| e.to_string())?;

        imported_count += 1;
    }

    Ok(imported_count)
}

/// Time entry data for syncing to Paymo
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncableEntry {
    pub id: String,
    pub task_name: String,
    pub project_name: String,
    pub paymo_task_id: i64,
    pub start_time: i64,
    pub end_time: i64,
    pub note: Option<String>,
}

/// Gets time entries that can be synced to Paymo (from tasks with paymo_task_id)
#[tauri::command]
pub fn get_syncable_entries(state: State<DbState>) -> Result<Vec<SyncableEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT te.id, t.name, p.name, t.paymo_task_id, te.start_time, te.end_time, n.content
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             LEFT JOIN notes n ON te.id = n.time_entry_id
             WHERE t.paymo_task_id IS NOT NULL
             AND te.end_time IS NOT NULL
             AND te.synced_at IS NULL
             ORDER BY te.start_time DESC",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map([], |row| {
            Ok(SyncableEntry {
                id: row.get(0)?,
                task_name: row.get(1)?,
                project_name: row.get(2)?,
                paymo_task_id: row.get(3)?,
                start_time: row.get(4)?,
                end_time: row.get(5)?,
                note: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

/// Syncs selected time entries to Paymo
#[tauri::command]
pub fn sync_entries_to_paymo(
    state: State<DbState>,
    api_key: String,
    entry_ids: Vec<String>,
) -> Result<i32, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let client = Client::new();
    let mut synced_count = 0;

    for entry_id in entry_ids {
        // Get entry details with paymo_task_id
        let entry: Option<(i64, i64, i64, Option<String>)> = conn
            .query_row(
                "SELECT t.paymo_task_id, te.start_time, te.end_time, n.content
                 FROM time_entries te
                 JOIN tasks t ON te.task_id = t.id
                 LEFT JOIN notes n ON te.id = n.time_entry_id
                 WHERE te.id = ?1 AND t.paymo_task_id IS NOT NULL AND te.end_time IS NOT NULL",
                [&entry_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .ok();

        if let Some((paymo_task_id, start_time, end_time, note)) = entry {
            // Convert Unix timestamps to ISO 8601
            let start_dt = chrono::DateTime::from_timestamp(start_time, 0)
                .unwrap_or_default()
                .format("%Y-%m-%dT%H:%M:%SZ")
                .to_string();
            let end_dt = chrono::DateTime::from_timestamp(end_time, 0)
                .unwrap_or_default()
                .format("%Y-%m-%dT%H:%M:%SZ")
                .to_string();

            // Build JSON payload
            let mut payload = serde_json::json!({
                "task_id": paymo_task_id,
                "start_time": start_dt,
                "end_time": end_dt,
            });

            if let Some(description) = note {
                payload["description"] = serde_json::Value::String(description);
            }

            // POST to Paymo
            let response = client
                .post("https://app.paymoapp.com/api/entries")
                .basic_auth(&api_key, Some("x"))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .map_err(|e| format!("Failed to sync entry: {}", e))?;

            if response.status().is_success() {
                // Mark entry as synced
                let synced_at = chrono::Local::now().timestamp();
                conn.execute(
                    "UPDATE time_entries SET synced_at = ?1 WHERE id = ?2",
                    (&synced_at, &entry_id),
                ).ok();
                synced_count += 1;
            } else {
                // Continue with other entries even if one fails
                eprintln!("Failed to sync entry {}: {}", entry_id, response.status());
            }
        }
    }

    Ok(synced_count)
}
