
# Ashwood & Co. — Mobile MVP Starter (Expo)

This is a minimal Expo (React Native) starter aligned to our approved MVP specs and screen names.

## Includes
- Navigation skeleton for all MVP screens:
  - `Ashwood_Main`
  - `Join_Flow`
  - `Character_Select`
  - `InGame_Player`
  - `Mystery_Board`
  - `Dialogue_Choice`
  - `GM_Control`
  - `Player_Profile`
  - `Creator_Toolkit`
- Zustand store with basic session state
- Dark gothic theme + flickering candle accent
- Placeholder assets and UI wiring to move between flows

## Quick Start
1. Install prerequisites: Node 18+, `npm i -g expo-cli` (or use `npx`)
2. Install deps:
   ```bash
   npm install
   ```
3. Run in Expo:
   ```bash
   npm start
   ```
   - Press `i` for iOS simulator, `a` for Android emulator, or open on device with Expo Go.
4. Web preview:
   ```bash
   npm run web
   ```

### Windows helper scripts (PowerShell)

We ship a few PowerShell scripts under `scripts/` to make Windows setup easier:

#### How to copy these scripts into your project (PowerShell-only workflow)

1. Open **Windows Terminal** or **PowerShell** and `cd` into the repository root (the folder that contains `package.json`).
2. Ensure the `scripts` directory exists:
   ```powershell
   New-Item -ItemType Directory -Path .\scripts -Force | Out-Null
   ```
3. For each script below, create the file and paste the contents from this repo (or your code review diff) into it:
   - `scripts\init-app.ps1`
   - `scripts\init-server.ps1`
   - `scripts\verify-openai.ps1`
   You can use any editor (`code .`, `notepad`, or `Set-Content`)—just make sure the files are saved with UTF-8 encoding and Windows line endings are fine.
4. If you received the scripts via chat, double-check that any `` ` `` characters were copied correctly (PowerShell escape character). When in doubt, compare with the versions in this repo.
5. After saving, you can run each helper exactly as shown below. PowerShell will prompt you if execution policy blocks the script; rerun with `-ExecutionPolicy Bypass` as demonstrated.

1. Initialize the Expo app and create `.env` defaults (configures the proxy URL):
   ```powershell
   pwsh -ExecutionPolicy Bypass -File .\scripts\init-app.ps1
   ```
   - Pass `-SkipInstall` if you have already run `npm install` and just need to refresh the `.env` values.
2. Install the proxy server dependencies and write `server/.env` (prompts for your OpenAI key):
   ```powershell
   pwsh -ExecutionPolicy Bypass -File .\scripts\init-server.ps1
   ```
3. Verify the proxy can reach OpenAI (optionally starts/stops it for you):
   ```powershell
   pwsh -ExecutionPolicy Bypass -File .\scripts\verify-openai.ps1 -StartServer
   ```

Run the scripts from the repo root. If you keep a custom port or shared secret, pass parameters such as `-ProxyPort` (init-app) or `-Port`, `-SharedSecret` (init-server). `verify-openai.ps1` will honor the values saved in `server/.env`.

## Next Tasks (Sprint 1)
- Wire Join → Lobby with real session service (we'll add a small Node/Express or Supabase)
- Implement Character selection draft order and private Flaw/Secret reveal
- Build Dialogue engine (tone → options → outcomes); connect to OpenAI responses if GM approves
- Add Mystery Board state (rooms, locks, tokens) and GM overlay controls
- Add basic chat/notes, with "ghost" mode visibility
- Implement Enhanced toggle for SFX and mood overlays (stubbed)

## Notes
- This starter intentionally keeps logic minimal so we can iterate quickly.
- Screen names match the project binder to keep design/dev in sync.
