"use strict";
(function (root) {
  const { MissionEngine } = typeof module === "object" && module.exports ? require("./engine") : root.LifeEngine;

  class LifeManagement {
    constructor(scenario, settings, saved) {
      if (!Number.isFinite(settings.secondsPerTick) || settings.secondsPerTick <= 0) throw new Error("Intervalo LIFE inválido.");
      this.scenario = scenario;
      this.settings = settings;
      this.engine = saved ? MissionEngine.restore(saved.mission, scenario) : MissionEngine.createMission({ scenario, seed: 7 });
      this.active = saved?.active === true;
      this.remainder = saved?.remainder ?? 0;
      if (saved && (saved.version !== 1 || saved.secondsPerTick !== settings.secondsPerTick || !Number.isFinite(this.remainder) || this.remainder < 0 || this.remainder >= settings.secondsPerTick)) throw new Error("Relógio LIFE incompatível.");
    }

    command(type, payload = {}) {
      const state = this.engine.getState();
      return this.engine.execute({ commandId: `management-${state.stateVersion + 1}`, expectedStateVersion: state.stateVersion, type, payload });
    }

    advance(seconds, suspended = false) {
      if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Tempo LIFE inválido.");
      // Read the status without cloning the full replay/ledger on every frame.
      if (!this.active || suspended || this.engine.state.status !== "active") return false;
      this.remainder += seconds;
      let changed = false;
      while (this.remainder + 1e-9 >= this.settings.secondsPerTick && this.engine.getState().status === "active") {
        this.remainder = Math.max(0, this.remainder - this.settings.secondsPerTick);
        this.command("advanceTime", { ticks: 1 });
        changed = true;
      }
      if (this.engine.getState().status !== "active") this.remainder = 0;
      return changed;
    }

    save() {
      return { version: 1, secondsPerTick: this.settings.secondsPerTick, active: this.active, remainder: this.remainder, mission: this.engine.save() };
    }

    snapshot() {
      const state = this.engine.getState();
      const indicators = {};
      const warnings = [];
      for (const name of ["waterClean", "oxygen", "food", "energy"]) {
        const resource = state.resources[name];
        const percent = resource.capacity ? resource.amount / resource.capacity * 100 : 0;
        const flows = state.resourceLedger.filter(flow => flow.tick === state.tick && flow.resource === name);
        const net = flows.reduce((sum, flow) => sum + (flow.direction === "produced" ? flow.amount : flow.direction === "consumed" || name === "energy" && flow.direction === "discarded" ? -flow.amount : 0), 0);
        indicators[name] = { ...resource, percent, net: state.tick ? Math.round(net * 1000) / 1000 : null };
        if (percent <= this.scenario.limits.resourceWarningFraction * 100) warnings.push(name);
      }
      if (state.team.fatigue >= this.settings.fatigueWarning) warnings.push("fatigue");
      if (state.systems.co2 >= this.scenario.limits.co2Warning) warnings.push("co2");
      return { state, indicators, warnings, actions: this.engine.availableActions() };
    }
  }

  function createManagementScenario(base, settings) {
    const scenario = JSON.parse(JSON.stringify(base));
    scenario.scenarioId = settings.scenarioId;
    scenario.version = settings.scenarioVersion;
    scenario.rates.fatigueWork = settings.fatigueWork;
    scenario.rates.fatigueRest = settings.fatigueRest;
    scenario.power.consumers.waterRecycler = { demand: settings.recyclerDemand, priority: 4 };
    scenario.activities.recycleWater.powerConsumer = "waterRecycler";
    return scenario;
  }
  const api = { LifeManagement, createManagementScenario };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LifeManagement = api;
})(globalThis);
