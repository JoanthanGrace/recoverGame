# Cocos Creator 使用说明（当前项目即根目录）

## 1) 打开项目

1. 打开 Cocos Creator（建议 3.8.x）。
2. 选择 **打开项目**，直接选当前目录 `recoverGame`。

## 2) 代码位置

核心脚本已在项目根目录下：

- `assets/scripts/GameRoot.ts`
- `assets/scripts/types.ts`
- `assets/scripts/config/level1.ts`
- `assets/scripts/core/I18n.ts`
- `assets/scripts/data/locales.ts`

## 3) 场景挂载脚本

1. 在层级管理器中，选择 `Canvas`（或创建空节点 `GameRootNode` 放在 Canvas 下）。
2. 添加脚本组件：`GameRoot.ts`。
3. 保存场景。

## 4) 运行验证

点击预览（Preview），你应该可以看到：

- 顶部健康条（初始 0%）
- 中部两个热区（胸前红色闪烁、后背蓝色区域）
- 底部两个可拖拽工具

交互规则：

- 筋膜球拖到胸前红区：正确 +50
- 弹力带拖到后背蓝区：正确 +50
- 错配时抖屏并弹回
- 到 100% 时显示结算层

## 5) 微信小游戏适配

1. 在 Cocos Creator 中执行 **构建发布 -> 微信小游戏**。
2. 用微信开发者工具打开构建产物。
3. 真机调试时 `wx.shareAppMessage` 会生效；在普通浏览器预览环境下会提示分享接口不可用。
