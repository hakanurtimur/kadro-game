import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';
const catalog = await importTs('lib/character-catalog.ts');
const input = { playerCount: 2, slots: 5 };
const request = { ...input, kind: 'category', characterCategory: 'Türk Dizi Evreni', characters: [] };
async function content() { return importTs('lib/ai/game-content.ts'); }

function assertCanonical(result) {
  const allowed = catalog.catalogCharacters(result.characterCategory);
  for (const item of result.characters) assert.ok(allowed.some((v) => v.name === item.name && v.source === item.source));
  assert.equal(new Set(result.characters.map((c) => c.name)).size, result.characters.length);
}

test('incomplete AI category response is filled from exactly the selected show', async () => {
  const { rerollContent } = await content();
  const result = await rerollContent(request, async () => ({ characterCategory: 'Muhteşem Yüzyıl', characters: [{ name: 'Hürrem Sultan', source: 'Muhteşem Yüzyıl' }] }));
  assert.equal(result.characterCategory, 'Muhteşem Yüzyıl');
  assert.equal(result.characters.length, 14);
  assertCanonical(result);
});

test('a forged source cannot smuggle Erdal into Muhteşem Yüzyıl', async () => {
  const { rerollContent } = await content();
  const result = await rerollContent(request, async () => ({ characterCategory: 'Muhteşem Yüzyıl', characters: [{ name: 'Erdal Bakkal', source: 'Muhteşem Yüzyıl' }] }));
  assert.equal(result.characterCategory, 'Muhteşem Yüzyıl');
  assert.ok(!result.characters.some((v) => v.name === 'Erdal Bakkal'));
  assertCanonical(result);
});

test('initial AI round also validates canonical membership and duplicates', async () => {
  const { generateRoundContent } = await content();
  const result = await generateRoundContent(input, async () => ({ scenario: 'Entrika', characterCategory: 'Muhteşem Yüzyıl', characters: [{ name: 'Pargalı İbrahim Paşa' }, { name: 'İbrahim Paşa' }, { name: 'Polat Alemdar' }] }));
  assert.equal(result.scenario, 'Entrika');
  assert.equal(result.characters.filter((c) => c.name === 'İbrahim Paşa').length, 1);
  assertCanonical(result);
});

test('initial round gracefully uses a consistent catalog if the provider fails', async () => {
  const { generateRoundContent } = await content();
  const result = await generateRoundContent(input, async () => { throw new Error('429'); });
  assert.equal(result.source, 'demo');
  assert.equal(result.characters.length, 14);
  assertCanonical(result);
});

test('unsupported AI universe is never relabeled around unrelated characters', async () => {
  const { rerollContent } = await content();
  const result = await rerollContent(request, async () => ({ characterCategory: 'Bilinmeyen Evren', characters: [{ name: 'Erdal Bakkal', source: 'Bilinmeyen Evren' }] }));
  assert.notEqual(result.characterCategory, 'Bilinmeyen Evren');
  assert.notEqual(result.characterCategory, request.characterCategory);
  assertCanonical(result);
});

test('single character reroll rejects a different show even when source is forged', async () => {
  const { rerollContent } = await content();
  const result = await rerollContent({ ...request, kind: 'character', characterCategory: 'Muhteşem Yüzyıl', characters: [{ name: 'Hürrem Sultan' }] }, async () => ({ character: { name: 'Polat Alemdar', source: 'Muhteşem Yüzyıl' } }));
  assert.equal(result.character.source, 'Muhteşem Yüzyıl');
  assert.notEqual(result.character.name, 'Hürrem Sultan');
  assert.notEqual(result.character.name, 'Polat Alemdar');
  assert.equal(result.source, 'demo');
});

test('single character exhausted pool returns an error without spending a provider call', async () => {
  const { rerollContent } = await content();
  let calls = 0;
  await assert.rejects(() => rerollContent({ ...request, kind: 'character', characterCategory: 'Muhteşem Yüzyıl', characters: catalog.catalogCharacters('Muhteşem Yüzyıl') }, async () => { calls++; return {}; }), /evren|karakter/i);
  assert.equal(calls, 0);
});

test('a supported AI character keeps its canonical name and source', async () => {
  const { rerollContent } = await content();
  const result = await rerollContent({ ...request, kind: 'character', characterCategory: 'Muhteşem Yüzyıl' }, async () => ({ character: { name: 'Pargalı İbrahim Paşa', source: 'Yanlış' } }));
  assert.deepEqual(result.character, { name: 'İbrahim Paşa', source: 'Muhteşem Yüzyıl' });
  assert.equal(result.source, 'groq');
});

test('existing aliases cannot reroll into the same person under a different name', async () => {
  const { rerollContent } = await content();
  const result = await rerollContent({ ...request, kind: 'character', characterCategory: 'Muhteşem Yüzyıl', characters: [{ name: 'İbrahim Paşa' }] }, async () => ({ character: { name: 'Pargalı İbrahim Paşa' } }));
  assert.notEqual(result.character.name, 'İbrahim Paşa');
});

test('large supported tables never get invented surprise-character filler', async () => {
  const { generateRoundContent } = await content();
  const result = await generateRoundContent({ playerCount: 8, slots: 8 });
  assert.equal(result.characters.length, 72);
  assertCanonical(result);
  assert.ok(result.characters.every((c) => !c.name.startsWith('Sürpriz')));
});

test('a too-small AI universe is replaced as one complete consistent pool', async () => {
  const { rerollContent } = await content();
  const result = await rerollContent({ ...request, characterCategory: 'Muhteşem Yüzyıl', playerCount: 4, slots: 8 }, async () => ({ characterCategory: 'Ezel', characters: [] }));
  assert.notEqual(result.characterCategory, 'Ezel');
  assertCanonical(result);
});

test('capacity exhaustion reports an error instead of silently repeating the old universe', async () => {
  const { rerollContent } = await content();
  await assert.rejects(() => rerollContent({ ...request, playerCount: 8, slots: 8 }), /evren|slot/i);
});

test('scenario reroll retains a different valid fallback on provider error', async () => {
  const { rerollContent } = await content();
  const result = await rerollContent({ ...request, kind: 'scenario', scenario: 'Entrika İmparatorluğu' }, async () => { throw Error('provider down'); });
  assert.notEqual(result.scenario, 'Entrika İmparatorluğu');
  assert.equal(result.source, 'demo');
});

test('malformed request values are rejected, not turned into huge/fractional pools', async () => {
  const { generateRoundContent, rerollContent } = await content();
  for (const bad of [null, [], { slots: 1.5 }, { playerCount: 99 }, { playerCount: '2' }]) {
    await assert.rejects(() => generateRoundContent(bad));
  }
  await assert.rejects(() => rerollContent({ ...request, kind: 'unsupported' }));
});

test('series generation avoids a repeated completed-round task without a second AI call',async()=>{
 const {generateRoundContent}=await content();let calls=0;
 const result=await generateRoundContent({...input,excludedScenarios:['Entrika']},async()=>{calls++;return {scenario:'Entrika',characterCategory:'Muhteşem Yüzyıl',characters:[]};});
 assert.equal(calls,1);assert.notEqual(catalog.normalizeCatalogKey(result.scenario),'entrika');assertCanonical(result);
});
test('oversized scenario history is rejected before calling the provider',async()=>{
 const {generateRoundContent}=await content();let calls=0;
 await assert.rejects(()=>generateRoundContent({...input,excludedScenarios:Array(20).fill('x')},async()=>{calls++;return {};}));assert.equal(calls,0);
});
