// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            rfid_bestandsabgleich::commands::import_reference_catalog,
            rfid_bestandsabgleich::commands::get_catalog_stats,
            rfid_bestandsabgleich::commands::catalog_ready,
            rfid_bestandsabgleich::commands::search_debitors,
            rfid_bestandsabgleich::commands::run_inventur,
            rfid_bestandsabgleich::commands::load_abgleich,
            rfid_bestandsabgleich::commands::export_abgleich_xlsx,
            rfid_bestandsabgleich::commands::export_abgleich_pdf,
            rfid_bestandsabgleich::commands::export_bestaetigung_pdf,
            rfid_bestandsabgleich::commands::create_inventur_project,
            rfid_bestandsabgleich::commands::list_inventur_projects,
            rfid_bestandsabgleich::commands::load_inventur_draft,
            rfid_bestandsabgleich::commands::save_inventur_draft,
            rfid_bestandsabgleich::commands::update_inventur_status,
            rfid_bestandsabgleich::commands::update_inventur_title,
            rfid_bestandsabgleich::commands::delete_inventur_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
