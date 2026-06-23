#[cfg(target_os = "windows")]
use std::path::Path;

#[cfg(target_os = "windows")]
use winreg::{enums::HKEY_CURRENT_USER, RegKey};

#[cfg(target_os = "windows")]
const RUN_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";

#[cfg(target_os = "windows")]
pub fn set_launch_on_login(app_name: &str, exe_path: &Path, enabled: bool) -> std::io::Result<()> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) = hkcu.create_subkey(RUN_KEY)?;

    if enabled {
        run_key.set_value(app_name, &format!("\"{}\"", exe_path.display()))?;
    } else {
        let _ = run_key.delete_value(app_name);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    #[test]
    fn quoted_exe_path_format_is_stable() {
        let path = PathBuf::from(r"C:\Program Files\PicoPet\picopet.exe");

        let value = format!("\"{}\"", path.display());

        assert_eq!(value, r#""C:\Program Files\PicoPet\picopet.exe""#);
    }
}
