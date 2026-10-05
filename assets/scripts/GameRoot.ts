import {
  _decorator, AudioClip, AudioSource, BlockInputEvents, Color, Component, EventTouch, Graphics,
  JsonAsset, Label, Layers, Node, ResolutionPolicy, resources, Sprite, SpriteFrame,
  Texture2D, Tween, UITransform, UIOpacity, Vec2, Vec3, view, tween, sys,
} from 'cc';
import { RecoverySession } from './core/RecoverySession';
import { PlayableLevel, ToolConfig, ToolType, ZoneConfig, ZoneType } from './types';

const { ccclass } = _decorator;
const PAPER = '#f5f1e6';
const INK = '#253f36';
const MUTED = '#758078';
const GREEN = '#46775e';
type ToolRuntime = { id: ToolType; node: Node; origin: Vec3; used: boolean };
type ZoneRuntime = { node: Node; label: Label; opacity: UIOpacity };

@ccclass('GameRoot')
export class GameRoot extends Component {
  private levels: PlayableLevel[] = [];
  private levelIndex = 0;
  private get level() { return this.levels[this.levelIndex]; }
  private session!: RecoverySession;
  private root!: Node;
  private toolMap = new Map<ToolType, ToolRuntime>();
  private zoneMap = new Map<ZoneType, ZoneRuntime>();
  private healthFill!: Node;
  private healthLabel!: Label;
  private feedback!: Label;
  private resultFeedback!: Label;
  private hintPanel!: Node;
  private resultPanel!: Node;
  private sciencePanel!: Node;
  private before!: UIOpacity;
  private after!: UIOpacity;
  private progress: UIOpacity | null = null;
  private audio!: AudioSource;
  private clips = new Map<string, AudioClip>();
  private muted = false;
  private drag: { tool: ToolRuntime; touchId: number } | null = null;
  private selected: ToolType | null = null;
  private locked = false;
  private generation = 0;
  private generatedFrames: SpriteFrame[] = [];

  start() {
    this.audio = this.node.addComponent(AudioSource); this.audio.volume = 0.45;
    for (const name of ['relax', 'strengthen', 'wrong', 'complete']) {
      resources.load('audio/' + name, AudioClip, (error, clip) => { if (this.isValid && !error) this.clips.set(name, clip); });
    }
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
    resources.load('data/levels', JsonAsset, (error, asset) => {
      if (!this.isValid) return;
      if (error || !Array.isArray(asset?.json) || !asset.json.length) {
        this.label(this.node, '关卡加载失败：请检查 resources/data/levels.json', 24, INK, 640, 100, 0, 0);
        return;
      }
      this.levels = asset.json as PlayableLevel[];
      this.showLevel(0);
    });
  }

  private showLevel(index: number) {
    this.disposeScene();
    this.levelIndex = index;
    this.session = new RecoverySession(this.level);
    this.locked = false; this.selected = null; this.drag = null;
    this.buildScene();
  }

