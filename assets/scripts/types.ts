export enum ToolType {
  FasciaBall = 'fasciaBall',
  ElasticBand = 'elasticBand',
  WalkBreak = 'walkBreak',
  DistanceBreak = 'distanceBreak',
  KeepWorking = 'keepWorking',
  AdjustChair = 'adjustChair',
  MicroBreak = 'microBreak',
  AlternatePosture = 'alternatePosture',
  BringCloser = 'bringCloser',
  UseTrolley = 'useTrolley',
  SplitLoad = 'splitLoad',
}
export enum ZoneType {
  Chest = 'chest',
  Back = 'back',
  Sitting = 'sitting',
  Screen = 'screen',
  WorkHeight = 'workHeight',
  HeldArms = 'heldArms',
  StaticStanding = 'staticStanding',
  FarReach = 'farReach',
  BulkyLoad = 'bulkyLoad',
  HeavyBatch = 'heavyBatch',
}
export type SuccessSound = 'relax' | 'strengthen';
export interface LevelTarget { tool: ToolType; zone: ZoneType; score: number; successSound?: SuccessSound; }
export interface LevelConfig {
  id: number; title: string; patientName: string; stageTip: string;
  targets: LevelTarget[]; observeFirst?: boolean;
}
export interface ToolConfig {
  id: ToolType; title: string; detail: string; art: string | null; action: string;
}
export interface ZoneConfig {
  id: ZoneType; title: string; detail: string; color: string; side: 'back' | 'chest';
  clue: string; wrong: string; correct: string;
}
export interface PlayableLevel extends LevelConfig {
  education: {
    summary: string; cause: string; boundary: string;
    muscles: { name: string; location: string; function: string }[];
    actions: { title: string; description: string }[];
    sources: { title: string; url: string }[];
  };
  designSource: 'prd' | 'extension'; knowledge: string; shortTitle?: string;
  progressArt?: string; progressAlt?: string;
  subtitle: string; story: string; room: string; status: string; dockTitle: string;
  instruction: string; beforeArt: string; afterArt: string; beforeAlt: string; afterAlt: string;
  artWidth: number; hintTitle: string; hintText: string; resultTitle: string;
  resultText: string; resultNote: string; shareTitle: string;
  tools: ToolConfig[]; zones: ZoneConfig[];
}
