# Wasp Command Log

## 2026-05-11

### Requested Setup

User-provided commands:

```powershell
npm i -g @wasp.sh/wasp-cli@latest
npx skills add wasp-lang/wasp-agent-plugins
```

### Native Windows Result

Native CLI install was not viable in this environment:

- Current package release targets Linux/macOS, not native Windows.
- The package requested Node `>=24.14.1`; Windows had Node `24.14.0`.

Decision: keep Windows as the main development environment and run Wasp CLI through Ubuntu WSL.

### Skills Install

Command:

```powershell
npx skills add wasp-lang/wasp-agent-plugins
```

Result:

- `.agents/skills/add-feature`
- `.agents/skills/deploying-app`
- `.agents/skills/expert-advice`
- `.agents/skills/start-dev-server`
- `.agents/skills/wasp-plugin-help`
- `.agents/skills/wasp-plugin-init`
- `skills-lock.json`

### WSL Runtime Install

Installed Linux Node and Wasp CLI under:

```txt
/home/lenovo/.local/node-v24.14.1-linux-x64
```

### Wrapper Verification

Command:

```powershell
.\scripts\wasp-wsl.ps1 version
```

Observed output:

```txt
0.23.0

If you wish to install/switch to the latest version of Wasp, do:
  npm i -g @wasp.sh/wasp-cli@latest
```

### Wrapper Fixes

Initial wrapper issues:

- WSL inherited a stale Windows PATH entry: `G:\Mi unidad\Git\cmd`.
- A bash-argument wrapper lost positional arguments when executed through this environment.
- `wasp` could not find Linux `node` when called by shebang without an explicit Linux PATH.

Final wrapper strategy:

- Filter invalid Windows PATH entries before invoking WSL.
- Use `wsl.exe --cd <wsl-path> -- env PATH=<linux-node-path> wasp ...`.
- Avoid bash positional argument forwarding.

### Useful Commands

Check CLI:

```powershell
.\scripts\wasp-wsl.ps1 version
```

Inspect Wasp commands:

```powershell
.\scripts\wasp-wsl.ps1 --help
```

Create a separate Wasp prototype:

```powershell
.\scripts\wasp-wsl.ps1 new CollectaAuthPrototype -t saas
```

Run only inside a Wasp project:

```powershell
.\scripts\wasp-wsl.ps1 start db
.\scripts\wasp-wsl.ps1 start
.\scripts\wasp-wsl.ps1 build
```

