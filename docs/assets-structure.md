# 资源目录规范（微信小游戏 / Cocos）

更新时间：2026-04-02  
适用项目：recoverGame（打工人康复指南）

## 1. 目录总览

```text
assets/
  resources/
    cover/                    # 封面、启动页、商店图、分享底图
    ui/
      common/                 # 公共按钮、通用面板、进度条、图标
      start/                  # 开始界面专属UI
      settlement/             # 结算界面专属UI
    characters/               # 角色素材（病人、医生、NPC）
    props/                    # 道具素材（筋膜球、弹力带、泡沫轴等）
    backgrounds/              # 背景图（诊疗室、办公室、健身角等）
    vfx/                      # 特效贴图（闪光、命中、粒子贴图）
    animations/               # 帧动画序列图/动画资源
    prefabs/                  # 资源预制体
    fonts/                    # 字体文件
    audio/
      bgm/                    # 背景音乐
      sfx/
        ui/                   # UI点击、弹窗、切页
        gameplay/             # 拖拽、命中、错误、回弹
        feedback/             # 通关、失败、提示
      voice/
        zh/                   # 中文语音
        en/                   # 英文语音
    levels/
      common/                 # 多关共享资源
      level01/                # 第1关专属资源
      level02/                # 第2关专属资源
      ...
      level30/                # 第30关专属资源
  source/
    psd/                      # 设计源文件
    figma/                    # 导出的设计标注或切图包
    spine/                    # 骨骼动画源文件
    audio/                    # 原始录音/母带
  export/
    wechat/                   # 面向微信小游戏导出图（审核图、商店图）
    review/                   # 备案/审核专用截图（场景、玩法、系统）
```

## 2. 你现在要用的目录

- 封面素材放到：`assets/resources/cover/`
- 第一关素材放到：`assets/resources/levels/level01/`
- 第二关素材放到：`assets/resources/levels/level02/`
- 第三关（提前预留）放到：`assets/resources/levels/level03/`
- 公共UI按钮和通用框体放到：`assets/resources/ui/common/`
- 开始界面专属UI放到：`assets/resources/ui/start/`
- 结算界面专属UI放到：`assets/resources/ui/settlement/`
- 备案截图导出放到：`assets/export/review/`

## 3. 文件命名建议（强烈建议统一）

推荐格式：

`[模块]_[关卡]_[用途]_[版本]`

示例：

- `cover_main_bg_v1.png`
- `lv01_patient_idle_v1.png`
- `lv01_zone_chest_red_v1.png`
- `lv02_zone_glute_blue_v1.png`
- `ui_btn_start_v1.png`
- `sfx_hit_correct_v1.wav`
- `bgm_main_loop_v1.mp3`

## 4. 音频落地规范（后续会扩展）

- 背景音乐：`assets/resources/audio/bgm/`
- 按钮音效：`assets/resources/audio/sfx/ui/`
- 玩法音效（拖拽、命中、错误）：`assets/resources/audio/sfx/gameplay/`
- 反馈音效（通关、提示）：`assets/resources/audio/sfx/feedback/`

建议参数：

- 音效优先 `wav`（开发阶段），最终可转 `ogg/mp3`
- 背景音乐循环片段统一留淡入淡出
- 所有音频文件名使用小写+下划线，不要空格

## 5. 关卡扩展策略（你后续加到30关时）

- 每关专属图放各自 `levels/levelXX/`
- 多关共享图（如通用按钮、共享角色）只放 `levels/common/` 或 `ui/common/`
- 不要把所有图都堆在一个目录，否则后期维护和替换会非常痛苦

## 6. 备案截图建议路径

备案时建议把三类图放在：

`assets/export/review/`

建议文件名：

- `record_scene_main_01.png`
- `record_gameplay_drag_01.png`
- `record_system_settlement_01.png`
