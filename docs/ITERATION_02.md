# 第二关：久坐暂停键

## 体验

第一关完成后可进入第二关；顶部也能直接切换两关。第二关增加「先观察再选择」：

1. 点击线索 A，发现小林一直坐着没有走动。
2. 点击线索 B，发现切换工作页时仍一直看屏幕。
3. 将「起身活动」用于坐姿线索，将「远眺休息」用于盯屏线索。可任意顺序完成。
4. 「继续工作」是干扰选项，不计分，并解释为什么不满足当前休息目标。
5. 结算展示同一人物坐姿/起身对比，可重玩本关或回到第一关。

未查看的线索不能通过拖拽直接计分，观察动作本身不加分。重玩重置线索，切换关卡取消未完成的结算延迟与拖拽状态。

## 共用配置

`assets/resources/data/levels.json` 是浏览器与 Cocos 的共同关卡来源，包含目标、工具、插画、观察门槛与提示文案。旧 `config/level1.ts` 保留作早期脚本兼容，本次两个入口不读取它。

浏览器通过 HTTP 读取 JSON；Cocos 通过 `resources.load('data/levels', JsonAsset)` 读取。浏览器须通过本地服务器打开，不支持直接以 file 协议读取关卡配置。

## 新美术

- `break-before.png`：小林坐在凳子上，低头面对电脑。
- `break-after.png`：同一人物起身舒展。
- `walk-break.png`：活动行动图标。
- `distance-break.png`：看向远处的窗景图标。

由第一关的原始素材作为风格参考生成，再拆分成透明 PNG。人物保留共用画布与脚部基线，坐姿不会被强行放大为站姿高度。「继续工作」图标由代码绘制。

## 文案依据

参考英国 Health and Safety Executive 的屏幕工作科普：

- [Work routine and breaks](https://www.hse.gov.uk/msd/dse/work-routine.htm)：休息或活动变化应允许起身、走动或改变姿势。
- [Working with display screen equipment](https://www.hse.gov.uk/pubns/indg36.pdf)：不时看向远处，打断持续屏幕工作。

游戏只表达两种休息习惯，没有计时处方或治疗效果承诺。

## 验证

`npm test` 检查两关配置、素材存在、计分、观察门槛、错配、重复、重置，以及 TS 语法转译。

`npm run test:browser` 用本机 Chrome 启动自动化测试服务器，验证第一关到第二关、未观察拖拽防绕过、干扰选项、提示、通关、重玩、切换时取消延迟结算、level=2 直达、320/390/1440px 无横向溢出，以及浏览器脚本错误。需要先安装开发依赖和 Chrome。可用 CHROME_PATH 指定可执行文件。

Cocos 仍未完成引擎运行、SDK 类型检查、微信构建和真机验证。
