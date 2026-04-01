/**
 * GameRoot.ts — 整页 UI 由代码动态拼出来（未用 Prefab）。
 *
 * 【怎么改「整页容器 / 布局」】
 * 1) 设计分辨率：在 Cocos 编辑器里选 Canvas，看「设计分辨率」(如 750×1334)。
 *    本脚本里 Root / PageBg 的宽高应与之接近，否则会出现裁切或留白。
 * 2) 改「整页大小」：改 buildScene() 里 createSizedNode('Root', 宽, 高) 与 pageBg 的宽高，二者保持一致。
 * 3) 改「上下分区位置」：改 root.addChild 之后各块的 setPosition(0, Y, 0)。
 *    - 父节点是 Root，子节点坐标原点在父节点中心；Y 越大越靠上（屏幕上方）。
 *    - 典型改法：整体往上移 → 所有块的 Y 同时加一个常数；或只调某一块的 Y 拉大间距。
 * 4) 改「某一区域内的控件」：进对应的 createTopBar / createTreatmentPanel 等函数，
 *    改里面子节点的 setPosition / createSizedNode 尺寸即可（相对该面板中心）。
 * 5) 进阶：若要在编辑器里拖布局，可把 Root 下各块改成 Prefab + Widget 组件；
 *    本文件仍可只保留逻辑，通过 @property 引用节点（此处未做，保持单文件可跑）。
 */
import {
  _decorator,
  Color,
  Component,
  EventTouch,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  UITransform,
  UIOpacity,
  Vec2,
  Vec3,
  VerticalTextAlignment,
  Tween,
  log,
  tween,
} from 'cc';
import { level1Config } from './config/level1';
import { level2Config } from './config/level2';
import { i18n } from './core/I18n';
import { ToolType, ZoneType, LevelConfig } from './types';

const { ccclass } = _decorator;

type ToolRuntime = {
  id: ToolType;
  node: Node;
  label: Label;
  descLabel: Label;
  origin: Vec3;
};

type ZoneRuntime = {
  id: ZoneType;
  node: Node;
  graphics: Graphics;
  label: Label;
  idleColor: Color;
  doneColor: Color;
};

/** 挂在 Canvas（或其子节点）上；start 时清空子节点并 buildScene 搭 UI。 */
@ccclass('GameRoot')
export class GameRoot extends Component {
  // Fixed portrait design size used by this scene. These are logical units, not CSS pixels.
  private readonly designWidth = 750;
  private readonly designHeight = 1334;
  // Fill the full design width to avoid the previous "narrow card in the middle" feeling.
  private readonly sideInset = 0;

  private health = 0;
  private currentLevel = 1;
  private healthFill!: Node;
  private healthLabel!: Label;
  private percentLabel!: Label;
  private diagnosisLabel!: Label;
  private feedbackLabel!: Label;
  private patientNode!: Node;
  private hintPanel!: Node;
  private settlementPanel!: Node;

  private draggingTool: ToolRuntime | null = null;
  private toolMap = new Map<ToolType, ToolRuntime>();
  private zoneMap = new Map<ZoneType, ZoneRuntime>();
  private completed = new Set<string>();
  private locked = false;

  start() {
    i18n.init();
    this.buildScene();
  }

  private getCurrentConfig(): LevelConfig {
    return this.currentLevel === 2 ? level2Config : level1Config;
  }

  private get panelWidth() {
    return this.designWidth - this.sideInset * 2;
  }

