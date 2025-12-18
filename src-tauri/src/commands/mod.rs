pub mod projects;
pub mod tasks;
pub mod time_entries;
pub mod notes;
pub mod dashboard;
pub mod settings;
pub mod paymo;
pub mod asana;

// Re-export all commands for easier access
pub use projects::*;
pub use tasks::*;
pub use time_entries::*;
pub use notes::*;
pub use dashboard::*;
pub use settings::*;
pub use paymo::*;
pub use asana::*;
