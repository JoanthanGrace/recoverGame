import { LevelConfig, ToolType, ZoneType } from '../types';

export const level1Config: LevelConfig = {
  id: 1,
  title: '病例01：键盘侠的觉醒',
  patientTag: '键盘侠衰衰',
  patientName: '圆肩驼背',
  diagnosis: '胸紧背弱',
  stageTip: '红色区域太紧了，需要放松；蓝色区域太弱了，需要激活。',
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
