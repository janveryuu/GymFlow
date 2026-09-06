import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F13.1: Category filter "chest" returns only chest workouts', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const workouts = await client.loadCatalog({ category: 'chest' });

  assert.ok(workouts.length > 0);
  for (const w of workouts) {
    assert.equal(w.category, 'chest');
  }
});

test('F13.2: Category filter "back" returns only back workouts', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const workouts = await client.loadCatalog({ category: 'back' });

  assert.ok(workouts.length > 0);
  for (const w of workouts) {
    assert.equal(w.category, 'back');
  }
});

test('F13.3: Difficulty filter "advanced" returns only advanced workouts', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const workouts = await client.loadCatalog({ difficulty: 'advanced' });

  assert.ok(workouts.length > 0);
  for (const w of workouts) {
    assert.equal(w.difficulty, 'advanced');
  }
});

test('F13.4: Combined category and difficulty filters narrow catalog accurately', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const workouts = await client.loadCatalog({ category: 'back', difficulty: 'advanced' });

  assert.ok(workouts.length > 0);
  for (const w of workouts) {
    assert.equal(w.category, 'back');
    assert.equal(w.difficulty, 'advanced');
  }
});

test('F13.5: Selecting "all" returns the complete workout catalog', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const allWorkouts = await client.loadCatalog({ category: 'all', difficulty: 'all' });

  assert.equal(allWorkouts.length, client.server.workouts.length);
});
