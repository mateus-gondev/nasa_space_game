/*
 * DADOS DO MAPA
 * Coordenadas são medidas em tiles. Um tile equivale a 40 pixels por padrão.
 * Para adicionar um objeto: inclua um item em props usando addProp().
 */
window.MAP_DATA = (() => {
  const { columns: W, rows: H } = window.MAP_ENGINE_CONFIG.grid;
  const grid = Array.from({ length: H }, () => Array(W).fill(0));
  const floorMap = Array.from({ length: H }, () => Array(W).fill(0));

  function room(x1, y1, x2, y2, floorType = 0) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const isBorder = x === x1 || x === x2 || y === y1 || y === y2;
        grid[y][x] = isBorder ? 1 : 2;
        if (!isBorder) floorMap[y][x] = floorType;
      }
    }
  }

  // Planta-base: corredor central e seis áreas conectadas.
  room(0, 8, 27, 11, 0);
  room(0, 0, 11, 8, 3);
  room(11, 0, 27, 8, 1);
  room(0, 11, 12, 17, 2);
  room(12, 11, 19, 17, 0);
  room(19, 11, 27, 17, 2);

  const doors = [[11, 4], [6, 8], [19, 8], [6, 11], [15, 11], [23, 11], [12, 14], [19, 14]]
    .map(([x, y]) => {
      grid[y][x] = 3;
      floorMap[y][x] = 0;
      return { x, y, openness: 0, vertical: grid[y - 1][x] === 1 && grid[y + 1][x] === 1 };
    });

  const props = [];
  function addProp(type, x, y, w, h, name, description, options = {}) {
    props.push({ type, x, y, w, h, name, description, solid: true, ...options });
  }

  const supplyDescription = "Caixa lacrada para amostras, ferramentas e alvos de calibração, identificada para uso da equipe de missão.";
  addProp("screen", 2, 1, 7, 1, "Painel de Operações", "Painel de telemetria: trajetória, intensidade do sinal e orçamento de energia da missão.");
  [2, 5, 8].forEach(x => addProp("console", x, 3, 2, 1, "Console de Controle", "Estação de trabalho usada para acompanhar a saúde do rover e preparar comandos da missão."));
  addProp("shelf", 1, 5, 1, 2, "Arquivo da Missão", "Documentos de missão, estudos do local de pouso e planos de atividades diárias.");
  addProp("telescope", 14, 1, 2, 2, "Pancam — Câmera Panorâmica", "Conjunto de câmeras panorâmicas montadas em um mastro, usado para registrar imagens e observar o terreno.");
  addProp("spec", 17, 1, 2, 2, "Espectrômetro APXS", "O Alpha Particle X-ray Spectrometer analisa a composição elementar de rochas e do solo.", { label: "APXS" });
  addProp("spec", 20, 1, 2, 2, "Espectrômetro Mössbauer", "Instrumento usado para identificar minerais que contêm ferro e estudar seu estado de oxidação.", { label: "MB" });
  addProp("dish", 24, 1, 3, 3, "Antena de Alto Ganho", "Antena direcionável para comunicação direta com a Terra. Parte dos dados também era retransmitida por sondas em órbita.");
  addProp("bench", 14, 5, 6, 1, "Bancada de Laboratório", "Área de preparação de amostras e calibração de instrumentos.");
  addProp("micro", 22, 5, 1, 1, "Microscopic Imager", "Câmera microscópica usada para registrar detalhes de rochas e do solo.");
  addProp("globe", 24, 5, 1, 1, "Globo de Marte", "O rover Opportunity pousou em Meridiani Planum, próximo ao equador marciano, em janeiro de 2004.");
  addProp("crate", 12, 6, 2, 1, "Caixa de Suprimentos", supplyDescription);
  addProp("rover", 4, 13, 4, 3, "Modelo de Testes do Rover", "Modelo de engenharia do veículo: seis rodas, mastro de câmeras e braço robótico com instrumentos de contato.");
  addProp("crate", 1, 12, 2, 1, "Caixa de Suprimentos", supplyDescription);
  addProp("crate", 9, 12, 2, 1, "Caixa de Suprimentos", supplyDescription);
  addProp("cart", 9, 15, 2, 1, "Carrinho de Ferramentas", "Ferramentas de montagem, chaves de torque e cabos usados na manutenção dos equipamentos.");
  addProp("shelf", 13, 12, 2, 1, "Prateleiras de Armazenamento", "Peças sobressalentes, filtros e kits de instrumentos protegidos.");
  addProp("shelf", 17, 12, 2, 1, "Prateleiras de Armazenamento", "Peças sobressalentes, filtros e kits de instrumentos protegidos.");
  addProp("crate", 13, 16, 2, 1, "Caixa de Suprimentos", supplyDescription);
  addProp("crate", 17, 16, 2, 1, "Caixa de Suprimentos", supplyDescription);
  addProp("crate", 16, 15, 1, 1, "Caixa de Suprimentos", supplyDescription);
  addProp("crate", 24, 9, 2, 1, "Caixa de Suprimentos", supplyDescription);
  addProp("crate", 1, 10, 2, 1, "Caixa de Suprimentos", supplyDescription);
  addProp("solar", 20, 12, 3, 2, "Painel Solar", "O Opportunity era alimentado por energia solar. O acúmulo de poeira reduzia a geração, enquanto ventos ocasionais limpavam os painéis.");
  addProp("rtg", 24, 12, 2, 2, "Unidade de Demonstração RTG", "Demonstração genérica de um gerador termoelétrico de radioisótopos. O Opportunity utilizava painéis solares, não um RTG.");
  addProp("rack", 21, 16, 3, 1, "Rack de Servidores", "Equipamentos de armazenamento de dados e infraestrutura de sequenciamento de comandos.");
  addProp("tank", 25, 15, 2, 2, "Cilindro de Nitrogênio", "Cilindro pressurizado de demonstração para sistemas de purga e limpeza de equipamentos.");
  props.sort((a, b) => a.y + a.h - (b.y + b.h));

  const roomLabels = [
    { text: "MISSION CONTROL", x: 2, y: 0 }, { text: "INSTRUMENT LAB", x: 14, y: 0 },
    { text: "TRANSIT", x: 1.2, y: 8 }, { text: "RESEARCH WING", x: 12, y: 8 },
    { text: "SERVICE WING", x: 21, y: 8 }, { text: "ROVER BAY", x: 1.5, y: 11 },
    { text: "STORAGE", x: 16, y: 11 }, { text: "POWER", x: 20.2, y: 11 }
  ];
  const lights = [[3,0],[7,0],[15,0],[19,0],[23,0],[3,8],[9,8],[15,8],[23,8],[3,11],[9,11],[17,11],[22,11],[26,11]];
  const decals = [[9.5,.6],[22.5,.6],[9.8,11.6],[13.7,11.6],[25.4,11.6]];
  const destinations = [
    { name: "Mission Control", x: 6, y: 5 }, { name: "Instrument Lab", x: 13, y: 4 },
    { name: "Rover Bay", x: 9.5, y: 13.5 }, { name: "Storage", x: 15.5, y: 14 },
    { name: "Power", x: 23.5, y: 14.5 }
  ];

  return { width: W, height: H, grid, floorMap, doors, props, roomLabels, lights, decals, destinations };
})();
