use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use user_idle::UserIdle;

use crate::db::DbState;

// Idle threshold in seconds (5 minutes)
const IDLE_THRESHOLD_SECONDS: u64 = 5 * 60;
// Poll interval in seconds
const POLL_INTERVAL_SECONDS: u64 = 30;

#[derive(Clone, Serialize)]
pub struct IdleEvent {
    pub idle_since: i64,      // Unix timestamp when idle started
    pub idle_seconds: u64,    // How long user has been idle
}

// State to track if we've already sent an idle notification
pub struct IdleWatcherState {
    pub idle_notified: AtomicBool,
}

impl Default for IdleWatcherState {
    fn default() -> Self {
        Self {
            idle_notified: AtomicBool::new(false),
        }
    }
}

/// Get current system idle time in seconds
#[tauri::command]
pub fn get_idle_seconds() -> Result<u64, String> {
    let idle = UserIdle::get_time().map_err(|e| e.to_string())?;
    Ok(idle.as_seconds())
}

/// Check if there's an active time entry (tracking in progress)
fn is_tracking_active(db_state: &DbState) -> bool {
    let conn = match db_state.0.lock() {
        Ok(c) => c,
        Err(_) => return false,
    };

    conn.query_row(
        "SELECT COUNT(*) FROM time_entries WHERE end_time IS NULL",
        [],
        |row| row.get::<_, i32>(0),
    )
    .map(|count| count > 0)
    .unwrap_or(false)
}

/// Start the idle watcher background thread
pub fn start_idle_watcher(app: AppHandle) {
    let idle_state = Arc::new(IdleWatcherState::default());
    
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(POLL_INTERVAL_SECONDS));

            // Check if tracking is active
            let db_state: State<DbState> = match app.try_state() {
                Some(s) => s,
                None => continue,
            };

            if !is_tracking_active(&db_state) {
                // Reset idle notification flag when not tracking
                idle_state.idle_notified.store(false, Ordering::SeqCst);
                continue;
            }

            // Get current idle time
            let idle_seconds = match UserIdle::get_time() {
                Ok(idle) => idle.as_seconds(),
                Err(_) => continue,
            };

            // Check if we've exceeded the threshold
            if idle_seconds >= IDLE_THRESHOLD_SECONDS {
                // Only notify once per idle session
                if !idle_state.idle_notified.swap(true, Ordering::SeqCst) {
                    let now = chrono::Local::now().timestamp();
                    let idle_since = now - idle_seconds as i64;

                    let event = IdleEvent {
                        idle_since,
                        idle_seconds,
                    };

                    // Emit event to frontend
                    let _ = app.emit_all("idle-detected", event);
                }
            } else {
                // User became active again, reset the flag
                idle_state.idle_notified.store(false, Ordering::SeqCst);
            }
        }
    });
}
