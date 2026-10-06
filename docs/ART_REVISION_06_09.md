# 第 6～9 关视觉强化

日期：2026-10-06。使用内置生图工具，参考原有对应人物图，透明背景。保留旧资源，新增 v2。机械处理仅透明边裁切、等比缩放与留白。

医学边界参考：[AAOS 肩胛障碍](https://orthoinfo.aaos.org/en/diseases--conditions/scapular-shoulder-blade-disorders/)。夸张图不是精准医学图谱，仍需专业审核。第 10 关酸痛主题与本次形态强化无关，未改动。

## 第 6 关

最终资源：`assets/resources/art/photographer-before-v2.png`

翼状肩胛示例：箭头强调肩胛内侧缘翘起。蝴蝶背不等于翼状肩胛；明显突出伴疼痛、无力时应寻求专业评估。

### 完整提示词

```text
Use case: scientific-educational. Edit target image 1, a transparent cartoon photographer. Create a new exaggerated educational game character illustration in identical warm hand-inked editorial cartoon style, dark forest outlines, muted terracotta and sage. Keep adult woman identity, low bun, sage trousers, cream shoes, camera hanging at hip. Change view to BACK three-quarter, wearing a modest terracotta open-back athletic top exposing the upper back only. Arms reaching forward at shoulder height. THE FOCAL POINT is distinctly protruding medial border and inferior angle of ONE shoulder blade, visible as a raised angular ridge under intact skin casting a shadow; opposite scapula much flatter. Enlarge upper torso proportion and exaggerate raised scapular ridge enough to be instantly readable at 250 pixels tall. Not literal wings, no bones outside skin, no wounds, no fantasy. Two small orange curved arrows point toward the raised medial border. Whole adult body, minimal props, genuinely transparent background. No text. This is a stylized example of scapular winging, not a diagnosis of the referenced person's everyday appearance.
```

## 第 7 关

最终资源：`assets/resources/art/shop-assistant-before-v2.png`

刻意压肩示例：向下箭头表示强行压低肩膀，而手臂正在抬起。自然肩线不是问题，不必消灭斜方肌。

### 完整提示词

```text
Use case: scientific-educational. Edit target image 1 transparent cartoon shop assistant. Preserve adult woman short brown bob, moss green shirt, beige trousers and terracotta shoes, existing warm hand-inked storybook cartoon style. Replace clothing shelf task with exaggerated teaching pose: FRONT three-quarter body, both elbows slightly bent and hands reaching outward about 45 degrees, woman deliberately forcing shoulders DOWN while trying to lift arms. Long tense neck, sharply horizontal shoulder line, brows slightly puzzled, not distressed. Make shoulder/neck area dominant and readable at 250px. Two bold orange DOWN arrows above the shoulders clearly indicate forced downward pressure; one small upward curved arm arrow illustrates conflict. No literal shoulder deformity, no skeletal bones, no demonizing naturally straight shoulders. Full adult body, isolated, transparent background, no mirror or shelf, no text or labels. Depict mistaken action of rigidly depressing shoulders, not a medical diagnosis based on shoulder shape.
```

## 第 8 关

最终资源：`assets/resources/art/stage-tech-before-v2.png`

刻意塌腰摆拍示例：箭头强调顶胸、拱腰的动作。自然腰曲不是错误，练臀不需要故意把腰顶得更弯。

### 完整提示词

```text
Use case: scientific-educational. Edit target transparent cartoon adult stage technician woman. Keep ponytail, ochre tshirt, dark sage trousers, cream sneakers, warm inked editorial cartoon style. Replace ordinary standing/mirror pose with obvious exaggerated SIDE VIEW staged posing: hands resting hips, pelvis pushed backward and belly/ribs pushed forward, exaggerated lumbar arch and buttocks backward making a clear S-curved torso silhouette. Stable feet beneath body, intact anatomy, do not enlarge breasts, no erotic framing. An orange curved arrow follows the exaggerated lower back arch and a small orange arrow indicates ribs thrust forward. This is a demonstration of deliberately over-arching the waist for a posed photo, NOT a diagnosis of lordosis or a judgment about natural hip shape. Full body centered, no mirror so the body occupies most of image, transparent background, no text, readable at 250px.
```

## 第 9 关

最终资源：`assets/resources/art/sorter-before-v2.png`

局部减脂误区示例：圆腹与圈线只强调关注区域。体型不是健康诊断，练腹也不能承诺只减少腹部脂肪。

### 完整提示词

```text
Use case: scientific-educational. Edit target image 1 transparent cartoon adult parcel sorter. Preserve friendly adult man identity, round glasses, short black hair, cream polo shirt, sage trousers, terracotta sneakers and phone. Warm hand-inked editorial cartoon matching reference. Make rounded abdomen MUCH larger and clearly visible in SIDE three-quarter view, comically exaggerated convex belly pushing shirt forward, intact modest shirt covering belly, wider waist and balanced realistic legs. Man casually looking at fitness claim on phone while other hand gently rests on belly. A single orange dashed elliptical outline around rounded abdominal region and small orange pointer highlight the region people mistakenly try to spot-reduce. No unhappy or ashamed expression, no sweating, no ridicule, no junk food, no before-after skinny comparison. No parcel prop competing with silhouette. Full body, enlarged belly is focal point and recognizable at 250px, transparent background, no text. Body shape is illustrative and conveys no diagnosis or moral judgment.
```

## 验收记录

十关数据、资源、TypeScript 语法与浏览器回归通过。新增检查：四关放大入口显隐、正确图片和说明、退出返回、不改变进度。320 / 390 / 933 / 1440 像素布局通过；另人工查看 390 / 933 像素的四关场景及放大图。Cocos 引擎、真机与专业医学图像审核尚未进行。
