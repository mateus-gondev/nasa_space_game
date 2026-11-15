const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPreferences({ menu = false, saved = {} } = {}) {
  const storage = new Map([['opportunity.labTraining.settings', JSON.stringify(saved)]]);
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
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    MutationObserver: class { observe() {} },
    CustomEvent: class {}, console,
  });
  for (const file of ['i18n.js', 'preferences.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/lab_training/js', file), 'utf8'), context);
  }
  return { context, nodes, storage };
}

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
    'temperature', 'drill', 'inventory', 'ship', 'launch', 'complete']) {
    tutorial.phase = phase;
    for (const field of ['title', 'description']) {
      assert.notEqual(context.window.GameI18n.t(tutorial.step[field]), tutorial.step[field], `${phase}: ${field}`);
    }
  }
});
