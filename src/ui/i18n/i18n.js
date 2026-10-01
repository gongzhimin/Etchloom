(function(root) {
  'use strict';

/**
 * Internationalization (i18n) Engine & Trilingual Dictionary (zh-CN, en-US, vi-VN)
 * Zero external dependencies, pure lightweight lookup and DOM binding.
 */
const DICTIONARY = {
  'zh-CN': {
    // Header & Workspace Tabs
    'app.title': 'Etchloom · 数字古典版画工坊',
    'app.subtitle': '数字版画工坊',
    'tab.master': '母版设计',
    'tab.plate': '虚拟铜版',
    'lang.toggle': 'English',
    'action.exportScheme': '导出配置',
    'action.about': '关于',

    // Step Flow Stages
    'step.0.title': '原图输入',
    'step.1.title': '线描感知',
    'step.2.title': '等高流场',
    'step.3.title': '透视轮廓',
    'step.4.title': '曲面排线',
    'step.5.title': '母版合成',
    'step.6.title': '纯棉印样',
    'step.intro': '点击卡片可全屏特写或独立导出图层。',

    // Card Badges & Actions
    'card.cached': '● 缓存命中',
    'card.computing': '计算中...',
    'card.done': '✓ 完成',
    'card.error': '异常',
    'card.loupe': '局部放大',
    'card.fullscreen': '全屏特写',
    'card.inspect': '特写',
    'card.download': '导出',
    'card.clickInspect': '点击查看大图 (支持滚轮缩放与拖拽)',
    'card.initMeta': '等待计算...',
    'card.pixelBase': '原始像素基准',
    'card.rawRatio': '原图比例',
    'card.neuralLine': '神经感知线描',
    'card.vectorContours': '空间轮廓',
    'card.surfaceHatching': '曲面排线',
    'card.masterVectors': '矢量母版线条',
    'card.cottonDeboss': '纯棉纸凹版印样仿真',

    // Sidebar 00: 图像感知
    'sec.0.title': '00 / 图像感知',
    'sec.0.upload': '载入照片',
    'sec.0.lotus': '3D几何增强',
    'sec.0.exposure': '曝光度',
    'sec.0.black': '黑场',
    'sec.0.white': '白场',

    // Sidebar 01: 空间轮廓
    'sec.1.title': '01 / 空间轮廓',
    'sec.1.contour': '轮廓密度',
    'sec.1.aerial': '透视强度',
    'sec.1.width': '轮廓刀宽',

    // Sidebar 02: 曲面排线
    'sec.2.title': '02 / 曲面排线',
    'sec.2.hatch': '排线密度',
    'sec.2.cross': '交叉排线',
    'sec.2.gate': '曲率门控',
    'sec.2.frame': '版画外框',
    'frame.double': '双层古典边框',
    'frame.fine': '单线精细刻框',
    'frame.rough': '手工古拙边框',
    'frame.none': '无外框',

    // Sidebar 03: 铜版工坊
    'sec.3.title': '03 / 铜版工坊',
    'sec.3.groupA': '工序 A · 上版',
    'sec.3.wizardBtn': '图稿上版向导...',
    'sec.3.groupB': '工序 B · 刻绘修版',
    'tool.needle': '蚀刻针 (Needle)',
    'tool.dry': '干刻针',
    'tool.stop': '防蚀漆',
    'tool.polish': '刮磨器',
    'sec.3.size': '工具直径',
    'action.undo': '撤销刻线',
    'action.clear': '清空版面',
    'action.demo': '载入静物练习版',
    'sec.3.groupC': '工序 C · 酸液腐蚀',
    'sec.3.acid': '酸液浓度',
    'sec.3.grain': '金相颗粒',
    'sec.3.irreversible': '不可逆模式',
    'sec.3.startAcid': '开始腐蚀',
    'sec.3.stopAcid': '停止腐蚀',
    'sec.3.groupD': '工序 D · 填墨试印',
    'sec.3.ink': '油墨饱满',
    'sec.3.pressure': '压印压力',
    'sec.3.plateTone': '留墨调子',
    'sec.3.paper': '纸张材质',
    'paper.rough': '暖白 · 粗纹棉纸',
    'paper.smooth': '象牙白 · 细纹纸',
    'sec.3.frame': '印样外框',
    'sec.3.print': '取一张印样',
    'action.save': '保存虚拟版',
    'action.load': '打开虚拟版',
    'action.transferToPlate': '雕刻至铜版 →',

    // Virtual Plate Studio Stepper & Views
    'stepper.transfer': '上版',
    'stepper.inscribe': '刻绘',
    'stepper.etch': '腐蚀',
    'stepper.ink': '填墨',
    'stepper.print': '试印',
    'view.plate': '虚拟铜版',
    'view.depth': '刻深图',
    'view.print': '压印预览',
    'plate.resLabel': '物理网格:',
    'plate.fullscreen': '⛶ 全屏特写',
    'plate.fullscreenTitle': '全屏特写检查',
    'plate.gauge': '腐蚀 {0}s · 深度 {1}μm',
    'caption.plate': '针尖划开保护层，等待酸液咬蚀',
    'caption.depth': '刻槽深度分布 (黑色为表面，明亮为刻深)',
    'caption.print': '纯棉纸凹版正向压印',
    'caption.timer': '腐蚀累计',

    // Status & Telemetry
    'status.ready': '运行就绪',
    'status.running': '正在执行仿真咬蚀...',
    'status.aborted': '已更新任务',
    'status.idle': '空闲',
    'status.loaded': '虚拟版已载入',
    'status.loadFailed': '打开失败',
    'status.demoLoaded': '静物练习版 · 可继续刻线或开始腐蚀',
    'status.needSwitchView': '切换到铜版或刻深图继续制版',
    'status.stopped': '已停止 · 可以继续制版或试印',
    'status.etching': '酸液作用中 · 随时停止以保留细线',
    'status.generating': '管线计算中...',
    'status.recomputing': '增量重算中...',
    'telemetry.status': '状态',
    'telemetry.task': '活跃任务',
    'telemetry.duration': '总耗时',
    'telemetry.strokes': '矢量线条',
    'telemetry.strokesUnit': '条',
    'telemetry.cache': '拓扑缓存命中',
    'telemetry.cacheUnit': '命中',

    // Log Console
    'console.title': '运行日志',
    'console.ready': 'Etchloom 版画工坊就绪。',
    'console.cleared': '日志已清空。',
    'console.sys': '系统',
    'console.plate': '铜版',
    'console.pipeline': '管线',
    'console.model': '模型',
    'console.image': '图像',
    'console.frame': '版画',
    'console.wizard': '向导',
    'console.switched': '界面语言已切换为: 简体中文',

    // Transfer Wizard Modal
    'wizard.title': '母版图稿上版向导',
    'wizard.badge': 'M1 → M3 物理转录',
    'wizard.statsReady': '当前就绪母版: 检测中...',
    'wizard.sec1': '1. 选择雕刻转录工艺技法:',
    'wizard.etchingTitle': '蚀刻针划线 (Etching)',
    'wizard.etchingDesc': '划破表面防蚀防酸保护漆，等待酸液咬蚀形成深沟。',
    'wizard.drypointTitle': '干刻直刻 (Drypoint)',
    'wizard.drypointDesc': '锋利钢针直接切削铜板，边缘翻起金属毛刺，暗部极深润。',
    'wizard.sec2': '2. 目标物理铜版规格:',
    'wizard.resStandard': '标准轻量',
    'wizard.res2k': '2K 高清 (推荐)',
    'wizard.res3k': '3K 展品级',
    'wizard.sec3': '3. 选择转录矢量图层:',
    'wizard.layerAll': '全部母版图稿',
    'wizard.layerAllSub': '全部矢量线条',
    'wizard.layerContours': '仅空间轮廓',
    'wizard.layerContoursSub': '骨干轮廓线',
    'wizard.layerHatching': '仅曲面排线',
    'wizard.layerHatchingSub': '细密顺形排线',
    'wizard.sec4': '4. 针尖刻划下压力度:',
    'action.cancel': '取消',
    'wizard.confirmBtn': '确认转入铜版并刻绘 →',
    'wizard.alertNoLines': '当前选择的图层尚无矢量线条可上版。请先载入图片或等待计算完成。',
    'wizard.warnGenerateFirst': '请先载入照片或运行管线生成母版矢量线条！',

    // Lightbox Modal
    'lightbox.inspect': '特写检查',
    'lightbox.zoomOut': '缩小 (−)',
    'lightbox.zoomIn': '放大 (+)',
    'lightbox.fit': '自适应',
    'lightbox.fitTitle': '全屏自适应',
    'lightbox.reset': '1:1',
    'lightbox.resetTitle': '1:1 原始像素',
    'lightbox.nativeFs': '⛶ 全屏',
    'lightbox.nativeFsTitle': '真全屏切换 (F11)',
    'lightbox.closeTitle': '退出特写 (ESC)',
    'lightbox.plateCloseUp': '虚拟铜版 · 全屏特写',
    'lightbox.depthCloseUp': '刻深图 · 全屏特写',
    'lightbox.printCloseUp': '压印预览 · 全屏特写',
    'lightbox.gridMeta': '物理网格',

    // About Modal
    'about.title': '关于 Etchloom',
    'about.headerTitle': 'Etchloom · 数字古典版画工坊 (Atelier Digital Printmaking Studio)',
    'about.p1': '<strong>Etchloom</strong> 是一套面向计算机图形学与计算摄影的数字古典铜版画工作室系统。',
    'about.p2': '系统完全基于纯数学几何管线与连续物理介质数值模拟，解耦实现五阶段离散数学管线、PDE 酸液侧向咬蚀与凹版压印光影着色。',
    'about.meta': '版本：v2.0.0 (Decoupled Pure ESM Architecture)<br>许可证：MIT License',
    'about.archTitle': '系统设计架构 (Architecture Modules)',
    'about.m1': '<strong>M1 视口引擎</strong>：Atelier Classical Dark 莫兰迪古典暗调美学，7阶段自适应响应式网格 (Step 0 ~ Step 6)。',
    'about.m2': '<strong>M2 算法管线</strong>：5阶段纯状态机（灰度线描感知 → 3D几何流场 → 空气透视轮廓 → 空间曲面几何排线 → 矢量母版合成）。',
    'about.m3': '<strong>M3 铜版工坊</strong>：4大正交物理工具（刻针、干刻针、防蚀漆、刮磨器）与 2D 偏微分酸液咬蚀化学仿真、纯手工棉纸凹版压痕印样。',
    'about.m4': '<strong>M4 调度编排</strong>：拓扑有向无环图哈希增量缓存、抢占式微任务调度、多格式图层导出 (SVG / CNC G-Code / Recipe JSON)。',
    'about.shortcutsTitle': '快捷操作指南 (Shortcuts & Interaction)',
    'about.s1': '点击主工作区任意步骤卡片或虚拟铜版画板：直接开启超高清全屏特写画廊（支持鼠标滚轮无级缩放与拖拽漫游）。',
    'about.s2': '点击卡片右上角 <code>[⛶ 特写]</code>：唤出超高清全屏视口特写。',
    'about.s3': '点击 <code>[雕刻至虚拟铜版 →]</code>：将母版计算所得的数千条矢量线条无缝转录为物理干刻针痕迹，直接进入酸液腐蚀工坊。',

    // AI Status
    'model.offline': '基础离线模式 (纯几何)',
    'model.localAi': '本机服务',
    'model.online': '联网模型'
  },

  'en-US': {
    // Header & Workspace Tabs
    'app.title': 'Etchloom · Digital Printmaking Studio',
    'app.subtitle': 'Digital Printmaking Studio',
    'tab.master': 'Algorithm Master',
    'tab.plate': 'Virtual Plate Studio',
    'lang.toggle': 'Tiếng Việt',
    'action.exportScheme': 'Export Recipe',
    'action.about': 'About Atelier',

    // Step Flow Stages
    'step.0.title': 'Original Input Photo',
    'step.1.title': 'Informative Line Extraction',
    'step.2.title': '3D Cross-Contour Flow',
    'step.3.title': 'Aerial Perspective Contours',
    'step.4.title': 'Curvature-Gated Hatching',
    'step.5.title': 'Master Print Vector Synthesis',
    'step.6.title': 'Virtual Plate & Debossed Print',
    'step.intro': 'Complete printmaking master synthesized across 5 geometric stages. Click any card to inspect or export.',

    // Card Badges & Actions
    'card.cached': '● Cached',
    'card.computing': 'Computing...',
    'card.done': '✓ Done',
    'card.error': 'Error',
    'card.loupe': 'Loupe Magnifier',
    'card.fullscreen': 'Fullscreen',
    'card.inspect': 'Inspect',
    'card.download': 'Export',
    'card.clickInspect': 'Click to inspect (wheel zoom & pan)',
    'card.initMeta': 'Waiting to compute...',
    'card.pixelBase': 'Original Pixel Base',
    'card.rawRatio': 'Original Aspect Ratio',
    'card.neuralLine': 'Neural Perception Drawing',
    'card.vectorContours': 'Spatial Contours',
    'card.surfaceHatching': 'Curvature Hatching',
    'card.masterVectors': 'Master Vector Lines',
    'card.cottonDeboss': 'Cotton Rag Intaglio Impression',

    // Sidebar 00: 图像感知
    'sec.0.title': '00 / Input & 3D Perception',
    'sec.0.upload': 'Upload Photo',
    'sec.0.lotus': 'Lotus 3D Geometry Enhancement',
    'sec.0.exposure': 'Exposure',
    'sec.0.black': 'Black Point',
    'sec.0.white': 'White Point',

    // Sidebar 01: 空间轮廓
    'sec.1.title': '01 / Contours & Aerial Perspective',
    'sec.1.contour': 'Contour Density',
    'sec.1.aerial': 'Aerial Perspective Strength',
    'sec.1.width': 'Contour Stroke Width',

    // Sidebar 02: 曲面排线
    'sec.2.title': '02 / 3D Curvature Hatching',
    'sec.2.hatch': 'Hatching Density',
    'sec.2.cross': 'Cross Hatching',
    'sec.2.gate': 'Curvature Gate Threshold',
    'sec.2.frame': 'Print Frame',
    'frame.double': 'Double Engraved Frame',
    'frame.fine': 'Fine Hairline Frame',
    'frame.rough': 'Hand-cut Rough Frame',
    'frame.none': 'None (Raw Paper)',

    // Sidebar 03: 铜版工坊
    'sec.3.title': '03 / Virtual Plate & Press',
    'sec.3.groupA': 'Stage A · Transfer',
    'sec.3.wizardBtn': 'Artwork Transfer Wizard...',
    'sec.3.groupB': 'Stage B · Engraving & Retouch',
    'tool.needle': 'Etching Needle',
    'tool.dry': 'Drypoint Needle',
    'tool.stop': 'Stop-out Varnish',
    'tool.polish': 'Burnisher',
    'sec.3.size': 'Tool Diameter',
    'action.undo': 'Undo',
    'action.clear': 'Clear Plate',
    'action.demo': 'Load Still Life Plate',
    'sec.3.groupC': 'Stage C · Acid Bite',
    'sec.3.acid': 'Acid Strength',
    'sec.3.grain': 'Acid Grain Noise',
    'sec.3.irreversible': 'Irreversible (Clear Undo)',
    'sec.3.startAcid': 'Start Acid Bite',
    'sec.3.stopAcid': 'Stop Acid Bite',
    'sec.3.groupD': 'Stage D · Inking & Proofing',
    'sec.3.ink': 'Ink Load',
    'sec.3.pressure': 'Press Pressure',
    'sec.3.plateTone': 'Plate Tone (Wiping)',
    'sec.3.paper': 'Rag Paper Substrate',
    'paper.rough': 'Warm White Rough Rag Paper',
    'paper.smooth': 'Ivory Smooth Cotton Paper',
    'sec.3.frame': 'Sample Frame',
    'sec.3.print': 'Pull a Print',
    'action.save': 'Save Plate',
    'action.load': 'Open Plate',
    'action.transferToPlate': 'Engrave to Virtual Plate →',

    // Virtual Plate Studio Stepper & Views
    'stepper.transfer': 'Transfer',
    'stepper.inscribe': 'Inscribe',
    'stepper.etch': 'Etch',
    'stepper.ink': 'Inking',
    'stepper.print': 'Proof',
    'view.plate': 'Copper Plate',
    'view.depth': 'Groove Depth',
    'view.print': 'Paper Print',
    'plate.resLabel': 'Grid Resolution:',
    'plate.fullscreen': '⛶ Fullscreen',
    'plate.fullscreenTitle': 'Fullscreen Inspection',
    'plate.gauge': 'Bite {0}s · Depth {1}μm',
    'caption.plate': 'Plate / Needle scratches ground, awaiting acid',
    'caption.depth': 'Depth / Black is surface, brightness indicates depth',
    'caption.print': 'Print / Upright impression, tone defined by depth & press',
    'caption.timer': 'Cumulative Bite',

    // Status & Telemetry
    'status.ready': 'Ready',
    'status.running': 'Simulating physical acid bite...',
    'status.aborted': 'Cancelled & updated to latest input',
    'status.idle': 'Idle',
    'status.loaded': 'Virtual plate loaded',
    'status.loadFailed': 'Load failed',
    'status.demoLoaded': 'Still life practice plate · Ready for carving or acid bite',
    'status.needSwitchView': 'Switch to plate or depth view to continue carving',
    'status.stopped': 'Stopped · Ready to continue engraving or proofing',
    'status.etching': 'Acid biting in progress · Stop anytime to retain fine lines',
    'status.generating': 'Pipeline computing...',
    'status.recomputing': 'Incremental recomputing...',
    'telemetry.status': 'Status',
    'telemetry.task': 'Active Task',
    'telemetry.duration': 'Total Elapsed',
    'telemetry.strokes': 'Vector Strokes',
    'telemetry.strokesUnit': 'lines',
    'telemetry.cache': 'Topology Cache Hit',
    'telemetry.cacheUnit': 'Hits',

    // Log Console
    'console.title': 'Atelier Activity Log',
    'console.ready': 'Etchloom printmaking atelier ready.',
    'console.cleared': 'Activity log cleared.',
    'console.sys': 'System',
    'console.plate': 'Plate',
    'console.pipeline': 'Pipeline',
    'console.model': 'Model',
    'console.image': 'Image',
    'console.frame': 'Frame',
    'console.wizard': 'Wizard',
    'console.switched': 'Language switched to: English',

    // Transfer Wizard Modal
    'wizard.title': 'Artwork Plate Transfer Wizard',
    'wizard.badge': 'M1 → M3 Physical Transfer',
    'wizard.statsReady': 'Current ready master: Detecting...',
    'wizard.sec1': '1. Select Engraving Transfer Technique:',
    'wizard.etchingTitle': 'Etching Needle Carving',
    'wizard.etchingDesc': 'Scratches off acid-resistant ground, allowing acid bite to form grooves.',
    'wizard.drypointTitle': 'Drypoint Direct Engraving',
    'wizard.drypointDesc': 'Hard steel point carves metal directly, raising burrs for rich velvety blacks.',
    'wizard.sec2': '2. Target Physical Plate Dimensions:',
    'wizard.resStandard': 'Standard Light',
    'wizard.res2k': '2K HD (Recommended)',
    'wizard.res3k': '3K Exhibition Grade',
    'wizard.sec3': '3. Select Vector Layers to Transfer:',
    'wizard.layerAll': 'All Master Artwork',
    'wizard.layerAllSub': 'All vector strokes',
    'wizard.layerContours': 'Contours Only',
    'wizard.layerContoursSub': 'Structural boundary lines',
    'wizard.layerHatching': 'Hatching Only',
    'wizard.layerHatchingSub': 'Dense surface flow lines',
    'wizard.sec4': '4. Needle Carving Pressure:',
    'action.cancel': 'Cancel',
    'wizard.confirmBtn': 'Transfer & Inscribe to Plate →',
    'wizard.alertNoLines': 'The selected layer contains no vector strokes. Please load an image or wait for computation.',
    'wizard.warnGenerateFirst': 'Please load an image or run pipeline to generate master vectors first!',

    // Lightbox Modal
    'lightbox.inspect': 'Close-up Inspection',
    'lightbox.zoomOut': 'Zoom Out (−)',
    'lightbox.zoomIn': 'Zoom In (+)',
    'lightbox.fit': 'Fit',
    'lightbox.fitTitle': 'Fit to Fullscreen',
    'lightbox.reset': '1:1',
    'lightbox.resetTitle': '1:1 Pixel Scale',
    'lightbox.nativeFs': '⛶ Fullscreen',
    'lightbox.nativeFsTitle': 'Toggle True Fullscreen (F11)',
    'lightbox.closeTitle': 'Exit Inspection (ESC)',
    'lightbox.plateCloseUp': 'Copper Plate · Fullscreen Close-up',
    'lightbox.depthCloseUp': 'Groove Depth · Fullscreen Close-up',
    'lightbox.printCloseUp': 'Paper Print · Fullscreen Close-up',
    'lightbox.gridMeta': 'Physical Grid',

    // About Modal
    'about.title': 'About Etchloom',
    'about.headerTitle': 'Etchloom · Atelier Digital Printmaking Studio',
    'about.p1': '<strong>Etchloom</strong> is a digital classical copperplate intaglio printmaking studio designed for computer graphics and computational photography.',
    'about.p2': 'Engineered with pure mathematical geometric pipelines and continuous physical media simulation: 5-stage geometry synthesis, PDE lateral acid bite, and authentic rag paper intaglio shading.',
    'about.meta': 'Version: v2.0.0 (Decoupled Pure ESM Architecture)<br>License: MIT License',
    'about.archTitle': 'Architecture Modules',
    'about.m1': '<strong>M1 Viewport Engine</strong>: Atelier Classical Dark Morandi aesthetics, 7-stage responsive adaptive grid (Step 0 ~ Step 6).',
    'about.m2': '<strong>M2 Algorithm Pipeline</strong>: 5-stage pure state machine (grayscale perception → 3D cross-contour flow → aerial contours → 3D surface hatching → master vector synthesis).',
    'about.m3': '<strong>M3 Virtual Plate Studio</strong>: 4 orthogonal tools (etching needle, drypoint, stop-out varnish, burnisher), 2D PDE acid bite chemical simulation, and rag paper press rendering.',
    'about.m4': '<strong>M4 Scheduling & Cache</strong>: DAG hash incremental caching, preemptive microtask scheduler, and multi-format exports (SVG / CNC G-Code / Recipe JSON).',
    'about.shortcutsTitle': 'Shortcuts & Interaction Guide',
    'about.s1': 'Click any card or plate canvas: Opens ultra-high definition fullscreen gallery with mouse wheel zoom & drag panning.',
    'about.s2': 'Click <code>[⛶ Inspect]</code> on any card: Directly triggers fullscreen view for inspecting fine line details.',
    'about.s3': 'Click <code>[Engrave to Virtual Plate →]</code>: Seamlessly transfers thousands of synthesized vector paths onto the copperplate for interactive acid biting.',

    // AI Status
    'model.offline': 'Offline Mode (Geometric)',
    'model.localAi': 'Local AI',
    'model.online': 'Online Model'
  },

  'vi-VN': {
    // Header & Workspace Tabs
    'app.title': 'Etchloom · Xưởng in tranh khắc kim loại số',
    'app.subtitle': 'Xưởng chế bản & in ấn số',
    'tab.master': 'Thiết kế bản mẫu',
    'tab.plate': 'Xưởng bản đồng ảo',
    'lang.toggle': '中文',
    'action.exportScheme': 'Xuất công thức',
    'action.about': 'Giới thiệu',

    // Step Flow Stages
    'step.0.title': 'Ảnh gốc đầu vào',
    'step.1.title': 'Trích xuất nét vẽ tri nhận',
    'step.2.title': 'Trường dòng đẳng cao 3D',
    'step.3.title': 'Đường bao phối cảnh không gian',
    'step.4.title': 'Đường khắc cong theo mặt cong',
    'step.5.title': 'Tổng hợp bản mẫu vector',
    'step.6.title': 'Bản in dập nổi giấy cotton',
    'step.intro': 'Bản khắc mẫu được tổng hợp qua 5 giai đoạn hình học. Nhấn vào thẻ để phóng to hoặc xuất lớp.',

    // Card Badges & Actions
    'card.cached': '● Trúng bộ nhớ đệm',
    'card.computing': 'Đang tính toán...',
    'card.done': '✓ Hoàn thành',
    'card.error': 'Lỗi',
    'card.loupe': 'Kính lúp phóng đại',
    'card.fullscreen': 'Toàn màn hình',
    'card.inspect': 'Xem cận cảnh',
    'card.download': 'Xuất lớp',
    'card.clickInspect': 'Nhấp để xem cận cảnh (cuộn chuột phóng to & kéo thả)',
    'card.initMeta': 'Chờ tính toán...',
    'card.pixelBase': 'Độ phân giải ảnh gốc',
    'card.rawRatio': 'Tỷ lệ ảnh gốc',
    'card.neuralLine': 'Nét vẽ mạng nơ-ron tri nhận',
    'card.vectorContours': 'Đường bao không gian',
    'card.surfaceHatching': 'Nét gạch mặt cong',
    'card.masterVectors': 'Đường nét bản mẫu vector',
    'card.cottonDeboss': 'Mô phỏng bản in dập nổi giấy cotton',

    // Sidebar 00: 图像感知
    'sec.0.title': '00 / Tri nhận hình ảnh',
    'sec.0.upload': 'Tải ảnh lên',
    'sec.0.lotus': 'Tăng cường hình học 3D Lotus',
    'sec.0.exposure': 'Độ phơi sáng',
    'sec.0.black': 'Điểm đen',
    'sec.0.white': 'Điểm trắng',

    // Sidebar 01: 空间轮廓
    'sec.1.title': '01 / Đường bao không gian',
    'sec.1.contour': 'Mật độ đường bao',
    'sec.1.aerial': 'Độ sâu phối cảnh',
    'sec.1.width': 'Độ rộng nét khắc',

    // Sidebar 02: 曲面排线
    'sec.2.title': '02 / Nét gạch mặt cong',
    'sec.2.hatch': 'Mật độ nét gạch',
    'sec.2.cross': 'Nét gạch chéo',
    'sec.2.gate': 'Ngưỡng độ cong',
    'sec.2.frame': 'Khung tranh khắc',
    'frame.double': 'Khung cổ điển hai lớp',
    'frame.fine': 'Khung viền mảnh tinh tế',
    'frame.rough': 'Khung thô khắc tay mộc mạc',
    'frame.none': 'Không khung viền',

    // Sidebar 03: 铜版工坊
    'sec.3.title': '03 / Xưởng bản đồng & in ấn',
    'sec.3.groupA': 'Công đoạn A · Lên bản',
    'sec.3.wizardBtn': 'Trợ lý chuyển giao bản mẫu...',
    'sec.3.groupB': 'Công đoạn B · Khắc nét & sửa bản',
    'tool.needle': 'Kim khắc axít (Needle)',
    'tool.dry': 'Kim khắc khô (Drypoint)',
    'tool.stop': 'Sơn phủ chống axít',
    'tool.polish': 'Dao mài bóng (Burnisher)',
    'sec.3.size': 'Kích thước đầu khắc',
    'action.undo': 'Hoàn tác nét khắc',
    'action.clear': 'Xóa sạch bản đồng',
    'action.demo': 'Tải bản mẫu tĩnh vật thực hành',
    'sec.3.groupC': 'Công đoạn C · Ăn mòn axít',
    'sec.3.acid': 'Nồng độ dung dịch axít',
    'sec.3.grain': 'Hạt cấu trúc kim loại',
    'sec.3.irreversible': 'Chế độ không thể hoàn tác',
    'sec.3.startAcid': 'Bắt đầu ăn mòn',
    'sec.3.stopAcid': 'Dừng ăn mòn',
    'sec.3.groupD': 'Công đoạn D · Thấm mực & in thử',
    'sec.3.ink': 'Lượng mực in',
    'sec.3.pressure': 'Áp lực bàn ép',
    'sec.3.plateTone': 'Mực lưu bề mặt (Lau mực)',
    'sec.3.paper': 'Chất liệu giấy in',
    'paper.rough': 'Giấy cotton trắng ấm vân thô',
    'paper.smooth': 'Giấy cotton trắng ngà vân mịn',
    'sec.3.frame': 'Khung bản in thử',
    'sec.3.print': 'Thực hiện một bản in',
    'action.save': 'Lưu bản đồng',
    'action.load': 'Mở bản đồng',
    'action.transferToPlate': 'Khắc nét sang bản đồng →',

    // Virtual Plate Studio Stepper & Views
    'stepper.transfer': 'Lên bản',
    'stepper.inscribe': 'Khắc nét',
    'stepper.etch': 'Ăn mòn',
    'stepper.ink': 'Thấm mực',
    'stepper.print': 'In thử',
    'view.plate': 'Bản đồng',
    'view.depth': 'Độ sâu rãnh',
    'view.print': 'Bản in giấy',
    'plate.resLabel': 'Lưới vật lý:',
    'plate.fullscreen': '⛶ Toàn màn hình',
    'plate.fullscreenTitle': 'Kiểm tra toàn màn hình',
    'plate.gauge': 'Ăn mòn {0}s · Sâu {1}μm',
    'caption.plate': 'Đầu kim rạch lớp phủ bảo vệ, chờ axít ăn mòn',
    'caption.depth': 'Phân bố độ sâu rãnh (đen là bề mặt, sáng là rãnh sâu)',
    'caption.print': 'Bản in giấy cotton dập nổi chiều thuận',
    'caption.timer': 'Thời gian ăn mòn tích lũy',

    // Status & Telemetry
    'status.ready': 'Sẵn sàng hoạt động',
    'status.running': 'Đang mô phỏng axít ăn mòn vật lý...',
    'status.aborted': 'Đã hủy và cập nhật theo dữ liệu mới nhất',
    'status.idle': 'Nghỉ',
    'status.loaded': 'Đã tải bản đồng ảo',
    'status.loadFailed': 'Mở bản đồng thất bại',
    'status.demoLoaded': 'Bản tĩnh vật thực hành · Sẵn sàng khắc hoặc ăn mòn',
    'status.needSwitchView': 'Chuyển sang xem bản đồng hoặc độ sâu để tiếp tục khắc',
    'status.stopped': 'Đã dừng · Có thể tiếp tục khắc hoặc in thử',
    'status.etching': 'Axít đang ăn mòn · Dừng bất cứ lúc nào để giữ nét mảnh',
    'status.generating': 'Quy trình đang tính toán...',
    'status.recomputing': 'Đang tính toán tăng dần lại...',
    'telemetry.status': 'Trạng thái',
    'telemetry.task': 'Tác vụ hoạt động',
    'telemetry.duration': 'Tổng thời gian',
    'telemetry.strokes': 'Đường nét vector',
    'telemetry.strokesUnit': 'nét',
    'telemetry.cache': 'Trúng bộ nhớ topo',
    'telemetry.cacheUnit': 'trúng',

    // Log Console
    'console.title': 'Nhật ký hoạt động xưởng',
    'console.ready': 'Xưởng in tranh khắc Etchloom đã sẵn sàng.',
    'console.cleared': 'Đã xóa sạch nhật ký hoạt động.',
    'console.sys': 'Hệ thống',
    'console.plate': 'Bản đồng',
    'console.pipeline': 'Quy trình',
    'console.model': 'Mô hình',
    'console.image': 'Hình ảnh',
    'console.frame': 'Khung tranh',
    'console.wizard': 'Trợ lý',
    'console.switched': 'Ngôn ngữ giao diện đã đổi sang: Tiếng Việt',

    // Transfer Wizard Modal
    'wizard.title': 'Trợ lý chuyển giao bản mẫu lên bản đồng',
    'wizard.badge': 'M1 → M3 Chuyển giao vật lý',
    'wizard.statsReady': 'Bản mẫu sẵn sàng: Đang kiểm tra...',
    'wizard.sec1': '1. Chọn kỹ thuật chuyển giao điêu khắc:',
    'wizard.etchingTitle': 'Khắc kim axít (Etching)',
    'wizard.etchingDesc': 'Rạch lớp phủ chống axít trên bề mặt để axít ăn mòn tạo rãnh sâu.',
    'wizard.drypointTitle': 'Khắc khô trực tiếp (Drypoint)',
    'wizard.drypointDesc': 'Mũi thép bén cắt trực tiếp vào đồng tạo gờ kim loại cho sắc tối đằm thắm.',
    'wizard.sec2': '2. Quy cách bản đồng vật lý đích:',
    'wizard.resStandard': 'Tiêu chuẩn nhẹ',
    'wizard.res2k': '2K Độ nét cao (Khuyên dùng)',
    'wizard.res3k': '3K Cấp độ triển lãm',
    'wizard.sec3': '3. Chọn các lớp vector chuyển giao:',
    'wizard.layerAll': 'Toàn bộ bản mẫu',
    'wizard.layerAllSub': 'Tất cả đường nét vector',
    'wizard.layerContours': 'Chỉ đường bao không gian',
    'wizard.layerContoursSub': 'Đường viền cấu trúc',
    'wizard.layerHatching': 'Chỉ nét gạch mặt cong',
    'wizard.layerHatchingSub': 'Nét gạch uốn lượn bề mặt',
    'wizard.sec4': '4. Áp lực tì đè đầu kim:',
    'action.cancel': 'Hủy',
    'wizard.confirmBtn': 'Chuyển sang bản đồng & khắc nét →',
    'wizard.alertNoLines': 'Lớp được chọn hiện chưa có đường nét vector để chuyển giao. Vui lòng tải ảnh lên hoặc đợi tính toán hoàn tất.',
    'wizard.warnGenerateFirst': 'Vui lòng tải ảnh hoặc chạy quy trình xử lý để tạo đường nét vector trước!',

    // Lightbox Modal
    'lightbox.inspect': 'Kiểm tra cận cảnh',
    'lightbox.zoomOut': 'Thu nhỏ (−)',
    'lightbox.zoomIn': 'Phóng to (+)',
    'lightbox.fit': 'Vừa khung',
    'lightbox.fitTitle': 'Tự động vừa màn hình',
    'lightbox.reset': '1:1',
    'lightbox.resetTitle': 'Tỷ lệ pixel gốc 1:1',
    'lightbox.nativeFs': '⛶ Toàn màn hình',
    'lightbox.nativeFsTitle': 'Bật/Tắt chế độ toàn màn hình (F11)',
    'lightbox.closeTitle': 'Thoát xem cận cảnh (ESC)',
    'lightbox.plateCloseUp': 'Bản đồng · Xem toàn màn hình cận cảnh',
    'lightbox.depthCloseUp': 'Độ sâu rãnh · Xem toàn màn hình cận cảnh',
    'lightbox.printCloseUp': 'Bản in giấy · Xem toàn màn hình cận cảnh',
    'lightbox.gridMeta': 'Lưới vật lý',

    // About Modal
    'about.title': 'Giới thiệu về Etchloom',
    'about.headerTitle': 'Etchloom · Xưởng in tranh khắc kim loại số',
    'about.p1': '<strong>Etchloom</strong> là một hệ thống xưởng in khắc kim loại cổ điển kỹ thuật số dành cho đồ họa máy tính và nhiếp ảnh điện toán.',
    'about.p2': 'Được xây dựng hoàn toàn dựa trên các quy trình hình học toán học thuần túy và mô phỏng số học môi trường vật lý liên tục: tổng hợp hình học 5 giai đoạn, mô phỏng axít ăn mòn ngang theo phương trình đạo hàm riêng (PDE) và tạo bóng bản in dập lõm trên giấy cotton thật.',
    'about.meta': 'Phiên bản: v2.0.0 (Kiến trúc ESM thuần phân tách)<br>Giấy phép: Giấy phép MIT',
    'about.archTitle': 'Các mô-đun kiến trúc hệ thống (Architecture Modules)',
    'about.m1': '<strong>M1 Động cơ khung nhìn</strong>: Mỹ học Morandi cổ điển Atelier Classical Dark, lưới thích ứng 7 giai đoạn (Step 0 ~ Step 6).',
    'about.m2': '<strong>M2 Quy trình thuật toán</strong>: Máy trạng thái thuần 5 giai đoạn (tri nhận nét xám → trường dòng 3D → đường bao phối cảnh không gian → nét gạch mặt cong → tổng hợp bản mẫu vector).',
    'about.m3': '<strong>M3 Xưởng bản đồng</strong>: 4 công cụ vật lý trực giao (kim khắc axít, kim khắc khô, sơn phủ chống axít, dao mài bóng), mô phỏng hóa học ăn mòn axít 2D PDE và ép in nổi lõm giấy cotton.',
    'about.m4': '<strong>M4 Điều phối & Đệm</strong>: Bộ nhớ đệm gia tăng hàm băm đồ thị có hướng (DAG), bộ lập lịch tác vụ vi mô ưu tiên, xuất đa định dạng (SVG / CNC G-Code / Recipe JSON).',
    'about.shortcutsTitle': 'Hướng dẫn thao tác nhanh (Shortcuts & Interaction)',
    'about.s1': 'Nhấp vào bất kỳ thẻ bước nào hoặc bản đồng: Mở ngay phòng tranh cận cảnh toàn màn hình siêu nét (hỗ trợ cuộn chuột phóng to vô cấp và kéo rê).',
    'about.s2': 'Nhấp vào nút <code>[⛶ Xem cận cảnh]</code> góc phải thẻ: Bật khung nhìn kiểm tra chi tiết toàn màn hình.',
    'about.s3': 'Nhấp vào <code>[Khắc nét sang bản đồng →]</code>: Chuyển hàng ngàn đường nét vector từ bản mẫu sang bản đồng để tiến hành ăn mòn axít.',

    // AI Status
    'model.offline': 'Chế độ ngoại tuyến (Hình học thuần)',
    'model.localAi': 'AI Cục bộ',
    'model.online': 'Mô hình trực tuyến'
  }
};

const SUPPORTED_LOCALES = ['zh-CN', 'en-US', 'vi-VN'];

class I18nManager {
  /**
   * @param {string} [initialLocale='zh-CN']
   */
  constructor(initialLocale = 'zh-CN') {
    this.dict = DICTIONARY;
    let saved = null;
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const queryLang = params.get('lang') || params.get('locale');
        if (queryLang) {
          const norm = queryLang.toLowerCase();
          if (norm.startsWith('en')) saved = 'en-US';
          else if (norm.startsWith('vi')) saved = 'vi-VN';
          else if (norm.startsWith('zh')) saved = 'zh-CN';
        }
      }
      if (!saved && typeof localStorage !== 'undefined') {
        saved = localStorage.getItem('etchloom_locale');
      }
    } catch (_) {}

    this.locale = (saved && this.dict[saved]) ? saved : (this.dict[initialLocale] ? initialLocale : 'zh-CN');
    this.listeners = new Set();
  }

  getLocale() {
    return this.locale;
  }

  getSupportedLocales() {
    return [...SUPPORTED_LOCALES];
  }

  /**
   * Switches the active language locale.
   * @param {'zh-CN'|'en-US'|'vi-VN'} locale
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
   * Toggles circularly between zh-CN -> en-US -> vi-VN -> zh-CN.
   */
  toggleLocale() {
    const idx = SUPPORTED_LOCALES.indexOf(this.locale);
    const nextIdx = (idx >= 0 ? idx + 1 : 0) % SUPPORTED_LOCALES.length;
    this.setLocale(SUPPORTED_LOCALES[nextIdx]);
  }

  /**
   * Translate key to current language string with optional parameter replacement.
   * @param {string} key
   * @param {string|Array|Object} [paramsOrFallback]
   * @param {string} [fallback]
   * @returns {string}
   */
  t(key, paramsOrFallback = '', fallback = '') {
    let str = this.dict[this.locale]?.[key] || this.dict['zh-CN']?.[key];
    if (str == null) {
      if (typeof paramsOrFallback === 'string' && paramsOrFallback.length > 0 && fallback === '') {
        return paramsOrFallback;
      }
      return fallback || key;
    }
    if (Array.isArray(paramsOrFallback)) {
      paramsOrFallback.forEach((p, i) => {
        str = str.replace(new RegExp(`\\{${i}\\}`, 'g'), String(p));
      });
    } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      Object.keys(paramsOrFallback).forEach((k) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(paramsOrFallback[k]));
      });
    }
    return str;
  }

  /**
   * Automatically traverses DOM container and updates text for [data-i18n], placeholders, titles, aria-labels, and innerHTML.
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

    const htmlElements = doc.querySelectorAll('[data-i18n-html]');
    htmlElements.forEach(el => {
      const key = el.dataset.i18nHtml || el.getAttribute('data-i18n-html');
      if (key) {
        el.innerHTML = this.t(key);
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

    const ariaLabels = doc.querySelectorAll('[data-i18n-aria]');
    ariaLabels.forEach(el => {
      const key = el.dataset.i18nAria || el.getAttribute('data-i18n-aria');
      if (key) {
        el.setAttribute('aria-label', this.t(key));
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
  SUPPORTED_LOCALES,
  I18nManager
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== 'undefined') {
  globalThis.I18n = api;
}

if (typeof root !== 'undefined') {
  root.I18n = api;
  root.I18nManager = I18nManager;
}
})(typeof globalThis !== 'undefined' ? globalThis : this);
