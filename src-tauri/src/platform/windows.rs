use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use tauri::WebviewWindow;
use windows_sys::Win32::{
    Foundation::{GetLastError, SetLastError, HWND},
    UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, SWP_FRAMECHANGED,
        SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_EX_LAYERED, WS_EX_TRANSPARENT,
    },
};

pub fn apply_click_through_ex_style(current_style: isize, enabled: bool) -> isize {
    if enabled {
        current_style | WS_EX_LAYERED as isize | WS_EX_TRANSPARENT as isize
    } else {
        (current_style | WS_EX_LAYERED as isize) & !(WS_EX_TRANSPARENT as isize)
    }
}

pub fn set_click_through(window: &WebviewWindow, enabled: bool) -> Result<(), String> {
    let handle = window.window_handle().map_err(|error| error.to_string())?;
    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(handle) => handle.hwnd.get() as HWND,
        _ => return Err("window handle is not Win32".to_string()),
    };

    unsafe {
        let current_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let next_style = apply_click_through_ex_style(current_style, enabled);

        SetLastError(0);
        let previous = SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next_style);
        let error = GetLastError();
        if previous == 0 && error != 0 {
            return Err(format!("SetWindowLongPtrW failed with error {error}"));
        }

        let changed = SetWindowPos(
            hwnd,
            std::ptr::null_mut(),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
        );
        if changed == 0 {
            return Err(format!("SetWindowPos failed with error {}", GetLastError()));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enabling_click_through_adds_required_bits() {
        let style = apply_click_through_ex_style(0, true);

        assert_eq!(style & WS_EX_LAYERED as isize, WS_EX_LAYERED as isize);
        assert_eq!(
            style & WS_EX_TRANSPARENT as isize,
            WS_EX_TRANSPARENT as isize
        );
    }

    #[test]
    fn disabling_click_through_keeps_layered_and_removes_transparent() {
        let original = (WS_EX_LAYERED | WS_EX_TRANSPARENT) as isize;

        let style = apply_click_through_ex_style(original, false);

        assert_eq!(style & WS_EX_LAYERED as isize, WS_EX_LAYERED as isize);
        assert_eq!(style & WS_EX_TRANSPARENT as isize, 0);
    }
}
