use serde::Serialize;
use std::cmp::Ordering;
use std::path::PathBuf;
use tauri::Emitter;

const BATCH_SIZE: usize = 250;
const PROGRESS_EVERY: usize = 250;

#[derive(Serialize)]
struct FileMetadata {
    name: String,
    is_dir: bool,
    size_kb: f64,
}

fn scan_directory_sync(window: tauri::Window, path: PathBuf) -> Result<(), String> {
    let root = path
        .canonicalize()
        .map_err(|err| format!("Unable to access directory: {err}"))?;
    if !root.is_dir() {
        return Err("Selected path is not a directory.".to_string());
    }

    let read_dir = std::fs::read_dir(&root)
        .map_err(|err| format!("Unable to read directory: {err}"))?;

    let mut entries = Vec::new();
    let mut processed = 0usize;
    for entry in read_dir {
        let entry = entry.map_err(|err| format!("Scan failed: {err}"))?;
        let metadata = entry
            .metadata()
            .map_err(|err| format!("Metadata error: {err}"))?;
        let is_dir = metadata.is_dir();
        let size_kb = if is_dir {
            0.0
        } else {
            metadata.len() as f64 / 1024.0
        };
        let name = entry.file_name().to_string_lossy().into_owned();

        entries.push(FileMetadata {
            name,
            is_dir,
            size_kb,
        });
        processed += 1;
        if processed % PROGRESS_EVERY == 0 {
            window
                .emit("scan_progress", processed)
                .map_err(|err| format!("Progress update failed: {err}"))?;
        }
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => Ordering::Less,
        (false, true) => Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });

    for batch in entries.chunks(BATCH_SIZE) {
        window
            .emit("scan_batch", batch)
            .map_err(|err| format!("Batch dispatch failed: {err}"))?;
    }
    window
        .emit("scan_complete", entries.len())
        .map_err(|err| format!("Completion dispatch failed: {err}"))?;

    Ok(())
}

#[tauri::command]
async fn scan_directory(window: tauri::Window, path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || scan_directory_sync(window, PathBuf::from(path)))
        .await
        .map_err(|err| format!("Scan task failed: {err}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![scan_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
