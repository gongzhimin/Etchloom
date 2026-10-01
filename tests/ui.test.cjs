const { test } = require('node:test');
const assert = require('node:assert/strict');
const { I18nManager } = require('../src/ui/i18n/i18n.js');
const { AppStore } = require('../src/ui/store/app-store.js');

test('I18nManager: Translation and Locale Switching (zh-CN -> en-US -> vi-VN)', () => {
  const i18n = new I18nManager('zh-CN');
  assert.equal(i18n.getLocale(), 'zh-CN');
  assert.equal(i18n.t('app.title'), 'Etchloom · 数字古典版画工坊');
  assert.equal(i18n.t('tool.needle'), '蚀刻针 (Needle)');
  assert.equal(i18n.t('sec.3.acid'), '酸液浓度');

  // Toggle locale to en-US
  i18n.toggleLocale();
  assert.equal(i18n.getLocale(), 'en-US');
  assert.equal(i18n.t('app.title'), 'Etchloom · Digital Printmaking Studio');
  assert.equal(i18n.t('tool.needle'), 'Etching Needle');
  assert.equal(i18n.t('sec.3.acid'), 'Acid Strength');

  // Toggle locale to vi-VN
  i18n.toggleLocale();
  assert.equal(i18n.getLocale(), 'vi-VN');
  assert.equal(i18n.t('app.title'), 'Etchloom · Xưởng in tranh khắc kim loại số');
  assert.equal(i18n.t('tool.needle'), 'Kim khắc axít (Needle)');
  assert.equal(i18n.t('sec.3.acid'), 'Nồng độ dung dịch axít');
  assert.equal(i18n.t('stepper.transfer'), 'Lên bản');

  // Toggle locale back to zh-CN
  i18n.toggleLocale();
  assert.equal(i18n.getLocale(), 'zh-CN');
  assert.equal(i18n.t('app.title'), 'Etchloom · 数字古典版画工坊');

  // Direct setLocale and parameter substitution
  i18n.setLocale('vi-VN');
  assert.equal(i18n.t('plate.gauge', ['1.5', '24.0']), 'Ăn mòn 1.5s · Sâu 24.0μm');

  // Fallback for nonexistent key
  assert.equal(i18n.t('nonexistent.key', 'Default Fallback'), 'Default Fallback');
});

test('I18nManager: DOM Data Attribute Binding across Locales', () => {
  const i18n = new I18nManager('vi-VN');

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
  assert.equal(titleEl.textContent, 'Etchloom · Xưởng in tranh khắc kim loại số');
  assert.equal(inputEl.placeholder, 'Tải ảnh lên');
});

test('I18nManager: Vietnamese vocabulary integrity and completeness', () => {
  const i18n = new I18nManager('vi-VN');
  assert.equal(i18n.getLocale(), 'vi-VN');

  // Verify all 7 steps have authentic Vietnamese translations
  for (let s = 0; s <= 6; s++) {
    const key = `step.${s}.title`;
    const translation = i18n.t(key);
    assert.ok(translation && translation.length > 0 && translation !== key, `Step ${s} translation missing`);
  }

  // Verify all 4 orthogonal tools
  assert.equal(i18n.t('tool.needle'), 'Kim khắc axít (Needle)');
  assert.equal(i18n.t('tool.dry'), 'Kim khắc khô (Drypoint)');
  assert.equal(i18n.t('tool.stop'), 'Sơn phủ chống axít');
  assert.equal(i18n.t('tool.polish'), 'Dao mài bóng (Burnisher)');

  // Verify 4 frames
  assert.equal(i18n.t('frame.double'), 'Khung cổ điển hai lớp');
  assert.equal(i18n.t('frame.fine'), 'Khung viền mảnh tinh tế');
  assert.equal(i18n.t('frame.rough'), 'Khung thô khắc tay mộc mạc');
  assert.equal(i18n.t('frame.none'), 'Không khung viền');

  // Verify 5 stepper stages
  assert.equal(i18n.t('stepper.transfer'), 'Lên bản');
  assert.equal(i18n.t('stepper.inscribe'), 'Khắc nét');
  assert.equal(i18n.t('stepper.etch'), 'Ăn mòn');
  assert.equal(i18n.t('stepper.ink'), 'Thấm mực');
  assert.equal(i18n.t('stepper.print'), 'In thử');
});

test('I18nManager: URL parameter query resolution', () => {
  const origWindow = globalThis.window;
  try {
    globalThis.window = {
      location: { search: '?lang=vi' }
    };
    const i18nVi = new I18nManager('zh-CN');
    assert.equal(i18nVi.getLocale(), 'vi-VN');

    globalThis.window = {
      location: { search: '?locale=en-US' }
    };
    const i18nEn = new I18nManager('zh-CN');
    assert.equal(i18nEn.getLocale(), 'en-US');

    globalThis.window = {
      location: { search: '?lang=zh' }
    };
    const i18nZh = new I18nManager('en-US');
    assert.equal(i18nZh.getLocale(), 'zh-CN');
  } finally {
    globalThis.window = origWindow;
  }
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