  /**
   * 页面骨架：唯一「整页容器」是 root（逻辑尺寸 750×1334，与常见竖屏设计稿一致）。
   * 这里采用“整屏式主界面”：
   * - pageBg 先铺满整页
   * - 顶栏 / 状态条 / 治疗区 / 诊断条 / 工具栏 也都使用接近整页宽度的满宽布局
   * 这样视觉上不会再像一张窄卡片悬在中间。
   */
  private buildScene() {
    this.node.removeAllChildren();
    this.zoneMap.clear();
    this.toolMap.clear();
    this.completed.clear();
    this.draggingTool = null;
    this.locked = false;

    // 整页逻辑尺寸（宽, 高）。改分辨率时同步改这里 + 下面 PageBg + 编辑器 Canvas 设计分辨率。
    const root = this.createSizedNode('Root', this.designWidth, this.designHeight);
    this.node.addChild(root);

    // Full-screen background. If this is not full-width visually, the preview is still using stale bundles.
    const pageBg = this.createRectNode('PageBg', this.designWidth, this.designHeight, new Color(8, 18, 38, 255), 0);
    root.addChild(pageBg);

    // Runtime sanity log for width debugging.
    log(`[GameRoot] design=${this.designWidth}x${this.designHeight}, panelWidth=${this.panelWidth}, sideInset=${this.sideInset}`);

    // Tiny build marker to verify the latest script is actually running.
    const buildTag = this.createLabelNode('BuildTag', 'build: fullwidth-2026-03-31-b', 14, new Color(90, 140, 210, 255), 300, 24);
    root.addChild(buildTag.node);
    buildTag.node.setPosition(-210, 650, 0);

    // —— 以下 Y 均为相对 root 中心；数值越大越靠屏幕上方 ——
    const topBar = this.createTopBar();
    root.addChild(topBar);
    topBar.setPosition(0, 580, 0);

    const statusBar = this.createStatusBar();
    root.addChild(statusBar);
    statusBar.setPosition(0, 470, 0);

    const treatmentPanel = this.createTreatmentPanel();
    root.addChild(treatmentPanel);
    treatmentPanel.setPosition(0, 115, 0);

    const diagnosisPanel = this.createDiagnosisPanel();
    root.addChild(diagnosisPanel);
    diagnosisPanel.setPosition(0, -285, 0);

    const toolDock = this.createToolDock();
    root.addChild(toolDock);
    toolDock.setPosition(0, -555, 0);

    this.hintPanel = this.createHintPanel();
    root.addChild(this.hintPanel);
    this.hintPanel.active = false;

    this.settlementPanel = this.createSettlementPanel();
    root.addChild(this.settlementPanel);
    this.settlementPanel.active = false;

    this.resetState();
  }

  /** 顶部标题栏：内部子元素位置相对 TopBar 中心。 */
  private createTopBar(): Node {
    const top = this.createSizedNode('TopBar', this.panelWidth, 116);

    const bg = this.createRectNode('TopBarBg', this.panelWidth, 116, new Color(24, 30, 44, 255), 8);
    top.addChild(bg);

    const title = this.createLabelNode('CaseTitle', this.getCurrentConfig().title, 38, new Color(200, 220, 255, 255), 590, 74);
    top.addChild(title.node);
    title.node.setPosition(-72, 0, 0);

    const hintBtn = this.createButtonNode('HintBtn', i18n.t('ui.hint'), 126, 62, new Color(0, 160, 255, 255), new Color(255, 255, 255, 255), 16);
    top.addChild(hintBtn);
    hintBtn.setPosition(286, 0, 0);
    hintBtn.on(Node.EventType.TOUCH_END, () => {
      this.hintPanel.active = !this.hintPanel.active;
    });

    return top;
  }

