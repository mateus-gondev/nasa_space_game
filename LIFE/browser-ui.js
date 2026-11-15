"use strict";
window.LifeUI = {
  async mount({ game, isSuspended }) {
    const panel = document.querySelector("#lifePanel");
    const open = document.querySelector("#lifeOpen");
    const message = panel.querySelector("#lifeMessage");
    const speechHost = message.parentElement;
    const speechAnchor = message.nextSibling;
    const assistant = window.NovaAssistant?.create({ compact: true, textNode: message, translate: window.GameI18n?.t });
    if (assistant) speechHost.insertBefore(assistant.element, speechAnchor);
    function speak(text, mood) { if (assistant) assistant.say(text, { mood }); else message.textContent = text; }
    speak("Vamos cuidar da equipe? Escolha uma ação e confira as reservas.");
    const storageKey = "nasaJourney.life.management.v1";
    const names = { waterClean: "Água limpa", waterUsed: "Água usada", oxygen: "Oxigênio", food: "Alimento", energy: "Energia", fatigue: "Fadiga", co2: "CO₂", seeds: "Sementes", materials: "Materiais", repairParts: "Peças" };
    const labels = { explore: "Explorar", research: "Pesquisar", buildShelter: "Construir abrigo", transferToShelter: "Ir ao abrigo", repairFilter: "Reparar filtro", plant: "Plantar", harvest: "Colher", recycleWater: "Reciclar água", rest: "Descansar" };
    const consumers = { lifeSupport: "Suporte de vida", airFilter: "Filtro de ar", oxygenProduction: "Produção de O₂", thermal: "Controle térmico", cultivation: "Cultivo", research: "Pesquisa", waterRecycler: "Reciclagem" };
    const number = value => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
    const colors = { waterClean: "#539cff", oxygen: "#50d8f2", food: "#ffb365", energy: "#ffe174", fatigue: "#c6a1ff" };
    const svgNS = "http://www.w3.org/2000/svg";
    function element(tag, className, text) {
      const node = document.createElement(tag);
      node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function bar(percent, label) {
      const track = element("div", "life-reserve-bar");
      track.setAttribute("role", "meter"); track.setAttribute("aria-label", label);
      track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", "100"); track.setAttribute("aria-valuenow", Math.round(percent));
      const fill = element("span", ""); fill.style.width = `${Math.max(0, Math.min(100, percent))}%`; track.append(fill);
      return track;
    }
    function chart(key, state, capacity) {
      // Reconstruct actual balances from the existing ledger; no forecast or extra simulation.
      let amount = manager.engine.initialState.resources[key].amount;
      const balances = [amount];
      const changes = new Map();
      for (const flow of state.resourceLedger) {
        if (flow.resource !== key) continue;
        const delta = flow.direction === "produced" ? flow.amount : flow.direction === "consumed" || key === "energy" && flow.direction === "discarded" ? -flow.amount : 0;
        changes.set(flow.tick, (changes.get(flow.tick) || 0) + delta);
      }
      for (let tick = 1; tick <= state.tick; tick++) { amount += changes.get(tick) || 0; balances.push(amount); }
      const start = Math.max(0, balances.length - 25);
      const samples = balances.slice(start);
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 260 64"); svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", `${names[key]}: histórico real dos passos ${start} a ${state.tick}, de ${number(samples[0])} a ${number(samples.at(-1))} unidades. Escala de 0 a ${capacity}.`);
      for (const y of [8, 32, 56]) {
        const line = document.createElementNS(svgNS, "path"); line.setAttribute("d", `M4 ${y} H256`); line.setAttribute("class", "life-chart-grid"); svg.append(line);
      }
      const points = samples.map((value, index) => `${4 + index / Math.max(1, samples.length - 1) * 252},${56 - Math.max(0, Math.min(1, value / capacity)) * 48}`);
      const line = document.createElementNS(svgNS, "polyline"); line.setAttribute("points", points.join(" ")); line.setAttribute("class", "life-chart-line"); svg.append(line);
      const dot = document.createElementNS(svgNS, "circle"); const [cx, cy] = points.at(-1).split(","); dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3"); svg.append(dot);
      return svg;
    }
    let manager;
    let previousFocus;
    let wasMovementEnabled = false;
    let background = [];
    let frameId;
    let lastTime = game.elapsed;
    let lastSaved = "";
    function persist() {
      try {
        const serialized = JSON.stringify(manager.save());
        if (serialized !== lastSaved) { localStorage.setItem(storageKey, serialized); lastSaved = serialized; }
      } catch { speak("Não foi possível salvar a gestão neste navegador.", "warning"); }
    }
    function close() {
      panel.hidden = true;
      assistant?.hide();
      for (const [element, inert] of background) element.inert = inert;
      background = [];
      open.setAttribute("aria-expanded", "false");
      game.controls.movementEnabled = wasMovementEnabled;
      game.controls.keys.clear();
      previousFocus?.focus();
      lastTime = game.elapsed;
    }
    open.addEventListener("click", () => {
      if (!panel.hidden) return close();
      previousFocus = document.activeElement;
      wasMovementEnabled = game.controls.movementEnabled;
      game.controls.movementEnabled = false;
      game.controls.keys.clear();
      panel.hidden = false;
      assistant?.say(message.textContent);
      background = [...panel.parentElement.children].filter(element => element !== panel).map(element => [element, element.inert]);
      for (const [element] of background) element.inert = true;
      open.setAttribute("aria-expanded", "true");
      panel.querySelector("#lifeClose").focus();
      if (manager) render();
    });
    panel.querySelector("#lifeClose").addEventListener("click", close);
    panel.addEventListener("keydown", event => {
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const nodes = [...panel.querySelectorAll("button:not(:disabled),select:not(:disabled),summary")].filter(node => node.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    panel.addEventListener("keyup", event => event.stopPropagation());

    function render() {
      const { state, indicators, warnings, actions } = manager.snapshot();
      const editable = manager.active && state.status === "active";
      panel.querySelector("#lifeClock").textContent = `${manager.active ? "Gestão ativada" : "Treinamento protegido"} · Passo ${state.tick}/${manager.scenario.clock.missionDurationTicks} · ${manager.scenario.clock.tickMinutes} min simulados a cada ${manager.settings.secondsPerTick}s de jogo`;
      panel.querySelector("#lifeActivate").hidden = manager.active;
      const status = document.querySelector("#lifeStatus");
      status.textContent = !manager.active ? "TREINO" : state.status === "completed" ? "CONCLUÍDA" : state.status === "interrupted" ? "INTERROMPIDA" : warnings.length ? "ATENÇÃO" : "NOMINAL";
      status.dataset.warning = String(warnings.length > 0 || state.status === "interrupted");
      const meters = [...document.querySelectorAll(".hud-vitals .vital-track")];
      ["oxygen", "waterClean", "food", "energy", "fatigue"].forEach((key, index) => {
        const percent = key === "fatigue" ? state.team.fatigue : indicators[key].percent;
        const meter = meters[index];
        meter.setAttribute("aria-valuenow", String(Math.round(percent)));
        meter.querySelector("span").style.width = `${percent}%`;
        meter.closest(".vital-item").querySelector("strong").textContent = `${Math.round(percent)}%`;
      });
      const list = panel.querySelector("#lifeResources");
      list.replaceChildren();
      for (const key of ["waterClean", "oxygen", "food", "energy"]) {
        const resource = indicators[key], trend = resource.net;
        const card = element("article", "life-resource-card"); card.style.setProperty("--resource-color", colors[key]);
        card.dataset.low = String(warnings.includes(key));
        const heading = element("div", "life-resource-heading"); heading.append(element("h4", "", names[key]), element("strong", "", `${Math.round(resource.percent)}%`));
        const quantity = element("p", "life-quantity", `${number(resource.amount)} / ${number(resource.capacity)} un.`);
        const change = element("p", "life-change", trend === null ? "• Aguardando primeiro passo" : `${trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} ${trend > 0 ? "+" : ""}${number(trend)} un. no último passo`);
        change.dataset.direction = trend > 0 ? "up" : trend < 0 ? "down" : "flat";
        card.append(heading, quantity, bar(resource.percent, names[key]), change, chart(key, state, resource.capacity), element("small", "life-chart-caption", state.tick ? "Histórico real · últimos 24 passos · escala 0–100%" : "O histórico aparece conforme você joga"), element("small", "life-reserved", `${warnings.includes(key) ? "⚠ Reserva baixa · " : ""}Reservado: ${number(resource.reserved)} un.`));
        list.append(card);
      }
      const supplies = element("div", "life-supplies");
      for (const key of ["waterUsed", "seeds", "materials", "repairParts"]) {
        const resource = state.resources[key];
        const item = element("div", ""); item.append(element("span", "", names[key]), element("strong", "", `${number(resource.amount)} / ${resource.capacity}`), element("small", "", `Reservado: ${number(resource.reserved)}`)); supplies.append(item);
      }
      list.append(supplies);
      panel.querySelector("#lifeAlerts").textContent = [
        ...warnings.map(key => key === "fatigue" ? "Fadiga alta: programe descanso." : key === "co2" ? "CO₂ alto: verifique o filtro e sua energia." : `${names[key]} em nível baixo.`),
        ...Object.entries(state.power.lastAllocation).filter(([, amount]) => amount === 0).map(([key]) => `${consumers[key]} sem energia no último passo: revise prioridades e reservas.`),
        state.eventHistory.at(-1)?.message || "",
        state.status === "interrupted" ? "A gestão foi interrompida. O tutorial continua disponível; use Nova gestão para tentar novamente." : state.status === "completed" ? "Ciclo de gestão concluído. Você pode iniciar uma nova gestão." : ""
      ].filter(Boolean).join(" ") || "Sem alertas.";
      const systems = panel.querySelector("#lifeSystems"); systems.replaceChildren();
      const fatigue = element("article", "life-system-card"); fatigue.style.setProperty("--resource-color", colors.fatigue);
      fatigue.append(element("h4", "", "Fadiga da equipe"), element("strong", "life-system-value", `${state.team.fatigue}%`), bar(state.team.fatigue, "Fadiga da equipe"), element("small", "", state.team.fatigue >= manager.settings.fatigueWarning ? "⚠ Alta · programe descanso" : "Quanto menor, mais descansada a equipe"));
      systems.append(fatigue);
      for (const [title, value, hint] of [
        ["Qualidade do ar", `${number(state.systems.co2)} CO₂`, `Alerta a partir de ${manager.scenario.limits.co2Warning} · filtro ${Math.round(state.systems.filterCondition * 100)}%`],
        ["Geração solar", `${number(state.power.lastGeneration)} un.`, "Energia produzida no último passo"],
        ["Cultivo", state.crop ? state.crop.failed ? "Perdido" : state.crop.remainingTicks === 0 ? "Pronto para colher" : `${state.crop.remainingTicks} passos` : "Sem plantio", "Plantar → crescer → colher"]
      ]) {
        const card = element("article", "life-system-card"); card.append(element("h4", "", title), element("strong", "life-system-value", value), element("small", "", hint)); systems.append(card);
      }
      const activity = state.activeActivity;
      if (activity) {
        const total = manager.scenario.activities[activity.type].durationTicks;
        const card = element("article", "life-system-card life-current-activity"); card.style.setProperty("--resource-color", "#50d8f2");
        card.append(element("h4", "", `Em andamento · ${labels[activity.type]}`), bar((total - activity.remainingTicks) / total * 100, "Progresso da atividade"), element("small", "", `${activity.remainingTicks} de ${total} passos restantes · avança ao fechar o painel`)); systems.append(card);
      }
      for (const [type, button] of Object.entries(activityButtons)) {
        const action = actions[type];
        const cost = Object.entries(action.reservedResources).map(([key, amount]) => `${amount} ${names[key] || key}`).join(", ") || "sem consumíveis reservados";
        const power = manager.scenario.activities[type].powerConsumer;
        const detail = button.nextElementSibling;
        detail.textContent = `${action.durationTicks} passos · ${cost}${power ? ` · energia por passo: ${manager.scenario.power.consumers[power].demand}` : ""}. ${action.reasons.join(" ")}`;
        button.disabled = !editable || !action.enabled;
      }
      panel.querySelector("#lifeCancel").disabled = !editable || !state.activeActivity;
      panel.querySelector("#lifePrioritiesApply").disabled = !editable;
      for (const [key, select] of Object.entries(priorityInputs)) {
        select.disabled = !editable;
        if (document.activeElement !== select && !select.dataset.dirty) select.value = state.priorities[key];
      }
    }

    const activityButtons = {};
    const priorityInputs = {};
    function execute(type, payload) {
      try {
        manager.command(type, payload);
        speak("Pronto! Feche o painel para continuar a aventura.", "success");
        persist(); render();
        if (document.activeElement === document.body || document.activeElement?.disabled) panel.querySelector("#lifeClose").focus();
      } catch (error) { speak(error.message, "warning"); render(); }
    }
    try {
      const fetchJSON = async url => { const response = await fetch(url); if (!response.ok) throw new Error(`Não foi possível carregar ${url}`); return response.json(); };
      const [base, settings] = await Promise.all([fetchJSON("/life/scenario-mars.json"), fetchJSON("/life/management-config.json")]);
      const { LifeManagement, createManagementScenario } = window.LifeManagement;
      const scenario = createManagementScenario(base, settings);
      let saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { speak("Não deu para abrir o progresso. Preparei um novo treino.", "warning"); }
      try { manager = new LifeManagement(scenario, settings, saved); }
      catch { manager = new LifeManagement(scenario, settings); speak("Este progresso é de outra versão. Preparei um novo treino.", "warning"); }
      for (const [type, label] of Object.entries(labels)) {
        const row = document.createElement("div"), button = document.createElement("button"), detail = document.createElement("small");
        button.type = "button"; button.textContent = label;
        button.addEventListener("click", () => execute("startActivity", { activity: type }));
        row.append(button, detail); panel.querySelector("#lifeActivities").append(row); activityButtons[type] = button;
      }
      for (const key of Object.keys(scenario.power.consumers)) {
        const label = document.createElement("label"), select = document.createElement("select");
        label.append(document.createTextNode(consumers[key]));
        for (let value = 1; value <= 10; value++) { const option = document.createElement("option"); option.value = value; option.textContent = value; select.append(option); }
        select.addEventListener("change", () => { select.dataset.dirty = "true"; });
        label.append(select); panel.querySelector("#lifePriorities").append(label); priorityInputs[key] = select;
      }
      panel.querySelector("#lifeActivate").addEventListener("click", () => { manager.active = true; speak("Tudo ligado! Feche o painel para começar a cuidar das reservas.", "success"); persist(); render(); panel.querySelector("#lifeClose").focus(); });
      panel.querySelector("#lifeNew").addEventListener("click", () => {
        manager = new LifeManagement(scenario, settings); lastTime = game.elapsed;
        for (const select of Object.values(priorityInputs)) delete select.dataset.dirty;
        speak("Novo treino pronto! As reservas só começam a baixar quando você ativar."); persist(); render();
      });
      panel.querySelector("#lifeCancel").addEventListener("click", () => execute("cancelActivity", { activityId: manager.engine.getState().activeActivity?.id }));
      panel.querySelector("#lifePrioritiesApply").addEventListener("click", () => {
        execute("setPowerPriorities", { priorities: Object.fromEntries(Object.entries(priorityInputs).map(([key, select]) => [key, Number(select.value)])) });
        for (const select of Object.values(priorityInputs)) delete select.dataset.dirty;
      });
      render();
      lastTime = game.elapsed;
      function frame() {
        const now = game.elapsed;
        const changed = manager.advance(Math.max(0, now - lastTime), game.paused || document.hidden || !panel.hidden || isSuspended());
        lastTime = now;
        if (changed) { render(); persist(); }
        frameId = requestAnimationFrame(frame);
      }
      frame();
      const save = () => persist();
      window.addEventListener("pagehide", save);
      document.addEventListener("visibilitychange", () => { lastTime = game.elapsed; if (document.hidden) persist(); });
      window.lifeManagement = { getState: () => manager.engine.getState(), save: () => manager.save() };
    } catch (error) {
      speak("Não consegui abrir os cuidados da base. Você pode continuar o treinamento.", "warning");
      open.disabled = false;
      cancelAnimationFrame(frameId);
    }
  }
};
