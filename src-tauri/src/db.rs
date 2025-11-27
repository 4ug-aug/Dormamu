use rusqlite::{Connection, Result as SqliteResult};
use std::sync::Mutex;

// Database state wrapper
pub struct DbState(pub Mutex<Connection>);

// Initialize database with schema
pub fn init_database(conn: &Connection) -> SqliteResult<()> {
    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    // Projects table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Tasks table with description and completion fields
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            completed INTEGER DEFAULT 0,
            completed_at INTEGER,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Time entries table
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

    // Notes table for session notes
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            time_entry_id TEXT NOT NULL UNIQUE,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Migration: Add new columns to existing tasks table if they don't exist
    // Check if description column exists
    let has_description: bool = conn
        .prepare("SELECT description FROM tasks LIMIT 1")
        .is_ok();
    
    if !has_description {
        conn.execute("ALTER TABLE tasks ADD COLUMN description TEXT", [])?;
        conn.execute("ALTER TABLE tasks ADD COLUMN completed INTEGER DEFAULT 0", [])?;
        conn.execute("ALTER TABLE tasks ADD COLUMN completed_at INTEGER", [])?;
    }

    Ok(())
}