  /** 病人标签 + 健康条区域。 */
  private createStatusBar(): Node {
    const bar = this.createSizedNode('StatusBar', this.panelWidth, 96);

    const bg = this.createRectNode('StatusBg', this.panelWidth, 96, new Color(22, 28, 42, 255), 8);
    bar.addChild(bg);

    const patientTag = this.createRectNode('PatientTagBg', 210, 46, new Color(0, 120, 200, 255), 12);
    bar.addChild(patientTag);
    patientTag.setPosition(-248, 0, 0);

    const patientTagLabel = this.createLabelNode(
      'PatientTagLabel',
      this.getCurrentConfig().patientTag || i18n.t('game.patientTag'),
      23,
      new Color(255, 255, 255, 255),
      186,
      46,
    );
    patientTag.addChild(patientTagLabel.node);

    this.percentLabel = this.createLabelNode('PercentLabel', '0%', 30, new Color(0, 220, 130, 255), 90, 44);
    bar.addChild(this.percentLabel.node);
    this.percentLabel.node.setPosition(-108, 0, 0);

    const progressBg = this.createRectNode('ProgressBg', 280, 36, new Color(40, 48, 68, 255), 10);
    bar.addChild(progressBg);
    progressBg.setPosition(196, 0, 0);

    const progressNode = this.createSizedNode('ProgressNode', 254, 24);
    progressBg.addChild(progressNode);
    progressNode.setPosition(0, 0, 0);

    this.healthFill = this.createRectNode('ProgressFill', 254, 24, new Color(0, 220, 130, 255), 8);
    progressNode.addChild(this.healthFill);
    const trans = this.healthFill.getComponent(UITransform)!;
    trans.setAnchorPoint(0, 0.5);
    this.healthFill.setPosition(-127, 0, 0);
    this.healthFill.setScale(0, 1, 1);

    this.healthLabel = this.createLabelNode('HealthLabel', `${i18n.t('ui.health')} 0%`, 22, new Color(140, 160, 200, 255), 210, 38);
    bar.addChild(this.healthLabel.node);
    this.healthLabel.node.setPosition(0, -30, 0);

    return bar;
  }

  /** 中部主操作区：床、人物、肌肉热区 chestZone/backZone 的坐标都在这里，改拖拽判定区域时同步改 pickZone 依赖的 node 位置/尺寸。 */
  private createTreatmentPanel(): Node {
    const panel = this.createSizedNode('TreatmentPanel', this.panelWidth, 630);
    const cfg = this.getCurrentConfig();

    // 主操作区直接整宽展开，让中部真正成为“游戏主体画面”。
    const bg = this.createRectNode('TreatmentBg', this.panelWidth, 630, new Color(26, 32, 48, 255), 0);
    panel.addChild(bg);

    const bed = this.createRectNode('Bed', 650, 368, new Color(34, 42, 62, 255), 18);
    panel.addChild(bed);
    bed.setPosition(0, -5, 0);

    const pillow = this.createRectNode('Pillow', 142, 48, new Color(50, 60, 85, 255), 14);
    panel.addChild(pillow);
    pillow.setPosition(-182, 120, 0);

    const body = this.createRectNode('PatientBody', 376, 144, new Color(255, 220, 185, 255), 44);
    panel.addChild(body);
    body.setPosition(24, 26, 0);
    body.angle = -8;

    const head = this.createCircleNode('PatientHead', 62, new Color(255, 220, 185, 255));
    panel.addChild(head);
    head.setPosition(-188, 80, 0);

    const hair = this.createCircleNode('Hair', 62, new Color(30, 20, 10, 255));
    head.addChild(hair);
    hair.setScale(1.05, 0.75, 1);
    hair.setPosition(0, 18, 0);

    const glasses = this.createRectNode('Glasses', 84, 24, new Color(100, 120, 160, 255), 8);
    head.addChild(glasses);
    glasses.setPosition(8, -2, 0);

    const arm = this.createRectNode('Arm', 126, 26, new Color(255, 220, 185, 255), 12);
    panel.addChild(arm);
    arm.setPosition(-98, 6, 0);
    arm.angle = -20;

    const legs = this.createRectNode('Legs', 146, 54, new Color(60, 80, 120, 255), 24);
    panel.addChild(legs);
    legs.setPosition(205, -14, 0);
    legs.angle = -8;

    const desk = this.createRectNode('Desk', 720, 34, new Color(40, 50, 72, 255), 12);
    panel.addChild(desk);
    desk.setPosition(0, 188, 0);

    // 热区1（紧张区，红色）
    const zone1Color = new Color(255, 60, 80, 200);
    const zone1DoneColor = new Color(0, 220, 130, 220);
    const chestZone = this.createRectNode('ChestZone', 130, 130, zone1Color, 65);
    panel.addChild(chestZone);
    chestZone.setPosition(12, 55, 0);
    const zone1Id = cfg.targets[0].zone;
    const zone1LabelKey = `ui.zone.${zone1Id}`;
    const chestLabel = this.addZoneLabel(chestZone, i18n.t(zone1LabelKey) || zone1Id);

    const chestOpacity = chestZone.addComponent(UIOpacity);
    chestOpacity.opacity = 180;
    tween(chestOpacity).to(0.45, { opacity: 90 }).to(0.45, { opacity: 205 }).union().repeatForever().start();

    // 热区2（无力区，蓝色）
    const zone2Color = new Color(0, 160, 255, 180);
    const zone2DoneColor = new Color(255, 200, 0, 220);
    const backZone = this.createRectNode('BackZone', 136, 136, zone2Color, 68);
    panel.addChild(backZone);
    backZone.setPosition(132, 74, 0);
    const zone2Id = cfg.targets[1].zone;
    const zone2LabelKey = `ui.zone.${zone2Id}`;
    const backLabel = this.addZoneLabel(backZone, i18n.t(zone2LabelKey) || zone2Id);

    const patientCaption = this.createLabelNode('PatientCaption', cfg.patientName, 28, new Color(140, 160, 200, 255), 320, 44);
    panel.addChild(patientCaption.node);
    patientCaption.node.setPosition(0, -248, 0);

    this.patientNode = body;
    this.zoneMap.set(cfg.targets[0].zone, {
      id: cfg.targets[0].zone,
      node: chestZone,
      graphics: chestZone.getComponent(Graphics)!,
      label: chestLabel,
      idleColor: zone1Color,
      doneColor: zone1DoneColor,
    });
    this.zoneMap.set(cfg.targets[1].zone, {
      id: cfg.targets[1].zone,
      node: backZone,
      graphics: backZone.getComponent(Graphics)!,
      label: backLabel,
      idleColor: zone2Color,
      doneColor: zone2DoneColor,
    });

    return panel;
  }

