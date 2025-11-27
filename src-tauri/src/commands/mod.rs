pub mod projects;
pub mod tasks;
pub mod time_entries;
pub mod notes;
pub mod dashboard;

// Re-export all commands for easier access
pub use projects::*;
pub use tasks::*;
pub use time_entries::*;
pub use notes::*;
pub use dashboard::*;

