import { LevelConfig, ToolType, ZoneType } from '../types';

export const level1Config: LevelConfig = {
  id: 1,
  title: '键盘侠的觉醒',
  patientName: '小周 / 伏案工作 8 小时',
  stageTip: '本关简化为两个科普目标：紧张区域放松，无力区域强化。',
  targets: [
    { tool: ToolType.FasciaBall, zone: ZoneType.Chest, score: 50 },
    { tool: ToolType.ElasticBand, zone: ZoneType.Back, score: 50 },
  ],
};
