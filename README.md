
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

## Checkpoint: sprint-1-verified

- App boots via Expo (Android emulator)
- Story playable (=5 scenes): Foyer ? Hall ? Gallery ? Study ? End
- 'Embellish with AI' uses proxy ? OpenAI (Responses API)
- Dev checks: 'Test OpenAI (prompt)' and 'Test Chat (messages)' succeed via proxy
- Secrets kept server-side (OPENAI_API_KEY only in server/.env)