  /** 诊断文案 + 操作反馈文案。 */
  private createDiagnosisPanel(): Node {
    const panel = this.createSizedNode('DiagnosisPanel', this.panelWidth, 144);

    const bg = this.createRectNode('DiagnosisBg', this.panelWidth, 144, new Color(20, 26, 40, 255), 0);
    panel.addChild(bg);

    this.diagnosisLabel = this.createLabelNode(
      'DiagnosisLabel',
      `${i18n.t('ui.diagnosisLabel')}：${this.getCurrentConfig().diagnosis || i18n.t('game.diagnosis')}`,
      32,
      new Color(200, 220, 255, 255),
      724,
      54,
    );
    panel.addChild(this.diagnosisLabel.node);
    this.diagnosisLabel.node.setPosition(0, 34, 0);

    this.feedbackLabel = this.createLabelNode('FeedbackLabel', i18n.t('feedback.default'), 24, new Color(120, 140, 180, 255), 724, 58);
    panel.addChild(this.feedbackLabel.node);
    this.feedbackLabel.node.setPosition(0, -30, 0);

    return panel;
  }

  /** 底部工具槽；fascia/band 的 origin 用于拖拽结束弹回原位。 */
  private createToolDock(): Node {
    const dock = this.createSizedNode('ToolDock', this.panelWidth, 252);
    const cfg = this.getCurrentConfig();

    const bg = this.createRectNode('DockBg', this.panelWidth, 252, new Color(16, 20, 32, 255), 0);
    dock.addChild(bg);

    const dockTitle = this.createLabelNode('DockTitle', i18n.t('ui.toolDock'), 30, new Color(140, 160, 200, 255), 340, 42);
    dock.addChild(dockTitle.node);
    dockTitle.node.setPosition(0, 84, 0);

    const tool1Id = cfg.targets[0].tool;
    const tool2Id = cfg.targets[1].tool;
    const tool1LabelKey = `ui.tool.${tool1Id}`;
    const tool1DescKey = `ui.tool.${tool1Id}.desc`;
    const tool2LabelKey = `ui.tool.${tool2Id}`;
    const tool2DescKey = `ui.tool.${tool2Id}.desc`;

    const tool1 = this.createToolNode(
      tool1Id,
      i18n.t(tool1LabelKey) || tool1Id,
      i18n.t(tool1DescKey) || '',
      new Color(30, 38, 58, 255),
      new Color(200, 220, 255, 255),
      new Color(120, 140, 180, 255),
    );
    dock.addChild(tool1.node);
    tool1.node.setPosition(-194, -28, 0);
    tool1.origin = tool1.node.getPosition().clone();

    const tool2 = this.createToolNode(
      tool2Id,
      i18n.t(tool2LabelKey) || tool2Id,
      i18n.t(tool2DescKey) || '',
      new Color(30, 38, 58, 255),
      new Color(200, 220, 255, 255),
      new Color(120, 140, 180, 255),
    );
    dock.addChild(tool2.node);
    tool2.node.setPosition(194, -28, 0);
    tool2.origin = tool2.node.getPosition().clone();

    this.toolMap.set(tool1Id, tool1);
    this.toolMap.set(tool2Id, tool2);
    return dock;
  }

