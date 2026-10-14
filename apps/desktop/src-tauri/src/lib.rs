//! Germanio desktop companion.
//!
//! Lives in the tray and brings German to every Windows app:
//! - Ctrl+Alt+D  looks up the selected text in *any* application (Telegram, VS Code, PDFs …)
//! - micro-cards: every few minutes one due card slides in at the bottom-right corner
//!
//! All learning logic stays in brain (127.0.0.1:4317); this shell only captures
//! the selection, positions windows and forwards events to the webviews.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_opener::OpenerExt;

const WEB_APP: &str = "http://localhost:3000";
const POPUP: (f64, f64) = (400.0, 480.0);
const CARD: (f64, f64) = (360.0, 220.0);

struct State {
    micro_cards: AtomicBool,
    /// Minutes between micro-cards.
    interval_min: AtomicU64,
}

/// Copy the current selection via a synthetic Ctrl+C, then restore the user's clipboard.
fn capture_selection(app: &AppHandle) -> Option<String> {
    let previous = app.clipboard().read_text().ok();
    // Empty the clipboard first so "nothing selected" is detectable (no stale text gets looked up).
    let _ = app.clipboard().write_text(String::new());
    let mut enigo = Enigo::new(&Settings::default()).ok()?;
    // The hotkey's own modifiers are still held: release Alt, otherwise the target app sees Ctrl+Alt+C.
    let _ = enigo.key(Key::Alt, Direction::Release);
    let _ = enigo.key(Key::Control, Direction::Press);
    let _ = enigo.key(Key::Unicode('c'), Direction::Click);
    let _ = enigo.key(Key::Control, Direction::Release);
    thread::sleep(Duration::from_millis(140));
    let selected = app.clipboard().read_text().ok();
    if let Some(prev) = previous.clone() {
        let _ = app.clipboard().write_text(prev);
    }
    let text = selected?.trim().to_string();
    if text.is_empty() {
        return None;
    }
    Some(text.chars().take(200).collect())
}

fn show_popup(app: &AppHandle, text: String) {
    let Some(win) = app.get_webview_window("popup") else { return };
    if let Ok(pos) = app.cursor_position() {
        // Open beside the cursor, kept inside the monitor under it.
        let (mut x, mut y) = (pos.x + 18.0, pos.y + 18.0);
        if let Ok(Some(m)) = app.monitor_from_point(pos.x, pos.y) {
            let (mx, my) = (m.position().x as f64, m.position().y as f64);
            let (mw, mh) = (m.size().width as f64, m.size().height as f64);
            let s = m.scale_factor();
            x = x.min(mx + mw - POPUP.0 * s - 12.0).max(mx);
            y = y.min(my + mh - POPUP.1 * s - 12.0).max(my);
        }
        let _ = win.set_position(PhysicalPosition::new(x, y));
    }
    let _ = win.show();
    let _ = win.set_focus();
    let _ = app.emit_to("popup", "lookup", text);
}

fn show_card(app: &AppHandle) {
    let Some(win) = app.get_webview_window("card") else { return };
    if let Ok(Some(m)) = win.primary_monitor() {
        let s = m.scale_factor();
        let x = m.position().x as f64 + m.size().width as f64 - (CARD.0 + 24.0) * s;
        let y = m.position().y as f64 + m.size().height as f64 - (CARD.1 + 72.0) * s;
        let _ = win.set_position(PhysicalPosition::new(x, y));
    }
    let _ = win.show();
    let _ = app.emit_to("card", "micro-card", ());
}

fn build_windows(app: &AppHandle) -> tauri::Result<()> {
    WebviewWindowBuilder::new(app, "popup", WebviewUrl::App("popup.html".into()))
        .title("Germanio")
        .inner_size(POPUP.0, POPUP.1)
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false)
        .build()?;
    WebviewWindowBuilder::new(app, "card", WebviewUrl::App("card.html".into()))
        .title("Germanio · Karte")
        .inner_size(CARD.0, CARD.1)
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .visible(false)
        .build()?;
    Ok(())
}

fn build_tray(app: &AppHandle, state: Arc<State>) -> tauri::Result<()> {
    let heute = MenuItem::with_id(app, "heute", "Heute öffnen", true, None::<&str>)?;
    let review = MenuItem::with_id(app, "review", "Wiederholen", true, None::<&str>)?;
    let card = MenuItem::with_id(app, "card", "Eine Karte jetzt", true, None::<&str>)?;
    let micro = CheckMenuItem::with_id(app, "micro", "Mikro-Karten", true, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Beenden", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&heute, &review, &card, &sep, &micro, &sep, &quit])?;

    let micro_item = micro.clone();
    TrayIconBuilder::with_id("germanio")
        .icon(app.default_window_icon().cloned().expect("bundle icon"))
        .tooltip("Germanio — Strg+Alt+D: Wort nachschlagen")
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "heute" => {
                let _ = app.opener().open_url(format!("{WEB_APP}/heute"), None::<&str>);
            }
            "review" => {
                let _ = app.opener().open_url(format!("{WEB_APP}/wortschatz"), None::<&str>);
            }
            "card" => show_card(app),
            "micro" => {
                let on = micro_item.is_checked().unwrap_or(true);
                state.micro_cards.store(on, Ordering::Relaxed);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

/// Micro-cards: spaced, small, ignorable. Retrieval in the gaps of the workday.
fn spawn_micro_cards(app: AppHandle, state: Arc<State>) {
    thread::spawn(move || loop {
        let minutes = state.interval_min.load(Ordering::Relaxed).max(5);
        thread::sleep(Duration::from_secs(minutes * 60));
        if state.micro_cards.load(Ordering::Relaxed) {
            show_card(&app);
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let lookup = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyD);
    let state = Arc::new(State { micro_cards: AtomicBool::new(true), interval_min: AtomicU64::new(25) });

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut == &lookup {
                        let app = app.clone();
                        // Off the event loop: capturing the selection sleeps briefly.
                        thread::spawn(move || {
                            if let Some(text) = capture_selection(&app) {
                                let handle = app.clone();
                                let _ = app.run_on_main_thread(move || show_popup(&handle, text));
                            }
                        });
                    }
                })
                .build(),
        )
        .setup(move |app| {
            let handle = app.handle().clone();
            build_windows(&handle)?;
            build_tray(&handle, state.clone())?;
            app.global_shortcut().register(lookup)?;
            spawn_micro_cards(handle, state.clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing a companion window only hides it; the app lives in the tray.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Germanio desktop");
}
