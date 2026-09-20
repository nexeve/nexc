mod audio;
mod theme;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        audio::set_audio_active,
        theme::get_system_accent
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      app.handle().plugin(tauri_plugin_dialog::init())?;
      app.handle().plugin(tauri_plugin_fs::init())?;
      
      // Spawn audio capture thread
      audio::spawn_audio_capture(app.handle().clone());
      
      // Spawn system accent color watcher (Noctalia)
      theme::spawn_theme_watcher(app.handle().clone());

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
