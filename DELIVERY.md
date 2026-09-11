# KADRO! — Firebase-ready delivery

Browser-based real-time auction party game with AI-generated rounds, rerolls, playable rock-paper-scissors, free draft, and AI judging.

## What is already configured

- Firebase Web App project: `kadro-party-game-51d0c`
- Realtime Database URL target: `https://kadro-party-game-51d0c-default-rtdb.europe-west1.firebasedatabase.app`
- Firebase Anonymous Auth client flow
- Realtime Database adapter and rules file
- Firebase CLI project mapping in `.firebaserc`
- Groq server routes with safe demo fallback
- Vercel-compatible Next.js application

Firebase's Web App configuration is public by design and is included as source defaults. No Firebase environment variables are required for this project unless you want to override the Firebase project.

## Remaining console actions

The Realtime Database is already created in Belgium (`europe-west1`). See `FIREBASE_SETUP.md` for the remaining steps:

1. Enable Authentication → Anonymous.
2. Publish `firebase/database.rules.json`.
3. Add `GROQ_API_KEY` to Vercel and redeploy.

Do not put a Firebase Admin SDK JSON file into this repository or Vercel.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To force the local two-tab demo, create `.env.local` with:

```env
NEXT_PUBLIC_GAME_MODE=local
```

## Verification

```bash
npm run check
npm run build
```

`npm run check` runs the gameplay tests and the TypeScript/TSX syntax audit. `npm run build` requires installed npm dependencies.
