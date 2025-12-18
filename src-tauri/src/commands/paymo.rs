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

        // Create the task
        let task_id = Uuid::new_v4().to_string();
        let created_at = Local::now().timestamp();

        conn.execute(
            "INSERT INTO tasks (id, project_id, name, description, completed, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
            (&task_id, &local_project_id, &import.task.name, &import.task.description, &created_at),
        )
        .map_err(|e| e.to_string())?;

        imported_count += 1;
    }

    Ok(imported_count)
}
