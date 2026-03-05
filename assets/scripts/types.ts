export enum ToolType {
  FasciaBall = 'fasciaBall',
  ElasticBand = 'elasticBand',
}

export enum ZoneType {
  Chest = 'chest',
  Back = 'back',
}

export interface LevelTarget {
  tool: ToolType;
  zone: ZoneType;
  score: number;
}

export interface LevelConfig {
  id: number;
  title: string;
  patientName: string;
  stageTip: string;
  targets: LevelTarget[];
}
