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
  patientTag: string;
  patientName: string;
  diagnosis: string;
  stageTip: string;
  targets: LevelTarget[];
}
