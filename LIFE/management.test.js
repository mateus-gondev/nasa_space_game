"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { LifeManagement, createManagementScenario } = require("./management");
const base = require("./scenario-mars.json");
const settings = require("./management-config.json");
const scenario = () => createManagementScenario(base, settings);
const create = () => new LifeManagement(scenario(), settings);

test("training, pauses and panel suspension never consume time; resuming preserves partial tick", () => {
  const life = create();
  life.advance(1000);
  assert.equal(life.engine.getState().tick, 0);
  life.active = true;
  life.advance(4);
  life.advance(300, true);
  assert.equal(life.remainder, 4);
  life.advance(6);
  assert.equal(life.engine.getState().tick, 1);
  assert.equal(life.remainder, 0);
});

test("30 and 144 FPS yield identical simulation state, including commands and resource ledger", () => {
  const a = create(), b = create();
  a.active = b.active = true;
  for (let frame = 0; frame < 30 * 50; frame++) a.advance(1 / 30);
  for (let frame = 0; frame < 144 * 50; frame++) b.advance(1 / 144);
  assert.deepEqual(a.engine.save(), b.engine.save());
  assert.equal(a.engine.getState().tick, 5);
});

test("save and restore retain activity, reservations, clock and deterministic continuation", () => {
  const a = create(); a.active = true;
  a.command("startActivity", { activity: "research" }); a.advance(25);
  const b = new LifeManagement(scenario(), settings, JSON.parse(JSON.stringify(a.save())));
  assert.deepEqual(a.save(), b.save());
  a.advance(35); b.advance(35);
  assert.deepEqual(a.save(), b.save());
  assert.ok(a.engine.getState().team.fatigue > 0);
  a.command("startActivity", { activity: "rest" }); a.advance(30);
  assert.equal(a.engine.getState().team.fatigue, 0);
});

test("water recycling waits for energy without duplicating reserved material; releases on cancel", () => {
  const custom = scenario(); custom.events = []; custom.power.baseGeneration = 0; custom.resources.energy.amount = 0;
  const life = new LifeManagement(custom, settings); life.active = true;
  life.command("startActivity", { activity: "recycleWater" });
  life.advance(10);
  const state = life.engine.getState();
  assert.equal(state.activeActivity.remainingTicks, 2);
  assert.equal(state.resources.waterUsed.reserved, 10);
  assert.equal(state.power.lastAllocation.waterRecycler, 0);
  life.command("cancelActivity", { activityId: state.activeActivity.id });
  assert.equal(life.engine.getState().resources.waterUsed.reserved, 0);
});

test("management recycling produces water and stock trends match actual net changes", () => {
  const life = create(); life.active = true;
  life.command("startActivity", { activity: "recycleWater" });
  const before = life.engine.getState(); life.advance(10);
  const after = life.snapshot();
  for (const [key, resource] of Object.entries(after.indicators)) {
    assert.ok(Math.abs(resource.net - (resource.amount - before.resources[key].amount)) < .001);
  }
  life.advance(10);
  assert.equal(life.engine.getState().activeActivity, null);
  assert.ok(life.engine.getState().resources.waterClean.amount > before.resources.waterClean.amount);
});

test("low reserves and high fatigue generate alerts; mission end never blocks tutorial state", () => {
  const custom = scenario(); custom.team.fatigue = 90; custom.resources.oxygen.amount = 0; custom.resources.waterClean.amount = 0;
  const life = new LifeManagement(custom, settings); life.active = true;
  assert.ok(life.snapshot().warnings.includes("fatigue"));
  assert.ok(life.snapshot().warnings.includes("oxygen"));
  life.advance(10);
  assert.equal(life.engine.getState().status, "interrupted");
  assert.equal(life.advance(100), false);
  for (const resource of Object.values(life.engine.getState().resources)) {
    assert.ok(resource.amount >= 0 && resource.amount <= resource.capacity);
  }
});

test("browser runtime needs no Node globals and matches Node rules", () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve("./engine"), "utf8"), context);
  vm.runInContext(fs.readFileSync(require.resolve("./management"), "utf8"), context);
  context.scenario = scenario(); context.settings = settings;
  const save = vm.runInContext("globalThis.life = new LifeManagement.LifeManagement(scenario, settings); life.active = true; life.advance(20); JSON.stringify(life.engine.save())", context);
  const node = create(); node.active = true; node.advance(20);
  assert.deepEqual(JSON.parse(save), node.engine.save());
});

test("invalid clocks are rejected and scenario source stays untouched", () => {
  assert.throws(() => new LifeManagement(scenario(), { ...settings, secondsPerTick: 0 }));
  const life = create(); assert.throws(() => life.advance(-1));
  const saved = life.save(); saved.remainder = 999;
  assert.throws(() => new LifeManagement(scenario(), settings, saved));
  assert.equal(base.power.consumers.waterRecycler, undefined);
});
