"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { hasRequiredFirebaseConfig, resolveFirebaseConfig } from "./firebase-config";

const firebaseConfig = resolveFirebaseConfig();

export const hasFirebaseConfig = hasRequiredFirebaseConfig(firebaseConfig);

let authReady: Promise<ReturnType<typeof getAuth>> | null = null;

export async function getFirebaseServices() {
  if (!hasFirebaseConfig) throw new Error("Firebase ayarları eksik.");

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = firebaseConfig.databaseURL
    ? getDatabase(app, firebaseConfig.databaseURL)
    : getDatabase(app);

  if (!authReady) {
    authReady = (async () => {
      await setPersistence(auth, browserSessionPersistence);
      if (!auth.currentUser) await signInAnonymously(auth);
      return auth;
    })();
  }

  await authReady;
  return { app, auth, db };
}
