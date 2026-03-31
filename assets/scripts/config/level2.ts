import { LevelConfig, ToolType, ZoneType } from '../types';

export const level2Config: LevelConfig = {
  id: 2,
  title: '病例02：久坐族的髋部解放',
  patientTag: '久坐族小明',
  patientName: '骨盆前倾',
  diagnosis: '髋屈肌紧张，臀肌无力',
  stageTip: '红色区域是紧张的髋屈肌，需要放松；蓝色区域是无力的臀肌，需要激活。',
  targets: [
    {
      tool: ToolType.FoamRoller,
      zone: ZoneType.Hip,
      score: 50,
    },
    {
      tool: ToolType.ResistanceBand,
      zone: ZoneType.Glute,
      score: 50,
    },
  ],
};
