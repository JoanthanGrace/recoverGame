import {
  _decorator,
  Color,
  Component,
  EventTouch,
  Graphics,
  Label,
  Node,
  UITransform,
  UIOpacity,
  Vec2,
  Vec3,
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
  origin: Vec3;
};

type ZoneRuntime = {
  id: ZoneType;
  node: Node;
  graphics: Graphics;
};

@ccclass('GameRoot')
export class GameRoot extends Component {
  private health = 0;
  private healthFill!: Node;
  private healthLabel!: Label;
  private feedbackLabel!: Label;
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
    const root = this.createSizedNode('Root', 720, 1280);
    this.node.addChild(root);

    const topBar = this.createTopBar();
    root.addChild(topBar);
    topBar.setPosition(0, 530, 0);

    const playArea = this.createPlayArea();
    root.addChild(playArea);
    playArea.setPosition(0, 80, 0);

    const toolDock = this.createToolDock();
    root.addChild(toolDock);
    toolDock.setPosition(0, -460, 0);

    this.feedbackLabel = this.createLabelNode('Feedback', '', 28, new Color(255, 255, 255, 255));
    root.addChild(this.feedbackLabel.node);
    this.feedbackLabel.node.setPosition(0, -240, 0);

    this.hintPanel = this.createHintPanel();
    root.addChild(this.hintPanel);
    this.hintPanel.active = false;

    this.settlementPanel = this.createSettlementPanel();
    root.addChild(this.settlementPanel);
    this.settlementPanel.active = false;

