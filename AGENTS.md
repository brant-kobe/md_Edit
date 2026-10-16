# Project Rules

- This project uses Electron, React, TypeScript, and electron-vite.
- The current goal is a local Markdown editor.
- Prefer small, focused changes; do not refactor unrelated code.
- Read the relevant code and `package.json` before making changes.
- Do not add dependencies without a clear need.
- Keep the Electron main process, preload script, and renderer process responsibilities separate.
- Keep `contextIsolation` enabled and `nodeIntegration` disabled.
- Keep renderer sandboxing and Electron security settings enabled; do not disable them for convenience.
- Run checks appropriate to the scope of each task after making changes.
- Report an operation as successful only after executing and verifying it.
