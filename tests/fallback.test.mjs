import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

const fallback = await importTs('lib/fallback.ts');

test('round fallback creates enough unique named characters', () => {
  const round = fallback.generateFallbackRound(18);
  assert.equal(round.source, 'demo');
  assert.ok(round.scenario.length > 2);
  assert.ok(round.characterCategory.length > 2);
  assert.equal(round.characters.length, 18);
  assert.equal(new Set(round.characters.map((character) => character.name.toLocaleLowerCase('tr-TR'))).size, 18);
});

test('scenario reroll avoids the previous scenario when alternatives exist', () => {
  const first = fallback.FALLBACK_SCENARIOS[0];
  const rerolled = fallback.rerollFallbackScenario([first]);
  assert.notEqual(rerolled, first);
});

test('single character reroll avoids existing names', () => {
  const existing = ['Hürrem Sultan', 'Ramiz Dayı', 'Bihter Ziyagil'];
  const replacement = fallback.rerollFallbackCharacter('Türk Dizi Evreni', existing);
  assert.ok(replacement.name);
  assert.ok(!existing.includes(replacement.name));
});

test('fallback judge ranks every team and returns a valid winner', () => {
  const judge = fallback.fallbackJudge('Entrika', [
    { playerUid: 'a', nickname: 'Hakan', balance: 3, characters: ['Hürrem Sultan', 'Eyşan'] },
    { playerUid: 'b', nickname: 'Can', balance: 7, characters: ['Erdal Bakkal', 'Ali Vefa'] },
  ]);
  assert.equal(judge.source, 'demo');
  assert.equal(judge.rankings.length, 2);
  assert.ok(['a', 'b'].includes(judge.winnerUid));
  assert.ok(judge.rankings.every((ranking) => ranking.score >= 0 && ranking.score <= 100));
});

test('category reroll changes the category even for a large character pool', () => {
  const rerolled = fallback.rerollFallbackCategory(['Türk Dizi Evreni'], 18);
  assert.notEqual(rerolled.characterCategory, 'Türk Dizi Evreni');
  assert.equal(rerolled.characters.length, 18);
});
