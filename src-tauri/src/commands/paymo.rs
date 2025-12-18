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
