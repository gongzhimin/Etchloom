(function(root) {
  'use strict';

/**
 * Internationalization (i18n) Engine & Bilingual Dictionary
 * Zero external dependencies, pure lightweight lookup and DOM binding.
 */
const DICTIONARY = {
  'zh-CN': {
    'app.title': 'Etchloom · 数字古典版画工坊',
    'app.subtitle': '数字版画工坊',
    'tab.master': '母版设计',
    'tab.plate': '虚拟铜版',
    'lang.toggle': 'English',
    'action.exportScheme': '导出配置',
    'action.about': '关于',
    'step.0.title': '原图输入',
    'step.1.title': '线描感知',
    'step.2.title': '等高流场',
    'step.3.title': '透视轮廓',
    'step.4.title': '曲面排线',
    'step.5.title': '母版合成',
    'step.6.title': '纯棉印样',
    'step.intro': '点击卡片可全屏特写或独立导出图层。',
    'card.cached': '缓存命中',
    'card.computing': '计算中...',
    'card.loupe': '局部放大',
    'card.fullscreen': '全屏特写',
    'card.download': '导出',
    'sec.0.title': '00 / 图像感知',
    'sec.0.upload': '载入照片',
    'sec.0.lotus': '3D几何增强',
    'sec.0.exposure': '曝光度',
    'sec.0.black': '黑场',
    'sec.0.white': '白场',
    'sec.1.title': '01 / 空间轮廓',
    'sec.1.contour': '轮廓密度',
    'sec.1.aerial': '透视强度',
    'sec.2.title': '02 / 曲面排线',
    'sec.2.hatch': '排线密度',
    'sec.2.cross': '交叉排线',
    'sec.2.gate': '曲率门控',
    'sec.3.title': '03 / 铜版工坊',
    'tool.needle': '蚀刻针 (Needle)',
    'tool.dry': '干刻针',
    'tool.stop': '防蚀漆',
    'tool.polish': '刮磨器',
    'sec.3.acid': '酸液浓度强度',
    'sec.3.grain': '金相颗粒',
    'sec.3.startAcid': '开始腐蚀',
    'sec.3.stopAcid': '停止腐蚀',
    'sec.3.ink': '油墨饱满',
    'sec.3.pressure': '压印压力',
    'sec.3.plateTone': '留墨调子',
    'sec.3.paper': '纸张材质',
    'paper.rough': '暖白粗纹棉纸',
    'paper.smooth': '象牙白细纹纸',
    'sec.3.print': '取一张印样',
    'status.ready': '就绪',
    'status.running': '正在执行仿真咬蚀...',
    'status.aborted': '已更新任务',
    'status.idle': '空闲',
    'status.loaded': '虚拟版已载入',
    'status.loadFailed': '打开失败',
    'status.demoLoaded': '静物练习版已就绪',
    'status.needSwitchView': '切换到铜版或刻深图继续制版',
    'action.undo': '撤销刻线',
    'action.clear': '清空版面',
    'action.save': '保存虚拟版',
    'action.load': '打开虚拟版',
    'action.demo': '载入静物练习版',
    'view.plate': '虚拟铜版',
    'view.depth': '刻深图',
    'view.print': '压印预览',
    'sec.1.width': '轮廓刀宽',
    'sec.3.size': '工具直径',
    'sec.3.irreversible': '不可逆模式',
    'action.transferToPlate': '雕刻至铜版 →',
    'telemetry.status': '状态',
    'telemetry.task': '活跃任务',
    'telemetry.duration': '总耗时',
    'telemetry.strokes': '矢量线条',
    'telemetry.cache': '拓扑缓存命中',
    'console.title': '运行日志',
    'caption.plate': '针尖划开保护层，等待酸液咬蚀',
    'caption.depth': '刻槽深度分布',
    'caption.print': '纯棉纸凹版镜像压印',
    'caption.timer': '腐蚀累计',
    'wizard.title': '母版图稿上版向导'
  },
  'en-US': {
    'app.title': 'Etchloom · Digital Printmaking Studio',
    'app.subtitle': 'Physical Simulation & Copperplate Intaglio Studio',
    'tab.master': 'Algorithm Master',
    'tab.plate': 'Virtual Plate Studio',
    'lang.toggle': '中文',
    'action.exportScheme': 'Export Recipe',
    'action.about': 'About Atelier',
    'step.0.title': 'Original Input Photo',
    'step.1.title': 'Informative Line Extraction',
    'step.2.title': '3D Cross-Contour Flow',
    'step.3.title': 'Aerial Perspective Contours',
    'step.4.title': 'Curvature-Gated Hatching',
    'step.5.title': 'Master Print Vector Synthesis',
    'step.6.title': 'Virtual Plate & Debossed Print',
    'step.intro': 'Complete printmaking master synthesized across 5 geometric stages. Click any card to inspect or export.',
    'card.cached': 'Cached',
    'card.computing': 'Computing...',
    'card.loupe': 'Loupe Magnifier',
    'card.fullscreen': 'Fullscreen',
    'card.download': 'Export Layer',
    'sec.0.title': '00 / Input & 3D Perception',
    'sec.0.upload': 'Upload Photo',
    'sec.0.lotus': 'Lotus 3D Geometry Enhancement',
    'sec.0.exposure': 'Exposure',
    'sec.0.black': 'Black Point',
    'sec.0.white': 'White Point',
    'sec.1.title': '01 / Contours & Aerial Perspective',
    'sec.1.contour': 'Contour Density',
    'sec.1.aerial': 'Aerial Perspective Strength',
    'sec.1.width': 'Contour Stroke Width',
    'sec.2.title': '02 / 3D Curvature Hatching',
    'sec.2.hatch': 'Hatching Density',
    'sec.2.cross': 'Cross Hatching',
    'sec.2.gate': 'Curvature Gate Threshold',
    'sec.3.title': '03 / Virtual Plate & Press',
    'tool.needle': 'Etching Needle',
    'tool.dry': 'Drypoint Needle',
    'tool.stop': 'Stop-out Varnish',
    'tool.polish': 'Burnisher',
    'sec.3.size': 'Tool Diameter',
    'sec.3.acid': 'Acid Strength',
    'sec.3.grain': 'Acid Grain Noise',
    'sec.3.startAcid': 'Start Acid Bite',
    'sec.3.stopAcid': 'Stop Acid Bite',
    'sec.3.irreversible': 'Irreversible (Clear Undo)',
    'sec.3.ink': 'Ink Load',
    'sec.3.pressure': 'Press Pressure',
    'sec.3.plateTone': 'Plate Tone (Wiping)',
    'sec.3.paper': 'Rag Paper Substrate',
    'paper.rough': 'Warm White Rough Rag Paper',
    'paper.smooth': 'Ivory Smooth Cotton Paper',
    'sec.3.print': 'Pull a Print',
    'status.ready': 'Ready · Carve the first line on plate',
    'status.running': 'Simulating physical acid bite...',
    'status.aborted': 'Cancelled & updated to latest input',
    'status.idle': 'Idle',
    'status.loaded': 'Virtual plate loaded',
    'status.loadFailed': 'Load failed',
    'status.demoLoaded': 'Still life practice plate · Ready for carving or acid bite',
    'status.needSwitchView': 'Switch to plate or depth view to continue carving',
    'action.undo': 'Undo',
    'action.clear': 'Clear Plate',
    'action.save': 'Save Plate',
    'action.load': 'Open Plate',
    'action.demo': 'Load Still Life Plate',
    'view.plate': 'Copper Plate',
    'view.depth': 'Groove Depth',
    'view.print': 'Paper Print',
    'action.transferToPlate': 'Engrave to Virtual Plate →',
    'telemetry.status': 'Status',
    'telemetry.task': 'Active Task',
    'telemetry.duration': 'Total Elapsed',
    'telemetry.strokes': 'Vector Strokes',
    'telemetry.cache': 'Topology Cache Hit',
    'console.title': 'Atelier Activity Log',
    'caption.plate': 'Plate / Needle scratches ground, awaiting acid',
    'caption.depth': 'Depth / Black is surface, brightness indicates depth',
    'caption.print': 'Print / Mirrored plate, tone defined by depth & press',
    'caption.timer': 'Cumulative Bite',
    'wizard.title': 'Artwork Plate Transfer Wizard'
  }
};

class I18nManager {
  /**
   * @param {string} [initialLocale='zh-CN']
   */
  constructor(initialLocale = 'zh-CN') {
    this.dict = DICTIONARY;
    let saved = null;
    try {
      if (typeof localStorage !== 'undefined') {
        saved = localStorage.getItem('etchloom_locale');
      }
    } catch (_) {}
    this.locale = (saved && this.dict[saved]) ? saved : (this.dict[initialLocale] ? initialLocale : 'zh-CN');
    this.listeners = new Set();
  }

  getLocale() {
    return this.locale;
  }

  /**
   * Switches the active language locale.
   * @param {'zh-CN'|'en-US'} locale
   */
  setLocale(locale) {
    if (this.dict[locale] && this.locale !== locale) {
      this.locale = locale;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('etchloom_locale', locale);
        }
      } catch (_) {}
      this.notify();
    }
  }

  /**
   * Toggles between zh-CN and en-US.
   */
  toggleLocale() {
    this.setLocale(this.locale === 'zh-CN' ? 'en-US' : 'zh-CN');
  }

  /**
   * Translate key to current language string.
   * @param {string} key
   * @param {string} [fallback]
   * @returns {string}
   */
  t(key, fallback = '') {
    return this.dict[this.locale]?.[key] || this.dict['zh-CN']?.[key] || fallback || key;
  }

  /**
   * Automatically traverses DOM container and updates text for [data-i18n] and placeholders for [data-i18n-placeholder].
   * @param {HTMLElement|Document} [container=document]
   */
  bindDom(container) {
    const doc = container || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.querySelectorAll) return;

    const elements = doc.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.dataset.i18n || el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    const placeholders = doc.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.dataset.i18nPlaceholder || el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = this.t(key);
      }
    });

    const titles = doc.querySelectorAll('[data-i18n-title]');
    titles.forEach(el => {
      const key = el.dataset.i18nTitle || el.getAttribute('data-i18n-title');
      if (key) {
        el.title = this.t(key);
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const l of this.listeners) {
      try {
        l(this.locale);
      } catch (err) {
        console.error('i18n listener error:', err);
      }
    }
  }
}

const api = {
  DICTIONARY,
  I18nManager
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== 'undefined') {
  globalThis.I18n = api;
}


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = typeof api !== 'undefined' ? api : (root.I18n || I18nManager);
  }
  if (typeof root !== 'undefined') {
    if (typeof api !== 'undefined') {
      root.I18n = api;
    }
    if (typeof I18nManager !== 'undefined') {
      root.I18nManager = I18nManager;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