  private createToolNode(
    id: ToolType,
    text: string,
    desc: string,
    cardColor: Color,
    titleColor: Color,
    descColor: Color,
  ): ToolRuntime {
    const node = this.createRectNode(`Tool-${id}`, 230, 140, cardColor, 22);

    let icon: Node;
    if (id === ToolType.FasciaBall) {
      icon = this.createCircleNode(`${id}-Icon`, 28, new Color(0, 180, 120, 255));
    } else if (id === ToolType.FoamRoller) {
      icon = this.createRectNode(`${id}-Icon`, 60, 28, new Color(0, 180, 120, 255), 14);
    } else if (id === ToolType.ResistanceBand) {
      icon = this.createBandIcon(`${id}-Icon`, new Color(0, 200, 120, 255));
    } else {
      icon = this.createBandIcon(`${id}-Icon`, new Color(143, 154, 173, 255));
    }
    node.addChild(icon);
    icon.setPosition(0, 22, 0);

    const label = this.createLabelNode(`${id}-Title`, text, 32, titleColor, 182, 46);
    node.addChild(label.node);
    label.node.setPosition(0, -18, 0);

    const descLabel = this.createLabelNode(`${id}-Desc`, desc, 24, descColor, 182, 36);
    node.addChild(descLabel.node);
    descLabel.node.setPosition(0, -52, 0);

    const runtime: ToolRuntime = {
      id,
      node,
      label,
      descLabel,
      origin: Vec3.ZERO.clone(),
    };

    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onToolStart(runtime, event));
    node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.onToolMove(runtime, event));
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onToolEnd(runtime, event));
    node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.onToolEnd(runtime, event));
    return runtime;
  }

  /** 全屏半透明遮罩 + 中间弹框；尺寸与 Root 一致，避免与 Canvas 设计分辨率错位时露边。 */
  private createHintPanel(): Node {
    const panel = this.createRectNode('HintOverlay', this.designWidth, this.designHeight, new Color(10, 14, 24, 180), 0);

    const box = this.createRectNode('HintBox', 560, 360, new Color(22, 28, 44, 255), 24);
    panel.addChild(box);
    box.setPosition(0, 130, 0);

    const title = this.createLabelNode('HintTitle', i18n.t('hint.title'), 34, new Color(0, 220, 130, 255), 460, 56);
    box.addChild(title.node);
    title.node.setPosition(0, 110, 0);

    const txt = this.createLabelNode('HintText', i18n.t('hint.text'), 24, new Color(160, 180, 220, 255), 460, 170);
    box.addChild(txt.node);
    txt.node.setPosition(0, 10, 0);

    const confirm = this.createButtonNode('HintConfirm', i18n.t('hint.confirm'), 220, 64, new Color(0, 160, 255, 255), new Color(255, 255, 255, 255), 16);
    box.addChild(confirm);
    confirm.setPosition(0, -115, 0);
    confirm.on(Node.EventType.TOUCH_END, () => {
      panel.active = false;
    });

    panel.on(Node.EventType.TOUCH_END, () => {
      panel.active = false;
    });

    return panel;
  }

  /** 通关全屏层；布局与 Hint 类似，改 box.setPosition 可整体上移/下移弹窗。 */
  private createSettlementPanel(): Node {
    const panel = this.createRectNode('SettlementPanel', this.designWidth, this.designHeight, new Color(10, 14, 20, 200), 0);
    const cfg = this.getCurrentConfig();

    const box = this.createRectNode('SettlementBox', 600, 560, new Color(22, 28, 44, 255), 28);
    panel.addChild(box);
    box.setPosition(0, 40, 0);

    const title = this.createLabelNode('SettlementTitle', i18n.t('settlement.title'), 40, new Color(0, 220, 130, 255), 500, 60);
    box.addChild(title.node);
    title.node.setPosition(0, 192, 0);

    const descText = cfg.id === 2 ? i18n.t('settlement.desc2') : i18n.t('settlement.desc');
    const desc = this.createLabelNode('SettlementDesc', descText, 28, new Color(180, 200, 240, 255), 500, 80);
    box.addChild(desc.node);
    desc.node.setPosition(0, 108, 0);

    const tipTitle = this.createLabelNode('SettlementTipTitle', '科普小贴士', 24, new Color(0, 160, 200, 255), 460, 40);
    box.addChild(tipTitle.node);
    tipTitle.node.setPosition(0, 34, 0);

    const tipText = cfg.id === 2 ? i18n.t('settlement.tip2') : i18n.t('settlement.tip');
    const tip = this.createLabelNode('SettlementTip', tipText, 24, new Color(120, 140, 180, 255), 460, 110);
    box.addChild(tip.node);
    tip.node.setPosition(0, -44, 0);

    const shareBtn = this.createButtonNode('ShareBtn', i18n.t('settlement.share'), 420, 74, new Color(0, 220, 130, 255), new Color(255, 255, 255, 255), 18);
    box.addChild(shareBtn);
    shareBtn.setPosition(0, -160, 0);
    shareBtn.on(Node.EventType.TOUCH_END, () => this.shareToWechat());

    const restartBtn = this.createButtonNode('RestartBtn', i18n.t('settlement.restart'), 200, 66, new Color(0, 120, 255, 255), new Color(255, 255, 255, 255), 18);
    box.addChild(restartBtn);
    restartBtn.setPosition(-112, -254, 0);
    restartBtn.on(Node.EventType.TOUCH_END, () => this.restartLevel());

    const nextBtn = this.createButtonNode('NextBtn', i18n.t('settlement.next'), 200, 66, new Color(30, 38, 58, 255), new Color(140, 160, 200, 255), 18);
    box.addChild(nextBtn);
    nextBtn.setPosition(112, -254, 0);
    nextBtn.on(Node.EventType.TOUCH_END, () => {
      if (this.currentLevel === 1) {
        this.currentLevel = 2;
        this.buildScene();
      } else {
        this.showFeedback(i18n.t('settlement.more'), new Color(255, 200, 80, 255));
        this.settlementPanel.active = false;
      }
    });

    return panel;
  }

  private onToolStart(tool: ToolRuntime, _event: EventTouch) {
    if (this.locked) {
      return;
    }
    this.draggingTool = tool;
    tool.node.setSiblingIndex(tool.node.parent?.children.length || 0);
    tool.node.setScale(1.08, 1.08, 1);
  }

  private onToolMove(tool: ToolRuntime, event: EventTouch) {
    if (this.locked || this.draggingTool !== tool) {
      return;
    }
    const location = event.getUILocation();
    const parent = tool.node.parent;
    if (!parent) {
      return;
    }
    const parentTransform = parent.getComponent(UITransform);
    if (!parentTransform) {
      return;
    }
    const localPos = parentTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
    tool.node.setPosition(localPos);
  }

  private onToolEnd(tool: ToolRuntime, event: EventTouch) {
    if (this.locked || this.draggingTool !== tool) {
      this.resetTool(tool);
      return;
    }

    const location = event.getUILocation();
    const droppedZone = this.pickZone(new Vec2(location.x, location.y));
    if (!droppedZone) {
      this.showFeedback(i18n.t('feedback.invalidDrop'), new Color(214, 123, 87, 255));
      this.resetTool(tool);
      return;
    }

    const target = this.getCurrentConfig().targets.find((it) => it.tool === tool.id && it.zone === droppedZone);
    if (!target) {
      this.showFeedback(i18n.t('feedback.wrongTool'), new Color(221, 97, 97, 255));
      this.shakeNode(this.patientNode);
      this.resetTool(tool);
      return;
    }

    const token = `${tool.id}-${droppedZone}`;
    if (this.completed.has(token)) {
      this.showFeedback(i18n.t('feedback.repeated'), new Color(121, 132, 150, 255));
      this.resetTool(tool);
      return;
    }

    this.completed.add(token);
    const cfg = this.getCurrentConfig();
    const isFirstTool = tool.id === cfg.targets[0].tool;
    if (isFirstTool) {
      const key = this.currentLevel === 2 ? 'feedback.correctRelax2' : 'feedback.correctRelax';
      this.showFeedback(i18n.t(key), new Color(0, 200, 120, 255));
      this.finishZone(cfg.targets[0].zone);
    } else {
      const key = this.currentLevel === 2 ? 'feedback.correctStrength2' : 'feedback.correctStrength';
      this.showFeedback(i18n.t(key), new Color(0, 200, 120, 255));
      this.finishZone(cfg.targets[1].zone);
    }

    this.updateHealth(target.score);
    this.resetTool(tool);
    if (this.health >= 100) {
      this.openSettlement();
    }
  }

  private pickZone(pos: Vec2): ZoneType | null {
    for (const [zoneId, zone] of this.zoneMap) {
      const bounds = zone.node.getComponent(UITransform)?.getBoundingBoxToWorld();
      if (bounds && bounds.contains(pos)) {
        return zoneId;
      }
    }
    return null;
  }

  private finishZone(zone: ZoneType) {
    const target = this.zoneMap.get(zone);
    if (!target) {
      return;
    }
    const trans = target.node.getComponent(UITransform);
    const width = trans ? trans.contentSize.width : 130;
    const height = trans ? trans.contentSize.height : 130;
    const radius = Math.min(width, height) / 2;
    this.drawRoundedRect(target.graphics, width, height, target.doneColor, radius);
    target.label.color = new Color(255, 255, 255, 255);
  }

  private updateHealth(delta: number) {
    this.health = Math.min(100, Math.max(0, this.health + delta));
    this.healthFill.setScale(this.health / 100, 1, 1);
    this.healthLabel.string = `${i18n.t('ui.health')} ${this.health}%`;
    this.percentLabel.string = `${this.health}%`;
  }

  private showFeedback(text: string, color: Color) {
    this.feedbackLabel.string = `${i18n.t('ui.feedbackLabel')}：${text}`;
    this.feedbackLabel.color = color;
  }

  private resetTool(tool: ToolRuntime) {
    tool.node.setScale(1, 1, 1);
    Tween.stopAllByTarget(tool.node);
    tween(tool.node).to(0.2, { position: tool.origin }).start();
    this.draggingTool = null;
  }

  private openSettlement() {
    this.locked = true;
    this.settlementPanel.active = true;
    this.shakeNode(this.patientNode, 5);
  }

  private restartLevel() {
    this.settlementPanel.active = false;
    this.hintPanel.active = false;
    this.resetState();
  }

  private resetState() {
    this.health = 0;
    this.completed.clear();
    this.locked = false;
    this.updateHealth(0);
    const cfg = this.getCurrentConfig();
    this.diagnosisLabel.string = `${i18n.t('ui.diagnosisLabel')}：${cfg.diagnosis || i18n.t('game.diagnosis')}`;
    this.showFeedback(i18n.t('feedback.default'), new Color(120, 140, 180, 255));

    this.toolMap.forEach((tool) => {
      Tween.stopAllByTarget(tool.node);
      tool.node.setScale(1, 1, 1);
      tool.node.setPosition(tool.origin);
    });

    this.zoneMap.forEach((zone) => {
      const trans = zone.node.getComponent(UITransform);
      const width = trans ? trans.contentSize.width : 130;
      const height = trans ? trans.contentSize.height : 130;
      const radius = Math.min(width, height) / 2;
      this.drawRoundedRect(zone.graphics, width, height, zone.idleColor, radius);
      zone.label.color = new Color(255, 255, 255, 255);
    });
  }

  private shareToWechat() {
    const wxApi = (globalThis as any).wx;
    if (!wxApi || typeof wxApi.shareAppMessage !== 'function') {
      this.showFeedback(i18n.t('feedback.shareUnavailable'), new Color(214, 123, 87, 255));
      return;
    }
    wxApi.shareAppMessage({
      title: '我把一个写代码写歪的打工人救回来了，你也来试试',
      imageUrl: '',
      query: 'from=share&level=1',
    });
  }

  private shakeNode(target: Node, distance = 8) {
    const p = target.position.clone();
    Tween.stopAllByTarget(target);
    tween(target)
      .to(0.04, { position: p.clone().add3f(distance, 0, 0) })
      .to(0.04, { position: p.clone().add3f(-distance, 0, 0) })
      .to(0.04, { position: p })
      .start();
  }

  private createButtonNode(
    name: string,
    text: string,
    w: number,
    h: number,
    bgColor: Color,
    textColor: Color,
    radius = 14,
  ): Node {
    const node = this.createRectNode(name, w, h, bgColor, radius);
    const textNode = this.createLabelNode(`${name}-Text`, text, 24, textColor, w - 24, h - 10);
    node.addChild(textNode.node);
    textNode.node.setPosition(0, 0, 0);
    return node;
  }

  private addZoneLabel(zoneNode: Node, text: string): Label {
    const label = this.createLabelNode(`${zoneNode.name}-Label`, text, 22, new Color(255, 255, 255, 255), 100, 100);
    zoneNode.addChild(label.node);
    return label;
  }

  private createBandIcon(name: string, color: Color): Node {
    const node = this.createSizedNode(name, 88, 66);
    const g = node.addComponent(Graphics);
    g.strokeColor = color;
    g.lineWidth = 8;
    g.roundRect(-24, -12, 48, 24, 12);
    g.stroke();
    g.moveTo(-10, -18);
    g.lineTo(20, -30);
    g.stroke();
    return node;
  }

  private createCircleNode(name: string, radius: number, color: Color): Node {
    const node = this.createSizedNode(name, radius * 2, radius * 2);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.circle(0, 0, radius);
    graphics.fill();
    return node;
  }

  private createRectNode(name: string, width: number, height: number, color: Color, radius = 14): Node {
    const node = this.createSizedNode(name, width, height);
    const graphics = node.addComponent(Graphics);
    this.drawRoundedRect(graphics, width, height, color, radius);
    return node;
  }

  private drawRoundedRect(graphics: Graphics, width: number, height: number, color: Color, radius: number) {
    graphics.clear();
    graphics.fillColor = color;
    if (radius <= 0) {
      graphics.rect(-width / 2, -height / 2, width, height);
    } else {
      graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    }
    graphics.fill();
  }

  private createLabelNode(
    name: string,
    text: string,
    fontSize: number,
    color: Color,
    width = 620,
    height = 160,
  ): Label {
    const node = new Node(name);
    node.layer = this.node.layer;
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.4);
    label.color = color;
    label.overflow = Label.Overflow.SHRINK;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    const trans = node.addComponent(UITransform);
    trans.setContentSize(width, height);
    return label;
  }

  /** 空容器节点：只有 UITransform 尺寸，无图；子节点用 setPosition 相对此节点中心布局。 */
  private createSizedNode(name: string, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = this.node.layer;
    const trans = node.addComponent(UITransform);
    trans.setContentSize(width, height);
    return node;
  }
}
