const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPreferences({ menu = false, saved } = {}) {
  const storage = new Map();
  if (saved !== undefined) storage.set('opportunity.labTraining.settings', JSON.stringify(saved));
  const nodes = new Map();
  function element() {
    return {
      value: '', hidden: false, dataset: {}, listeners: new Map(),
      style: { setProperty() {} },
      addEventListener(type, listener) { this.listeners.set(type, listener); },
      querySelectorAll() { return []; },
      setAttribute() {},
    };
  }
  if (menu) {
    for (const id of ['settingsDialog', 'openSettings', 'closeSettings', 'mainMenuOverlay',
      'musicVolume', 'musicVolumeValue', 'gameVolume', 'gameVolumeValue', 'subtitlesEnabled', 'gameLanguage']) {
      nodes.set('#' + id, element());
    }
    nodes.set('#menuMusic', {
      paused: true,
      play() { this.paused = false; return Promise.resolve(); },
      pause() { this.paused = true; },
    });
  }
  const context = vm.createContext({
    window: { addEventListener() {}, dispatchEvent() {} },
    document: {
      documentElement: { dataset: {} }, hidden: false,
      querySelector: selector => nodes.get(selector) || null,
      querySelectorAll: () => [], addEventListener() {},
    },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    MutationObserver: class { observe() {} },
    CustomEvent: class {}, console,
  });
  for (const file of ['i18n.js', 'preferences.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/lab_training/js', file), 'utf8'), context);
  }
  return { context, nodes, storage };
}

test('English is selected on first launch and a saved Portuguese choice takes precedence', () => {
  const { context, nodes, storage } = loadPreferences({ menu: true });
  const input = nodes.get('#gameLanguage');
  assert.equal(input.value, 'en');
  assert.equal(context.document.documentElement.lang, 'en');

  input.value = 'pt-BR';
  input.listeners.get('change')({ target: input });
  assert.equal(context.document.documentElement.lang, 'pt-BR');

  const saved = JSON.parse(storage.get('opportunity.labTraining.settings'));
  const reloaded = loadPreferences({ menu: true, saved });
  assert.equal(reloaded.nodes.get('#gameLanguage').value, 'pt-BR');
  assert.equal(reloaded.context.document.documentElement.lang, 'pt-BR');
});

test('training loads shared preferences without requiring the menu DOM or restarting menu music', () => {
  const { context } = loadPreferences({ saved: { language: 'en', subtitles: false, musicVolume: 35, gameVolume: 0 } });
  assert.equal(context.document.documentElement.lang, 'en');
  assert.equal(context.document.documentElement.dataset.subtitles, 'off');
  assert.equal(context.window.GameI18n.t('Volume da música'), 'Music Volume');
  assert.equal(context.window.GamePreferences.get().gameVolume, 0);
  assert.doesNotThrow(() => context.window.GamePreferences.syncMusic());
});

test('independent menu restores settings and saves volume changes for the next training document', () => {
  const { context, nodes, storage } = loadPreferences({ menu: true, saved: { musicVolume: 35, gameVolume: 80 } });
  assert.equal(nodes.get('#gameLanguage').value, 'en');
  const music = nodes.get('#menuMusic');
  assert.equal(music.volume, .35);
  const input = nodes.get('#musicVolume');
  input.value = '0';
  input.listeners.get('input')({ target: input });
  assert.equal(music.paused, true);
  assert.equal(JSON.parse(storage.get('opportunity.labTraining.settings')).musicVolume, 0);
  assert.equal(context.window.GamePreferences.get().gameVolume, 80);
  const training = loadPreferences({ saved: JSON.parse(storage.get('opportunity.labTraining.settings')) });
  assert.equal(training.context.window.GamePreferences.get().musicVolume, 0);
});

test('all guided tutorial briefings remain translated with the saved English setting', () => {
  const { context } = loadPreferences({ saved: { language: 'en' } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/lab_training/js/tutorial.js'), 'utf8'), context);
  const tutorial = new context.window.LabTutorial();
  for (const phase of ['movement', 'map', 'gravity', 'gravityWalk', 'lab', 'camera', 'microscope',
    'temperature', 'drill', 'inventory', 'communication', 'ship', 'launch', 'complete']) {
    tutorial.phase = phase;
    for (const field of ['title', 'description']) {
      assert.notEqual(context.window.GameI18n.t(tutorial.step[field]), tutorial.step[field], `${phase}: ${field}`);
    }
  }
});

test('inventory reads live HUD meters after their accessible labels are translated', () => {
  const { context, nodes } = loadPreferences({ saved: { language: 'en' } });
  const values = [0, 37.5, 90, 100];
  const labels = ['Oxigênio', 'Água', 'Energia', 'Alimentação'];
  const inventoryRows = labels.map(sourceLabel => ({
    dataset: { sourceLabel },
    value: {}, meter: { setAttribute(name, value) { this[name] = value; } }, fill: { style: {} },
    querySelector(selector) {
      return selector === '.inventory-vital-value' ? this.value : selector === '.inventory-vital-track' ? this.meter : this.fill;
    },
  }));
  const hudRows = labels.map((source, index) => ({
    querySelector() {
      return { getAttribute(name) {
        if (name === 'data-i18n-aria-label') return source;
        if (name === 'aria-label') return context.window.GameI18n.t(source);
        if (name === 'aria-valuenow') return String(values[index]);
        return null;
      } };
    },
  }));
  nodes.set('#hudCadetName', { textContent: 'Cadet Nova' });
  nodes.set('#hudLocation', { textContent: 'Instrument Lab' });
  nodes.set('#inventoryCadetName', {});
  nodes.set('#inventoryLocation', {});
  nodes.set('#inventoryAstronaut', { setAttribute() {} });
  context.document.querySelectorAll = selector => selector.startsWith('#inventoryVitals') ? inventoryRows : hudRows;
  context.$ = context.document.querySelector;
  context.t = context.window.GameI18n.t;
  const errors = [];
  context.console = { error: message => errors.push(message) };
  const source = fs.readFileSync(path.join(__dirname, '../static/lab_training/js/app.js'), 'utf8');
  vm.runInContext(source.slice(source.indexOf('  function renderInventoryOverview()'), source.indexOf('  const inventoryHudObserver')), context);
  context.renderInventoryOverview();
  assert.deepEqual(errors, []);
  assert.equal(nodes.get('#inventoryCadetName').textContent, 'Cadet Nova');
  assert.equal(nodes.get('#inventoryLocation').textContent, 'Instrument Lab');
  inventoryRows.forEach((row, index) => {
    assert.equal(row.value.textContent, `${values[index]}%`);
    assert.equal(row.meter['aria-valuenow'], String(values[index]));
    assert.equal(row.fill.style.width, `${values[index]}%`);
  });
});
