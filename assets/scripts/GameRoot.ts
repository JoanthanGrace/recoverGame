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
  tween,
} from 'cc';
import { level1Config } from './config/level1';
import { i18n } from './core/I18n';
import { ToolType, ZoneType } from './types';

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

@ccclass('GameRoot')
export class GameRoot extends Component {
  private health = 0;
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

  private buildScene() {
    this.node.removeAllChildren();
    this.zoneMap.clear();
    this.toolMap.clear();
    this.completed.clear();
    this.draggingTool = null;
    this.locked = false;

    const root = this.createSizedNode('Root', 750, 1334);
    this.node.addChild(root);

    const pageBg = this.createRectNode('PageBg', 750, 1334, new Color(240, 243, 247, 255), 0);
    root.addChild(pageBg);

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

  private createTopBar(): Node {
    const top = this.createSizedNode('TopBar', 700, 116);

    const bg = this.createRectNode('TopBarBg', 700, 116, new Color(92, 107, 126, 255), 18);
    top.addChild(bg);

    const title = this.createLabelNode('CaseTitle', level1Config.title, 38, new Color(255, 255, 255, 255), 470, 74);
    top.addChild(title.node);
    title.node.setPosition(-105, 0, 0);

    const hintBtn = this.createButtonNode('HintBtn', i18n.t('ui.hint'), 126, 62, new Color(227, 231, 238, 255), new Color(65, 73, 88, 255), 16);
    top.addChild(hintBtn);
    hintBtn.setPosition(252, 0, 0);
    hintBtn.on(Node.EventType.TOUCH_END, () => {
      this.hintPanel.active = !this.hintPanel.active;
    });

    return top;
  }

  private createStatusBar(): Node {
    const bar = this.createSizedNode('StatusBar', 700, 96);

    const bg = this.createRectNode('StatusBg', 700, 96, new Color(224, 229, 236, 255), 18);
    bar.addChild(bg);

    const patientTag = this.createRectNode('PatientTagBg', 210, 46, new Color(97, 111, 132, 255), 12);
    bar.addChild(patientTag);
    patientTag.setPosition(-225, 0, 0);

    const patientTagLabel = this.createLabelNode(
      'PatientTagLabel',
      level1Config.patientTag || i18n.t('game.patientTag'),
      23,
      new Color(255, 255, 255, 255),
      186,
      46,
    );
    patientTag.addChild(patientTagLabel.node);

    this.percentLabel = this.createLabelNode('PercentLabel', '0%', 30, new Color(63, 72, 89, 255), 90, 44);
    bar.addChild(this.percentLabel.node);
    this.percentLabel.node.setPosition(-85, 0, 0);

    const progressBg = this.createRectNode('ProgressBg', 280, 36, new Color(84, 96, 113, 255), 10);
    bar.addChild(progressBg);
    progressBg.setPosition(155, 0, 0);

    const progressNode = this.createSizedNode('ProgressNode', 254, 24);
    progressBg.addChild(progressNode);
    progressNode.setPosition(0, 0, 0);

    this.healthFill = this.createRectNode('ProgressFill', 254, 24, new Color(95, 190, 124, 255), 8);
    progressNode.addChild(this.healthFill);
    const trans = this.healthFill.getComponent(UITransform)!;
    trans.setAnchorPoint(0, 0.5);
    this.healthFill.setPosition(-127, 0, 0);
    this.healthFill.setScale(0, 1, 1);

    this.healthLabel = this.createLabelNode('HealthLabel', `${i18n.t('ui.health')} 0%`, 22, new Color(63, 72, 89, 255), 210, 38);
    bar.addChild(this.healthLabel.node);
    this.healthLabel.node.setPosition(0, -30, 0);

    return bar;
  }

  private createTreatmentPanel(): Node {
    const panel = this.createSizedNode('TreatmentPanel', 700, 610);

    const bg = this.createRectNode('TreatmentBg', 700, 610, new Color(233, 237, 242, 255), 18);
    panel.addChild(bg);

    const bed = this.createRectNode('Bed', 560, 332, new Color(214, 221, 230, 255), 22);
    panel.addChild(bed);
    bed.setPosition(0, -5, 0);

    const pillow = this.createRectNode('Pillow', 134, 46, new Color(191, 201, 214, 255), 16);
    panel.addChild(pillow);
    pillow.setPosition(-182, 120, 0);

    const body = this.createRectNode('PatientBody', 376, 144, new Color(252, 252, 252, 255), 44);
    panel.addChild(body);
    body.setPosition(24, 26, 0);
    body.angle = -8;

    const head = this.createCircleNode('PatientHead', 62, new Color(252, 230, 202, 255));
    panel.addChild(head);
    head.setPosition(-188, 80, 0);

    const hair = this.createCircleNode('Hair', 62, new Color(48, 62, 82, 255));
    head.addChild(hair);
    hair.setScale(1.05, 0.75, 1);
    hair.setPosition(0, 18, 0);

    const glasses = this.createRectNode('Glasses', 84, 24, new Color(78, 88, 103, 255), 8);
    head.addChild(glasses);
    glasses.setPosition(8, -2, 0);

    const arm = this.createRectNode('Arm', 126, 26, new Color(252, 230, 202, 255), 12);
    panel.addChild(arm);
    arm.setPosition(-98, 6, 0);
    arm.angle = -20;

    const legs = this.createRectNode('Legs', 146, 54, new Color(84, 98, 122, 255), 24);
    panel.addChild(legs);
    legs.setPosition(205, -14, 0);
    legs.angle = -8;

    const desk = this.createRectNode('Desk', 640, 34, new Color(155, 166, 180, 255), 14);
    panel.addChild(desk);
    desk.setPosition(0, 188, 0);

    const chestZone = this.createRectNode('ChestZone', 130, 130, new Color(255, 98, 98, 165), 65);
    panel.addChild(chestZone);
    chestZone.setPosition(12, 55, 0);
    const chestLabel = this.addZoneLabel(chestZone, i18n.t('ui.zone.chest'));

    const chestOpacity = chestZone.addComponent(UIOpacity);
    chestOpacity.opacity = 180;
    tween(chestOpacity).to(0.45, { opacity: 90 }).to(0.45, { opacity: 205 }).union().repeatForever().start();

    const backZone = this.createRectNode('BackZone', 136, 136, new Color(90, 155, 255, 150), 68);
    panel.addChild(backZone);
    backZone.setPosition(132, 74, 0);
    const backLabel = this.addZoneLabel(backZone, i18n.t('ui.zone.back'));

    const patientCaption = this.createLabelNode('PatientCaption', level1Config.patientName, 28, new Color(77, 88, 106, 255), 320, 44);
    panel.addChild(patientCaption.node);
    patientCaption.node.setPosition(0, -238, 0);

    this.patientNode = body;
    this.zoneMap.set(ZoneType.Chest, {
      id: ZoneType.Chest,
      node: chestZone,
      graphics: chestZone.getComponent(Graphics)!,
      label: chestLabel,
      idleColor: new Color(255, 98, 98, 165),
      doneColor: new Color(104, 193, 120, 220),
    });
    this.zoneMap.set(ZoneType.Back, {
      id: ZoneType.Back,
      node: backZone,
      graphics: backZone.getComponent(Graphics)!,
      label: backLabel,
      idleColor: new Color(90, 155, 255, 150),
      doneColor: new Color(255, 208, 92, 220),
    });

    return panel;
  }

  private createDiagnosisPanel(): Node {
    const panel = this.createSizedNode('DiagnosisPanel', 700, 140);

    const bg = this.createRectNode('DiagnosisBg', 700, 140, new Color(246, 248, 251, 255), 18);
    panel.addChild(bg);

    this.diagnosisLabel = this.createLabelNode(
      'DiagnosisLabel',
      `${i18n.t('ui.diagnosisLabel')}：${level1Config.diagnosis || i18n.t('game.diagnosis')}`,
      32,
      new Color(58, 67, 82, 255),
      650,
      54,
    );
    panel.addChild(this.diagnosisLabel.node);
    this.diagnosisLabel.node.setPosition(0, 34, 0);

    this.feedbackLabel = this.createLabelNode('FeedbackLabel', i18n.t('feedback.default'), 24, new Color(109, 119, 135, 255), 650, 58);
    panel.addChild(this.feedbackLabel.node);
    this.feedbackLabel.node.setPosition(0, -30, 0);

    return panel;
  }

  private createToolDock(): Node {
    const dock = this.createSizedNode('ToolDock', 700, 248);

    const bg = this.createRectNode('DockBg', 700, 248, new Color(78, 90, 109, 255), 20);
    dock.addChild(bg);

    const dockTitle = this.createLabelNode('DockTitle', i18n.t('ui.toolDock'), 30, new Color(255, 255, 255, 255), 340, 42);
    dock.addChild(dockTitle.node);
    dockTitle.node.setPosition(0, 84, 0);

    const fascia = this.createToolNode(
      ToolType.FasciaBall,
      i18n.t('ui.tool.fasciaBall'),
      i18n.t('ui.tool.fasciaBall.desc'),
      new Color(235, 239, 245, 255),
      new Color(65, 74, 92, 255),
      new Color(108, 120, 140, 255),
    );
    dock.addChild(fascia.node);
    fascia.node.setPosition(-176, -28, 0);
    fascia.origin = fascia.node.getPosition().clone();

    const band = this.createToolNode(
      ToolType.ElasticBand,
      i18n.t('ui.tool.elasticBand'),
      i18n.t('ui.tool.elasticBand.desc'),
      new Color(235, 239, 245, 255),
      new Color(65, 74, 92, 255),
      new Color(108, 120, 140, 255),
    );
    dock.addChild(band.node);
    band.node.setPosition(176, -28, 0);
    band.origin = band.node.getPosition().clone();

    this.toolMap.set(ToolType.FasciaBall, fascia);
    this.toolMap.set(ToolType.ElasticBand, band);
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
    const node = this.createRectNode(`Tool-${id}`, 220, 136, cardColor, 22);
    const icon = id === ToolType.FasciaBall
      ? this.createCircleNode(`${id}-Icon`, 28, new Color(143, 154, 173, 255))
      : this.createBandIcon(`${id}-Icon`, new Color(143, 154, 173, 255));
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

  private createHintPanel(): Node {
    const panel = this.createRectNode('HintOverlay', 720, 1280, new Color(20, 24, 32, 145), 0);

    const box = this.createRectNode('HintBox', 560, 360, new Color(248, 250, 252, 255), 24);
    panel.addChild(box);
    box.setPosition(0, 130, 0);

    const title = this.createLabelNode('HintTitle', i18n.t('hint.title'), 34, new Color(61, 72, 88, 255), 460, 56);
    box.addChild(title.node);
    title.node.setPosition(0, 110, 0);

    const txt = this.createLabelNode('HintText', i18n.t('hint.text'), 24, new Color(92, 103, 120, 255), 460, 170);
    box.addChild(txt.node);
    txt.node.setPosition(0, 10, 0);

    const confirm = this.createButtonNode('HintConfirm', i18n.t('hint.confirm'), 220, 64, new Color(100, 130, 255, 255), new Color(255, 255, 255, 255), 16);
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

  private createSettlementPanel(): Node {
    const panel = this.createRectNode('SettlementPanel', 720, 1280, new Color(10, 14, 20, 180), 0);

    const box = this.createRectNode('SettlementBox', 600, 560, new Color(246, 248, 251, 255), 28);
    panel.addChild(box);
    box.setPosition(0, 40, 0);

    const title = this.createLabelNode('SettlementTitle', i18n.t('settlement.title'), 40, new Color(70, 167, 95, 255), 500, 60);
    box.addChild(title.node);
    title.node.setPosition(0, 192, 0);

    const desc = this.createLabelNode('SettlementDesc', i18n.t('settlement.desc'), 28, new Color(60, 71, 86, 255), 500, 80);
    box.addChild(desc.node);
    desc.node.setPosition(0, 108, 0);

    const tipTitle = this.createLabelNode('SettlementTipTitle', '科普小贴士', 24, new Color(78, 90, 109, 255), 460, 40);
    box.addChild(tipTitle.node);
    tipTitle.node.setPosition(0, 34, 0);

    const tip = this.createLabelNode('SettlementTip', i18n.t('settlement.tip'), 24, new Color(102, 111, 125, 255), 460, 110);
    box.addChild(tip.node);
    tip.node.setPosition(0, -44, 0);

    const shareBtn = this.createButtonNode('ShareBtn', i18n.t('settlement.share'), 420, 74, new Color(78, 186, 102, 255), new Color(255, 255, 255, 255), 18);
    box.addChild(shareBtn);
    shareBtn.setPosition(0, -160, 0);
    shareBtn.on(Node.EventType.TOUCH_END, () => this.shareToWechat());

    const restartBtn = this.createButtonNode('RestartBtn', i18n.t('settlement.restart'), 200, 66, new Color(100, 130, 255, 255), new Color(255, 255, 255, 255), 18);
    box.addChild(restartBtn);
    restartBtn.setPosition(-112, -254, 0);
    restartBtn.on(Node.EventType.TOUCH_END, () => this.restartLevel());

    const nextBtn = this.createButtonNode('NextBtn', i18n.t('settlement.next'), 200, 66, new Color(220, 226, 235, 255), new Color(68, 78, 94, 255), 18);
    box.addChild(nextBtn);
    nextBtn.setPosition(112, -254, 0);
    nextBtn.on(Node.EventType.TOUCH_END, () => {
      this.showFeedback(i18n.t('settlement.more'), new Color(255, 236, 148, 255));
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

    const target = level1Config.targets.find((it) => it.tool === tool.id && it.zone === droppedZone);
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
    if (tool.id === ToolType.FasciaBall) {
      this.showFeedback(i18n.t('feedback.correctRelax'), new Color(85, 163, 103, 255));
      this.finishZone(ZoneType.Chest);
    } else {
      this.showFeedback(i18n.t('feedback.correctStrength'), new Color(85, 163, 103, 255));
      this.finishZone(ZoneType.Back);
    }

    this.updateHealth(target.score);
    this.resetTool(tool);
    if (this.health >= 100) {
      this.openSettlement();
    }
  }

  private pickZone(pos: Vec2): ZoneType | null {
    const chest = this.zoneMap.get(ZoneType.Chest)?.node.getComponent(UITransform)?.getBoundingBoxToWorld();
    if (chest && chest.contains(pos)) {
      return ZoneType.Chest;
    }
    const back = this.zoneMap.get(ZoneType.Back)?.node.getComponent(UITransform)?.getBoundingBoxToWorld();
    if (back && back.contains(pos)) {
      return ZoneType.Back;
    }
    return null;
  }

  private finishZone(zone: ZoneType) {
    const target = this.zoneMap.get(zone);
    if (!target) {
      return;
    }
    const width = target.id === ZoneType.Chest ? 130 : 136;
    const radius = target.id === ZoneType.Chest ? 65 : 68;
    this.drawRoundedRect(target.graphics, width, width, target.doneColor, radius);
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
    this.diagnosisLabel.string = `${i18n.t('ui.diagnosisLabel')}：${level1Config.diagnosis || i18n.t('game.diagnosis')}`;
    this.showFeedback(i18n.t('feedback.default'), new Color(109, 119, 135, 255));

    this.toolMap.forEach((tool) => {
      Tween.stopAllByTarget(tool.node);
      tool.node.setScale(1, 1, 1);
      tool.node.setPosition(tool.origin);
    });

    this.zoneMap.forEach((zone) => {
      const width = zone.id === ZoneType.Chest ? 130 : 136;
      const radius = zone.id === ZoneType.Chest ? 65 : 68;
      this.drawRoundedRect(zone.graphics, width, width, zone.idleColor, radius);
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

  private createSizedNode(name: string, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = this.node.layer;
    const trans = node.addComponent(UITransform);
    trans.setContentSize(width, height);
    return node;
  }
}
