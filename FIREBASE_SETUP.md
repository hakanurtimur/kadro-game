# Firebase setup — KADRO!

The KADRO Firebase Web App configuration is already wired into the source code. Do **not** add a Firebase Admin SDK JSON file to this repository or to Vercel.

## 1. Realtime Database is ready

The Firebase project `kadro-party-game-51d0c` already has a Realtime Database in **Belgium (`europe-west1`)**. The app is configured for:

```text
https://kadro-party-game-51d0c-default-rtdb.europe-west1.firebasedatabase.app
```

## 2. Enable invisible anonymous identity

1. **Build → Authentication → Get started**
2. **Sign-in method → Anonymous**
3. Enable and save.

Players still see no login, email, password, or registration screen. Firebase only assigns a temporary technical UID in the background.

## 3. Publish Realtime Database rules

Open **Realtime Database → Rules**, replace the editor contents with `firebase/database.rules.json`, then click **Publish**.

Alternatively, after installing and logging into Firebase CLI:

```bash
npx firebase-tools login
npx firebase-tools deploy --only database
```

The included `.firebaserc` already targets `kadro-party-game-51d0c`.

## 4. Add only the Groq secret to Vercel

In **Vercel → Project → Settings → Environment Variables**, add:

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-20b
```

Apply `GROQ_API_KEY` to Production, Preview, and Development as needed. Redeploy after saving it.

Firebase's public Web App values are already source defaults, so they do not need to be repeated in Vercel. `.env.example` keeps optional overrides for moving the app to another Firebase project.

## Security

- Never commit or upload `firebase-adminsdk-*.json`.
- Never prefix `GROQ_API_KEY` with `NEXT_PUBLIC_`.
- Revoke any Admin SDK private key that was shared outside a trusted secret manager.
