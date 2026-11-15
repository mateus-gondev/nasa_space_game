/* Progresso por ações reais; não depende da interface ou da engine. */
window.LabTutorial = class LabTutorial {
  constructor() { this.reset(); }

  reset() {
    this.phase = "intro";
    this.distance = 0;
    this.completedTools ??= new Set();
    this.completedTools.clear();
    this.mapOpened = false;
    this.inventoryOpened = false;
    this.report = null;
  }

  equip() {
    if (this.phase === "intro") this.phase = "movement";
    this.distance = 0;
  }

  move(distance, room) {
    if (distance <= 0 || distance > 1) return; // Teleportes não contam como caminhada.
    if (this.phase === "movement" || this.phase === "gravityWalk") {
      this.distance += distance;
      if (this.distance >= (this.phase === "movement" ? 4 : 6)) {
        this.phase = this.phase === "movement" ? "map" : "lab";
        this.distance = 0;
      }
    } else if (this.phase === "lab" && room === "Atrium") this.phase = "camera";
  }

  map(open) {
    if (this.phase !== "map") return;
    if (open) this.mapOpened = true;
    else if (this.mapOpened) this.phase = "gravity";
  }

  inventory(open) {
    if (this.phase !== "inventory") return;
    if (open) this.inventoryOpened = true;
    else if (this.inventoryOpened) this.phase = "communication";
  }

  interact(id, tool) {
    if (this.phase === "communication" && id === "communication" && this.completedTools.size === 4) {
      this.report = "Quatro instrumentos verificados; fotografia, textura, leitura térmica e rególito registrados. Objetivo: manter a base, investigar evidências e recuperar arquivos históricos MER-B em uma expedição fictícia.";
      this.phase = "ship";
      return true;
    }
    if (this.phase === "gravity" && id === "gravity") {
      this.phase = "gravityWalk";
      this.distance = 0;
      return true;
    }
    const steps = ["camera", "microscope", "temperature", "drill"];
    const index = steps.indexOf(this.phase);
    if (index >= 0 && id === this.phase && tool === index + 1) {
      this.completedTools.add(tool);
      this.phase = steps[index + 1] || "inventory";
      return true;
    }
    if (this.phase === "ship" && id === "ship") {
      this.phase = "launch";
      return true;
    }
    return false;
  }

  finishLaunch() {
    if (this.phase !== "launch") return false;
    this.phase = "complete";
    return true;
  }

  leaveLaunchRoom() {
    if (this.phase === "launch") this.phase = "ship";
  }

  get targetId() {
    if (this.phase === "map") return "gravity";
    if (this.phase === "lab") return "camera";
    return ["gravity", "camera", "microscope", "temperature", "drill", "communication", "ship"].includes(this.phase) ? this.phase : null;
  }

  get step() {
    const steps = {
      movement: ["01 / 10 · MOVIMENTO", "Primeiros passos", "Use W, A, S, D ou as setas para caminhar. Percorra 4 metros de treino para calibrar o traje.", "W A S D"],
      map: ["02 / 10 · NAVEGAÇÃO", "Localize a antena", "Pressione M ou toque em Mapa. O alvo âmbar indica a Antena de Alto Ganho. Feche o mapa para seguir.", "M"],
      gravity: ["03 / 10 · GRAVIDADE", "Antena de Alto Ganho", "Siga a trilha luminosa até a antena. Aproxime-se do contorno âmbar e pressione E para ativar a simulação.", "E"],
      gravityWalk: ["03 / 10 · GRAVIDADE", "Sinta a gravidade de Marte", "Simulação de baixa gravidade ativada. Caminhe por 6 metros de treino e observe os passos flutuantes do traje.", "W A S D"],
      lab: ["04 / 10 · LABORATÓRIO", "Vá ao laboratório de treinamento", "Saia pela porta oeste e siga a trilha até a sala ao lado. Lá estão as quatro estações científicas. M mostra o percurso completo.", "W A S D · M"],
      camera: ["05 / 10 · CÂMERA CIENTÍFICA", "Fotografe terrenos e materiais", "Aproxime-se do alvo destacado e pressione 1 para abrir a visão 3D. Arraste para mirar no terreno simulado e pressione E ou Fotografar para guardar a imagem. Esc volta ao mapa.", "1 → MIRAR → E"],
      microscope: ["06 / 10 · MICROSCÓPIO PORTÁTIL", "Analise uma amostra", "Siga até a amostra destacada. Pressione 2 para equipar o microscópio e E para observar os detalhes do material.", "2 → E"],
      temperature: ["07 / 10 · SENSOR DE TEMPERATURA", "Meça a temperatura de um sólido", "Aproxime-se da rocha marcada. Pressione 3 para equipar o sensor e E para registrar a leitura térmica.", "3 → E"],
      drill: ["08 / 10 · FURADEIRA DE AMOSTRAS", "Extraia material do solo", "Vá à estação de solo marcada. Pressione 4 para equipar a furadeira e E para extrair uma amostra de rególito.", "4 → E"],
      inventory: ["09 / 10 · MOCHILA", "Confira seus resultados", "Pressione Tab ou toque em Mochila. Os quatro slots abrem no centro da tela. Confira os registros e feche a mochila para avançar.", "TAB"],
      communication: ["RELATÓRIO · COMUNICAÇÃO", "Envie o relatório de treinamento", "Siga a trilha até o terminal de comunicação e pressione E. NOVA reunirá os quatro registros e enviará seu briefing: sustentar a base e recuperar arquivos históricos do Opportunity em uma expedição fictícia.", "E"],
      ship: ["10 / 10 \u00b7 LAN\u00c7AMENTO", "Entre na sala de lan\u00e7amento", "Siga a trilha at\u00e9 o Rover Bay e atravesse a porta da sala MARS 01. L\u00e1 dentro, inicie o lan\u00e7amento do foguete 3D.", "W A S D"],
      launch: ["10 / 10 \u00b7 LAN\u00c7AMENTO", "Lance o MARS 01", "Use Iniciar lan\u00e7amento e acompanhe o voo para concluir o treinamento.", "LAN\u00c7AR"],
      complete: ["TREINAMENTO CONCLUÍDO", "Vamos para Marte!", "Excelente trabalho, cadete. Você concluiu os módulos básicos de treinamento. Agora é hora da sua primeira missão. Vamos para Marte!", ""]
    };
    const step = steps[this.phase];
    return step && { label: step[0], title: step[1], description: step[2], key: step[3] };
  }
};