  private buildScene() {
    const level = this.level;
    this.root = this.rect(this.node, 'RecoveryRoot', 720, 1280, PAPER, 0, 0);
    this.label(this.root, '打工人康复指南', 30, INK, 360, 50, -145, 565);
    const soundButton = this.button(this.root, this.muted ? '音效关' : '音效开', 90, 52, '#e5ebdc', 100, 565, () => {
      this.muted = !this.muted; this.audio.stop();
      soundButton.getComponentInChildren(Label)!.string = this.muted ? '音效关' : '音效开';
    });
    this.button(this.root, '怎么玩？', 135, 52, '#e5ebdc', 230, 565, () => {
      if (this.locked || this.drag) return;
      this.hintPanel.active = true;
    });
    const navWidth = 600 / this.levels.length;
    this.levels.forEach((item, index) => {
      this.button(this.root, '关 ' + String(item.id).padStart(2, '0'), navWidth - 12, 42, index === this.levelIndex ? '#dce7d5' : PAPER, -300 + navWidth * (index + 0.5), 505, () => this.showLevel(index));
    });
    this.label(this.root, 'CASE ' + String(level.id).padStart(3, '0') + ' / ' + level.room, 19, GREEN, 620, 35, 0, 458);
    this.label(this.root, level.title, 43, INK, 620, 65, 0, 408);
    this.label(this.root, level.subtitle, 26, MUTED, 620, 45, 0, 360);
    this.rect(this.root, 'ProgressTrack', 600, 10, '#dce2d5', 0, 307);
    this.healthFill = this.rect(this.root, 'ProgressFill', 600, 10, GREEN, 0, 307);
    this.healthLabel = this.label(this.root, '', 21, INK, 600, 35, 0, 333);
    const stage = this.rect(this.root, 'ObservationRoom', 660, 510, '#e9eddf', 0, 30, 40);
    this.label(stage, level.patientName + ' · 侧面示意', 19, MUTED, 580, 34, 0, -230);
    const beforeNode = this.art(stage, level.beforeArt, level.artWidth, 400, 0, 0);
    const afterNode = this.art(stage, level.afterArt, level.artWidth, 400, 0, 0);
    this.before = beforeNode.addComponent(UIOpacity); this.after = afterNode.addComponent(UIOpacity); this.after.opacity = 0;
    this.progress = null;
    if (level.progressArt) {
      this.progress = this.art(stage, level.progressArt, level.artWidth, 400, 0, 0).addComponent(UIOpacity); this.progress.opacity = 0;
    }
    for (const zone of level.zones) {
      const left = zone.side === 'back';
      this.addZone(stage, zone, left ? -225 : 225, level.observeFirst ? (left ? -90 : 90) : (left ? 100 : 55));
    }
    this.feedback = this.label(this.root, level.instruction, 22, MUTED, 630, 74, 0, -277);
    const dock = this.rect(this.root, 'ToolDock', 660, 215, '#faf8f0', 0, -430, 26);
    this.label(dock, level.dockTitle, 25, INK, 580, 40, 0, 76);
    level.tools.forEach((tool, index) => this.addTool(dock, tool, level.tools.length === 3 ? (index - 1) * 210 : (index === 0 ? -165 : 165)));
    this.button(this.root, '本关学习卡 · 肌肉与工作习惯', 600, 44, '#e5ebdc', 0, -559, () => { if (!this.locked && !this.drag) this.sciencePanel.active = true; });
    this.label(this.root, '身体变化为游戏表达；用于科普，不用于诊断或治疗。', 17, MUTED, 650, 36, 0, -605);
    this.hintPanel = this.makeHint(); this.resultPanel = this.makeResult(); this.sciencePanel = this.makeScience(); this.updateProgress();
  }

  private zoneText(zone: ZoneConfig) {
    if (this.level.observeFirst && !this.session.isObserved(zone.id)) return (zone.side === 'back' ? '线索 A' : '线索 B') + '\n点击观察';
    return zone.title + '\n' + (this.session.isCompleted(zone.id) ? '已完成' : zone.detail);
  }

  private addZone(parent: Node, config: ZoneConfig, x: number, y: number) {
    const node = this.rect(parent, 'Zone-' + config.id, 180, 100, '#fffaf0', x, y, 16);
    const label = this.label(node, this.zoneText(config), 23, this.level.observeFirst ? MUTED : config.color, 170, 90, 0, 0);
    const opacity = node.addComponent(UIOpacity);
    this.zoneMap.set(config.id, { node, label, opacity });
    node.on(Node.EventType.TOUCH_END, () => {
      if (this.locked || this.hintPanel.active || this.sciencePanel.active || this.drag) return;
      if (this.level.observeFirst && !this.session.isObserved(config.id)) {
        this.session.inspect(config.id); label.string = this.zoneText(config); label.color = this.color(config.color);
        this.selected = null; this.say(config.clue); return;
      }
      if (this.selected) this.applyDrop(this.selected, config.id);
      else this.say(this.level.observeFirst ? config.clue : '先选一件工具，再点身体标记。');
    });
    if (!this.level.observeFirst && config.id === ZoneType.Chest) tween(opacity).to(0.8, { opacity: 160 }).to(0.8, { opacity: 255 }).union().repeatForever().start();
  }

