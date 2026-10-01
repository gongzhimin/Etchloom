const { test } = require('node:test');
const assert = require('node:assert/strict');
const { I18nManager } = require('../src/ui/i18n/i18n.js');
const { AppStore } = require('../src/ui/store/app-store.js');

test('I18nManager: Translation and Locale Switching', () => {
  const i18n = new I18nManager('zh-CN');
  assert.equal(i18n.getLocale(), 'zh-CN');
  assert.equal(i18n.t('app.title'), 'Etchloom · 数字古典版画工坊');
  assert.equal(i18n.t('tool.needle'), '蚀刻针 (Needle)');
  assert.equal(i18n.t('sec.3.acid'), '酸液浓度强度');

  // Toggle locale to en-US
  i18n.toggleLocale();
  assert.equal(i18n.getLocale(), 'en-US');
  assert.equal(i18n.t('app.title'), 'Etchloom · Digital Printmaking Studio');
  assert.equal(i18n.t('tool.needle'), 'Etching Needle');
  assert.equal(i18n.t('sec.3.acid'), 'Acid Strength');

  // Fallback for nonexistent key
  assert.equal(i18n.t('nonexistent.key', 'Default Fallback'), 'Default Fallback');
});

test('I18nManager: DOM Data Attribute Binding', () => {
  const i18n = new I18nManager('en-US');

  const titleEl = { dataset: { i18n: 'app.title' }, textContent: '' };
  const inputEl = { dataset: { i18nPlaceholder: 'sec.0.upload' }, placeholder: '' };

  const fakeDocument = {
    querySelectorAll: (selector) => {
      if (selector === '[data-i18n]') return [titleEl];
      if (selector === '[data-i18n-placeholder]') return [inputEl];
      return [];
    }
  };

  i18n.bindDom(fakeDocument);
  assert.equal(titleEl.textContent, 'Etchloom · Digital Printmaking Studio');
  assert.equal(inputEl.placeholder, 'Upload Photo');
});

test('AppStore: State mutations and listener notifications', () => {
  const store = new AppStore();
  const state = store.getState();
  assert.equal(state.locale, 'zh-CN');
  assert.equal(state.recipe.density, 50);

  const notifications = [];
  const unsubscribe = store.subscribe((st, action) => {
    notifications.push(action);
  });

  store.dispatch({ type: 'SET_RECIPE_PARAM', key: 'density', value: 85 });
  assert.equal(store.getState().recipe.density, 85);

  store.dispatch({ type: 'UPDATE_RUNTIME', payload: { status: 'COMPUTING', progress: 45 } });
  assert.equal(store.getState().runtime.status, 'COMPUTING');
  assert.equal(store.getState().runtime.progress, 45);

  store.dispatch({ type: 'FOCUS_STEP', index: 3 });
  assert.equal(store.getState().stepFlow.activeStepIndex, 3);

  store.dispatch({ type: 'TOGGLE_LOUPE' });
  assert.equal(store.getState().stepFlow.loupeActive, true);

  assert.equal(notifications.length, 4);
  unsubscribe();

  store.dispatch({ type: 'TOGGLE_LOUPE' });
  assert.equal(notifications.length, 4); // No new notification after unsubscribe
});
