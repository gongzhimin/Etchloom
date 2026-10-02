(function(root) {
  'use strict';

/**
 * Internationalization (i18n) Engine & Trilingual Dictionary (zh-CN, en-US, vi-VN)
 * Zero external dependencies, pure lightweight lookup and DOM binding.
 */
const DICTIONARY = {
  'zh-CN': {
    // Header & Workspace Tabs
    'app.title': 'Etchloom',
    'app.subtitle': '数字版画工坊',
    'tab.master': '母版设计',
    'tab.plate': '虚拟铜版',
    'lang.toggle': 'English',
    'action.exportScheme': '导出设置',
    'action.about': '关于',

    // Step Flow Stages
    'step.0.title': '原图输入',
    'step.1.title': '线描感知',
    'step.2.title': '等高流场',
    'step.3.title': '透视轮廓',
    'step.4.title': '曲面排线',
    'step.5.title': '母版合成',
    'step.6.title': '上版母稿',
    'step.intro': '点击卡片可全屏特写或独立导出图层。',

    // Card Badges & Actions
    'card.cached': '● 缓存命中',
    'card.computing': '计算中...',
    'card.done': '完成',
    'card.error': '异常',
    'card.loupe': '局部放大',
    'card.fullscreen': '全屏特写',
    'card.inspect': '特写',
    'card.download': '导出',
    'card.clickInspect': '点击查看大图 (支持滚轮缩放与拖拽)',
    'card.initMeta': '等待计算...',
    'card.sourceSize': '{0} × {1} · 原图',
    'card.aiLine': 'AI 线描已提取',
    'card.lineReady': '线描已提取',
    'card.flowReady': '等高流场已生成',
    'card.contourCount': '{0} 条轮廓',
    'card.hatchingCount': '{0} 条排线',
    'card.masterCount': '{0} 条母版线',
    'card.transferReady': '上版母稿已就绪',
    'card.pixelBase': '原始像素基准',
    'card.rawRatio': '原图比例',
    'card.neuralLine': '神经感知线描',
    'card.vectorContours': '空间轮廓',
    'card.surfaceHatching': '曲面排线',
    'card.masterVectors': '矢量母版线条',
    'card.cottonDeboss': '上版母稿',

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
    'sec.3.wizardBtn': '调整上版细节',
    'sec.3.groupB': '工序 B · 刻绘修版',
    'tool.needle': '蚀刻针',
    'tool.dry': '干刻针',
    'tool.stop': '防蚀漆',
    'tool.polish': '刮磨器',
    'sec.3.size': '笔触宽度',
    'action.undo': '撤销',
    'action.clear': '清空版面',
    'action.clearLog': '清空日志',
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
    'paper.rough': '粗纹棉纸',
    'paper.smooth': '细纹棉纸',
    'paper.linen': '麻棉混纺纸 · 粗纹',
    'paper.rosaspina': 'Rosaspina · 自然纹',
    'paper.desc.rough': '暖白色，表面纹理较明显。',
    'paper.desc.smooth': '浅白色，表面较平整。',
    'paper.desc.linen': '85% 棉、15% 亚麻；自然粗纹。',
    'paper.desc.rosaspina': '60% 棉；圆网纸的自然颗粒。',
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
    'view.plate': '铜版',
    'view.depth': '刻深',
    'view.print': '印样',
    'plate.resLabel': '当前精度',
    'plate.fullscreen': '全屏查看',
    'plate.fullscreenTitle': '全屏特写检查',
    'plate.gauge': '腐蚀 {0}s · 深度 {1}μm',
    'sheet.toggle': '切换面板展开',
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
    'wizard.title': '上版细节',
    'wizard.badge': 'M1 → M3 物理转录',
    'wizard.statsReady': '当前就绪母版: 检测中...',
    'wizard.sec1': '刻绘方式',
    'wizard.etchingTitle': '蚀刻针',
    'wizard.etchingDesc': '划开保护层，再用酸液腐蚀。',
    'wizard.drypointTitle': '干刻针',
    'wizard.drypointDesc': '直接刻入铜版，无需酸液。',
    'wizard.sec2': '铜版精度',
    'wizard.resStandard': '标准轻量',
    'wizard.res2k': '2K 高清 (推荐)',
    'wizard.res3k': '3K 展品级',
    'wizard.sec3': '上版图层',
    'wizard.layerAll': '全部母版图稿',
    'wizard.layerAllSub': '全部矢量线条',
    'wizard.layerContours': '仅空间轮廓',
    'wizard.layerContoursSub': '骨干轮廓线',
    'wizard.layerHatching': '仅曲面排线',
    'wizard.layerHatchingSub': '细密顺形排线',
    'wizard.sec4': '刻划力度',
    'wizard.lineWidth': '上版线宽',
    'action.cancel': '取消',
    'wizard.confirmBtn': '开始刻绘 →',
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
    'about.close': '关闭关于页面',
    'about.intro': 'Etchloom 将照片转为线条母版，再让你亲手制作铜版与试印。',
    'about.stage1Title': '制作母版',
    'about.stage1Body': '选择照片，调整线条，检查生成的母版。',
    'about.stage2Title': '蚀刻铜版',
    'about.stage2Body': '将母版上版，亲手刻绘、腐蚀，并在不同纸张上试印。',
    'about.guideTitle': '操作提示',
    'about.guide1': '从示例或自己的照片开始。',
    'about.guide2': '上版前可调整铜版精度和转录线宽。',
    'about.guide3': '刻绘时可调整笔触宽度；试印前可选择纸张。',
    'about.outputTitle': '保存与导出',
    'about.outputBody': '可导出母版 SVG、下载试印 PNG，并保存铜版进度。',
    'about.communityTitle': '项目与反馈',
    'about.communityBody': '在 GitHub 查看最新代码与下载说明；发现问题或有改进建议，欢迎提交 Issue。',
    'about.repositoryLink': '下载最新',
    'about.issuesLink': '反馈',
    'about.meta': '开源许可：MIT',

    // AI Status
    'model.offline': '基础离线模式 (纯几何)',
    'model.localAi': '本机服务',
    'model.online': '本地模型',

    // Two-Stage Progressive Atelier UI Keys
    'nav.step1': '制作母版',
    'nav.step2': '蚀刻铜版',
    'lang.label': '界面语言',
    'm1.sourcePreview': '原图预览',
    'm1.masterLabel': '上版母稿',
    'm1.redrawing': '正在重绘母版…',
    'status.frameUpdated': '外框已更新',
    'nav.stages': '工作阶段',
    'm1.preview': '母版预览',
    'm2.canvas': '铜版绘图区',
    'action.cancel': '取消任务',
    'cta.selectPhoto': '选择照片',
    'cta.transferToPlate': '制作铜版 →',
    'cta.confirmTransfer': '上版，开始刻绘 →',
    'cta.startEtch': '开始腐蚀',
    'cta.pauseEtch': '暂停腐蚀',
    'cta.resumeEtch': '继续腐蚀',
    'cta.toProofPrint': '前往试印 →',
    'cta.startEtchNav': '前往腐蚀 →',
    'cta.toDrypointProof': '前往试印 →',
    'cta.reprint': '重新试印',
    'm1.initTitle': '从照片开始',
    'm1.initDesc': '将照片转为可上版的线条母版。',
    'm1.dragTip': '支持直接拖拽图片文件到此区域',
    'm1.noPhoto': '没有照片？',
    'm1.loadDemo': '试用示例图',
    'm1.compTitle': '正在制作母版…',
    'm1.compSub': '分析曲面等高流向与透视轮廓 (阶段 3/5)',
    'm1.compStrokes': '已提取 2,410 条空间轮廓线条',
    'm1.stepForward': '查看生成结果 →',
    'm1.readyTitle': '母版已完成',
    'm1.readyCount': '3,892 条矢量线条',
    'm1.readyDesc': '双层古典边框与顺形曲面排线已融合完成。',
    'm1.changePhoto': '更换照片',
    'm1.sampleText': '高精度曲面排线与透视轮廓',
    'm1.filmstripTitle': '查看制作过程',
    'm1.filmstripTip': '点击卡片可全屏特写或独立下载图层',
    'm1.drawerAppearance': '外观调整',
    'm1.drawerTone': '明暗调整',
    'm1.drawerAlgorithm': '进阶参数',
    'm1.lotusDesc': '让排线顺应物体表面。',
    'm2.step1Title': '选择上版方式',
    'm2.step1Desc': '先转入母版线条，再亲手刻绘。',
    'm2.currentMaster': '母版线条',
    'm2.currentMasterLines': '3,892 矢量线条',
    'm2.moreTransfer': '更多上版设置 ▾',
    'm2.specLabel': '物理规格:',
    'm2.specVal': '1500 × 1100 (2K)',
    'm2.layerLabel': '转录图层:',
    'm2.pressureLabel': '针尖压力:',
    'm2.pressureVal': '65%',
    'm2.plateReadyTitle': '虚拟抛光铜版 (1500 × 1100)',
    'm2.plateReadyDesc': '确认后，母版线条将作为物理基准拓印在防酸保护漆表面。',
    'm2.backToMaster': '← 查看母版',
    'm2.step2Title': '亲手刻绘',
    'm2.step2Desc': '在铜版上补线或修整刻痕。',
    'm2.toolsLabel': '常用修绘工具',
    'm2.moreTools': '更多工具',
    'm2.inscribeStatus': '漆面已划破 (3,892 条裸铜基准线) · 刻槽深度 0.0 μm · 每一笔手工补线均产生真实咬蚀',
    'm2.bareCopperLines': '裸铜金线已清晰显露 · 尚未浸酸',
    'm2.step3Title': '控制腐蚀',
    'm2.step3Desc': '开始后可随时暂停，保留当前刻深。',
    'm2.step4Title': '填墨试印',
    'm2.step4Desc': '选择纸张，检查印样。',
    'etch.stateStandby': '状态: 待开始浸酸 (铜版悬置)',
    'etch.stateBiting': '状态: 酸液咬蚀中 (2D PDE 迭代)',
    'etch.statePaused': '状态: 已取出酸槽，反应暂停',
    'etch.state.standby': '待开始',
    'etch.state.biting': '腐蚀中',
    'etch.state.paused': '已暂停',
    'etch.timeLabel': '累计腐蚀时间',
    'etch.depthLabel': '平均刻槽深度',
    'etch.drawerSettings': '腐蚀参数',
    'etch.plateStandby': '铜版悬空等待 · 未入酸槽',
    'etch.plateBiting': '酸液咬蚀中 · 刻痕侧蚀加宽加深',
    'etch.platePaused': '刻槽深度已固定 · 可继续浸酸或冲洗去试印',
    'proof.download': '下载印样 PNG',
    'proof.backToEtch': '继续腐蚀',
    'proof.backToInscribe': '返回刻绘',
    'proof.drawerInking': '油墨与压印设置',
    'proof.footerTip': '试印是创作反馈环，满意后即可独立装裱',
    'proof.statusDone': '纯棉纸压印完成',
    'proof.printCaption': '纯棉纸凹版正向印迹',
    'dialog.retransferTitle': '重新上版将覆写当前铜版',
    'dialog.retransferDesc': '当前铜版已包含手工刻绘痕迹或酸液咬蚀深度。再次执行上版将以新母版重写并清空当前版面数据。',
    'dialog.cancel': '取消 (保留当前铜版)',
    'dialog.saveAndOverwrite': '备份保存当前版并覆盖',
    'dialog.directOverwrite': '直接清空覆盖 (不备份) →',
    'common.toggle': '展开 / 折叠 ▾',
    'common.standard': '常用 ▾',
    'common.collapsed': '展开 ▾'
  },

  'en-US': {
    // Header & Workspace Tabs
    'app.title': 'Etchloom',
    'app.subtitle': 'Digital Print Studio',
    'tab.master': 'Algorithm Master',
    'tab.plate': 'Virtual Plate Studio',
    'lang.toggle': 'Tiếng Việt',
    'action.exportScheme': 'Export',
    'action.about': 'About',

    // Step Flow Stages
    'step.0.title': 'Original Input Photo',
    'step.1.title': 'Informative Line Extraction',
    'step.2.title': '3D Cross-Contour Flow',
    'step.3.title': 'Aerial Perspective Contours',
    'step.4.title': 'Curvature-Gated Hatching',
    'step.5.title': 'Master Print Vector Synthesis',
    'step.6.title': 'Transfer Master',
    'step.intro': 'Complete printmaking master synthesized across 5 geometric stages. Click any card to inspect or export.',

    // Card Badges & Actions
    'card.cached': '● Cached',
    'card.computing': 'Computing...',
    'card.done': 'Done',
    'card.error': 'Error',
    'card.loupe': 'Loupe Magnifier',
    'card.fullscreen': 'Fullscreen',
    'card.inspect': 'Inspect',
    'card.download': 'Export',
    'card.clickInspect': 'Click to inspect (wheel zoom & pan)',
    'card.initMeta': 'Waiting to compute...',
    'card.sourceSize': '{0} × {1} · Source',
    'card.aiLine': 'AI linework ready',
    'card.lineReady': 'Linework ready',
    'card.flowReady': 'Contour flow ready',
    'card.contourCount': '{0} contours',
    'card.hatchingCount': '{0} hatch lines',
    'card.masterCount': '{0} master lines',
    'card.transferReady': 'Ready to transfer',
    'card.pixelBase': 'Original Pixel Base',
    'card.rawRatio': 'Original Aspect Ratio',
    'card.neuralLine': 'Neural Perception Drawing',
    'card.vectorContours': 'Spatial Contours',
    'card.surfaceHatching': 'Curvature Hatching',
    'card.masterVectors': 'Master Vector Lines',
    'card.cottonDeboss': 'Transfer Master',

    // Sidebar 00: 图像感知
    'sec.0.title': '00 / Input & 3D Perception',
    'sec.0.upload': 'Upload Photo',
    'sec.0.lotus': '3D Geometry Enhancement',
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
    'sec.3.wizardBtn': 'Adjust Transfer',
    'sec.3.groupB': 'Stage B · Engraving & Retouch',
    'tool.needle': 'Etching Needle',
    'tool.dry': 'Drypoint Needle',
    'tool.stop': 'Stop-out Varnish',
    'tool.polish': 'Burnisher',
    'sec.3.size': 'Stroke Width',
    'action.undo': 'Undo',
    'action.clear': 'Clear Plate',
    'action.clearLog': 'Clear Log',
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
    'paper.rough': 'Textured Cotton',
    'paper.smooth': 'Smooth Cotton',
    'paper.linen': 'Cotton–Linen · Coarse',
    'paper.rosaspina': 'Rosaspina · Natural Grain',
    'paper.desc.rough': 'Warm white with pronounced texture.',
    'paper.desc.smooth': 'Light white with a smoother surface.',
    'paper.desc.linen': '85% cotton, 15% flax; natural coarse grain.',
    'paper.desc.rosaspina': '60% cotton; natural mould-made grain.',
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
    'view.plate': 'Plate',
    'view.depth': 'Depth',
    'view.print': 'Proof',
    'plate.resLabel': 'Current Resolution',
    'plate.fullscreen': 'View Fullscreen',
    'plate.fullscreenTitle': 'Fullscreen Inspection',
    'plate.gauge': 'Bite {0}s · Depth {1}μm',
    'sheet.toggle': 'Toggle panel expansion',
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
    'wizard.title': 'Plate Setup',
    'wizard.badge': 'M1 → M3 Physical Transfer',
    'wizard.statsReady': 'Current ready master: Detecting...',
    'wizard.sec1': 'Engraving Method',
    'wizard.etchingTitle': 'Etching Needle',
    'wizard.etchingDesc': 'Open the ground, then etch with acid.',
    'wizard.drypointTitle': 'Drypoint Needle',
    'wizard.drypointDesc': 'Cut directly into copper. No acid needed.',
    'wizard.sec2': 'Plate Resolution',
    'wizard.resStandard': 'Standard Light',
    'wizard.res2k': '2K HD (Recommended)',
    'wizard.res3k': '3K Exhibition Grade',
    'wizard.sec3': 'Transfer Layers',
    'wizard.layerAll': 'All Master Artwork',
    'wizard.layerAllSub': 'All vector strokes',
    'wizard.layerContours': 'Contours Only',
    'wizard.layerContoursSub': 'Structural boundary lines',
    'wizard.layerHatching': 'Hatching Only',
    'wizard.layerHatchingSub': 'Dense surface flow lines',
    'wizard.sec4': 'Needle Pressure',
    'wizard.lineWidth': 'Transfer Line Width',
    'action.cancel': 'Cancel',
    'wizard.confirmBtn': 'Start Engraving →',
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
    'about.close': 'Close About',
    'about.intro': 'Turn a photo into a line master, then make and proof your copperplate by hand.',
    'about.stage1Title': 'Make the master',
    'about.stage1Body': 'Choose a photo, refine the lines, and inspect the finished master.',
    'about.stage2Title': 'Etch the plate',
    'about.stage2Body': 'Transfer the master, engrave and etch the plate, then proof it on different papers.',
    'about.guideTitle': 'Getting started',
    'about.guide1': 'Start with a sample or your own photo.',
    'about.guide2': 'Set plate resolution and transfer line width before transferring.',
    'about.guide3': 'Adjust stroke width while engraving; choose paper before proofing.',
    'about.outputTitle': 'Save and export',
    'about.outputBody': 'Export the master as SVG, download a PNG proof, or save plate progress.',
    'about.communityTitle': 'Project and feedback',
    'about.communityBody': 'Find the latest code and download instructions on GitHub. Report bugs or suggest improvements through Issues.',
    'about.repositoryLink': 'Download Latest',
    'about.issuesLink': 'Feedback',
    'about.meta': 'Open-source license: MIT',

    // AI Status
    'model.offline': 'Offline Mode (Geometric)',
    'model.localAi': 'Local AI',
    'model.online': 'Local Model',

    // Two-Stage Progressive Atelier UI Keys
    'nav.step1': 'Create Master',
    'nav.step2': 'Etch Plate',
    'lang.label': 'Interface language',
    'm1.sourcePreview': 'Original photo preview',
    'm1.masterLabel': 'TRANSFER MASTER',
    'm1.redrawing': 'Redrawing master…',
    'status.frameUpdated': 'Frame updated',
    'nav.stages': 'Workflow stages',
    'm1.preview': 'Master preview',
    'm2.canvas': 'Copperplate drawing area',
    'action.cancel': 'Cancel Task',
    'cta.selectPhoto': 'Choose Photo',
    'cta.transferToPlate': 'Work on Plate →',
    'cta.confirmTransfer': 'Transfer & Start Drawing →',
    'cta.startEtch': 'Start Etching',
    'cta.pauseEtch': 'Pause Etching',
    'cta.resumeEtch': 'Resume Etching',
    'cta.toProofPrint': 'Go to Proof →',
    'cta.startEtchNav': 'Go to Etching →',
    'cta.toDrypointProof': 'Go to Proof →',
    'cta.reprint': 'Make Another Proof',
    'm1.initTitle': 'Start with a Photo',
    'm1.initDesc': 'Turn a photo into a line master ready for the plate.',
    'm1.dragTip': 'Drag and drop an image file here directly',
    'm1.noPhoto': 'No photo?',
    'm1.loadDemo': 'Try Sample Image',
    'm1.compTitle': 'Creating Master…',
    'm1.compSub': 'Analyzing curvature flow and contours (Stage 3/5)',
    'm1.compStrokes': '2,410 vector strokes extracted',
    'm1.stepForward': 'Inspect Results →',
    'm1.readyTitle': 'Master Complete',
    'm1.readyCount': '3,892 Vector Strokes',
    'm1.readyDesc': 'Classical double frame and surface hatching synthesized.',
    'm1.changePhoto': 'Replace Photo',
    'm1.sampleText': 'Curvature Hatching & Perspective Contours',
    'm1.filmstripTitle': 'View Process',
    'm1.filmstripTip': 'Click any card to inspect fullscreen or export vector layer',
    'm1.drawerAppearance': 'Appearance',
    'm1.drawerTone': 'Light & Tone',
    'm1.drawerAlgorithm': 'Advanced Settings',
    'm1.lotusDesc': 'Guide hatching along the surface.',
    'm2.step1Title': 'Choose Transfer Method',
    'm2.step1Desc': 'Transfer the master, then draw your own marks.',
    'm2.currentMaster': 'Master Lines',
    'm2.currentMasterLines': '3,892 Vector Strokes',
    'm2.moreTransfer': 'More Transfer Settings ▾',
    'm2.specLabel': 'Plate Resolution:',
    'm2.specVal': '1500 × 1100 (2K)',
    'm2.layerLabel': 'Transfer Layers:',
    'm2.pressureLabel': 'Needle Pressure:',
    'm2.pressureVal': '65%',
    'm2.plateReadyTitle': 'Polished Copperplate (1500 × 1100)',
    'm2.plateReadyDesc': 'Once confirmed, master lines will be transferred onto ground surface.',
    'm2.backToMaster': '← View Master',
    'm2.step2Title': 'Draw by Hand',
    'm2.step2Desc': 'Add lines or refine the plate.',
    'm2.toolsLabel': 'Common Retouching Tools',
    'm2.moreTools': 'More Tools',
    'm2.inscribeStatus': 'Ground scratched (3,892 bare copper lines) · Depth 0.0 μm · Ready for hand inscription',
    'm2.bareCopperLines': 'Bare copper exposed · Not yet submerged',
    'm2.step3Title': 'Control Etching',
    'm2.step3Desc': 'Pause at any time to keep the current depth.',
    'm2.step4Title': 'Ink & Proof',
    'm2.step4Desc': 'Choose paper and inspect the result.',
    'etch.stateStandby': 'Status: Standby (Plate Suspended)',
    'etch.stateBiting': 'Status: Acid Biting (2D PDE)',
    'etch.statePaused': 'Status: Lifted & Paused',
    'etch.state.standby': 'Standby',
    'etch.state.biting': 'Biting',
    'etch.state.paused': 'Paused',
    'etch.timeLabel': 'Bite Duration',
    'etch.depthLabel': 'Average Groove Depth',
    'etch.drawerSettings': 'Etching Settings',
    'etch.plateStandby': 'Plate Suspended · Not in Acid',
    'etch.plateBiting': 'Acid Biting · Grooves Deepening',
    'etch.platePaused': 'Depth Fixed · Ready to Proof',
    'proof.download': 'Download Proof PNG',
    'proof.backToEtch': 'Continue Etching',
    'proof.backToInscribe': 'Back to Drawing',
    'proof.drawerInking': 'Ink & Press Settings',
    'proof.footerTip': 'Proof printing is an iterative feedback loop.',
    'proof.statusDone': 'Debossed Cotton Impression Complete',
    'proof.printCaption': 'Hand-pulled Intaglio Impression',
    'dialog.retransferTitle': 'Re-transfer Will Overwrite Current Plate',
    'dialog.retransferDesc': 'The active plate contains manual inscription or acid bite depth. Re-transferring will clear the plate and apply the new master.',
    'dialog.cancel': 'Cancel (Keep Current Plate)',
    'dialog.saveAndOverwrite': 'Save Backup & Overwrite',
    'dialog.directOverwrite': 'Overwrite Directly →',
    'common.toggle': 'Expand / Collapse ▾',
    'common.standard': 'Standard ▾',
    'common.collapsed': 'Expand ▾'
  },

  'vi-VN': {
    // Header & Workspace Tabs
    'app.title': 'Etchloom',
    'app.subtitle': 'Xưởng in khắc số',
    'tab.master': 'Thiết kế bản mẫu',
    'tab.plate': 'Xưởng bản đồng ảo',
    'lang.toggle': '中文',
    'action.exportScheme': 'Xuất',
    'action.about': 'Giới thiệu',

    // Step Flow Stages
    'step.0.title': 'Ảnh gốc đầu vào',
    'step.1.title': 'Trích xuất nét vẽ tri nhận',
    'step.2.title': 'Trường dòng đẳng cao 3D',
    'step.3.title': 'Đường bao phối cảnh không gian',
    'step.4.title': 'Đường khắc cong theo mặt cong',
    'step.5.title': 'Tổng hợp bản mẫu vector',
    'step.6.title': 'Bản mẫu chuyển',
    'step.intro': 'Bản khắc mẫu được tổng hợp qua 5 giai đoạn hình học. Nhấn vào thẻ để phóng to hoặc xuất lớp.',

    // Card Badges & Actions
    'card.cached': '● Trúng bộ nhớ đệm',
    'card.computing': 'Đang tính toán...',
    'card.done': 'Hoàn thành',
    'card.error': 'Lỗi',
    'card.loupe': 'Kính lúp phóng đại',
    'card.fullscreen': 'Toàn màn hình',
    'card.inspect': 'Xem cận cảnh',
    'card.download': 'Xuất lớp',
    'card.clickInspect': 'Nhấp để xem cận cảnh (cuộn chuột phóng to & kéo thả)',
    'card.initMeta': 'Chờ tính toán...',
    'card.sourceSize': '{0} × {1} · Ảnh gốc',
    'card.aiLine': 'Đã tạo nét AI',
    'card.lineReady': 'Đã tạo nét',
    'card.flowReady': 'Đã tạo luồng đường mức',
    'card.contourCount': '{0} nét viền',
    'card.hatchingCount': '{0} nét gạch',
    'card.masterCount': '{0} nét bản mẫu',
    'card.transferReady': 'Sẵn sàng chuyển bản',
    'card.pixelBase': 'Độ phân giải ảnh gốc',
    'card.rawRatio': 'Tỷ lệ ảnh gốc',
    'card.neuralLine': 'Nét vẽ mạng nơ-ron tri nhận',
    'card.vectorContours': 'Đường bao không gian',
    'card.surfaceHatching': 'Nét gạch mặt cong',
    'card.masterVectors': 'Đường nét bản mẫu vector',
    'card.cottonDeboss': 'Bản mẫu chuyển',

    // Sidebar 00: 图像感知
    'sec.0.title': '00 / Tri nhận hình ảnh',
    'sec.0.upload': 'Tải ảnh lên',
    'sec.0.lotus': 'Tăng cường hình học 3D',
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
    'sec.3.wizardBtn': 'Chỉnh cách chuyển bản',
    'sec.3.groupB': 'Công đoạn B · Khắc nét & sửa bản',
    'tool.needle': 'Kim khắc axit',
    'tool.dry': 'Kim khắc khô (Drypoint)',
    'tool.stop': 'Sơn phủ chống axít',
    'tool.polish': 'Dao mài',
    'sec.3.size': 'Độ rộng nét',
    'action.undo': 'Hoàn tác',
    'action.clear': 'Xóa bản đồng',
    'action.clearLog': 'Xóa nhật ký',
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
    'paper.rough': 'Giấy cotton vân thô',
    'paper.smooth': 'Giấy cotton vân mịn',
    'paper.linen': 'Giấy cotton–lanh · Vân thô',
    'paper.rosaspina': 'Rosaspina · Vân tự nhiên',
    'paper.desc.rough': 'Trắng ấm, bề mặt có vân rõ.',
    'paper.desc.smooth': 'Trắng sáng, bề mặt mịn hơn.',
    'paper.desc.linen': '85% cotton, 15% lanh; vân thô tự nhiên.',
    'paper.desc.rosaspina': '60% cotton; vân tự nhiên của giấy làm bằng khuôn tròn.',
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
    'view.depth': 'Độ sâu',
    'view.print': 'Bản in thử',
    'plate.resLabel': 'Độ phân giải hiện tại',
    'plate.fullscreen': 'Xem toàn màn hình',
    'plate.fullscreenTitle': 'Kiểm tra toàn màn hình',
    'plate.gauge': 'Ăn mòn {0}s · Sâu {1}μm',
    'sheet.toggle': 'Bật/tắt mở rộng bảng điều khiển',
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
    'wizard.title': 'Thiết lập bản đồng',
    'wizard.badge': 'M1 → M3 Chuyển giao vật lý',
    'wizard.statsReady': 'Bản mẫu sẵn sàng: Đang kiểm tra...',
    'wizard.sec1': 'Cách khắc',
    'wizard.etchingTitle': 'Kim khắc axit',
    'wizard.etchingDesc': 'Rạch lớp phủ rồi dùng axit ăn mòn.',
    'wizard.drypointTitle': 'Kim khắc khô',
    'wizard.drypointDesc': 'Khắc trực tiếp trên đồng, không dùng axit.',
    'wizard.sec2': 'Độ phân giải bản đồng',
    'wizard.resStandard': 'Tiêu chuẩn nhẹ',
    'wizard.res2k': '2K Độ nét cao (Khuyên dùng)',
    'wizard.res3k': '3K Cấp độ triển lãm',
    'wizard.sec3': 'Lớp chuyển bản',
    'wizard.layerAll': 'Toàn bộ bản mẫu',
    'wizard.layerAllSub': 'Tất cả đường nét vector',
    'wizard.layerContours': 'Chỉ đường bao không gian',
    'wizard.layerContoursSub': 'Đường viền cấu trúc',
    'wizard.layerHatching': 'Chỉ nét gạch mặt cong',
    'wizard.layerHatchingSub': 'Nét gạch uốn lượn bề mặt',
    'wizard.sec4': 'Lực mũi kim',
    'wizard.lineWidth': 'Độ rộng nét chuyển bản',
    'action.cancel': 'Hủy',
    'wizard.confirmBtn': 'Bắt đầu khắc →',
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
    'about.close': 'Đóng trang giới thiệu',
    'about.intro': 'Chuyển ảnh thành bản mẫu nét, rồi tự tay làm bản đồng và in thử.',
    'about.stage1Title': 'Tạo bản mẫu',
    'about.stage1Body': 'Chọn ảnh, tinh chỉnh nét và xem lại bản mẫu đã tạo.',
    'about.stage2Title': 'Khắc bản đồng',
    'about.stage2Body': 'Chuyển bản mẫu, khắc và ăn mòn bản đồng, rồi in thử trên nhiều loại giấy.',
    'about.guideTitle': 'Bắt đầu',
    'about.guide1': 'Bắt đầu với ảnh mẫu hoặc ảnh của bạn.',
    'about.guide2': 'Chọn độ phân giải bản đồng và độ rộng nét trước khi chuyển bản.',
    'about.guide3': 'Điều chỉnh độ rộng nét khi khắc; chọn giấy trước khi in thử.',
    'about.outputTitle': 'Lưu và xuất',
    'about.outputBody': 'Xuất bản mẫu SVG, tải bản in thử PNG hoặc lưu tiến trình bản đồng.',
    'about.communityTitle': 'Dự án và phản hồi',
    'about.communityBody': 'Xem mã nguồn mới nhất và hướng dẫn tải xuống trên GitHub. Báo lỗi hoặc đề xuất cải tiến qua Issues.',
    'about.repositoryLink': 'Tải bản mới nhất',
    'about.issuesLink': 'Phản hồi',
    'about.meta': 'Giấy phép mã nguồn mở: MIT',

    // AI Status
    'model.offline': 'Chế độ ngoại tuyến (Hình học thuần)',
    'model.localAi': 'AI Cục bộ',
    'model.online': 'Mô hình cục bộ',

    // Two-Stage Progressive Atelier UI Keys
    'nav.step1': 'Tạo bản mẫu',
    'nav.step2': 'Khắc bản đồng',
    'lang.label': 'Ngôn ngữ giao diện',
    'm1.sourcePreview': 'Xem trước ảnh gốc',
    'm1.masterLabel': 'BẢN MẪU CHUYỂN',
    'm1.redrawing': 'Đang vẽ lại bản mẫu…',
    'status.frameUpdated': 'Đã đổi khung',
    'nav.stages': 'Các bước làm việc',
    'm1.preview': 'Xem trước bản mẫu',
    'm2.canvas': 'Vùng vẽ bản đồng',
    'action.cancel': 'Hủy Tác Vụ',
    'cta.selectPhoto': 'Chọn ảnh',
    'cta.transferToPlate': 'Làm bản đồng →',
    'cta.confirmTransfer': 'Chuyển bản và bắt đầu khắc →',
    'cta.startEtch': 'Bắt đầu ăn mòn',
    'cta.pauseEtch': 'Tạm dừng ăn mòn',
    'cta.resumeEtch': 'Tiếp tục ăn mòn',
    'cta.toProofPrint': 'Đến bước in thử →',
    'cta.startEtchNav': 'Đến bước ăn mòn →',
    'cta.toDrypointProof': 'Đến bước in thử →',
    'cta.reprint': 'In thử lần nữa',
    'm1.initTitle': 'Bắt đầu từ ảnh',
    'm1.initDesc': 'Biến ảnh thành bản mẫu đường nét để chuyển lên bản đồng.',
    'm1.dragTip': 'Hỗ trợ kéo thả tập tin ảnh trực tiếp vào đây',
    'm1.noPhoto': 'Chưa có ảnh?',
    'm1.loadDemo': 'Thử ảnh mẫu',
    'm1.compTitle': 'Đang tạo bản mẫu…',
    'm1.compSub': 'Phân tích độ cong bề mặt và đường bao (Giai đoạn 3/5)',
    'm1.compStrokes': 'Đã trích xuất 2,410 nét vector',
    'm1.stepForward': 'Xem Kết Quả →',
    'm1.readyTitle': 'Bản mẫu đã hoàn tất',
    'm1.readyCount': '3,892 Nét Vector',
    'm1.readyDesc': 'Khung viền cổ điển và nét đan bóng cong đã được tổng hợp.',
    'm1.changePhoto': 'Đổi ảnh',
    'm1.sampleText': 'Nét đan bóng cong và đường viền phối cảnh',
    'm1.filmstripTitle': 'Xem quy trình',
    'm1.filmstripTip': 'Nhấp vào thẻ để phóng to kiểm tra hoặc tải lớp vector',
    'm1.drawerAppearance': 'Điều chỉnh hình thức',
    'm1.drawerTone': 'Ánh sáng và sắc độ',
    'm1.drawerAlgorithm': 'Cài đặt nâng cao',
    'm1.lotusDesc': 'Dẫn nét theo bề mặt vật thể.',
    'm2.step1Title': 'Chọn cách chuyển bản',
    'm2.step1Desc': 'Chuyển nét từ bản mẫu, rồi tự tay khắc thêm.',
    'm2.currentMaster': 'Nét bản mẫu',
    'm2.currentMasterLines': '3,892 Nét Vector',
    'm2.moreTransfer': 'Thêm Thiết Lập Chuyển Bản ▾',
    'm2.specLabel': 'Quy Cách Độ Phân Giải:',
    'm2.specVal': '1500 × 1100 (2K)',
    'm2.layerLabel': 'Lớp Chuyển Bản:',
    'm2.pressureLabel': 'Áp Lực Mũi Kim:',
    'm2.pressureVal': '65%',
    'm2.plateReadyTitle': 'Bản Đồng Đánh Bóng (1500 × 1100)',
    'm2.plateReadyDesc': 'Sau khi xác nhận, nét vẽ sẽ được in lên bề mặt lớp vec-ni chống axit.',
    'm2.backToMaster': '← Xem bản mẫu',
    'm2.step2Title': 'Tự tay khắc',
    'm2.step2Desc': 'Thêm nét hoặc chỉnh sửa bản đồng.',
    'm2.toolsLabel': 'Công Cụ Khắc Thông Dụng',
    'm2.moreTools': 'Thêm công cụ',
    'm2.inscribeStatus': 'Đã cào lộ đồng (3,892 nét chuẩn) · Độ sâu 0.0 μm · Mọi nét tay đều sẽ ăn mòn thực',
    'm2.bareCopperLines': 'Đồng trần đã lộ rõ · Chưa nhúng vào bể axit',
    'm2.step3Title': 'Điều khiển ăn mòn',
    'm2.step3Desc': 'Có thể tạm dừng bất cứ lúc nào để giữ độ sâu hiện tại.',
    'm2.step4Title': 'Thoa mực và in thử',
    'm2.step4Desc': 'Chọn giấy và xem bản in.',
    'etch.stateStandby': 'Trạng thái: Chờ bắt đầu (Bản đồng treo trên bể)',
    'etch.stateBiting': 'Trạng thái: Đang ăn mòn axit (PDE 2D)',
    'etch.statePaused': 'Trạng thái: Đã nhấc lên, tạm dừng',
    'etch.state.standby': 'Chờ ăn mòn',
    'etch.state.biting': 'Đang ăn mòn',
    'etch.state.paused': 'Đã tạm dừng',
    'etch.timeLabel': 'Thời gian ăn mòn',
    'etch.depthLabel': 'Độ sâu rãnh trung bình',
    'etch.drawerSettings': 'Cài đặt ăn mòn',
    'etch.plateStandby': 'Bản đồng treo chờ · Chưa nhúng axit',
    'etch.plateBiting': 'Axit đang ăn mòn · Rãnh nét sâu dần',
    'etch.platePaused': 'Độ sâu cố định · Có thể in thử ngay',
    'proof.download': 'Tải bản in thử PNG',
    'proof.backToEtch': 'Tiếp tục ăn mòn',
    'proof.backToInscribe': 'Quay lại khắc',
    'proof.drawerInking': 'Cài đặt mực và ép in',
    'proof.footerTip': 'In thử nghiệm là vòng lặp sáng tạo, ưng ý có thể lồng khung ngay',
    'proof.statusDone': 'Đã hoàn thành in dập nổi giấy bông',
    'proof.printCaption': 'Dấu ấn in lõm thủ công trên giấy bông',
    'dialog.retransferTitle': 'Chuyển Lại Sẽ Ghi Đè Bản Khắc Hiện Tại',
    'dialog.retransferDesc': 'Bản đồng hiện tại có nét khắc thủ công hoặc độ sâu ăn mòn axit. Chuyển lại sẽ xóa toàn bộ để áp dụng mẫu mới.',
    'dialog.cancel': 'Hủy (Giữ Bản Khắc Hiện Tại)',
    'dialog.saveAndOverwrite': 'Lưu Bản Sao & Ghi Đè',
    'dialog.directOverwrite': 'Ghi Đè Trực Tiếp →',
    'common.toggle': 'Thu gọn / Mở rộng ▾',
    'common.standard': 'Chuẩn ▾',
    'common.collapsed': 'Mở rộng ▾'
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

    const altTexts = doc.querySelectorAll('[data-i18n-alt]');
    altTexts.forEach(el => {
      const key = el.dataset.i18nAlt || el.getAttribute('data-i18n-alt');
      if (key) el.alt = this.t(key);
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
