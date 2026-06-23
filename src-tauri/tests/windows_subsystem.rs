#[cfg(windows)]
#[test]
fn release_main_uses_windows_gui_subsystem() {
    let source = include_str!("../src/main.rs");

    assert!(
        source.contains("cfg_attr(not(debug_assertions), windows_subsystem = \"windows\")"),
        "Windows release builds must use the GUI subsystem so launching PicoPet does not open a console window"
    );
}
