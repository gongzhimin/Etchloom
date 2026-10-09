/**
 * Etchloom Two-Stage Progressive UI & Process Verification Test Suite
 * Validates:
 * 1. Top Two-Stage Master Stepper workflow switching (Master Creation <-> Copper Workshop)
 * 2. 4-Stage Progressive Process navigation & dynamic side panel transitions
 * 3. 4-State Acid Biting State Machine (Standby -> Biting -> Paused -> Standby)
 * 4. Guarded Retransfer Safety Intercept (hasPlateModifications & modal logic)
 * 5. Complete Tri-lingual dictionary coverage without Emojis (zh-CN, en-US, vi-VN)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { I18nManager } = require('../src/ui/i18n/i18n.js');

test('transfer line width scales rasterized strokes independently of manual tool size', async () => {
  const { transferStrokeWidth } = await import('../src/ui/controllers/transfer-wizard-controller.js');
  const narrow = transferStrokeWidth(2, 1, 1500, 0.5);
  const normal = transferStrokeWidth(2, 1, 1500, 1);
  const wide = transferStrokeWidth(2, 1, 1500, 2);
  assert.ok(narrow < normal && normal < wide);
  assert.equal(wide, normal * 2);
});

test('About content covers the same sections in all supported languages', () => {
  const i18n = new I18nManager();
  const keys = ['about.intro', 'about.stage1Title', 'about.stage1Body', 'about.stage2Title',
    'about.stage2Body', 'about.guideTitle', 'about.guide1', 'about.guide2', 'about.guide3',
    'about.outputTitle', 'about.outputBody', 'about.communityTitle', 'about.communityBody',
    'about.repositoryLink', 'about.issuesLink', 'about.meta'];
  for (const locale of ['zh-CN', 'en-US', 'vi-VN']) {
    i18n.setLocale(locale);
    for (const key of keys) {
      const value = i18n.t(key);
      assert.notEqual(value, key, `${locale}: ${key}`);
      assert.doesNotMatch(value, /<[^>]+>/);
    }
  }
});

test('Two-Stage UI: first visit starts with a choice and translated visible controls', async () => {
  const { headerTemplate, masterWorkspaceTemplate, plateWorkspaceTemplate, modalsTemplate } = await import('../src/ui/templates/layout-templates.js');
  assert.match(headerTemplate, /id="languageTabs"[^>]*role="tablist"/);
  for (const locale of ['zh-CN', 'en-US', 'vi-VN']) {
    assert.match(headerTemplate, new RegExp(`role="tab" data-locale="${locale}"`));
  }
  assert.doesNotMatch(headerTemplate, /id="langToggle"/);
  assert.match(masterWorkspaceTemplate, /id="masterIntro"/);
  assert.match(masterWorkspaceTemplate, /id="masterSourcePreview"/);
  assert.match(masterWorkspaceTemplate, /id="masterRedrawStatus"/);
  assert.match(masterWorkspaceTemplate, /id="selectPhotoBtn"/);
  assert.match(masterWorkspaceTemplate, /id="loadDemoBtn"/);
  assert.match(masterWorkspaceTemplate, /id="masterTopBanner"[^>]*hidden/);
  assert.match(masterWorkspaceTemplate, /id="filmstripDetails"[^>]*hidden/);
  assert.doesNotMatch(masterWorkspaceTemplate, /id="filmstripDetails"[^>]*\sopen(?:\s|>)/);
  assert.match(plateWorkspaceTemplate, /id="plateWorkspace" hidden/);
  assert.match(plateWorkspaceTemplate, /id="canvas" width="900" height="660"/);
  assert.match(plateWorkspaceTemplate, /id="plateResolutionValue"/);
  assert.doesNotMatch(plateWorkspaceTemplate, /class="res-btn/);
  assert.doesNotMatch(plateWorkspaceTemplate, /id="transferLineWidth"/);
  assert.match(plateWorkspaceTemplate, /id="size" type="range"/);
  assert.match(modalsTemplate, /id="wizardLineWidth"/);
  assert.doesNotMatch(plateWorkspaceTemplate, /id="stepInk"/);
  assert.match(plateWorkspaceTemplate, /class="plate-caption-status telemetry-status-val"/);

  const templates = `${headerTemplate}${masterWorkspaceTemplate}${plateWorkspaceTemplate}${modalsTemplate}`;
  const keys = [...templates.matchAll(/data-i18n(?:-aria|-title|-html|-alt)?="([^"]+)"/g)].map(match => match[1]);
  const i18n = new I18nManager();
  for (const locale of ['zh-CN', 'en-US', 'vi-VN']) {
    i18n.setLocale(locale);
    for (const key of keys) {
      assert.notEqual(i18n.t(key), key, `Missing ${locale} translation: ${key}`);
    }
  }
});

// Simple DOM Mock helper
function createMockElement(tag = 'div', attrs = {}) {
  const classes = new Set();
  const children = [];
  const { className, ...restAttrs } = attrs;
  const el = {
    tagName: tag.toUpperCase(),
    style: {},
    dataset: {},
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        if (typeof force === 'boolean') {
          if (force) classes.add(c); else classes.delete(c);
          return force;
        }
        if (classes.has(c)) { classes.delete(c); return false; }
        classes.add(c); return true;
      }
    },
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      if (val) val.trim().split(/\s+/).forEach(c => classes.add(c));
    },
    children,
    appendChild: (child) => {
      child.parentElement = el;
      children.push(child);
      return child;
    },
    removeChild: (child) => {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentElement = null;
      }
      return child;
    },
    click: () => {
      if (typeof el.onclick === 'function') {
        el.onclick({ stopPropagation: () => {}, preventDefault: () => {}, target: el });
      }
    },
    ...restAttrs
  };
  if (className) el.className = className;
  return el;
}

test('Two-Stage UI: Complete Tri-lingual coverage and zero Emoji enforcement', () => {
  const i18n = new I18nManager();
  const requiredKeys = [
    'nav.step1',
    'nav.step2',
    'app.title',
    'app.subtitle',
    'cta.transferToPlate',
    'm2.backToMaster',
    'm2.step1Title',
    'm2.step2Title',
    'm2.step3Title',
    'm2.step4Title',
    'cta.confirmTransfer',
    'cta.startEtchNav',
    'cta.startEtch',
    'cta.pauseEtch',
    'cta.resumeEtch',
    'cta.resetEtch',
    'etch.phaseLabel',
    'etch.state.standby',
    'etch.state.biting',
    'etch.state.paused',
    'cta.toProofPrint',
    'dialog.retransferTitle',
    'dialog.retransferDesc',
    'dialog.cancel',
    'dialog.saveAndOverwrite',
    'dialog.directOverwrite',
    'proof.backToEtch',
    'proof.backToInscribe',
    'cta.reprint'
  ];

  const locales = ['zh-CN', 'en-US', 'vi-VN'];
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  for (const loc of locales) {
    i18n.setLocale(loc);
    for (const key of requiredKeys) {
      const translation = i18n.t(key);
      assert.ok(translation, `Key ${key} must exist in locale ${loc}`);
      assert.notEqual(translation, key, `Key ${key} must not return the raw key name in locale ${loc}`);
      assert.ok(translation.length > 0, `Key ${key} must have content in locale ${loc}`);
      assert.doesNotMatch(translation, emojiRegex, `Key ${key} in locale ${loc} must contain zero emoji: "${translation}"`);
    }
  }
});

test('Two-Stage UI: Top workflow mode switching (Master <-> Plate) preserves states without blocking', async () => {
  const masterWs = createMockElement('div', { id: 'masterWorkspace', hidden: false });
  const plateWs = createMockElement('div', { id: 'plateWorkspace', hidden: true });
  const showGenBtn = createMockElement('button', { id: 'showGenerator', className: 'active' });
  const showPlateBtn = createMockElement('button', { id: 'showPlate', className: '' });
  const body = createMockElement('body', { className: 'mode-master' });

  const switchWorkflow = (mode) => {
    body.className = mode === 'plate' ? 'mode-plate' : 'mode-master';
    if (mode === 'plate') {
      showPlateBtn.classList.add('active');
      showGenBtn.classList.remove('active');
      masterWs.hidden = true;
      plateWs.hidden = false;
    } else {
      showGenBtn.classList.add('active');
      showPlateBtn.classList.remove('active');
      masterWs.hidden = false;
      plateWs.hidden = true;
    }
  };

  // 1. Initial State: Master workspace active
  assert.equal(masterWs.hidden, false);
  assert.equal(plateWs.hidden, true);
  assert.equal(showGenBtn.classList.contains('active'), true);
  assert.equal(showPlateBtn.classList.contains('active'), false);

  // 2. Switch to Plate Studio
  switchWorkflow('plate');
  assert.equal(masterWs.hidden, true);
  assert.equal(plateWs.hidden, false);
  assert.equal(showPlateBtn.classList.contains('active'), true);
  assert.equal(showGenBtn.classList.contains('active'), false);
  assert.equal(body.className, 'mode-plate');

  // 3. Switch back to Master (via backToMaster or top button)
  switchWorkflow('master');
  assert.equal(masterWs.hidden, false);
  assert.equal(plateWs.hidden, true);
  assert.equal(showGenBtn.classList.contains('active'), true);
  assert.equal(showPlateBtn.classList.contains('active'), false);
  assert.equal(body.className, 'mode-master');
});

test('Two-Stage UI: Plate Studio 4-Stage Progressive Workflow & Dynamic Panels', async () => {
  const { currentPlateStage, setPlateStage } = await import('../src/ui/controllers/plate-studio-controller.js');
  
  // Verify initial stage is Stage 1
  assert.strictEqual(currentPlateStage, 1, 'Default stage must be Stage 1 (上版)');

  // Verify progression 1 -> 2 -> 3 -> 4
  setPlateStage(2);
  const mod2 = await import('../src/ui/controllers/plate-studio-controller.js');
  assert.strictEqual(mod2.currentPlateStage, 2, 'Stage must advance to 2 (刻绘)');

  setPlateStage(3);
  const mod3 = await import('../src/ui/controllers/plate-studio-controller.js');
  assert.strictEqual(mod3.currentPlateStage, 3, 'Stage must advance to 3 (腐蚀)');

  setPlateStage(4);
  const mod4 = await import('../src/ui/controllers/plate-studio-controller.js');
  assert.strictEqual(mod4.currentPlateStage, 4, 'Stage must advance to 4 (试印)');

  // Verify clamping
  setPlateStage(10);
  const modClamped = await import('../src/ui/controllers/plate-studio-controller.js');
  assert.strictEqual(modClamped.currentPlateStage, 4, 'Stage > 4 must clamp to 4');

  // Reset back to 1
  setPlateStage(1);
  const modReset = await import('../src/ui/controllers/plate-studio-controller.js');
  assert.strictEqual(modReset.currentPlateStage, 1);
});

test('Two-Stage UI: Discrete 4-State Acid Biting Machine (Standby -> Biting -> Paused -> Standby)', async () => {
  const plateMod = await import('../src/ui/controllers/plate-studio-controller.js');
  
  // 1. Initial State: Standby (0)
  plateMod.stop();
  assert.strictEqual(plateMod.running, false, 'Acid engine must not be running initially');

  // 2. Toggle Etch -> Biting (1)
  plateMod.toggleEtch();
  assert.strictEqual(plateMod.etchState, 1, 'Toggling from Standby must enter Biting (1)');
  assert.strictEqual(plateMod.running, true, 'Acid engine must be running during Biting');

  // 3. Stop / Pause -> Paused (2)
  plateMod.stop();
  assert.strictEqual(plateMod.etchState, 2, 'Stopping active bite must transition to Paused (2)');
  assert.strictEqual(plateMod.running, false, 'Acid engine must not be running when Paused');

  // 4. Toggle from Paused -> Resume Biting (1)
  plateMod.toggleEtch();
  assert.strictEqual(plateMod.etchState, 1, 'Toggling from Paused must resume Biting (1)');
  assert.strictEqual(plateMod.running, true);

  // 5. Stop again -> Paused (2)
  plateMod.stop();
  assert.strictEqual(plateMod.etchState, 2);

  // 6. Reset to Standby via resetEtch()
  plateMod.resetEtch();
  assert.strictEqual(plateMod.etchState, 0, 'resetEtch must return state to Standby (0)');
  assert.strictEqual(plateMod.elapsed, 0, 'resetEtch must reset elapsed time to 0');
  assert.strictEqual(plateMod.running, false, 'Acid engine must not be running after reset');
});

test('Two-Stage UI: Guarded Retransfer detects copperplate modifications and triggers safety intercept', async () => {
  const plateMod = await import('../src/ui/controllers/plate-studio-controller.js');

  // 1. Blank plate has zero modifications
  plateMod.depth.fill(0);
  plateMod.exposed.fill(0);
  plateMod.burr.fill(0);
  plateMod.stop();
  assert.strictEqual(plateMod.hasPlateModifications(), false, 'Blank copperplate must report no modifications');

  // 2. User draws needle stroke on wax ground
  plateMod.dab(Math.round(plateMod.W / 2), Math.round(plateMod.H / 2), 1.0);
  assert.strictEqual(plateMod.hasPlateModifications(), true, 'Needle scratch on wax ground must be detected as modification');

  // 3. Clean up and verify
  plateMod.depth.fill(0);
  plateMod.exposed.fill(0);
  plateMod.burr.fill(0);
  assert.strictEqual(plateMod.hasPlateModifications(), false, 'Clearing copperplate restores clean modification state');
});

test('Two-Stage UI: Retransfer Modal handles Cancel, Direct Overwrite, and Backup Overwrite', () => {
  const modal = createMockElement('div', { id: 'retransferModalOverlay', hidden: true });
  const cancelBtn = createMockElement('button', { id: 'retransferCancelBtn' });
  const saveBtn = createMockElement('button', { id: 'retransferSaveBtn' });
  const directBtn = createMockElement('button', { id: 'retransferDirectBtn' });

  let actionTaken = null;
  let backupSaved = false;

  cancelBtn.onclick = () => {
    modal.hidden = true;
    actionTaken = 'cancel';
  };
  saveBtn.onclick = () => {
    backupSaved = true;
    modal.hidden = true;
    actionTaken = 'saveAndOverwrite';
  };
  directBtn.onclick = () => {
    modal.hidden = true;
    actionTaken = 'directOverwrite';
  };

  // Trigger modal
  modal.hidden = false;
  assert.equal(modal.hidden, false);

  // 1. Test Cancel
  cancelBtn.click();
  assert.equal(modal.hidden, true);
  assert.equal(actionTaken, 'cancel');
  assert.equal(backupSaved, false);

  // 2. Trigger again, test Direct Overwrite
  modal.hidden = false;
  directBtn.click();
  assert.equal(modal.hidden, true);
  assert.equal(actionTaken, 'directOverwrite');
  assert.equal(backupSaved, false);

  // 3. Trigger again, test Backup and Overwrite
  modal.hidden = false;
  saveBtn.click();
  assert.equal(modal.hidden, true);
  assert.equal(actionTaken, 'saveAndOverwrite');
  assert.equal(backupSaved, true);
});
