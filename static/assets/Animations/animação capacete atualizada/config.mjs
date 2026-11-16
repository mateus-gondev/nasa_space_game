// Dados puros da animação. Mexa aqui para trocar textos, tempos, sons e cores.

export const DURATION = 14;   // segundos (a animação termina e dispara onComplete)
export const FPS = 15;        // passo de renderização "8-bit" (só renderiza quando o passo muda)

// Marcos da coreografia (s). Cada fase vai de um marco ao próximo.
export const T = {
  pick: 1.2,       // 0 → pick: pega e levanta o capacete
  spin: 3.0,       // pick → spin: gira o capacete 360° nas mãos
  tip: 4.0,        // spin → tip: inclina para olhar por dentro
  flipStart: 4.6,  // tip → flipStart: pausa olhando o interior
  flipEnd: 5.7,    // flipStart → flipEnd: vira e ergue acima da cabeça
  seat: 6.8,       // flipEnd → seat: desce sobre a cabeça; no final, flash e visor
};

// [tempo, texto] — legenda inferior (o último item com t >= tempo vence)
export const CAPTIONS = [
  [0, 'VOCE PEGA O CAPACETE'],
  [1.2, 'INSPECIONANDO...'],
  [3.0, 'POR DENTRO...'],
  [4.6, 'LEVANTANDO...'],
  [5.7, 'ENCAIXANDO'],
  [6.8, ''],
];

// [tempo, texto] — linhas do HUD, na ordem em que aparecem dentro do visor
export const HUD = [
  [7.9, 'SELANDO TRAJE...'],
  [8.9, 'PRESSAO .... OK'],
  [9.8, 'O2 ........ 100%'],
  [10.8, 'BOA MISSAO!'],
];

// [tempo, frequência Hz, duração s] — bipes de onda quadrada
export const BEEPS = [
  [1.0, 330, 0.1],
  [3.0, 260, 0.08],
  [4.6, 220, 0.1],
  [5.7, 180, 0.1],
  [6.8, 90, 0.25],
  [7.9, 880, 0.08],
  [8.9, 880, 0.08],
  [9.8, 880, 0.08],
  [10.8, 1320, 0.2],
];

// Paleta (mesmas cores do original 2D)
export const PAL = {
  void: 0x05060f,
  wall: 0x1a2040,
  panel: 0x262e55,
  panelEdge: 0x3c4770,
  floor: 0x161a33,
  grid: 0x232a52,
  base: 0x4a5580,
  rimOuter: 0x3c4770,
  rimInner: 0x8c96b5,
  tableBody: 0x2f3860,
  tableTop: 0x5a6798,
  orange: 0xff8a3d,
  orangeDim: 0x5a2f1a,
  outline: 0x2a3350,
  interior: 0x151a36,
  shell: 0xaab3c8,
  white: 0xe8ecf4,
  steel: 0x8c96b5,
  glove: 0xc9d0e0,
  knuckle: 0x7a85a6,
  visorRim: 0x1b1f3a,
  gold: 0xd9a441,
  goldLow: 0xb9772a,
  cream: 0xfff3c4,
  land: 0x3d8a4f,
  sea: 0x2c6fbb,
  atmo: 0x7fc7ff,
  starA: 0xffffff,
  starB: 0x8c96b5,
};