    this.updateHealth(0);
  }

  private createTopBar(): Node {
    const top = this.createSizedNode('TopBar', 700, 180);

    const levelTitle = this.createLabelNode('LevelTitle', i18n.t('game.levelTitle'), 34, new Color(255, 255, 255, 255));
    top.addChild(levelTitle.node);
    levelTitle.node.setPosition(0, 48, 0);

    const healthBg = this.createRectNode('HealthBg', 520, 26, new Color(60, 60, 60, 255));
    top.addChild(healthBg);
    healthBg.setPosition(-40, -6, 0);

    const progressNode = this.createSizedNode('HealthProgress', 520, 26);
    progressNode.setPosition(-40, -6, 0);
    top.addChild(progressNode);

    this.healthFill = this.createRectNode('BarFill', 520, 26, new Color(240, 80, 80, 255));
    progressNode.addChild(this.healthFill);
    const trans = this.healthFill.getComponent(UITransform)!;
    trans.setAnchorPoint(0, 0.5);
    this.healthFill.setPosition(-260, 0, 0);
    this.healthFill.setScale(0, 1, 1);

    this.healthLabel = this.createLabelNode('HealthLabel', `${i18n.t('ui.health')}: 0%`, 24, new Color(255, 255, 255, 255));
    top.addChild(this.healthLabel.node);
    this.healthLabel.node.setPosition(-40, -42, 0);

    const hintBtn = this.createButtonNode('HintBtn', i18n.t('ui.hint'), 110, 56, new Color(90, 150, 255, 255));
    top.addChild(hintBtn);
    hintBtn.setPosition(285, 52, 0);
    hintBtn.on(Node.EventType.TOUCH_END, () => {
      this.hintPanel.active = !this.hintPanel.active;
    });

    return top;
  }

  private createPlayArea(): Node {
    const playArea = this.createSizedNode('PlayArea', 700, 760);

    const patientBody = this.createRectNode('PatientBody', 260, 420, new Color(180, 180, 180, 255));
    playArea.addChild(patientBody);
    patientBody.setPosition(0, 0, 0);
    const bodyLabel = this.createLabelNode('PatientLabel', level1Config.patientName, 22, new Color(30, 30, 30, 255));
    patientBody.addChild(bodyLabel.node);
    bodyLabel.node.setPosition(0, -190, 0);

    const chestZone = this.createRectNode('ChestZone', 180, 80, new Color(230, 70, 70, 200));
    playArea.addChild(chestZone);
    chestZone.setPosition(0, 90, 0);
    this.addZoneLabel(chestZone, i18n.t('ui.zone.chest'));

    const chestOpacity = chestZone.addComponent(UIOpacity);
    chestOpacity.opacity = 200;
    tween(chestOpacity)
      .to(0.45, { opacity: 80 })
      .to(0.45, { opacity: 220 })
      .union()
      .repeatForever()
      .start();

    const backZone = this.createRectNode('BackZone', 180, 80, new Color(80, 140, 255, 170));
    playArea.addChild(backZone);
    backZone.setPosition(0, -20, 0);
    this.addZoneLabel(backZone, i18n.t('ui.zone.back'));

    this.zoneMap.set(ZoneType.Chest, {
      id: ZoneType.Chest,
      node: chestZone,
      graphics: chestZone.getComponent(Graphics)!,
    });
    this.zoneMap.set(ZoneType.Back, {
      id: ZoneType.Back,
      node: backZone,
      graphics: backZone.getComponent(Graphics)!,
    });

    return playArea;
  }

  private createToolDock(): Node {
    const dock = this.createRectNode('ToolDock', 700, 240, new Color(35, 35, 35, 255));

    const fascia = this.createToolNode(ToolType.FasciaBall, i18n.t('ui.tool.fasciaBall'), new Color(250, 200, 70, 255));
    dock.addChild(fascia.node);
    fascia.node.setPosition(-140, 0, 0);
    fascia.origin = fascia.node.getPosition().clone();

    const band = this.createToolNode(ToolType.ElasticBand, i18n.t('ui.tool.elasticBand'), new Color(120, 230, 120, 255));
    dock.addChild(band.node);
    band.node.setPosition(140, 0, 0);
    band.origin = band.node.getPosition().clone();

    this.toolMap.set(ToolType.FasciaBall, fascia);
    this.toolMap.set(ToolType.ElasticBand, band);
    return dock;
  }

  private createToolNode(id: ToolType, text: string, color: Color): ToolRuntime {
    const node = this.createButtonNode(`Tool-${id}`, text, 170, 170, color);
    const label = node.getComponentInChildren(Label)!;
    const runtime: ToolRuntime = {
      id,
      node,
      label,
      origin: Vec3.ZERO.clone(),
    };

    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onToolStart(runtime, event));
    node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.onToolMove(runtime, event));
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onToolEnd(runtime, event));
    node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.onToolEnd(runtime, event));
    return runtime;
  }

  private onToolStart(tool: ToolRuntime, _event: EventTouch) {
    if (this.locked) {
      return;
    }
    this.draggingTool = tool;
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
      this.showFeedback(i18n.t('feedback.invalidDrop'), new Color(220, 220, 220, 255));
      this.resetTool(tool);
      return;
    }

    const target = level1Config.targets.find((it) => it.tool === tool.id && it.zone === droppedZone);
    if (!target) {
      this.showFeedback(i18n.t('feedback.wrongTool'), new Color(255, 100, 100, 255));
      this.shakeRoot();
      this.resetTool(tool);
      return;
    }

    const token = `${tool.id}-${droppedZone}`;
    if (this.completed.has(token)) {
      this.resetTool(tool);
      return;
    }

    this.completed.add(token);
    if (tool.id === ToolType.FasciaBall) {
      this.showFeedback(i18n.t('feedback.correctRelax'), new Color(120, 255, 120, 255));
      this.finishZone(ZoneType.Chest, new Color(80, 200, 90, 220));
    } else {
      this.showFeedback(i18n.t('feedback.correctStrength'), new Color(120, 255, 120, 255));
      this.finishZone(ZoneType.Back, new Color(255, 220, 80, 220));
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

  private finishZone(zone: ZoneType, color: Color) {
    const target = this.zoneMap.get(zone);
    if (!target) {
      return;
    }
    target.graphics.clear();
    target.graphics.fillColor = color;
    target.graphics.roundRect(-90, -40, 180, 80, 14);
    target.graphics.fill();
  }

  private updateHealth(delta: number) {
    this.health = Math.min(100, Math.max(0, this.health + delta));
    this.healthFill.setScale(this.health / 100, 1, 1);
    this.healthLabel.string = `${i18n.t('ui.health')}: ${this.health}%`;
  }

  private showFeedback(text: string, color: Color) {
    this.feedbackLabel.string = text;
    this.feedbackLabel.color = color;
  }

  private resetTool(tool: ToolRuntime) {
    tool.node.setScale(1, 1, 1);
    tween(tool.node).to(0.15, { position: tool.origin }).start();
    this.draggingTool = null;
  }

  private openSettlement() {
    this.locked = true;
    this.settlementPanel.active = true;
  }

  private shakeRoot() {
    const p = this.node.position.clone();
    tween(this.node)
      .to(0.04, { position: p.clone().add3f(8, 0, 0) })
      .to(0.04, { position: p.clone().add3f(-8, 0, 0) })
      .to(0.04, { position: p })
      .start();
  }

  private createHintPanel(): Node {
    const panel = this.createRectNode('HintPanel', 650, 200, new Color(20, 20, 20, 230));
    panel.setPosition(0, 250, 0);
    const txt = this.createLabelNode('HintText', i18n.t('hint.text'), 24, new Color(255, 255, 255, 255));
    panel.addChild(txt.node);
    txt.node.setPosition(0, 0, 0);
    return panel;
  }

  private createSettlementPanel(): Node {
    const panel = this.createRectNode('SettlementPanel', 720, 1280, new Color(10, 10, 10, 220));

    const box = this.createRectNode('SettlementBox', 630, 620, new Color(42, 42, 42, 255));
    panel.addChild(box);

    const title = this.createLabelNode('SettlementTitle', i18n.t('settlement.title'), 40, new Color(130, 255, 130, 255));
    box.addChild(title.node);
    title.node.setPosition(0, 230, 0);

    const desc = this.createLabelNode('SettlementDesc', i18n.t('settlement.desc'), 26, new Color(255, 255, 255, 255));
    box.addChild(desc.node);
    desc.node.setPosition(0, 130, 0);

    const tip = this.createLabelNode('SettlementTip', i18n.t('settlement.tip'), 22, new Color(220, 220, 220, 255));
    box.addChild(tip.node);
    tip.node.setPosition(0, 40, 0);

    const shareBtn = this.createButtonNode('ShareBtn', i18n.t('settlement.share'), 450, 80, new Color(65, 185, 75, 255));
    box.addChild(shareBtn);
    shareBtn.setPosition(0, -90, 0);
    shareBtn.on(Node.EventType.TOUCH_END, () => this.shareToWechat());

    const nextBtn = this.createButtonNode('NextBtn', i18n.t('settlement.next'), 360, 70, new Color(100, 130, 255, 255));
    box.addChild(nextBtn);
    nextBtn.setPosition(0, -200, 0);
    nextBtn.on(Node.EventType.TOUCH_END, () => {
      this.showFeedback(i18n.t('settlement.more'), new Color(255, 240, 150, 255));
    });

    return panel;
  }

  private shareToWechat() {
    const wxApi = (globalThis as any).wx;
    if (!wxApi || typeof wxApi.shareAppMessage !== 'function') {
      this.showFeedback(i18n.t('feedback.shareUnavailable'), new Color(255, 170, 120, 255));
      return;
    }
    wxApi.shareAppMessage({
      title: 'I recovered the keyboard worker posture. Can you do it too?',
      imageUrl: '',
      query: 'from=share&level=1',
    });
  }

  private createButtonNode(name: string, text: string, w: number, h: number, color: Color): Node {
    const node = this.createRectNode(name, w, h, color);
    const textNode = this.createLabelNode(`${name}-Text`, text, 24, new Color(255, 255, 255, 255));
    node.addChild(textNode.node);
    textNode.node.setPosition(0, 0, 0);
    return node;
  }

  private addZoneLabel(zoneNode: Node, text: string) {
    const label = this.createLabelNode(`${zoneNode.name}-Label`, text, 20, new Color(255, 255, 255, 255));
    zoneNode.addChild(label.node);
  }

  private createRectNode(name: string, width: number, height: number, color: Color): Node {
    const node = this.createSizedNode(name, width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.roundRect(-width / 2, -height / 2, width, height, 14);
    graphics.fill();
    return node;
  }

  private createLabelNode(name: string, text: string, fontSize: number, color: Color): Label {
    const node = new Node(name);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.45);
    label.color = color;
    label.overflow = Label.Overflow.SHRINK;
    const trans = node.addComponent(UITransform);
    trans.setContentSize(620, 160);
    return label;
  }

  private createSizedNode(name: string, width: number, height: number): Node {
    const node = new Node(name);
    const trans = node.addComponent(UITransform);
    trans.setContentSize(width, height);
    return node;
  }
}
