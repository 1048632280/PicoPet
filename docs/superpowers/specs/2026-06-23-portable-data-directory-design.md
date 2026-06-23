# PicoPet Portable Data Directory Design

## Goal

Make PicoPet use a single portable data directory under the application folder so users can edit configuration easily and the app can support a green, unzip-and-run distribution.

## Decision

PicoPet will store all app-owned writable data under:

```text
PicoPet/
  picopet.exe
  uninstall.exe
  data/
    config.json
    picopet.log
    EBWebView/
```

`uninstall.exe` exists only for the installed NSIS build. The portable zip build will contain `picopet.exe` and create `data/` on first launch.

## Scope

This design covers the Windows Beta line only.

In scope:

- Move `config.json` from Tauri `app_config_dir()` to `PicoPet/data/config.json`.
- Move `picopet.log` to `PicoPet/data/picopet.log`.
- Move WebView2 user data to `PicoPet/data/EBWebView/`.
- Make the tray item `打开配置目录` open `PicoPet/data/`.
- Update diagnostics to report the portable data directory and log path.
- Add a portable zip artifact that can be extracted and run without installation.
- Update installer and Beta QA checklists for the new data layout.

Out of scope:

- macOS/Linux support.
- Old AppData migration.
- Multi-profile support.
- User-selectable data directory.
- Skin/plugin package loading.
- Code signing.

## Data Directory Rules

The data directory is derived from the running executable path:

```text
portable_data_dir = parent(current_exe) / "data"
```

All required directories are created on startup.

The app must not read from or write to these old AppData locations:

```text
%APPDATA%/com.picopet.app
%APPDATA%/com.picopet.desktop
%LOCALAPPDATA%/com.picopet.app
%LOCALAPPDATA%/com.picopet.desktop
```

There is no migration path. This is acceptable because PicoPet is still in test/Beta preparation and has no stable user base. Existing local test data can be deleted manually.

## Runtime Behavior

On first launch:

1. Resolve the executable directory.
2. Create `data/`.
3. Create or repair `data/config.json`.
4. Append startup logs to `data/picopet.log`.
5. Use `data/EBWebView/` as WebView2's user data directory.

On subsequent launches:

1. Load `data/config.json`.
2. Apply saved window position, scale, animation, click-through, and startup settings.
3. Continue appending logs to `data/picopet.log`.

If `data/config.json` is damaged, the current repair behavior remains: write a default sanitized config and continue.

## Installer Behavior

The installer should install PicoPet into a directory where the app can write `data/`.

For Beta, the installer must preserve `data/` during overwrite install and uninstall:

- Clean install creates only program files. `data/` is created when PicoPet first runs.
- Overwrite install must not delete `data/`.
- Uninstall removes installed program files but leaves `data/` in place for now.

If the user installs into a read-only directory such as `C:\Program Files\PicoPet`, the app may fail to write `data/`. For Beta, the installer/QA documentation should steer testing toward a user-writable install directory. A startup error dialog for read-only directories is out of scope for this design.

## Portable Zip Behavior

Add a Windows portable artifact with this layout:

```text
PicoPet/
  picopet.exe
  data/
```

The `data/` directory may be empty in the zip. The app creates `config.json`, `picopet.log`, and `EBWebView/` on first launch.

The portable artifact should be generated from the release executable after `pnpm tauri build`.

## Tray And Diagnostics

The tray item `打开配置目录` opens:

```text
PicoPet/data/
```

Diagnostics returns:

- app version
- portable data directory
- config file path
- log file path

The current `config_dir` field can continue to mean "data directory" for Beta, but README and QA docs should describe it as the portable data directory.

## Testing Strategy

Automated tests:

- Pure unit test for resolving `current_exe` parent plus `data`.
- Config store test writes to a temp executable-like directory and creates `data/config.json`.
- Logging test writes to `data/picopet.log`.
- Diagnostics test verifies returned paths point under `data/`.
- WebView window creation path uses `data/EBWebView/`; this can be covered by a small helper test that derives the path.

Manual QA:

- Launch release exe directly and confirm `data/config.json` appears beside `picopet.exe`.
- Confirm `data/picopet.log` appears after startup.
- Confirm `data/EBWebView/` appears after the webview starts.
- Move the pet, exit, relaunch, and confirm position restores from `data/config.json`.
- Use tray `打开配置目录` and confirm it opens `data/`.
- Run NSIS clean install, overwrite install, and uninstall; confirm `data/` is preserved.
- Extract portable zip into a new directory, run `picopet.exe`, and confirm no AppData `com.picopet.*` directory is created.

## Risks

- Program directory write permissions are the main risk. This is acceptable for Beta if the installer and portable QA use user-writable folders.
- WebView2 can create many cache files under `data/EBWebView/`. This is expected and should be documented so users understand why `data/` grows.
- Existing local AppData test directories will remain until deleted manually.

## Success Criteria

- A fresh run creates `PicoPet/data/config.json`.
- A fresh run creates `PicoPet/data/picopet.log`.
- A fresh run creates `PicoPet/data/EBWebView/`.
- No new `com.picopet.*` AppData config directory is written by PicoPet.
- Release gate still passes.
- Windows installer QA and portable zip QA both pass.
