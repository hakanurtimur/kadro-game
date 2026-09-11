import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

const fallback = await importTs('lib/fallback.ts');

test('exhausted Muhteşem Yüzyıl pool never leaks a character from another show', () => {
  const names = fallback.FALLBACK_POOLS['Muhteşem Yüzyıl'].map(([name]) => name);
  assert.throws(() => fallback.rerollFallbackCharacter('Muhteşem Yüzyıl', names), /karakter|havuz|evren/i);
});

test('unknown universes fail explicitly instead of becoming a Turkish TV mix', () => {
  assert.throws(() => fallback.rerollFallbackCharacter('Bilinmeyen Evren', []), /evren|katalog/i);
});

test('a named show always returns a character from its own source', () => {
  const names = [];
  for (let i = 0; i < 8; i++) {
    const character = fallback.rerollFallbackCharacter('Muhteşem Yüzyıl', names);
    assert.equal(character.source, 'Muhteşem Yüzyıl');
    assert.ok(!names.includes(character.name));
    names.push(character.name);
  }
});

test('category rerolls report exhaustion instead of silently keeping the same category', () => {
  assert.throws(() => fallback.rerollFallbackCategory(Object.keys(fallback.FALLBACK_POOLS), 14), /evren|kategori|havuz/i);
});
