"use strict";

(function (root) {

const DEFAULT_SCENARIO = typeof module === "object" && module.exports ? require("./scenario-mars.json") : null;
const SAVE_FORMAT_VERSION = 1;
const RULES_VERSION = "0.1.0";

class EngineError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "EngineError";
    this.code = code;
    this.details = details || null;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeAmount(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function makeResource(definition) {
  return {
    amount: definition.amount,
    capacity: definition.capacity,
    reserved: 0
  };
}

function makeInitialState({ scenario, seed, missionId }) {
  const resources = {};
  for (const [name, definition] of Object.entries(scenario.resources)) {
    resources[name] = makeResource(definition);
  }

  const priorities = {};
  for (const [name, definition] of Object.entries(scenario.power.consumers)) {
    priorities[name] = definition.priority;
  }

  return {
    schemaVersion: 1,
    missionId,
    scenarioId: scenario.scenarioId,
    scenarioVersion: scenario.version,
    rulesVersion: RULES_VERSION,
    tick: 0,
    stateVersion: 0,
    status: "active",
    seed,
    rngState: seed,
    nextActivityNumber: 1,
    nextMessageNumber: 1,
    resources,
    team: clone(scenario.team),
    systems: clone(scenario.systems),
    priorities,
    power: {
      solarMultiplier: 1,
      channelAvailable: true,
      lastAllocation: {},
      lastGeneration: 0
    },
    crop: null,
    activeActivity: null,
    messages: [],
    activeEvents: [],
    eventHistory: [],
    explanations: [],
    resourceLedger: [],
    objectives: {
      shelterBuilt: false,
      cropHarvested: false,
      missionSurvived: false
    },
    resourceWarnings: {},
    commandResults: {},
    acceptedCommands: []
  };
}

function addExplanation(state, explanation) {
  state.explanations.push({
    id: `explanation-${String(state.explanations.length + 1).padStart(4, "0")}`,
    tick: state.tick,
    ...explanation
  });
}

function addEvent(state, event) {
  const record = {
    id: `event-${String(state.eventHistory.length + 1).padStart(4, "0")}`,
    tick: state.tick,
    ...event
  };
  state.eventHistory.push(record);
  return record;
}

function recordFlow(state, resource, amount, direction, source) {
  if (amount <= 0) {
    return;
  }
  state.resourceLedger.push({
    sequence: state.resourceLedger.length + 1,
    tick: state.tick,
    resource,
    amount: normalizeAmount(amount),
    direction,
    source
  });
}

function resourceAvailable(state, name) {
  const resource = state.resources[name];
  return resource ? normalizeAmount(resource.amount - resource.reserved) : 0;
}

function consumeResource(state, name, requested, source) {
  const resource = state.resources[name];
  if (!resource) {
    throw new EngineError("UNKNOWN_RESOURCE", `Recurso desconhecido: ${name}`);
  }
  const consumed = Math.min(resourceAvailable(state, name), requested);
  resource.amount = normalizeAmount(resource.amount - consumed);
  recordFlow(state, name, consumed, "consumed", source || "life-support");
  return normalizeAmount(consumed);
}

function addResource(state, name, quantity, source) {
  const resource = state.resources[name];
  if (!resource) {
    throw new EngineError("UNKNOWN_RESOURCE", `Recurso desconhecido: ${name}`);
  }
  const room = Math.max(0, resource.capacity - resource.amount);
  const accepted = Math.min(room, quantity);
  resource.amount = normalizeAmount(resource.amount + accepted);
  recordFlow(state, name, accepted, "produced", source || "system");
  recordFlow(state, name, quantity - accepted, "discarded", `${source || "system"}-capacity`);
  return {
    accepted: normalizeAmount(accepted),
    discarded: normalizeAmount(quantity - accepted)
  };
}

function reserveResources(state, requirements) {
  for (const [name, quantity] of Object.entries(requirements)) {
    if (!state.resources[name]) {
      throw new EngineError("UNKNOWN_RESOURCE", `Recurso desconhecido: ${name}`);
    }
    if (resourceAvailable(state, name) < quantity) {
      throw new EngineError(
        "INSUFFICIENT_RESOURCE",
        `Não há ${name} suficiente disponível.`,
        { resource: name, required: quantity, available: resourceAvailable(state, name) }
      );
    }
  }
  for (const [name, quantity] of Object.entries(requirements)) {
    state.resources[name].reserved = normalizeAmount(state.resources[name].reserved + quantity);
  }
}

function releaseReservations(state, requirements, consume, source) {
  for (const [name, quantity] of Object.entries(requirements)) {
    const resource = state.resources[name];
    if (!resource || resource.reserved < quantity) {
      throw new EngineError("INVALID_RESERVATION", `Reserva inválida para ${name}.`);
    }
    resource.reserved = normalizeAmount(resource.reserved - quantity);
    if (consume) {
      resource.amount = normalizeAmount(resource.amount - quantity);
      recordFlow(state, name, quantity, "consumed", source || "activity");
    }
  }
}

function isActivityAvailable(state, scenario, type) {
  const reasons = [];
  const definition = scenario.activities[type];
  if (!definition) {
    return { enabled: false, reasons: ["Atividade desconhecida."] };
  }
  if (state.status !== "active") {
    reasons.push("A missão não está em andamento.");
  }
  if (state.activeActivity) {
    reasons.push("A equipe já está ocupada em outra atividade.");
  }
  if (state.team.fatigue >= 100 && type !== "rest") {
    reasons.push("A equipe precisa descansar antes de trabalhar.");
  }
  if (type === "buildShelter" && state.systems.shelterBuilt) {
    reasons.push("O abrigo já está reforçado.");
  }
  if (type === "transferToShelter" && !state.systems.shelterBuilt) {
    reasons.push("É preciso reforçar o abrigo antes de transferir a equipe.");
  }
  if (type === "repairFilter" && state.systems.filterCondition >= 1) {
    reasons.push("O filtro não precisa de reparo.");
  }
  if (type === "plant" && state.crop) {
    reasons.push("Já existe um cultivo em andamento.");
  }
  if (type === "harvest" && (!state.crop || state.crop.remainingTicks > 0)) {
    reasons.push("O cultivo ainda não está pronto para colher.");
  }
  if (type === "recycleWater" && resourceAvailable(state, "waterUsed") < scenario.rates.waterRecycleInput) {
    reasons.push("Ainda não há água usada suficiente para reciclar.");
  }
  if (type === "explore" && state.team.location === "outside") {
    reasons.push("A equipe já está fora do habitat.");
  }
  if (type === "rest" && state.team.location === "outside") {
    reasons.push("A equipe precisa voltar a um local habitável antes de descansar.");
  }
  for (const [name, quantity] of Object.entries(definition.reserved)) {
    if (resourceAvailable(state, name) < quantity) {
      reasons.push(`Recursos insuficientes: ${name}.`);
    }
  }
  return { enabled: reasons.length === 0, reasons };
}

function makeActivity(state, type, definition) {
  const id = `activity-${String(state.nextActivityNumber).padStart(4, "0")}`;
  state.nextActivityNumber += 1;
  return {
    id,
    type,
    startedAtTick: state.tick,
    remainingTicks: definition.durationTicks,
    totalTicks: definition.durationTicks,
    reservedResources: clone(definition.reserved),
    previousLocation: type === "explore" ? state.team.location : null
  };
}

function getActivePowerConsumers(state, scenario) {
  const consumers = scenario.power.consumers;
  const active = ["lifeSupport"];
  if (state.systems.filterCondition > 0) {
    active.push("airFilter");
  }
  if (resourceAvailable(state, "waterClean") >= scenario.rates.oxygenWaterInput) {
    active.push("oxygenProduction");
  }
  active.push("thermal");
  if (state.crop && state.crop.remainingTicks > 0 && !state.crop.failed) {
    active.push("cultivation");
  }
  if (state.activeActivity && state.activeActivity.type === "research") {
    active.push("research");
  }
  if (state.activeActivity?.type === "recycleWater" && scenario.power.consumers.waterRecycler) {
    active.push("waterRecycler");
  }
  return active.map((name) => ({
    name,
    demand: consumers[name].demand,
    priority: state.priorities[name]
  }));
}

function distributePower(state, scenario) {
  const generation = Math.floor(
    scenario.power.baseGeneration * state.systems.solarCondition * state.power.solarMultiplier
  );
  let available = normalizeAmount(generation + resourceAvailable(state, "energy"));
  const allocation = {};
  const consumers = getActivePowerConsumers(state, scenario).sort((a, b) =>
    a.priority - b.priority || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  );
  for (const consumer of consumers) {
    allocation[consumer.name] = 0;
  }
  for (const consumer of consumers) {
    if (available >= consumer.demand) {
      allocation[consumer.name] = consumer.demand;
      available = normalizeAmount(available - consumer.demand);
    } else {
      break;
    }
  }
  const energy = state.resources.energy;
  const stored = Math.min(energy.capacity, available);
  const discarded = normalizeAmount(available - stored);
  const allocated = Object.values(allocation).reduce((total, amount) => total + amount, 0);
  recordFlow(state, "energy", generation, "produced", "solar-panels");
  recordFlow(state, "energy", allocated, "consumed", "power-distribution");
  recordFlow(state, "energy", discarded, "discarded", "battery-capacity");
  energy.amount = normalizeAmount(stored);
  state.power.lastAllocation = allocation;
  state.power.lastGeneration = generation;
  return { allocation, generation, discarded };
}

function emitWarning(state, eventDefinition) {
  const messages = {
    solarDust: {
      title: "Alerta de poeira",
      message: "A poeira pode reduzir a geração solar em breve."
    },
    filterFailure: {
      title: "Filtro precisa de atenção",
      message: "O filtro está mostrando sinais de desgaste. Planeje um reparo."
    },
    communicationsOutage: {
      title: "Canal de comunicação instável",
      message: "Mensagens para a Terra podem demorar mais para chegar."
    }
  };
  const warning = messages[eventDefinition.type];
  addEvent(state, {
    type: "warning",
    source: eventDefinition.id,
    title: warning.title,
    message: warning.message
  });
}

function startScenarioEvent(state, eventDefinition) {
  const event = { id: eventDefinition.id, type: eventDefinition.type, startedAtTick: state.tick };
  state.activeEvents.push(event);
  if (eventDefinition.type === "solarDust") {
    state.power.solarMultiplier = eventDefinition.solarMultiplier;
    addEvent(state, {
      type: "environmentalEventStarted",
      source: event.id,
      title: "Tempestade de poeira",
      message: "A poeira reduziu a geração solar. A bateria e as prioridades de energia fazem diferença."
    });
    addExplanation(state, {
      whatHappened: "A poeira reduziu a energia produzida pelos painéis.",
      contributingDecisionOrCondition: "A condição ambiental diminuiu a geração solar.",
      affectedResources: ["energy"],
      availableAlternative: "Ajustar prioridades ou reduzir atividades que usam energia.",
      principle: "A energia usada em uma atividade deixa de estar disponível para outra."
    });
  } else if (eventDefinition.type === "filterFailure") {
    state.systems.filterCondition = 0;
    addEvent(state, {
      type: "systemFailure",
      source: event.id,
      title: "Falha no filtro de ar",
      message: "O filtro parou. O oxigênio ainda existe, mas o CO2 começa a se acumular."
    });
    addExplanation(state, {
      whatHappened: "O filtro de ar parou de remover CO2.",
      contributingDecisionOrCondition: "O equipamento atingiu a falha prevista no cenário.",
      affectedResources: ["energy"],
      availableAlternative: "Reparar o filtro e manter energia disponível para a filtragem.",
      principle: "Ter oxigênio não significa que o ar esteja livre de CO2."
    });
  } else if (eventDefinition.type === "communicationsOutage") {
    state.power.channelAvailable = false;
    addEvent(state, {
      type: "communicationsOutageStarted",
      source: event.id,
      title: "Canal temporariamente indisponível",
      message: "As mensagens ficam aguardando o canal; a missão continua normalmente."
    });
  }
}

function endScenarioEvent(state, eventDefinition) {
  state.activeEvents = state.activeEvents.filter((event) => event.id !== eventDefinition.id);
  if (eventDefinition.type === "solarDust") {
    state.power.solarMultiplier = 1;
    addEvent(state, {
      type: "environmentalEventEnded",
      source: eventDefinition.id,
      title: "Poeira diminuiu",
      message: "A geração solar voltou à condição normal do cenário."
    });
  } else if (eventDefinition.type === "communicationsOutage") {
    state.power.channelAvailable = true;
    addEvent(state, {
      type: "communicationsRestored",
      source: eventDefinition.id,
      title: "Canal restabelecido",
      message: "Mensagens pendentes podem ser entregues quando o prazo de retorno terminar."
    });
  }
}

function updateMessages(state, scenario) {
  for (const message of state.messages) {
    if (message.status === "outbound" && state.tick >= message.outboundArrivesAt) {
      message.status = "processing";
      addEvent(state, {
        type: "messageAtEarth",
        source: message.id,
        message: "O pedido chegou à Terra e aguarda processamento."
      });
    }
    if (message.status === "processing" && state.tick >= message.responseReadyAt) {
      message.response = buildAdvice(message.snapshot);
      message.status = "returnTransit";
      addEvent(state, {
        type: "messageResponseSent",
        source: message.id,
        message: "A resposta foi enviada com base nas informações incluídas no pedido."
      });
    }
    if (message.status === "returnTransit" && state.tick >= message.deliveryDueAt) {
      if (state.power.channelAvailable) {
        deliverMessage(state, message);
      } else {
        message.status = "waitingForChannel";
      }
    }
    if (message.status === "waitingForChannel" && state.power.channelAvailable) {
      deliverMessage(state, message);
    }
    if (message.status === "delivered" && !message.deliveryRecorded) {
      message.deliveryRecorded = true;
      addEvent(state, {
        type: "messageDelivered",
        source: message.id,
        message: "A resposta da Terra foi entregue. Ela pode estar desatualizada."
      });
    }
  }
}

function buildAdvice(snapshot) {
  if (snapshot.co2 >= 20 || snapshot.filterCondition < 1) {
    return "Verifique o filtro e a qualidade do ar. Esta orientação usa o estado informado no pedido.";
  }
  if (snapshot.waterClean < 30) {
    return "Revise o uso e a reciclagem de água. A orientação não fornece água nem repara equipamentos.";
  }
  if (snapshot.food < 20) {
    return "Considere planejar um cultivo e uma colheita. O alimento exige tempo e recursos.";
  }
  return "Mantenha as verificações dos sistemas e compare as prioridades com as reservas disponíveis.";
}

function deliverMessage(state, message) {
  message.status = "delivered";
  message.deliveredAtTick = state.tick;
}

function applyActivityCompletion(state, scenario, activity) {
  if (activity.type === "buildShelter") {
    state.systems.shelterBuilt = true;
    state.systems.shelterProtection = scenario.rates.shelterBuildProtection;
    state.objectives.shelterBuilt = true;
    addExplanation(state, {
      whatHappened: "O abrigo foi reforçado.",
      contributingDecisionOrCondition: "Materiais e tempo foram investidos no trabalho.",
      affectedResources: ["materials"],
      availableAlternative: "Usar esses materiais em outra melhoria, aceitando menor proteção.",
      principle: "A proteção futura exige recursos e trabalho agora."
    });
  } else if (activity.type === "repairFilter") {
    state.systems.filterCondition = 1;
    addEvent(state, {
      type: "systemRecovered",
      source: activity.id,
      title: "Filtro reparado",
      message: "A filtragem voltou a funcionar."
    });
    addExplanation(state, {
      whatHappened: "O filtro voltou a funcionar.",
      contributingDecisionOrCondition: "A equipe usou uma peça e concluiu o reparo.",
      affectedResources: ["repairParts"],
      availableAlternative: "Enquanto o reparo acontecia, era possível economizar energia em outros sistemas.",
      principle: "Manutenção usa recursos agora para reduzir riscos futuros."
    });
  } else if (activity.type === "plant") {
    state.crop = { remainingTicks: scenario.rates.cropGrowthTicks, failed: false };
    addEvent(state, {
      type: "cropPlanted",
      source: activity.id,
      title: "Cultivo iniciado",
      message: "A planta precisa de tempo, água e energia antes da colheita."
    });
  } else if (activity.type === "harvest") {
    const result = addResource(state, "food", scenario.rates.cropYield, "crop-harvest");
    state.crop = null;
    state.objectives.cropHarvested = true;
    addEvent(state, {
      type: "cropHarvested",
      source: activity.id,
      title: "Colheita concluída",
      message: `Foram guardadas ${result.accepted} unidades de alimento; ${result.discarded} não couberam no estoque.`
    });
    addExplanation(state, {
      whatHappened: "O cultivo amadureceu e foi colhido.",
      contributingDecisionOrCondition: "A equipe investiu sementes, água, energia e tempo antes da colheita.",
      affectedResources: ["food", "waterClean", "seeds", "energy"],
      availableAlternative: "Manter alimentos armazenados ou usar energia em outra prioridade enquanto a planta cresce.",
      principle: "Produzir alimento no futuro exige investimento no presente."
    });
  } else if (activity.type === "recycleWater") {
    const result = addResource(state, "waterClean", scenario.rates.waterRecycleOutput, "water-recycling");
    const discardedByCapacity = result.discarded;
    recordFlow(
      state,
      "waterLoss",
      scenario.rates.waterRecycleInput - scenario.rates.waterRecycleOutput,
      "discarded",
      "water-recycling"
    );
    addEvent(state, {
      type: "waterRecycled",
      source: activity.id,
      title: "Reciclagem concluída",
      message: `A água foi reciclada; ${discardedByCapacity} unidade(s) foram descartadas por falta de capacidade de armazenamento.`
    });
  } else if (activity.type === "explore") {
    state.team.location = activity.previousLocation || "habitat";
    const sample = nextRandom(state) % 3;
    const result = addResource(state, "materials", sample, "exploration");
    addEvent(state, {
      type: "explorationCompleted",
      source: activity.id,
      title: "Exploração concluída",
      message: `A equipe voltou e encontrou ${sample} unidade(s) de material útil; ${result.discarded} não couberam no estoque.`
    });
  } else if (activity.type === "research") {
    addEvent(state, {
      type: "researchCompleted",
      source: activity.id,
      title: "Pesquisa concluída",
      message: "A equipe concluiu a atividade de pesquisa."
    });
  }
}

function nextRandom(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState;
}

function progressActivity(state, scenario, allocation) {
  const activity = state.activeActivity;
  if (!activity) {
    return;
  }
  const definition = scenario.activities[activity.type];
  const powered = !definition.powerConsumer || allocation[definition.powerConsumer] > 0;
  if (activity.type === "rest") {
    state.team.fatigue = Math.max(0, state.team.fatigue - (scenario.rates.fatigueRest ?? 2));
  } else if (scenario.rates.fatigueWork !== undefined || activity.type === "explore" || activity.type === "research") {
    state.team.fatigue = Math.min(100, state.team.fatigue + (scenario.rates.fatigueWork ?? 1));
  }
  if (!powered) {
    addEvent(state, {
      type: "activityPaused",
      source: activity.id,
      message: "A atividade aguarda energia suficiente para continuar."
    });
    return;
  }
  activity.remainingTicks -= 1;
  if (activity.remainingTicks > 0) {
    return;
  }
  releaseReservations(state, activity.reservedResources, true, activity.type);
  applyActivityCompletion(state, scenario, activity);
  state.activeActivity = null;
  addEvent(state, {
    type: "activityCompleted",
    source: activity.id,
    activityType: activity.type,
    message: "A atividade foi concluída."
  });
}

function applyScenarioEvents(state, scenario) {
  for (const definition of scenario.events) {
    if (definition.warningAt === state.tick) {
      emitWarning(state, definition);
    }
    if (definition.startAt === state.tick) {
      startScenarioEvent(state, definition);
    }
    if (definition.endAt === state.tick) {
      endScenarioEvent(state, definition);
    }
  }
}

function runTick(state, scenario) {
  state.tick += 1;
  applyScenarioEvents(state, scenario);
  updateMessages(state, scenario);

  const powerResult = distributePower(state, scenario);
  const rates = scenario.rates;
  const waterConsumed = consumeResource(state, "waterClean", rates.teamWaterUse, "team-use");
  const returnedWater = normalizeAmount(waterConsumed * rates.usedWaterFraction);
  const waterDiscarded = normalizeAmount(waterConsumed - returnedWater);
  const returned = addResource(state, "waterUsed", returnedWater, "team-water-recovery");
  recordFlow(state, "waterLoss", waterDiscarded, "discarded", "team-water-use");
  const waterOverflow = normalizeAmount(waterDiscarded + returned.discarded);

  const foodConsumed = consumeResource(state, "food", rates.foodUse, "team-consumption");
  const oxygenConsumed = consumeResource(state, "oxygen", rates.oxygenUse, "team-consumption");
  const oxygenPower = powerResult.allocation.oxygenProduction || 0;
  let oxygenProduced = 0;
  let oxygenWaterConsumed = 0;
  if (oxygenPower > 0) {
    oxygenWaterConsumed = consumeResource(state, "waterClean", rates.oxygenWaterInput, "oxygen-production");
    if (oxygenWaterConsumed === rates.oxygenWaterInput) {
      oxygenProduced = addResource(state, "oxygen", rates.oxygenOutput, "oxygen-production").accepted;
    }
  }

  const filterPower = powerResult.allocation.airFilter || 0;
  if (filterPower > 0 && state.systems.filterCondition > 0) {
    state.systems.co2 = Math.max(0, normalizeAmount(state.systems.co2 - rates.co2Filtered));
  } else {
    state.systems.co2 = normalizeAmount(state.systems.co2 + rates.co2Output);
  }
  if (powerResult.allocation.thermal > 0) {
    state.systems.temperature = 20;
  } else if (state.systems.temperature > 10) {
    state.systems.temperature = Math.max(10, state.systems.temperature - rates.unheatedTemperatureStep);
  } else {
    state.systems.temperature = Math.min(10, state.systems.temperature + rates.unheatedTemperatureStep);
  }
  if (state.team.location === "outside") {
    const protection = state.systems.shelterProtection;
    state.team.exposure = normalizeAmount(
      state.team.exposure + rates.outsideExposure * (1 - protection)
    );
  }
  if (state.crop && state.crop.remainingTicks > 0 && (powerResult.allocation.cultivation || 0) > 0) {
    state.crop.remainingTicks -= 1;
  }

  progressActivity(state, scenario, powerResult.allocation);
  updateMessages(state, scenario);

  if (state.systems.co2 >= scenario.limits.co2Warning && !state.systems.co2WarningShown) {
    state.systems.co2WarningShown = true;
    addEvent(state, {
      type: "systemWarning",
      source: "co2",
      title: "A qualidade do ar precisa de atenção",
      message: "O CO2 está aumentando. Verifique a filtragem, mesmo que ainda haja oxigênio."
    });
  }

  updateResourceWarnings(state, scenario);

  if (waterOverflow > 0) {
    addEvent(state, {
      type: "resourceLoss",
      source: "water",
      amount: waterOverflow,
      message: "Parte da água não foi recuperada ou não coube no armazenamento."
    });
  }
  if (foodConsumed < rates.foodUse || oxygenConsumed < rates.oxygenUse) {
    addEvent(state, {
      type: "resourceWarning",
      source: foodConsumed < rates.foodUse ? "food" : "oxygen",
      message: "Uma necessidade da equipe não pôde ser totalmente atendida."
    });
  }

  updateMissionStatus(state, scenario);
}

function updateMissionStatus(state, scenario) {
  const limits = scenario.limits;
  let interruption = null;
  if (resourceAvailable(state, "oxygen") <= 0) {
    interruption = "A reserva de oxigênio terminou.";
  } else if (resourceAvailable(state, "food") <= 0) {
    interruption = "A reserva de alimento terminou.";
  } else if (state.systems.co2 >= limits.co2Critical) {
    interruption = "A qualidade do ar chegou ao limite crítico.";
  } else if (
    state.systems.temperature < limits.temperatureMin ||
    state.systems.temperature > limits.temperatureMax
  ) {
    interruption = "A temperatura interna saiu da faixa segura do cenário.";
  }

  if (interruption) {
    stopActivityAtMissionEnd(state);
    state.status = "interrupted";
    state.objectives.missionSurvived = false;
    addEvent(state, {
      type: "missionInterrupted",
      title: "Missão interrompida",
      message: interruption
    });
    addExplanation(state, {
      whatHappened: interruption,
      contributingDecisionOrCondition: "Um sistema essencial ultrapassou o limite de recuperação do cenário.",
      affectedResources: ["oxygen", "food", "waterClean", "energy"],
      availableAlternative: "Revise os avisos, prioridades e atividades antes de iniciar uma nova tentativa.",
      principle: "Sistemas conectados precisam de reservas e manutenção."
    });
  } else if (state.tick >= scenario.clock.missionDurationTicks) {
    stopActivityAtMissionEnd(state);
    state.status = "completed";
    state.objectives.missionSurvived = true;
    addEvent(state, {
      type: "missionCompleted",
      title: "Missão concluída",
      message: "A duração planejada terminou. O resumo mostra objetivos e decisões separadamente."
    });
  }
}

function updateResourceWarnings(state, scenario) {
  const threshold = scenario.limits.resourceWarningFraction;
  for (const name of ["energy", "waterClean", "oxygen", "food"]) {
    const resource = state.resources[name];
    const low = resource.amount / resource.capacity <= threshold;
    if (low && !state.resourceWarnings[name]) {
      state.resourceWarnings[name] = true;
      addEvent(state, {
        type: "resourceWarning",
        source: name,
        title: `Reserva baixa: ${name}`,
        message: "A reserva está baixa. Considere as prioridades, atividades e opções de recuperação."
      });
    } else if (!low && state.resourceWarnings[name]) {
      state.resourceWarnings[name] = false;
    }
  }
}

function stopActivityAtMissionEnd(state) {
  const activity = state.activeActivity;
  if (!activity) {
    return;
  }
  releaseReservations(state, activity.reservedResources, false);
  if (activity.type === "explore") {
    state.team.location = activity.previousLocation || "habitat";
  }
  state.activeActivity = null;
  addEvent(state, {
    type: "activityCancelled",
    source: activity.id,
    activityType: activity.type,
    message: "A atividade foi encerrada com a missão; as reservas não consumidas foram liberadas."
  });
}

function assertInvariants(state, scenario) {
  for (const [name, resource] of Object.entries(state.resources)) {
    if (
      !Number.isFinite(resource.amount) ||
      !Number.isFinite(resource.reserved) ||
      resource.amount < 0 ||
      resource.reserved < 0 ||
      resource.reserved > resource.amount + 1e-9 ||
      resource.amount > resource.capacity + 1e-9
    ) {
      throw new EngineError("INVARIANT_VIOLATION", `Estado inválido para o recurso ${name}.`);
    }
  }
  if (state.tick < 0 || !Number.isInteger(state.tick)) {
    throw new EngineError("INVARIANT_VIOLATION", "O relógio da missão é inválido.");
  }
  if (!Number.isInteger(state.rngState) || state.rngState < 0) {
    throw new EngineError("INVARIANT_VIOLATION", "O estado do gerador aleatório é inválido.");
  }
  if (!["active", "completed", "interrupted"].includes(state.status)) {
    throw new EngineError("INVARIANT_VIOLATION", "O estado da missão é inválido.");
  }
  for (const name of Object.keys(scenario.power.consumers)) {
    if (!Number.isInteger(state.priorities[name]) || state.priorities[name] < 1 || state.priorities[name] > 10) {
      throw new EngineError("INVARIANT_VIOLATION", `Prioridade inválida para ${name}.`);
    }
  }
}

function summarize(state) {
  return {
    missionId: state.missionId,
    status: state.status,
    tick: state.tick,
    objectives: clone(state.objectives),
    resources: clone(state.resources),
    explanations: clone(state.explanations),
    events: clone(state.eventHistory)
  };
}

class MissionEngine {
  constructor(scenario, state, initialState) {
    this.scenario = clone(scenario);
    this.state = clone(state);
    this.initialState = clone(initialState);
    assertInvariants(this.state, this.scenario);
  }

  static createMission(options) {
    const settings = options || {};
    const scenario = clone(settings.scenario || DEFAULT_SCENARIO);
    const seed = settings.seed === undefined ? 1 : settings.seed;
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new EngineError("INVALID_SEED", "A semente deve ser um inteiro entre 0 e 4294967295.");
    }
    const missionId = settings.missionId || `mission-${seed.toString(16).padStart(8, "0")}`;
    const state = makeInitialState({ scenario, seed, missionId });
    return new MissionEngine(scenario, state, state);
  }

  static restore(save, scenario) {
    if (
      !save ||
      save.saveFormatVersion !== SAVE_FORMAT_VERSION ||
      !save.state ||
      !save.initialState ||
      !Array.isArray(save.acceptedCommands)
    ) {
      throw new EngineError("UNSUPPORTED_SAVE", "Formato de save não suportado.");
    }
    const activeScenario = clone(scenario || DEFAULT_SCENARIO);
    if (
      save.state.scenarioId !== activeScenario.scenarioId ||
      save.state.scenarioVersion !== activeScenario.version ||
      save.state.rulesVersion !== RULES_VERSION ||
      save.initialState.scenarioId !== activeScenario.scenarioId ||
      save.initialState.scenarioVersion !== activeScenario.version ||
      save.initialState.rulesVersion !== RULES_VERSION
    ) {
      throw new EngineError("INCOMPATIBLE_SAVE", "O save exige uma versão compatível de cenário e regras.");
    }
    assertInvariants(save.initialState, activeScenario);
    return new MissionEngine(activeScenario, save.state, save.initialState);
  }

  static replay(save, scenario) {
    if (
      !save ||
      save.saveFormatVersion !== SAVE_FORMAT_VERSION ||
      !save.initialState ||
      !Array.isArray(save.acceptedCommands)
    ) {
      throw new EngineError("UNSUPPORTED_SAVE", "Formato de save não suportado.");
    }
    const engine = MissionEngine.createMission({
      scenario: scenario || DEFAULT_SCENARIO,
      seed: save.initialState.seed,
      missionId: save.initialState.missionId
    });
    for (const command of save.acceptedCommands) {
      engine.execute(command);
    }
    return engine;
  }

  getState() {
    return clone(this.state);
  }

  availableActions() {
    const actions = {};
    for (const [type, definition] of Object.entries(this.scenario.activities)) {
      const availability = isActivityAvailable(this.state, this.scenario, type);
      actions[type] = {
        enabled: availability.enabled,
        reasons: availability.reasons,
        durationTicks: definition.durationTicks,
        reservedResources: clone(definition.reserved),
        cancelable: true
      };
    }
    actions.setPowerPriorities = {
      enabled: this.state.status === "active",
      reasons: this.state.status === "active" ? [] : ["A missão não está em andamento."],
      durationTicks: 0,
      cancelable: false
    };
    actions.sendEarthMessage = {
      enabled: this.state.status === "active",
      reasons: this.state.status === "active" ? [] : ["A missão não está em andamento."],
      durationTicks:
        this.scenario.communication.outboundTicks +
        this.scenario.communication.processingTicks +
        this.scenario.communication.returnTicks,
      cancelable: false
    };
    return actions;
  }

  estimateActivity(type) {
    const definition = this.scenario.activities[type];
    if (!definition) {
      throw new EngineError("UNKNOWN_ACTIVITY", `Atividade desconhecida: ${type}`);
    }
    const availability = isActivityAvailable(this.state, this.scenario, type);
    return {
      activity: type,
      stateVersion: this.state.stateVersion,
      available: availability.enabled,
      blockers: availability.reasons,
      durationTicks: definition.durationTicks,
      durationMinutes: definition.durationTicks * this.scenario.clock.tickMinutes,
      resourcesReserved: clone(definition.reserved),
      assumptions: [
        "A estimativa considera o cenário e o estado conhecidos agora.",
        "Eventos futuros ocultos não são revelados.",
        "Falhas e resultados que usem a semente podem alterar o resultado."
      ],
      uncertainty: "A duração pode aumentar se uma atividade depender de energia indisponível."
    };
  }

  execute(command) {
    if (!command || typeof command !== "object") {
      throw new EngineError("INVALID_COMMAND", "Comando inválido.");
    }
    const { commandId, expectedStateVersion, type, payload = {} } = command;
    if (typeof commandId !== "string" || commandId.trim() === "") {
      throw new EngineError("INVALID_COMMAND", "commandId é obrigatório.");
    }
    if (!Number.isInteger(expectedStateVersion)) {
      throw new EngineError("INVALID_COMMAND", "expectedStateVersion deve ser um inteiro.");
    }
    if (typeof type !== "string") {
      throw new EngineError("INVALID_COMMAND", "O tipo do comando é obrigatório.");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new EngineError("INVALID_COMMAND", "payload deve ser um objeto.");
    }

    const signature = stableStringify({ expectedStateVersion, type, payload });
    const previous = this.state.commandResults[commandId];
    if (previous) {
      if (previous.signature !== signature) {
        throw new EngineError("IDEMPOTENCY_CONFLICT", "commandId já foi usado com outro conteúdo.");
      }
      return clone(previous.result);
    }
    if (expectedStateVersion !== this.state.stateVersion) {
      throw new EngineError("VERSION_CONFLICT", "O estado mudou. Consulte a missão e tente novamente.", {
        expected: expectedStateVersion,
        current: this.state.stateVersion
      });
    }
    if (this.state.status !== "active") {
      throw new EngineError("MISSION_NOT_ACTIVE", "A missão não está em andamento.");
    }

    const draft = clone(this.state);
    const firstNewEvent = draft.eventHistory.length;
    const result = this.applyCommand(draft, type, payload);
    draft.stateVersion += 1;
    const response = {
      commandId,
      accepted: true,
      type,
      stateVersion: draft.stateVersion,
      result,
      events: clone(draft.eventHistory.slice(firstNewEvent))
    };
    draft.acceptedCommands.push(clone(command));
    draft.commandResults[commandId] = { signature, result: clone(response) };
    assertInvariants(draft, this.scenario);
    this.state = draft;
    return clone(response);
  }

  applyCommand(state, type, payload) {
    if (type === "startActivity") {
      return this.startActivity(state, payload);
    }
    if (type === "cancelActivity") {
      return this.cancelActivity(state, payload);
    }
    if (type === "setPowerPriorities") {
      return this.setPowerPriorities(state, payload);
    }
    if (type === "advanceTime") {
      return this.advanceTime(state, payload);
    }
    if (type === "sendEarthMessage") {
      return this.sendEarthMessage(state, payload);
    }
    throw new EngineError("UNKNOWN_COMMAND", `Comando desconhecido: ${type}`);
  }

  startActivity(state, payload) {
    const type = payload.activity;
    const definition = this.scenario.activities[type];
    if (!definition) {
      throw new EngineError("UNKNOWN_ACTIVITY", `Atividade desconhecida: ${type}`);
    }
    const availability = isActivityAvailable(state, this.scenario, type);
    if (!availability.enabled) {
      throw new EngineError("ACTION_BLOCKED", availability.reasons.join(" "), {
        reasons: availability.reasons
      });
    }
    reserveResources(state, definition.reserved);
    state.activeActivity = makeActivity(state, type, definition);
    if (type === "explore") {
      state.team.location = "outside";
    }
    const record = addEvent(state, {
      type: "activityStarted",
      source: state.activeActivity.id,
      activityType: type,
      message: `Atividade iniciada; duração prevista de ${definition.durationTicks} passo(s).`
    });
    return { activityId: state.activeActivity.id, eventId: record.id };
  }

  cancelActivity(state, payload) {
    const activity = state.activeActivity;
    if (!activity || activity.id !== payload.activityId) {
      throw new EngineError("ACTIVITY_NOT_FOUND", "A atividade não está em andamento.");
    }
    releaseReservations(state, activity.reservedResources, false);
    if (activity.type === "explore") {
      state.team.location = activity.previousLocation || "habitat";
    }
    state.activeActivity = null;
    addEvent(state, {
      type: "activityCancelled",
      source: activity.id,
      activityType: activity.type,
      message: "Atividade cancelada; recursos ainda não consumidos foram liberados."
    });
    addExplanation(state, {
      whatHappened: "A atividade foi cancelada.",
      contributingDecisionOrCondition: "A equipe escolheu liberar tempo e recursos reservados.",
      affectedResources: Object.keys(activity.reservedResources),
      availableAlternative: "A atividade pode ser iniciada novamente se ainda fizer sentido.",
      principle: "Cancelar libera reservas futuras, mas não apaga efeitos já concluídos."
    });
    return { activityId: activity.id, releasedResources: clone(activity.reservedResources) };
  }

  setPowerPriorities(state, payload) {
    const priorities = payload.priorities;
    const known = Object.keys(this.scenario.power.consumers).sort();
    if (!priorities || typeof priorities !== "object") {
      throw new EngineError("INVALID_PRIORITIES", "Informe as prioridades dos consumidores.");
    }
    const supplied = Object.keys(priorities).sort();
    if (stableStringify(known) !== stableStringify(supplied)) {
      throw new EngineError("INVALID_PRIORITIES", "As prioridades devem incluir todos os consumidores conhecidos.");
    }
    for (const [name, value] of Object.entries(priorities)) {
      if (!Number.isInteger(value) || value < 1 || value > 10) {
        throw new EngineError("INVALID_PRIORITIES", `Prioridade inválida para ${name}.`);
      }
    }
    state.priorities = clone(priorities);
    addEvent(state, {
      type: "powerPrioritiesChanged",
      message: "Prioridades alteradas. Valores menores recebem energia primeiro."
    });
    return { priorities: clone(state.priorities) };
  }

  advanceTime(state, payload) {
    const ticks = payload.ticks;
    if (!Number.isInteger(ticks) || ticks < 1 || ticks > this.scenario.clock.maxAdvanceTicks) {
      throw new EngineError(
        "INVALID_TICK_COUNT",
        `ticks deve ser um inteiro entre 1 e ${this.scenario.clock.maxAdvanceTicks}.`
      );
    }
    let advanced = 0;
    for (; advanced < ticks && state.status === "active"; advanced += 1) {
      runTick(state, this.scenario);
    }
    return {
      requestedTicks: ticks,
      advancedTicks: advanced,
      tick: state.tick,
      status: state.status
    };
  }

  sendEarthMessage(state, payload) {
    if (typeof payload.text !== "string" || payload.text.trim() === "") {
      throw new EngineError("INVALID_MESSAGE", "A mensagem precisa ter texto.");
    }
    if (payload.text.length > 500) {
      throw new EngineError("INVALID_MESSAGE", "A mensagem não pode ultrapassar 500 caracteres.");
    }
    const timing = this.scenario.communication;
    const id = `message-${String(state.nextMessageNumber).padStart(4, "0")}`;
    state.nextMessageNumber += 1;
    const outboundArrivesAt = state.tick + timing.outboundTicks;
    const responseReadyAt = outboundArrivesAt + timing.processingTicks;
    const deliveryDueAt = responseReadyAt + timing.returnTicks;
    const message = {
      id,
      text: payload.text.trim(),
      sentAtTick: state.tick,
      outboundArrivesAt,
      responseReadyAt,
      deliveryDueAt,
      deliveredAtTick: null,
      status: "outbound",
      snapshot: {
        co2: state.systems.co2,
        filterCondition: state.systems.filterCondition,
        waterClean: state.resources.waterClean.amount,
        food: state.resources.food.amount
      },
      response: null,
      deliveryRecorded: false
    };
    state.messages.push(message);
    addEvent(state, {
      type: "messageSent",
      source: id,
      message: `Pedido enviado. A resposta não pode chegar antes do passo ${deliveryDueAt}.`
    });
    return { messageId: id, estimatedDeliveryTick: deliveryDueAt };
  }

  getSummary() {
    return summarize(this.state);
  }

  save() {
    return {
      saveFormatVersion: SAVE_FORMAT_VERSION,
      scenarioId: this.scenario.scenarioId,
      scenarioVersion: this.scenario.version,
      rulesVersion: RULES_VERSION,
      initialState: clone(this.initialState),
      state: clone(this.state),
      acceptedCommands: clone(this.state.acceptedCommands)
    };
  }
}

const api = {
  EngineError,
  MissionEngine,
  RULES_VERSION,
  SAVE_FORMAT_VERSION
};
if (typeof module === "object" && module.exports) module.exports = api;
else root.LifeEngine = api;
})(globalThis);
