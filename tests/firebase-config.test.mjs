import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

const firebaseConfigModule = await importTs('lib/firebase-config.ts');

test('uses the Kadro Firebase web app as the safe public default', () => {
  const config = firebaseConfigModule.resolveFirebaseConfig({});

  assert.equal(config.apiKey, 'AIzaSyD3hIQWk0kb1f3sdv0zKiUcQhQvAh4zAbc');
  assert.equal(config.authDomain, 'kadro-party-game-51d0c.firebaseapp.com');
  assert.equal(config.projectId, 'kadro-party-game-51d0c');
  assert.equal(config.storageBucket, 'kadro-party-game-51d0c.firebasestorage.app');
  assert.equal(config.messagingSenderId, '831853333337');
  assert.equal(config.appId, '1:831853333337:web:360fd0d02ca878723b1a48');
  assert.equal(
    config.databaseURL,
    'https://kadro-party-game-51d0c-default-rtdb.europe-west1.firebasedatabase.app',
  );
});

test('allows Vercel environment variables to override public defaults', () => {
  const config = firebaseConfigModule.resolveFirebaseConfig({
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'preview-project',
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: ' https://preview-project-default-rtdb.europe-west1.firebasedatabase.app/ ',
  });

  assert.equal(config.projectId, 'preview-project');
  assert.equal(config.databaseURL, 'https://preview-project-default-rtdb.europe-west1.firebasedatabase.app');
});

test('default Firebase config is complete without environment variables', () => {
  const config = firebaseConfigModule.resolveFirebaseConfig({});
  assert.equal(firebaseConfigModule.hasRequiredFirebaseConfig(config), true);
});
