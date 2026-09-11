export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type FirebaseEnvironment = Partial<Record<
  | "NEXT_PUBLIC_FIREBASE_API_KEY"
  | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  | "NEXT_PUBLIC_FIREBASE_DATABASE_URL"
  | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  | "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  | "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  | "NEXT_PUBLIC_FIREBASE_APP_ID",
  string | undefined
>>;

/**
 * Firebase Web configuration is intentionally public. Security comes from
 * Anonymous Auth, Realtime Database Rules and (for a public launch) App Check.
 * Environment variables remain supported so preview deployments can override
 * the default project without changing source code.
 */
export const DEFAULT_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: "AIzaSyD3hIQWk0kb1f3sdv0zKiUcQhQvAh4zAbc",
  authDomain: "kadro-party-game-51d0c.firebaseapp.com",
  databaseURL: "https://kadro-party-game-51d0c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kadro-party-game-51d0c",
  storageBucket: "kadro-party-game-51d0c.firebasestorage.app",
  messagingSenderId: "831853333337",
  appId: "1:831853333337:web:360fd0d02ca878723b1a48",
};

function clean(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function cleanDatabaseUrl(value: string | undefined) {
  const normalized = clean(value);
  return normalized?.replace(/\/+$/, "");
}

const browserEnvironment: FirebaseEnvironment = {
  // Keep these as direct property accesses so Next.js can inline NEXT_PUBLIC_*
  // values into the browser bundle at build time.
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function resolveFirebaseConfig(
  env: FirebaseEnvironment = browserEnvironment,
): FirebaseWebConfig {
  return {
    apiKey: clean(env.NEXT_PUBLIC_FIREBASE_API_KEY) ?? DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: clean(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) ?? DEFAULT_FIREBASE_CONFIG.authDomain,
    databaseURL:
      cleanDatabaseUrl(env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) ??
      DEFAULT_FIREBASE_CONFIG.databaseURL,
    projectId: clean(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ?? DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket:
      clean(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) ?? DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId:
      clean(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) ??
      DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: clean(env.NEXT_PUBLIC_FIREBASE_APP_ID) ?? DEFAULT_FIREBASE_CONFIG.appId,
  };
}

export function hasRequiredFirebaseConfig(config: FirebaseWebConfig) {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId,
  );
}
