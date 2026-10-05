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
  NeckStretch = 'neckStretch',
  WallBall = 'wallBall',
  CalfRoll = 'calfRoll',
  FootBall = 'footBall',
  GluteRoll = 'gluteRoll',
  HipHinge = 'hipHinge',
  WallPush = 'wallPush',
  BandRow = 'bandRow',
  WallSlide = 'wallSlide',
  GluteBridge = 'gluteBridge',
  BirdDog = 'birdDog',
  ChairRise = 'chairRise',
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
  UpperTrap = 'upperTrap',
  Scapular = 'scapular',
  Calf = 'calf',
  FootArch = 'footArch',
  Glute = 'glute',
  HipControl = 'hipControl',
  ScapularForward = 'scapularForward',
  ScapularBack = 'scapularBack',
  CoreControl = 'coreControl',
  GeneralActivity = 'generalActivity',
  LoadProgress = 'loadProgress',
}
export type SuccessSound = 'relax' | 'strengthen';
export interface LevelTarget { tool: ToolType; zone: ZoneType; score: number; successSound?: SuccessSound; demoArt?: string; }
export interface LevelConfig {
  id: number; title: string; patientName: string; stageTip: string;
  targets: LevelTarget[]; observeFirst?: boolean;
}
export interface ToolConfig {
  id: ToolType; title: string; detail: string; art: string | null; action: string; wrongFeedback?: string;
}
export interface ZoneConfig {
  id: ZoneType; title: string; detail: string; color: string; side: 'back' | 'chest';
  clue: string; wrong: string; correct: string;
}
export interface PlayableLevel extends LevelConfig {
  fitness?: boolean; workTip?: string; chapter?: 'myths';
  education: {
    question?: string;
    myths?: { claim: string; verdict: boolean; explanation: string }[];
    summary: string; cause: string; boundary: string;
    muscles: { name: string; location: string; function: string; anatomy?: {
      art: string; view: string; caption: string; source: string;
      legend: { name: string; color: string }[];
    } }[];
    actions: { title: string; description: string; art?: string; steps?: string[]; principle?: string; caution?: string }[];
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
