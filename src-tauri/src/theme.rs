use std::path::PathBuf;
use std::fs;
use std::sync::mpsc::channel;
use std::time::Duration;
use notify::{Watcher, RecursiveMode};
use tauri::{AppHandle, Emitter};
use log::{info, warn, error};

fn get_noctalia_path() -> Option<PathBuf> {
    if let Some(mut dir) = dirs::config_dir() {
        dir.push("hypr/noctalia.lua");
        return Some(dir);
    }
    None
}

fn parse_noctalia_primary(path: &PathBuf) -> Option<String> {
    if let Ok(content) = fs::read_to_string(path) {
        for line in content.lines() {
            if line.contains("local primary =") {
                if let Some(start) = line.find("rgb(") {
                    let hex_start = start + 4;
                    if hex_start + 6 <= line.len() {
                        let hex = &line[hex_start..hex_start+6];
                        return Some(format!("#{}", hex));
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn get_system_accent() -> Option<String> {
    if let Some(path) = get_noctalia_path() {
        parse_noctalia_primary(&path)
    } else {
        None
    }
}

pub fn spawn_theme_watcher(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let path = match get_noctalia_path() {
            Some(p) => p,
            None => {
                error!("[Theme Watcher] Failed to resolve config directory.");
                return;
            }
        };
        
        info!("[Theme Watcher] Starting theme watcher for {:?}", path);
        info!("[Theme Watcher] File exists: {}", path.exists());

        // Initial parse
        if let Some(color) = parse_noctalia_primary(&path) {
            info!("[Theme Watcher] Initial parsed accent: {}", color);
            let _ = app_handle.emit("system-accent-changed", color.clone());
            info!("[Theme Watcher] Emitted initial accent: {}", color);
        } else {
            warn!("[Theme Watcher] Failed to parse initial accent.");
        }

        let (tx, rx) = channel();
        
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                error!("[Theme Watcher] Failed to create watcher: {}", e);
                return;
            }
        };

        if path.exists() {
            let _ = watcher.watch(&path, RecursiveMode::NonRecursive);
        } else {
            if let Some(parent) = path.parent() {
                let _ = watcher.watch(parent, RecursiveMode::NonRecursive);
            }
        }

        loop {
            match rx.recv() {
                Ok(Ok(event)) => {
                    info!("[Theme Watcher] Filesystem event: {:?}", event.kind);
                    
                    std::thread::sleep(Duration::from_millis(150));
                    
                    if let Some(color) = parse_noctalia_primary(&path) {
                        info!("[Theme Watcher] Parsed accent after event: {}", color);
                        let _ = app_handle.emit("system-accent-changed", color.clone());
                        info!("[Theme Watcher] Emitting accent: {}", color);
                    } else {
                        warn!("[Theme Watcher] Parsing failed after event.");
                    }
                },
                Ok(Err(e)) => {
                    error!("[Theme Watcher] Watcher error: {:?}", e);
                }
                Err(e) => {
                    error!("[Theme Watcher] Channel recv error: {:?}", e);
                    break;
                }
            }
        }
    });
}
