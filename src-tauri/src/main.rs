// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;

use db::{init_database, DbState};
use rusqlite::Connection;
use std::sync::Mutex;

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
            // Project commands
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::get_projects,
            // Task commands
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::get_tasks,
            commands::get_tasks_by_project,
            commands::toggle_task_completed,
            commands::get_incomplete_tasks,
            // Time entry commands
            commands::start_tracking,
            commands::stop_tracking,
            commands::get_active_entry,
            commands::get_today_entries,
            commands::delete_time_entry,
            commands::update_time_entry,
            // Note commands
            commands::create_note,
            commands::update_note,
            commands::delete_note,
            commands::get_note_by_entry,
            commands::upsert_note,
            // Dashboard commands
            commands::get_stats,
            commands::get_all_entries,
            commands::get_entries_by_range,
            commands::get_aggregated_time,
            commands::get_daily_hours,
            // Settings commands
            commands::get_setting,
            commands::set_setting,
            // Paymo commands
            commands::fetch_paymo_projects,
            commands::fetch_paymo_tasks,
            commands::import_paymo_projects,
            commands::import_paymo_tasks,
            commands::get_syncable_entries,
            commands::sync_entries_to_paymo,
            // Asana commands
            commands::fetch_asana_workspaces,
            commands::fetch_asana_tasks,
            commands::import_asana_tasks,
            commands::get_asana_syncable_entries,
            commands::sync_entries_to_asana,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
