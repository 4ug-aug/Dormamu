use serde::{Deserialize, Serialize};

// Project model
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: i64,
}

// Task model
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub completed: bool,
    pub completed_at: Option<i64>,
    pub created_at: i64,
}

// Task with project info (for display)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskWithProject {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub completed: bool,
    pub completed_at: Option<i64>,
    pub created_at: i64,
    pub project_name: String,
    pub project_color: String,
}

// Time entry model
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeEntry {
    pub id: String,
    pub task_id: String,
    pub start_time: i64,
    pub end_time: Option<i64>,
}

// Time entry with details (for display)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeEntryWithDetails {
    pub id: String,
    pub task_id: String,
    pub task_name: String,
    pub project_id: String,
    pub project_name: String,
    pub project_color: String,
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub note: Option<String>,
}

// Note model
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub time_entry_id: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

// Dashboard stats
#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_time: i64,
    pub this_month_time: i64,
    pub avg_daily_time: i64,
    pub total_entries: i64,
}

// Paginated entries response
#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedEntries {
    pub entries: Vec<TimeEntryWithDetails>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

// Chart data point
#[derive(Debug, Serialize, Deserialize)]
pub struct ChartDataPoint {
    pub date: String,
    pub project_id: String,
    pub project_name: String,
    pub project_color: String,
    pub duration: i64,
}

// Aggregated time per project
#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectTimeAggregate {
    pub project_id: String,
    pub project_name: String,
    pub project_color: String,
    pub total_duration: i64,
}

// Aggregated time per task
#[derive(Debug, Serialize, Deserialize)]
pub struct TaskTimeAggregate {
    pub task_id: String,
    pub task_name: String,
    pub project_id: String,
    pub project_name: String,
    pub project_color: String,
    pub total_duration: i64,
}

// Container for all aggregated time data
#[derive(Debug, Serialize, Deserialize)]
pub struct AggregatedTimeData {
    pub by_project: Vec<ProjectTimeAggregate>,
    pub by_task: Vec<TaskTimeAggregate>,
}
