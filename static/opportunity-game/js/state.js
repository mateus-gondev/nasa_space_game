export const $ = (selector) => document.querySelector(selector);
export const cv = $('#c');
export const g = cv.getContext('2d');

export let W;
export let H;

function rs() {
  const ratio = devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;

  cv.width = W * ratio;
  cv.height = H * ratio;
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
}

addEventListener('resize', rs);
rs();

const hx = (color) => [1, 3, 5].map((index) => parseInt(color.substr(index, 2), 16));

export const mx = (startColor, endColor, amount) => {
  const from = hx(startColor);
  const to = hx(endColor);

  return `rgb(${from.map((value, index) => value + ((to[index] - value) * amount) | 0)})`;
};

export const PAL = [
  ['#b8683f', '#e8b48a'],
  ['#c9805a', '#efc9a0'],
  ['#9c5a3c', '#d9a074'],
];

export const DEF = () => ({
  mode: 'drive',
  x: 0,
  max: 2000,
  sol: 1,
  loc: '',
  energy: 100,
  dust: 0,
  pal: 1,
  locked: false,
  busy: false,
  talk: false,
  special: null,
  obj: null,
  oi: 0,
  onObj: null,
  trap: 0,
  exitAt: 0,
  exitFn: null,
  spd: 2.4,
  goal: '',
  vis: 0,
  sink: 0,
  f1: 0,
  f2: 0,
  f3: 0,
});

export const S = DEF();
export const K = {};
export const B = {};

