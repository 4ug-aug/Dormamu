use chrono::Local;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::db::DbState;

// Asana API response structures
#[derive(Debug, Deserialize)]
struct AsanaResponse<T> {
    data: T,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AsanaWorkspace {
    pub gid: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AsanaProject {
    pub gid: String,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AsanaTask {
    pub gid: String,
    pub name: String,
    pub notes: Option<String>,
    pub completed: bool,
    pub projects: Option<Vec<AsanaProject>>,
}

/// Task data for import with project info
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AsanaTaskImport {
    pub task: AsanaTask,
    pub project_name: String,
    pub project_color: Option<String>,
}

/// Fetches workspaces from Asana API
#[tauri::command]
pub fn fetch_asana_workspaces(api_key: String) -> Result<Vec<AsanaWorkspace>, String> {
    let client = Client::new();

    let response = client
        .get("https://app.asana.com/api/1.0/workspaces")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "application/json")
        .send()
        .map_err(|e| format!("Failed to connect to Asana: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Asana API error: {} - Check your access token",
            response.status()
        ));
    }

    let data: AsanaResponse<Vec<AsanaWorkspace>> = response
        .json()
        .map_err(|e| format!("Failed to parse Asana response: {}", e))?;

    Ok(data.data)
}

/// Fetches tasks assigned to the authenticated user in a workspace
#[tauri::command]
pub fn fetch_asana_tasks(api_key: String, workspace_id: String) -> Result<Vec<AsanaTask>, String> {
    let client = Client::new();

    // First get the user's ID (me)
    let me_response = client
        .get("https://app.asana.com/api/1.0/users/me")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "application/json")
        .send()
        .map_err(|e| format!("Failed to get user info: {}", e))?;

    if !me_response.status().is_success() {
        return Err(format!("Failed to authenticate: {}", me_response.status()));
    }

    #[derive(Deserialize)]
    struct UserData {
        gid: String,
    }

    let user: AsanaResponse<UserData> = me_response
        .json()
        .map_err(|e| format!("Failed to parse user response: {}", e))?;

    // Fetch tasks assigned to this user in the workspace
    let url = format!(
        "https://app.asana.com/api/1.0/tasks?workspace={}&assignee={}&opt_fields=name,notes,completed,projects.name,projects.color&completed_since=now",
        workspace_id, user.data.gid
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "application/json")
        .send()
        .map_err(|e| format!("Failed to fetch tasks: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch tasks: {}", response.status()));
    }

    let data: AsanaResponse<Vec<AsanaTask>> = response
        .json()
        .map_err(|e| format!("Failed to parse tasks: {}", e))?;

    // Filter to incomplete tasks
    Ok(data.data.into_iter().filter(|t| !t.completed).collect())
}

/// Imports selected Asana tasks into local database
#[tauri::command]
pub fn import_asana_tasks(
    state: State<DbState>,
    task_imports: Vec<AsanaTaskImport>,
) -> Result<i32, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut imported_count = 0;

    // Track which local project IDs we've created for each project name
    let mut project_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    for import in task_imports {
        // Get or create local project for this task
        let local_project_id = if let Some(id) = project_map.get(&import.project_name) {
            id.clone()
        } else {
            // Check if project already exists by name
            let existing: Option<String> = conn
                .query_row(
                    "SELECT id FROM projects WHERE name = ?1",
                    [&import.project_name],
                    |row| row.get(0),
                )
                .ok();

            let project_id = if let Some(id) = existing {
                id
            } else {
                // Create new project
                let id = Uuid::new_v4().to_string();
                let created_at = Local::now().timestamp();
                
                // Convert Asana color to hex, or use default
                let color = asana_color_to_hex(&import.project_color.unwrap_or_default());

                conn.execute(
                    "INSERT INTO projects (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
                    (&id, &import.project_name, &color, &created_at),
                )
                .map_err(|e| e.to_string())?;

                id
            };

            project_map.insert(import.project_name.clone(), project_id.clone());
            project_id
        };

        // Create the task with asana_task_id
        let task_id = Uuid::new_v4().to_string();
        let created_at = Local::now().timestamp();

        conn.execute(
            "INSERT INTO tasks (id, project_id, name, description, completed, created_at, asana_task_id) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)",
            (&task_id, &local_project_id, &import.task.name, &import.task.notes, &created_at, &import.task.gid),
        )
        .map_err(|e| e.to_string())?;

        imported_count += 1;
    }

    Ok(imported_count)
}

/// Convert Asana color names to hex values
fn asana_color_to_hex(color: &str) -> String {
    match color {
        "dark-pink" => "#EA4E9D".to_string(),
        "dark-green" => "#62D26F".to_string(),
        "dark-blue" => "#4186E0".to_string(),
        "dark-red" => "#E8384F".to_string(),
        "dark-teal" => "#37C5AB".to_string(),
        "dark-brown" => "#8D6E63".to_string(),
        "dark-orange" => "#FD612C".to_string(),
        "dark-purple" => "#7A6FF0".to_string(),
        "dark-warm-gray" => "#8DA3A6".to_string(),
        "light-pink" => "#F9AAEF".to_string(),
        "light-green" => "#B4EC51".to_string(),
        "light-blue" => "#9EE7E3".to_string(),
        "light-red" => "#F1BD6C".to_string(),
        "light-teal" => "#4ECBC4".to_string(),
        "light-yellow" => "#F8DF72".to_string(),
        "light-orange" => "#FFB74D".to_string(),
        "light-purple" => "#B278FF".to_string(),
        "light-warm-gray" => "#B0BEC5".to_string(),
        _ => "#6366f1".to_string(), // Default indigo
    }
}
