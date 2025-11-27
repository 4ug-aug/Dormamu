use chrono::{Datelike, Local, TimeZone};
use tauri::State;

use crate::db::DbState;
use crate::models::{ChartDataPoint, DashboardStats, PaginatedEntries, TimeEntryWithDetails};

#[tauri::command]
pub fn get_stats(state: State<DbState>) -> Result<DashboardStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Local::now().timestamp();

    // Get start of this month
    let today = Local::now().date_naive();
    let start_of_month = Local
        .from_local_datetime(&today.with_day(1).unwrap().and_hms_opt(0, 0, 0).unwrap())
        .unwrap()
        .timestamp();

    // Total time (all completed entries)
    let total_time: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(COALESCE(end_time, ?1) - start_time), 0) FROM time_entries",
            [&now],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // This month's time
    let this_month_time: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(COALESCE(end_time, ?1) - start_time), 0) FROM time_entries WHERE start_time >= ?2",
            [&now, &start_of_month],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Get first entry date for average calculation
    let first_entry_date: Option<i64> = conn
        .query_row("SELECT MIN(start_time) FROM time_entries", [], |row| {
            row.get(0)
        })
        .ok();

    // Calculate average daily time
    let avg_daily_time = if let Some(first_date) = first_entry_date {
        let days = ((now - first_date) / 86400).max(1);
        total_time / days
    } else {
        0
    };

    // Total entries count
    let total_entries: i64 = conn
        .query_row("SELECT COUNT(*) FROM time_entries", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(DashboardStats {
        total_time,
        this_month_time,
        avg_daily_time,
        total_entries,
    })
}

#[tauri::command]
pub fn get_all_entries(
    state: State<DbState>,
    page: i64,
    per_page: i64,
) -> Result<PaginatedEntries, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let offset = (page - 1) * per_page;

    // Get total count
    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM time_entries", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // Get paginated entries
    let mut stmt = conn
        .prepare(
            "SELECT te.id, te.task_id, t.name, t.project_id, p.name, p.color, te.start_time, te.end_time, n.content
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             LEFT JOIN notes n ON te.id = n.time_entry_id
             ORDER BY te.start_time DESC
             LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map([&per_page, &offset], |row| {
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

    Ok(PaginatedEntries {
        entries,
        total,
        page,
        per_page,
    })
}

#[tauri::command]
pub fn get_entries_by_range(
    state: State<DbState>,
    start_timestamp: i64,
    end_timestamp: i64,
) -> Result<Vec<ChartDataPoint>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Local::now().timestamp();

    // Get entries grouped by date and project
    let mut stmt = conn
        .prepare(
            "SELECT 
                date(te.start_time, 'unixepoch', 'localtime') as date,
                p.id as project_id,
                p.name as project_name,
                p.color as project_color,
                SUM(COALESCE(te.end_time, ?1) - te.start_time) as duration
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             WHERE te.start_time >= ?2 AND te.start_time <= ?3
             GROUP BY date, p.id
             ORDER BY date ASC, p.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let data_points = stmt
        .query_map([&now, &start_timestamp, &end_timestamp], |row| {
            Ok(ChartDataPoint {
                date: row.get(0)?,
                project_id: row.get(1)?,
                project_name: row.get(2)?,
                project_color: row.get(3)?,
                duration: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(data_points)
}

