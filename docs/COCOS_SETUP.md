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

## 3.1) 设计分辨率（竖屏铺满）

`GameRoot` 按 **750 × 1334** 逻辑尺寸搭 UI。场景 `assets/scene-001.scene` 里 **Canvas 的 UITransform 内容尺寸** 已与此对齐。

- **浏览器预览**：宽屏下引擎会整体缩放 Canvas，一般能铺满可视区域（上下或左右可能仍有极细边，取决于窗口比例与适配模式）。
- **微信小程序**：构建后在开发者工具里选竖屏、常见机型比例与 750×1334 接近，显示会更「满屏」。
- 若仍觉得偏小：在编辑器选中 **Canvas**，在属性检查器里勾选 **适配屏幕高度** / **适配屏幕宽度**（按产品需求二选一或组合），与 `GameRoot.ts` 里 Root 尺寸保持一致即可。

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
