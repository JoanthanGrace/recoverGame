import { LevelConfig, ToolType, ZoneType } from '../types';

export const level1Config: LevelConfig = {
  id: 1,
  title: 'Lv.1 Keyboard Worker Recovery',
  patientName: 'Upper Crossed Syndrome',
  stageTip: 'Relax front chest muscles and strengthen back muscles.',
  targets: [
    {
      tool: ToolType.FasciaBall,
      zone: ZoneType.Chest,
      score: 50,
    },
    {
      tool: ToolType.ElasticBand,
      zone: ZoneType.Back,
      score: 50,
    },
  ],
};
