export enum ToolType {
  FasciaBall = 'fasciaBall',
  ElasticBand = 'elasticBand',
  FoamRoller = 'foamRoller',
  ResistanceBand = 'resistanceBand',
}

export enum ZoneType {
  Chest = 'chest',
  Back = 'back',
  Hip = 'hip',
  Glute = 'glute',
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
