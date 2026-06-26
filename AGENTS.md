## 文件处理

- 所有文件读写使用 UTF-8 编码，修改文件时不要改变原有编码。
- 在 PowerShell 中读取含中文的文件时，先执行 `chcp 65001` 并设置 UTF-8 输出，读取时用 `Get-Content -Encoding UTF8`。
- 不要用 `sed`/`awk` 处理含中文的文件，改用 Python 或 Node.js。
- 代码注释使用中文。

## Superpowers

- 本项目的 Superpowers skills 安装在 `.codex/skills/`，仅在本项目内使用。
- 使用 Superpowers 时，优先读取 `.codex/skills/using-superpowers/SKILL.md`，再按任务匹配读取对应 skill。
- 不要把本项目的 Superpowers 复制或迁移到用户级 `C:\Users\10486\.codex\skills`，除非用户明确要求全局安装。
