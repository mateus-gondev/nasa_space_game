"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { EngineError, MissionEngine } = require("./engine");
const marsScenario = require("./scenario-mars.json");

function command(engine, commandId, type, payload) {
  return engine.execute({
    commandId,
    expectedStateVersion: engine.getState().stateVersion,
    type,
    payload
  });
}

function assertResourceBounds(state) {
  for (const resource of Object.values(state.resources)) {
    assert.ok(resource.amount >= 0);
    assert.ok(resource.amount <= resource.capacity);
    assert.ok(resource.reserved >= 0);
    assert.ok(resource.reserved <= resource.amount);
  }
}

function simulationState(state) {
  const { stateVersion, commandResults, acceptedCommands, ...simulation } = state;
  return simulation;
}

test("comandos inválidos não alteram o estado e commandId é idempotente", () => {
  const engine = MissionEngine.createMission({ seed: 7 });
  const initial = engine.getState();

  assert.throws(
    () =>
      engine.execute({
        commandId: "bad-priorities",
        expectedStateVersion: 0,
        type: "setPowerPriorities",
        payload: { priorities: { lifeSupport: 0 } }
      }),
    (error) => error instanceof EngineError && error.code === "INVALID_PRIORITIES"
  );
  assert.deepEqual(engine.getState(), initial);

  const request = {
    commandId: "priorities-1",
    expectedStateVersion: 0,
    type: "setPowerPriorities",
    payload: {
      priorities: {
        lifeSupport: 1,
        airFilter: 2,
        oxygenProduction: 2,
        thermal: 3,
        cultivation: 4,
        research: 5
      }
    }
  };
  const first = engine.execute(request);
  assert.deepEqual(engine.execute(request), first);
  assert.equal(engine.getState().stateVersion, 1);
  assert.throws(
    () => engine.execute({ ...request, payload: { priorities: request.payload.priorities, extra: true } }),
    (error) => error.code === "IDEMPOTENCY_CONFLICT"
  );
  assert.throws(
    () =>
      engine.execute({
        commandId: "stale",
        expectedStateVersion: 0,
        type: "advanceTime",
        payload: { ticks: 1 }
      }),
    (error) => error.code === "VERSION_CONFLICT"
  );
});

test("reservas de atividade são atômicas e cancelamento libera o saldo", () => {
  const engine = MissionEngine.createMission({ seed: 8 });
  const start = command(engine, "plant-1", "startActivity", { activity: "plant" });
  const started = engine.getState();
  assert.equal(started.activeActivity.id, start.result.activityId);
  assert.equal(started.resources.seeds.reserved, 1);
  assert.equal(started.resources.waterClean.reserved, 5);
  assert.equal(started.resources.seeds.amount, 2);

  command(engine, "cancel-plant", "cancelActivity", { activityId: start.result.activityId });
  const cancelled = engine.getState();
  assert.equal(cancelled.activeActivity, null);
  assert.equal(cancelled.resources.seeds.reserved, 0);
  assert.equal(cancelled.resources.waterClean.reserved, 0);
  assert.equal(cancelled.resources.seeds.amount, 2);
  assert.equal(cancelled.resources.waterClean.amount, 80);
  assertResourceBounds(cancelled);
});

test("poeira preserva prioridades essenciais e corta cultivo primeiro", () => {
  const engine = MissionEngine.createMission({ seed: 9 });
  command(engine, "plant", "startActivity", { activity: "plant" });
  command(engine, "one-tick", "advanceTime", { ticks: 1 });
  command(engine, "to-dust", "advanceTime", { ticks: 12 });

  const state = engine.getState();
  assert.equal(state.tick, 13);
  assert.equal(state.power.lastGeneration, 3);
  assert.equal(state.power.lastAllocation.lifeSupport, 2);
  assert.equal(state.power.lastAllocation.airFilter, 0);
  assert.equal(state.power.lastAllocation.oxygenProduction, 0);
  assert.equal(state.power.lastAllocation.thermal, 0);
  assert.equal(state.power.lastAllocation.cultivation, 0);
  assert.equal(state.crop.remainingTicks, 2);
  assertResourceBounds(state);
});

test("filtro quebrado permite que CO2 aumente mesmo com oxigênio disponível", () => {
  const engine = MissionEngine.createMission({ seed: 10 });
  command(engine, "to-filter-failure", "advanceTime", { ticks: 24 });
  const failed = engine.getState();
  assert.equal(failed.systems.filterCondition, 0);
  assert.ok(failed.resources.oxygen.amount > 0);

  const co2AtFailure = failed.systems.co2;
  command(engine, "filter-wait", "advanceTime", { ticks: 2 });
  assert.ok(engine.getState().systems.co2 > co2AtFailure);
  command(engine, "repair", "startActivity", { activity: "repairFilter" });
  command(engine, "finish-repair", "advanceTime", { ticks: 4 });

  const repaired = engine.getState();
  assert.equal(repaired.systems.filterCondition, 1);
  assert.ok(repaired.systems.co2 > co2AtFailure);
  assertResourceBounds(repaired);
});