  private addTool(parent: Node, config: ToolConfig, x: number) {
    const compact = this.level.tools.length === 3;
    const node = this.rect(parent, 'Tool-' + config.id, compact ? 190 : 290, 115, '#edf0e5', x, -12, 18);
    if (config.art) this.art(node, config.art, compact ? 46 : 82, compact ? 46 : 82, compact ? 0 : -90, compact ? 27 : 0);
    else this.label(node, '▤', 40, MUTED, 60, 48, 0, 27);
    this.label(node, config.title, compact ? 22 : 25, INK, compact ? 175 : 170, 35, compact ? 0 : 48, compact ? -12 : 20);
    this.label(node, config.detail, compact ? 16 : 18, MUTED, compact ? 175 : 170, 30, compact ? 0 : 48, compact ? -40 : -22);
    const tool: ToolRuntime = { id: config.id, node, origin: node.position.clone(), used: false };
    this.toolMap.set(config.id, tool);
    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
      if (this.locked || this.drag || tool.used || this.hintPanel.active || this.sciencePanel.active) return;
      this.selected = config.id; this.say('已选' + config.title + '，拖到或点击对应目标。');
      this.drag = { tool, touchId: event.getID() }; node.setScale(1.05, 1.05, 1);
    });
    node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
      if (!this.ownsTouch(tool, event)) return;
      const point = event.getUILocation();
      node.setPosition(node.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y, 0)));
    });
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      if (!this.ownsTouch(tool, event)) return;
      const point = event.getUILocation(); const zone = this.pickZone(point); this.returnTool(tool);
      if (zone) this.applyDrop(config.id, zone);
      else if (!node.getComponent(UITransform)!.getBoundingBoxToWorld().contains(point)) this.say('没有放到目标上，再试一次。');
    });
    node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => { if (this.ownsTouch(tool, event)) { this.returnTool(tool); this.selected = null; } });
  }

  private ownsTouch(tool: ToolRuntime, event: EventTouch) { return !this.locked && this.drag?.tool === tool && this.drag.touchId === event.getID(); }
  private returnTool(tool: ToolRuntime) { tool.node.setPosition(tool.origin); tool.node.setScale(1, 1, 1); this.drag = null; }
  private pickZone(point: Vec2): ZoneType | null {
    for (const [id, zone] of this.zoneMap) if (zone.node.getComponent(UITransform)!.getBoundingBoxToWorld().contains(point)) return id;
    return null;
  }

  private applyDrop(tool: ToolType, zone: ZoneType) {
    const outcome = this.session.drop(tool, zone);
    const config = this.level.zones.find(item => item.id === zone)!;
    if (outcome === 'unobserved') { this.say('先点开这条线索，了解情况再选行动。'); return; }
    if (outcome === 'wrong') {
      this.playSound('wrong'); this.say(config.wrong, '#ae593f'); Tween.stopAllByTarget(this.root); this.root.setPosition(0, 0, 0);
      tween(this.root).to(0.05, { position: new Vec3(-6, 0, 0) }).to(0.05, { position: new Vec3(6, 0, 0) }).to(0.05, { position: Vec3.ZERO.clone() }).start(); return;
    }
    if (outcome === 'completed') { this.say('这个目标已经完成了，试试另一个。'); return; }
    if (outcome !== 'correct') return;
    this.selected = null;
    this.playSound(this.level.targets.find(item => item.zone === zone)!.successSound || 'strengthen');
    const target = this.zoneMap.get(zone)!;
    Tween.stopAllByTarget(target.opacity); target.opacity.opacity = 255;
    target.label.string = this.zoneText(config); target.label.color = this.color(GREEN);
    const runtime = this.toolMap.get(tool)!;
    if (this.level.targets.filter(item => item.tool === tool).every(item => this.session.isCompleted(item.zone))) {
      runtime.used = true; const opacity = runtime.node.getComponent(UIOpacity) || runtime.node.addComponent(UIOpacity); opacity.opacity = 120;
    }
    this.say(config.correct, GREEN); this.updateProgress();
    if (this.session.completedCount === 1 && this.progress) {
      Tween.stopAllByTarget(this.before); Tween.stopAllByTarget(this.progress);
      tween(this.before).to(0.35, { opacity: 0 }).start(); tween(this.progress).to(0.35, { opacity: 255 }).start();
    }
    if (this.session.finished) {
      Tween.stopAllByTarget(this.before);
      if (this.progress) { Tween.stopAllByTarget(this.progress); tween(this.progress).to(0.65, { opacity: 0 }).start(); }
      this.scheduleOnce(() => this.playSound('complete'), 0.45);
      this.locked = true; this.hintPanel.active = false;
      tween(this.before).to(0.65, { opacity: 0 }).start(); tween(this.after).to(0.65, { opacity: 255 }).start();
      this.scheduleOnce(() => { this.resultPanel.active = true; }, 1.3);
    }
  }

  private updateProgress() {
    const ratio = this.session.health / 100; this.healthFill.setScale(ratio, 1, 1); this.healthFill.setPosition(-300 * (1 - ratio), 307, 0);
    this.healthLabel.string = '关卡进度  ' + this.session.health + '% · ' + this.session.completedCount + ' / ' + this.level.targets.length;
  }
  private say(text: string, color = MUTED) { this.feedback.string = text; this.feedback.color = this.color(color); }
  private modal(name: string, height: number): { panel: Node; box: Node } {
    const panel = this.rect(this.root, name, 720, 1280, '#253f36cc', 0, 0, 0); panel.addComponent(BlockInputEvents);
    const box = this.rect(panel, name + 'Box', 630, height, PAPER, 0, 0, 28); panel.active = false; return { panel, box };
  }
  private makeHint(): Node {
    const { panel, box } = this.modal('Hint', 500);
    this.label(box, this.level.hintTitle, 32, INK, 550, 70, 0, 160);
    this.label(box, this.level.hintText, 24, INK, 550, 230, 0, 5);
    this.button(box, '我来试试', 500, 70, '#e5ebdc', 0, -175, () => { panel.active = false; }); return panel;
  }
  private makeResult(): Node {
    const { panel, box } = this.modal('Result', 960);
    this.label(box, this.level.resultTitle, 36, INK, 550, 65, 0, 395);
    const w = this.level.artWidth * 0.625;
    this.art(box, this.level.beforeArt, w, 250, -120, 215); this.art(box, this.level.afterArt, w, 250, 120, 215);
    this.label(box, '→', 32, GREEN, 60, 60, 0, 215);
    this.label(box, this.level.resultText, 24, INK, 560, 100, 0, 25);
    this.label(box, this.level.resultNote, 19, MUTED, 550, 70, 0, -60);
    this.button(box, this.levelIndex < this.levels.length - 1 ? '下一关 · ' + this.levels[this.levelIndex + 1].title : '回到第一关继续探索', 510, 70, '#dce7d5', 0, -150, () => this.showLevel((this.levelIndex + 1) % this.levels.length));
    this.button(box, '再玩本关', 510, 65, '#e8e4d7', 0, -235, () => this.showLevel(this.levelIndex));
    this.button(box, '分享这份舒展指南', 510, 65, '#e8e4d7', 0, -315, () => this.share());
    this.button(box, '读一读本关学习卡', 510, 60, '#e5ebdc', 0, -390, () => { this.sciencePanel.active = true; });
    this.resultFeedback = this.label(box, '', 17, MUTED, 550, 38, 0, -448); return panel;
  }
  private makeScience(): Node {
    const { panel, box } = this.modal('Science', 1040);
    const data = this.level.education;
    this.label(box, this.level.shortTitle + ' · 工作与肌肉', 32, INK, 540, 65, 0, 440);
    const heading = this.label(box, '', 27, GREEN, 540, 55, 0, 355);
    const body = this.label(box, '', 24, INK, 540, 590, 0, 25);
    const pages = [
      { title: '为什么会累？', text: data.summary + '\n\n' + data.cause },
      { title: '认识这些肌肉', text: data.muscles.map(item => item.name + '\n' + item.location + '\n' + item.function).join('\n\n') },
      { title: '从工作方式开始', text: data.actions.map(item => item.title + '\n' + item.description).join('\n\n') + '\n\n' + data.boundary },
      { title: '科普依据 · 继续阅读', text: '资料用于支持肌肉功能与工效学原则，不是对玩家的诊断。部分资料为英文；外部链接需平台支持。' },
    ];
    const links = data.sources.map((source, index) => this.button(box, source.title, 530, 75, '#e8e4d7', 0, 105 - index * 100, () => { if (/^https:\/\//.test(source.url)) sys.openURL(source.url); }));
    let page = 0;
    const number = this.label(box, '', 20, MUTED, 90, 45, 0, -342);
    const render = () => { heading.string = pages[page].title; body.string = pages[page].text; body.node.setPosition(0, page === 3 ? 230 : 25, 0); body.node.getComponent(UITransform)!.setContentSize(540, page === 3 ? 160 : 590); number.string = (page + 1) + ' / ' + pages.length; links.forEach(link => { link.active = page === 3; }); };
    this.button(box, '上一页', 190, 62, '#e5ebdc', -175, -342, () => { page = (page + pages.length - 1) % pages.length; render(); });
    this.button(box, '下一页', 190, 62, '#e5ebdc', 175, -342, () => { page = (page + 1) % pages.length; render(); });
    this.button(box, '回到游戏', 530, 65, '#dce7d5', 0, -440, () => { panel.active = false; });
    render(); return panel;
  }
  private playSound(name: string) {
    const clip = this.clips.get(name);
    if (this.muted || !clip) return;
    this.audio.stop(); this.audio.clip = clip; this.audio.play();
  }
  private share() {
    const wxApi = (globalThis as unknown as { wx?: { shareAppMessage?: (options: { title: string; query: string }) => void } }).wx;
    if (!wxApi?.shareAppMessage) { this.resultFeedback.string = '当前预览不支持微信分享；请在微信真机中验证。'; return; }
    try { wxApi.shareAppMessage({ title: this.level.shareTitle, query: 'from=share&level=' + this.level.id }); this.resultFeedback.string = '分享面板已打开。'; }
    catch { this.resultFeedback.string = '当前环境分享不可用，请稍后再试。'; }
  }

  private art(parent: Node, name: string, w: number, h: number, x: number, y: number): Node {
    const node = this.sized(parent, `Art-${name}`, w, h, x, y);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    const generation = this.generation;
    resources.load(`art/${name}`, Texture2D, (error, texture) => {
      if (!node.isValid || generation !== this.generation || !this.isValid) return;
      if (error) { this.label(node, '图片待导入', 18, MUTED, w, h, 0, 0); return; }
      const frame = new SpriteFrame(); frame.texture = texture;
      this.generatedFrames.push(frame); sprite.spriteFrame = frame;
    });
    return node;
  }

  private button(parent: Node, text: string, w: number, h: number, color: string, x: number, y: number, action: () => void): Node {
    const node = this.rect(parent, text, w, h, color, x, y, 16);
    this.label(node, text, 23, INK, w - 20, h - 10, 0, 0);
    node.on(Node.EventType.TOUCH_END, action);
    return node;
  }

  private color(hex: string) { return new Color().fromHEX(hex); }
  private sized(parent: Node, name: string, w: number, h: number, x: number, y: number): Node {
    const node = new Node(name); node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(w, h);
    parent.addChild(node); node.setPosition(x, y, 0);
    return node;
  }
  private rect(parent: Node, name: string, w: number, h: number, color: string, x: number, y: number, radius = 6): Node {
    const node = this.sized(parent, name, w, h, x, y);
    const graphics = node.addComponent(Graphics); graphics.fillColor = this.color(color);
    graphics.roundRect(-w / 2, -h / 2, w, h, radius); graphics.fill();
    return node;
  }
  private label(parent: Node, text: string, fontSize: number, color: string, w: number, h: number, x: number, y: number): Label {
    const node = this.sized(parent, 'Text', w, h, x, y);
    const label = node.addComponent(Label); label.string = text; label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.45); label.color = this.color(color);
    label.overflow = Label.Overflow.SHRINK; label.enableWrapText = true;
    return label;
  }


  private disposeScene() {
    this.generation++; this.unscheduleAllCallbacks();
    if (this.audio) this.audio.stop();
    if (this.progress) Tween.stopAllByTarget(this.progress);
    for (const zone of this.zoneMap.values()) Tween.stopAllByTarget(zone.opacity);
    if (this.before) Tween.stopAllByTarget(this.before); if (this.after) Tween.stopAllByTarget(this.after);
    if (this.root) { Tween.stopAllByTarget(this.root); this.root.active = false; this.root.destroy(); }
    for (const frame of this.generatedFrames) frame.destroy();
    this.generatedFrames = []; this.toolMap.clear(); this.zoneMap.clear();
  }
  onDestroy() { this.disposeScene(); }
}