test("mensagem não chega antes do prazo e aguarda restauração do canal", () => {
  const engine = MissionEngine.createMission({ seed: 11 });
  command(engine, "reach-comms-window", "advanceTime", { ticks: 36 });
  const sent = command(engine, "ask-earth", "sendEarthMessage", { text: "Como priorizar água?" });
  assert.equal(sent.result.estimatedDeliveryTick, 41);

  command(engine, "wait-for-return", "advanceTime", { ticks: 5 });
  let state = engine.getState();
  assert.equal(state.tick, 41);
  assert.equal(state.messages[0].status, "waitingForChannel");
  assert.equal(state.messages[0].deliveredAtTick, null);
  assert.ok(state.messages[0].response);

  command(engine, "wait-for-channel", "advanceTime", { ticks: 2 });
  state = engine.getState();
  assert.equal(state.tick, 43);
  assert.equal(state.messages[0].status, "delivered");
  assert.equal(state.messages[0].deliveredAtTick, 43);
  assertResourceBounds(state);
});

test("save, restauração e replay preservam atividades e determinismo", () => {
  const engine = MissionEngine.createMission({ seed: 12, missionId: "replay-test" });
  command(engine, "start-exploration", "startActivity", { activity: "explore" });
  command(engine, "advance-exploration", "advanceTime", { ticks: 2 });
  const save = engine.save();

  const restored = MissionEngine.restore(save);
  assert.deepEqual(restored.getState(), engine.getState());
  assert.equal(restored.getState().activeActivity.remainingTicks, 4);

  const replayed = MissionEngine.replay(save);
  assert.deepEqual(replayed.getState(), engine.getState());

  const next = {
    commandId: "continue-exploration",
    expectedStateVersion: engine.getState().stateVersion,
    type: "advanceTime",
    payload: { ticks: 4 }
  };
  engine.execute(next);
  restored.execute(next);
  replayed.execute(next);
  assert.deepEqual(restored.getState(), engine.getState());
  assert.deepEqual(replayed.getState(), engine.getState());
  assert.equal(engine.getState().team.location, "habitat");
});

test("avanço em lote equivale aos mesmos passos executados individualmente", () => {
  const batched = MissionEngine.createMission({ seed: 16, missionId: "batch-test" });
  const individual = MissionEngine.createMission({ seed: 16, missionId: "batch-test" });
  command(batched, "plant-batch", "startActivity", { activity: "plant" });
  command(individual, "plant-batch", "startActivity", { activity: "plant" });
  command(batched, "advance-batch", "advanceTime", { ticks: 16 });
  for (let tick = 0; tick < 16; tick += 1) {
    command(individual, `advance-${tick}`, "advanceTime", { ticks: 1 });
  }

  assert.deepEqual(simulationState(batched.getState()), simulationState(individual.getState()));
  const ledger = batched.getState().resourceLedger;
  assert.ok(ledger.some((entry) => entry.direction === "consumed"));
  assert.ok(ledger.some((entry) => entry.resource === "waterLoss" && entry.direction === "discarded"));
});

test("estimativas não alteram estado e recursos permanecem dentro dos limites", () => {
  const engine = MissionEngine.createMission({ seed: 13 });
  const before = engine.getState();
  const estimate = engine.estimateActivity("buildShelter");
  assert.equal(estimate.available, true);
  assert.equal(estimate.durationMinutes, 80);
  assert.deepEqual(engine.getState(), before);

  command(engine, "simulate-60-minutes", "advanceTime", { ticks: 6 });
  assertResourceBounds(engine.getState());
});

test("uma estratégia de proteção, reciclagem e colheita conclui o cenário", () => {
  const engine = MissionEngine.createMission({ seed: 14 });
  let sequence = 0;
  const run = (type, payload) => command(engine, `strategy-${sequence++}`, type, payload);
  const start = (activity) => run("startActivity", { activity });
  const advance = (ticks) => run("advanceTime", { ticks });

  start("buildShelter");
  advance(8);
  start("transferToShelter");
  advance(1);
  start("plant");
  advance(1);
  start("recycleWater");
  advance(2);
  advance(15);
  start("recycleWater");
  advance(2);
  start("repairFilter");
  advance(4);
  advance(11);
  start("recycleWater");
  advance(2);
  advance(15);
  start("recycleWater");
  advance(2);
  start("harvest");
  advance(1);
  advance(8);

  const state = engine.getState();
  assert.equal(state.status, "completed");
  assert.equal(state.tick, 72);
  assert.equal(state.objectives.shelterBuilt, true);
  assert.equal(state.objectives.cropHarvested, true);
  assert.equal(state.objectives.missionSurvived, true);
  assert.ok(state.resources.waterClean.amount > 0);
  assert.ok(state.resources.food.amount > 0);
  assert.ok(state.resources.oxygen.amount > 0);
  assertResourceBounds(state);
});

test("fim da missão encerra trabalho incompleto e libera reservas", () => {
  const scenario = JSON.parse(JSON.stringify(marsScenario));
  scenario.clock.missionDurationTicks = 10;
  const engine = MissionEngine.createMission({ seed: 17, scenario });
  command(engine, "to-tick-three", "advanceTime", { ticks: 3 });
  command(engine, "build-late", "startActivity", { activity: "buildShelter" });
  command(engine, "finish-mission", "advanceTime", { ticks: 7 });

  const state = engine.getState();
  assert.equal(state.status, "completed");
  assert.equal(state.activeActivity, null);
  assert.equal(state.resources.materials.amount, 14);
  assert.equal(state.resources.materials.reserved, 0);
  assert.ok(state.eventHistory.some((event) => event.type === "activityCancelled"));
  assertResourceBounds(state);
});
