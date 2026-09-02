# 拼豆助手 前端技术架构

| 项目 | 内容 |
| --- | --- |
| 产品 | 拼豆助手 / Perler Beads Assistant |
| 文档类型 | 前端架构设计 |
| 版本 | v1.0 |
| 依据 | `docs/PRD.md`、`docs/UI-UX.md` |
| 状态 | 方案待确认，未写业务代码 |
| 栈 | Vue 3 + TypeScript + Vite + Pinia + Canvas + UnoCSS |

---

## 0. 架构原则

1. **一套相机，全家共用。** 图片、网格、高亮、数格、完成、小地图，禁止各算各的缩放。
2. **引擎与界面分离。** 坐标、命中、绘制、历史是纯 TypeScript；Vue 只负责壳和输入转发。
3. **格子不是 DOM。** 200×200 = 40000 格，只存在于数字和像素里。
4. **状态进 Store / Engine，不进组件局部。** 组件可以有一次性 UI 状态（Sheet 开合），不能有 `currentRow`。
5. **能不重绘就不重绘。** 空闲时 0 帧；交互时 1 个 rAF。
6. **持久化以作品为中心。** IndexedDB 存作品；localStorage 只存设置和「上次打开谁」。

---

## 1. 架构设计

### 1.1 分层

```text
┌-----------------------------------------------------------┐
│  Pages / Vue Components                                   │
│  HomePage · WorkspacePage · Toolbars · Sheets · Toast     │
├-----------------------------------------------------------┤
│  Pinia Stores                                             │
│  project · viewport · interaction · progress · settings   │
├-----------------------------------------------------------┤
│  Canvas Engine（纯 TS，无 Vue）                            │
│  Camera · Coord · HitTest · Renderer · Layers · Input     │
├-----------------------------------------------------------┤
│  Persist                                                  │
│  IndexedDB (作品) · localStorage (设置)                    │
└-----------------------------------------------------------┘
```

数据一律从上到下：**用户事件 → Store 改状态 → Engine 标脏 → rAF 绘制**。  
禁止 Layer 直接改 Store，禁止组件里 `ctx.fillRect` 画格子。

### 1.2 运行时主链路

```text
Pointer / Wheel / Keyboard
        │
        ▼
  input/gesture.ts          区分 tap / pan / pinch / wheel
        │
        ▼
  coord.convert             Screen → Canvas → World → Grid
        │
        ▼
  Pinia actions             selection / measure / completed / camera
        │
        ▼
  renderer.requestFrame()
        │
        ▼
  rAF → Camera.apply(ctx) → Layer1..5.draw(world)
        │
        ▼
  MiniMapRenderer           同一 World，另一套 Camera
```

### 1.3 技术选型落地

| 项 | 选择 | 理由 |
| --- | --- | --- |
| 框架 | Vue 3 `<script setup>` + TS | 与指定栈一致 |
| 构建 | Vite | 快，原生 ESM |
| 状态 | Pinia 5 个 Store，不按字段拆 9 个文件 | 避免循环依赖；领域仍覆盖你列的 9 块 |
| 样式 | **UnoCSS + `@unocss/preset-wind`** | 兼容 Tailwind 写法，Vite 下比 Tailwind JIT 更轻 |
| 绘制 | 主舞台 **1 个可见 Canvas**；小地图独立小 Canvas | 变换只 apply 一次；小地图分辨率低 |
| 图片 | `createImageBitmap` 缓存 | 解码一次，每帧 `drawImage` |
| 事件 | Pointer Events + 独立 pinch 状态机 | 鼠标/手指同一套，再叠加双指 |
| 存储 | `idb` 包或自研薄封装 IndexedDB | 图片 Blob 不能进 localStorage |
| 路由 | `vue-router` 两页：`/`、`/w/:projectId` | 刷新可恢复 |

暂不引入：PixiJS、Konva、Fabric。这个产品的图元是「一张图 + 矩形格」，自研 Camera + Layer 更可控，也避免双坐标系。

### 1.4 模块边界

```text
engine/          不知道 Vue、不知道 Pinia
stores/          不知道 CanvasRenderingContext2D
components/      不知道行列计算公式（只调用 composable）
persist/         不知道怎么画
composables/     胶水：把 Store + Engine 接到组件
```

`useBeadCanvas()` 是唯一允许同时碰 Store 和 Engine 的组合式函数。

### 1.5 与产品文档的对应

| 产品概念 | 技术落点 |
| --- | --- |
| 我现在在哪 | `interaction.selection` + HighlightLayer |
| 数格 / 测距 | `interaction.measurement` + MeasurementLayer |
| 完成标记 | `progress.completed` + CompletedLayer |
| 缩放拖动不错位 | 全体 Layer 只使用 `Camera.apply` 后的 World |
| 小地图 | 同一 `Grid` + `World`，`MiniMapCamera` |
| 本地续拼 | IndexedDB `ProjectRecord` |

---

## 2. 数据模型

类型只描述形状，不是可运行业务代码。

### 2.1 坐标类型

```ts
type ScreenPt = { screenX: number; screenY: number } // 视口 client
type CanvasPt = { canvasX: number; canvasY: number } // Canvas CSS 像素
type WorldPt  = { worldX: number; worldY: number }   // 图片像素，原点左上
type GridCell = { row: number; col: number }         // 1-based，与 PRD 展示一致

type CameraState = {
  scale: number
  minScale: number
  maxScale: number
  offsetX: number   // World(0,0) 画到 Canvas 的 CSS X
  offsetY: number
}

type ViewportState = CameraState & {
  cssWidth: number
  cssHeight: number
  dpr: number
}
```

`Cell` 作为 **值对象** 使用，不作为 40000 条记录存盘。

```ts
type Cell = {
  row: number
  col: number
  color?: string      // 需要时从图片采样，不持久化全图颜色
  completed?: boolean // 展示用派生，源数据在 CompletedSet
}
```

格子主键用打包整数，避免 `"12,8"` 字符串和对象分配：

```ts
type CellId = number
// id = (row - 1) * colCount + (col - 1)
```

改 `colCount` 会使旧 id 失效。与 PRD 一致：改行列时清空完成集和历史。

### 2.2 网格与图片

```ts
type ImageAsset = {
  id: string
  name: string
  mime: string
  width: number          // 自然像素
  height: number
  bitmap: ImageBitmap | null  // 运行时
  blobKey: string        // IndexedDB 里的 Blob
}

type GridSpec = {
  rowCount: number
  colCount: number
  insetLeft: number      // World px
  insetTop: number
  insetRight: number
  insetBottom: number
}

type GridMetrics = GridSpec & {
  cellWidth: number
  cellHeight: number
  originX: number        // = insetLeft
  originY: number
  gridWidth: number
  gridHeight: number
}
```

```text
cellWidth  = (image.width  - insetL - insetR) / colCount
cellHeight = (image.height - insetT - insetB) / rowCount

cellWorldRect(row, col):
  x = insetL + (col - 1) * cellWidth
  y = insetT + (row - 1) * cellHeight
  w = cellWidth
  h = cellHeight
```

### 2.3 交互与进度

```ts
type ToolMode = 'select' | 'count' | 'measure' | 'mark'

type SelectionState = {
  focus: GridCell | null
  hover: GridCell | null   // 仅 pointer 精细设备
}

type CountSession = {
  start: GridCell | null
  end: GridCell | null
  path: CellId[]           // 同行或同列闭区间
  count: number
}

type MeasureSession = {
  a: GridCell | null
  b: GridCell | null
  deltaCol: number         // |colB-colA|
  deltaRow: number
  width: number            // +1
  height: number
  area: number
}

type MeasurementState = {
  kind: 'idle' | 'count' | 'measure'
  count: CountSession
  measure: MeasureSession
}

type CompletedSet = Set<CellId>

type HistoryCommand =
  | { type: 'setCompleted'; ids: CellId[]; value: boolean }

type HistoryState = {
  undo: HistoryCommand[]
  redo: HistoryCommand[]
}
```

缩放、拖动、切换当前格 **不进** 历史栈。

### 2.4 作品与设置

```ts
type ProjectMeta = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbKey?: string
}

type ProjectPersist = {
  meta: ProjectMeta
  image: { blob: Blob; width: number; height: number; mime: string }
  grid: GridSpec
  completed: number[]     // CellId[]
  camera: Pick<CameraState, 'scale' | 'offsetX' | 'offsetY'>
  selection: GridCell | null
  settingsOverride?: Partial<WorkspaceSettings>
}

type WorkspaceSettings = {
  showGrid: boolean
  gridOpacity: number
  showRulers: boolean
  doneOverlay: boolean     // 默认 false，UI-UX：轻遮罩可选
  lockPanZoom: boolean     // P1
}

type AppSettings = {
  lastProjectId: string | null
  seenGuide: boolean
}
```

### 2.5 为什么不存 `Cell[]`

| 规模 | 格数 | 若每格一个对象 | 建议 |
| --- | --- | --- | --- |
| 100×100 | 1e4 | 可撑但浪费 | Set / Bitset |
| 200×200 | 4e4 | 卡顿风险 | Set of CellId |
| 500×500 | 2.5e5 | 绝不能全量对象 | 稀疏 Set；全完成时可用 Uint32 bitset |

源数据：

- 位置：`row/col` 即时算
- 颜色：当前格从 bitmap 采 1 次
- 完成：`CompletedSet.has(id)`

---

## 3. Store 设计

你列出的 9 个状态域全部保留，但 **收成 5 个 Pinia Store**。  
`zoom` 与 `viewport` 合并：缩放就是相机，拆开会出现两份 `scale`。

```text
settingsStore          独立，localStorage
        ▲
projectStore           image + grid + meta
        ▲
viewportStore          zoom + viewport + dpr
        ▲
interactionStore       selection + measurement + mode
        ▲
progressStore          completedCells + history
```

依赖单向。`progress` 需要 `grid.colCount` 才能 pack/unpack，通过 action 参数传入，不 import `projectStore` 进 `progressStore`（避免环）。由 `composables/useWorkspace.ts` 编排。

### 3.1 `projectStore`（image + grid）

```text
state
  projectId
  meta
  image: ImageAsset
  grid: GridSpec

getters
  gridMetrics
  hasImage
  totalCells = rowCount * colCount

actions
  createFromFile(file)
  load(id)
  setGrid(partial)            // 改行列：通知 workspace 清空进度
  setInsets(insets)           // 不清空进度
  rename(name)
```

### 3.2 `viewportStore`（zoom + viewport）

```text
state
  scale, minScale, maxScale
  offsetX, offsetY
  cssWidth, cssHeight, dpr

getters
  camera: CameraState
  visibleWorldRect
  scalePercent

actions
  resize(cssW, cssH, dpr)
  setScaleAt(canvasPt, nextScale)     // 锚点缩放
  panBy(dx, dy)
  fitToScreen(worldRect)
  centerOnWorld(worldPt)              // 回中
  centerOnCell(cell, metrics)
  restore(camera)
```

`minScale`：整图（含 8% 边）能放进画布。  
`maxScale`：单格 CSS 边长上限约 120（按 `cellWidth * scale` 计）。  
图片或网格变化后重算 min/max，并 clamp 当前 scale。

### 3.3 `interactionStore`（selection + measurement）

```text
state
  mode: ToolMode
  selection: { focus, hover }
  measurement

actions
  setMode(mode)
  tapCell(cell)               // 按 mode 分发
  setHover(cell | null)
  clearMeasurement
  applyCountEnd(cell)         // 非法则失败原因给 UI
```

`tapCell` 是唯一「点格子」入口。组件不得自己 `if (mode === ...)`。

### 3.4 `progressStore`（completedCells + history）

```text
state
  completed: Set<CellId>
  history: { undo, redo }

getters
  doneCount
  percent
  isCompleted(id)

actions
  toggle(ids)
  setMany(ids, value)
  undo / redo
  reset()                     // 改行列后
```

历史只存命令，不存整个 Set 快照。上限 50。

### 3.5 `settingsStore`

```text
state: AppSettings & WorkspaceSettings
actions: patch + persist localStorage
```

### 3.6 持久化编排（不是第六个业务 Store）

`composables/useProjectPersist.ts`：

- `completed` / `camera` / `grid` / `focus` 变更后 **400ms debounce** 写入 IDB
- `visibilitychange` / `pagehide` flush
- 加载：IDB → project/viewport/progress/interaction

不要每个 Store 自己写 IDB，以免写出 4 份不一致的作品。

---

## 4. Canvas 架构

### 4.1 物理层 vs 逻辑层

**主舞台：1 个可见 `<canvas>`。**  
多 Canvas 叠层要同步 5 次 `setTransform` 和 5 次 resize，错一位就网格漂。单 Canvas 用代码分层，变换只发生一次。

**额外：**

| 表面 | 用途 |
| --- | --- |
| MainCanvas | 用户看见的工作区 |
| ImageBitmap | 解码缓存，不是第二层 DOM |
| Offscreen 缩略图 | 生成列表/小地图底图（可选） |
| MiniMapCanvas | 独立小画布，约 120×120 CSS |

### 4.2 逻辑分层（必须按此顺序）

```text
Camera.apply(ctx)          // 此后 ctx 单位 = World px

Layer 1  Background / Image
Layer 2  Grid
Layer 3  Highlight         // 行带、列带、当前格
Layer 4  Completed
Layer 5  Measurement       // 数格路径、测距矩形、起终角标

Camera.reset(ctx)
HUD（可选）                 // 若尺画在主 Canvas 视口边，用 Screen 空间
```

UI-UX 的视觉强度：当前格 > 数格/测距 > 行列带 > 完成勾 > 网格。  
绘制顺序是「先弱后强」，所以 Highlight 在 Completed 之下时，当前格描边会被勾挡住一角——**当前格描边应在 Layer 3 画填充/行列，在 Layer 5 之后再描一次边**，或把 FocusStroke 当作 3b/5b。架构上记为：

```text
3a Crosshair fill
4  Completed ticks
5  Measurement
3b Focus stroke          // 保证「我在哪」永远在最上面
```

实现可以是 `HighlightLayer.drawFill` + `HighlightLayer.drawStroke` 两次调用，仍算一层逻辑。

### 4.3 Layer 接口

```ts
type LayerContext = {
  ctx: CanvasRenderingContext2D
  camera: ViewportState
  grid: GridMetrics
  image: ImageAsset
  visible: WorldRect
}

interface Layer {
  name: 'image' | 'grid' | 'highlight' | 'completed' | 'measurement'
  dirty: boolean
  draw(lc: LayerContext): void
}
```

单 Canvas 时 `dirty` 用于 **跳过整层计算**（例如测量 idle 则 Measurement 直接 return），不是跳过清屏。每帧仍按序画可见层；Image 用 bitmap，Grid/Completed 做视口裁剪。

### 4.4 Renderer

```text
requestFrame()
  if scheduled: return
  scheduled = true
  requestAnimationFrame(flush)

flush()
  scheduled = false
  resizeIfNeeded()
  clear css well color
  camera.apply(ctx)          // setTransform(dpr*scale, 0, 0, dpr*scale, dpr*ox, dpr*oy)
  image.draw()
  if settings.showGrid: grid.draw()
  highlight.drawFill()
  completed.draw()
  measurement.draw()
  highlight.drawStroke()
  camera.reset()
  optional: rulers in screen space
  minimap.requestFrame()
```

禁止在 Vue `watch` 里直接 `draw()`。一律 `requestFrame()`。

### 4.5 小地图

```text
MiniMapCamera
  scale = fit(image) into 120×120
  offset = 居中
  与主相机无关

绘制
  同一 ImageBitmap
  同一 Grid（可只画外框）
  主相机 visibleWorldRect → 映射成小地图上的视口框
  当前格：一个点

点击
  MiniMap Screen → MiniMap Canvas → World → viewport.centerOnWorld
```

小地图 **不得** 维护自己的 `row/col` 算法副本；调用同一 `worldToGrid`。

### 4.6 Vue 组件职责

| 组件 | 做什么 | 不做什么 |
| --- | --- | --- |
| `BeadCanvas` | 挂 canvas、ResizeObserver、把 pointer 丢给 engine | 算 row/col、写 completed |
| `MiniMap` | 挂小 canvas、转发点击 | 自写缩放公式 |
| `GridOverlay` 等 | **不是 DOM 叠加格网**；对应 Layer 类 | 不要做成 40000 个 div |
| Toolbars / Panels | 改 Store.mode / 调 camera.fit | 碰 ctx |

命名保留你的建议，但 Overlay 在本架构里是 **Layer 类**，不是 Vue 覆盖层：

```text
components/workspace/BeadCanvas.vue
engine/layers/GridLayer.ts          ← GridOverlay
engine/layers/HighlightLayer.ts     ← SelectionOverlay
engine/layers/MeasurementLayer.ts   ← MeasurementTool
```

---

## 5. 坐标转换方案

### 5.1 四个空间

```text
Screen (clientX, clientY)
    │  − canvas.getBoundingClientRect()
    ▼
Canvas (canvasX, canvasY)        CSS 像素，原点 = canvas 左上
    │  World = (Canvas - offset) / scale
    ▼
World (worldX, worldY)           图片自然像素，原点 = 图左上
    │  − inset；/ cellSize；+1
    ▼
Grid (row, col)                  1-based
```

反向：

```text
Grid → World（格中心或格左上）
    → Canvas = World * scale + offset
    → Screen = Canvas + rect.left/top
```

DPR **不进入** 这四条业务公式。DPR 只在 `Canvas.width = cssWidth * dpr` 和 `setTransform` 里出现。命中检测一律用 CSS 像素。

### 5.2 公式

```text
screenToCanvas(s):
  canvasX = screenX - rect.left
  canvasY = screenY - rect.top

canvasToWorld(c, cam):
  worldX = (canvasX - cam.offsetX) / cam.scale
  worldY = (canvasY - cam.offsetY) / cam.scale

worldToCanvas(w, cam):
  canvasX = w.worldX * cam.scale + cam.offsetX
  canvasY = w.worldY * cam.scale + cam.offsetY

worldToGrid(w, g):
  if outside inset+grid → null
  col = floor((worldX - g.insetLeft) / g.cellWidth) + 1
  row = floor((worldY - g.insetTop)  / g.cellHeight) + 1
  clamp 到 [1, count]，越界则 null

gridToWorldRect(cell, g):  见 §2.2
gridToWorldCenter(cell, g): 矩形中心
```

链式 API 固定这两个函数，避免各处手写：

```text
screenToGrid(screen, cam, rect, grid) 
gridToScreen(cell, cam, rect, grid)
```

小地图传入 **自己的** `cam` 和 `rect`，函数相同。

### 5.3 绘制时为什么 Layer 只用 World

```text
ctx.setTransform(
  dpr * scale, 0,
  0, dpr * scale,
  dpr * offsetX, dpr * offsetY
)
```

之后：

- `drawImage(bitmap, 0, 0)` 与网格矩形用同一 World
- 线宽要保持 1 屏像素：`ctx.lineWidth = 1 / scale`（再按 dpr 已在 transform 里）
- 完成勾大小按 `clamp(worldSize, minScreen/scale, maxScreen/scale)` 算，近大远小但有下限

### 5.4 尺、Status、小地图对齐验收

同一帧内：

1. 点击 → `screenToGrid` → `8,12`
2. Highlight 用 `gridToWorldRect(8,12)`
3. Status 显示同一 `focus`
4. 小地图点画在 `worldToCanvas(center, miniCam)`

四者不一致即视为坐标系统分裂，优先查是否有人用了 `event.offsetX` 或漏减了 rect。

统一规定：命中用 `clientX/Y` + `getBoundingClientRect()`，不用 `offsetX`（CSS 缩放和 padding 会偏）。

---

## 6. Zoom / Pan 方案

### 6.1 唯一相机

```text
scale, minScale, maxScale, offsetX, offsetY
```

所有缩放、平移、回中、适应屏幕、小地图跳转，只改这 5 个数（外加 resize 的宽高 dpr）。

### 6.2 锚点缩放（指针 / 双指中心尽量不动）

```text
zoomAt(canvasAnchor, factor):
  world = canvasToWorld(anchor, cam)      // 缩放前
  next  = clamp(cam.scale * factor, min, max)
  // 希望缩放后该 world 仍投影到同一 canvas 点：
  offsetX = anchor.canvasX - world.worldX * next
  offsetY = anchor.canvasY - world.worldY * next
  scale   = next
```

滚轮、Ctrl+滚轮、双指、按钮 +/-，全部走 `zoomAt`。  
按钮 +/- 的锚点 = 画布中心；回中不改变 scale。

### 6.3 PC 缩放

| 输入 | 行为 |
| --- | --- |
| 滚轮 | `zoomAt(cursor, 1.001 ** deltaY 的平滑映射)`，`preventDefault` |
| Ctrl + 滚轮 | 同上（有的系统把 Ctrl+轮当页缩放，必须 preventDefault） |
| +/- 键 | `zoomAt(center, 1.1)` |

delta 建议映射到指数，避免一次跳 50%。触控板连续事件走同一函数。

### 6.4 Mobile 双指

```text
pointers: Map<id, CanvasPt>

on pointerdown: 记录
on pointermove:
  若 pointers.size === 2:
    mid0, dist0 = 上一帧中点与距离
    mid1, dist1 = 本帧
    zoomAt(mid1, dist1 / dist0)
    再 panBy(mid1 - mid0)           // 平移跟手
    标记 gesture = 'pinch'
  若 size === 1 且非 pinch:
    走 pan / tap 判定
on pointerup/cancel: 删除 id；剩 0 个时结束 pinch
```

不要用浏览器 `gesture*` 事件。不要把 pinch 拆成两个独立 pan。

### 6.5 Pan 与点击冲突

```text
TAP_SLOP = 5 CSS px          // 可按 dpr 略增，但用 CSS px
DRAG_SLOP = TAP_SLOP

pointerdown:
  start = canvasPt
  moved = 0
  gesture = 'pending'

pointermove:
  moved = distance(start, current)
  if gesture === 'pending' and moved > TAP_SLOP:
    gesture = 'pan'
  if gesture === 'pan':
    panBy(delta)
    consume event

pointerup:
  if gesture === 'pending' or (moved <= TAP_SLOP):
    emit tap(start)          // 用 down 点，不用 up 点，避免手抖偏一格
  gesture = 'idle'
```

补充：

- `pointercapture` 在 down 时 `setPointerCapture`，移出画布也能结束
- 超过 slop 后即使回到原点也仍是 drag，避免「拖一圈再点上」误选
- pinch 一旦成立，本次手势不再 tap
- 双击「适应/聚焦」用 300ms 内两次 tap，且两次都未变 pan

### 6.6 边界

```text
约束 World 在视口内至少露出 24% 画布井（与 UI-UX 一致）
空图：offset 居中，scale = 1
fitToScreen：整图 + padding 写入 scale/offset
centerOnCell：只改 offset，scale 不变
```

缩放不改变 `selection.focus`。

### 6.7 输入模块位置

```text
engine/input/pointerMachine.ts    tap / pan / pinch
engine/input/wheel.ts
engine/input/keyboard.ts          方向键、快捷键 → 只发命令
```

Vue 只 `addEventListener` 并转进去。

---

## 7. 性能方案

### 7.1 目标档

| 网格 | 期望 |
| --- | --- |
| 100×100 | 手机 60fps 缩放拖动 |
| 200×200 | 手机跟手，偶发掉到 30 可接受 |
| 500×500 | 视口裁剪 + 网格 LOD，拖动跟手；全图网格远景抽稀 |

### 7.2 不画 40000 个 DOM，也不每格 `fillRect` 全图遍历

完成集按 **已完成 id 列表** 画勾，并与 `visibleWorldRect` 求交。  
若 `doneCount` 很大（例如 > 2 万）且高缩放只看见 80 格：改为按可见行列双重循环，`has(id)` 查询。  
阈值：`doneCount < visibleCells * 4` 时遍历 Set，否则遍历可见格。

### 7.3 网格 LOD

```text
screenCell = cellWidth * scale
if screenCell < 4:   只画每 10 条 或 只画外框
if screenCell < 8:   每 2 条
else:                逐条
线宽恒为 ~1 CSS px
只画与 visibleWorldRect 相交的线
```

远景不画勾，只在进度里体现（与 UI-UX 一致）。

### 7.4 rAF 与脏标记

```text
空闲：0 个 rAF
一次 wheel / move：合并到下一帧，一帧内多次事件只画一次
动画（回中缓动，可选）：连续 rAF，结束立刻停
禁止 setInterval(draw, 16)
```

### 7.5 图片

- `createImageBitmap(blob, { resizeWidth, resizeHeight })`：长边 > 8192 则降到 8192，记录 `bitmapScale`，World 仍用逻辑宽高（自然尺寸），绘制时 `drawImage` 拉满逻辑矩形
- 解码期间主舞台可先空井 + Spinner（Vue）
- 不要每帧 `new Image()`
- 不要 `getImageData` 全图；ColorPanel 只读当前格中心 1×1 或 3×3 平均

### 7.6 对象分配

热路径（pointermove、draw）禁止：

- 每格 `new Path2D`
- 每帧分配 `[]` 装全部可见格（复用模块级 scratch rect）
- 字符串拼 `"row,col"` 当 key

`CellId` 用整数。转换函数返回复用对象时要小心别被存下来；对外 API 返回新字面量即可，move 热路径用 out 参数。

### 7.7 DPR

```text
dpr = min(devicePixelRatio || 1, 3)
backingWidth  = round(cssWidth  * dpr)
backingHeight = round(cssHeight * dpr)
仅当 backing 变化时设置 canvas.width/height（这会清空画布，随后必绘）
```

ResizeObserver 看的是 **容器 CSS 盒**，不是 window。  
`dpr` 变化（拖窗口到另一屏）走同一 resize。

### 7.8 单帧预算（经验）

```text
apply transform     可忽略
drawImage           0.2–1ms
grid lines          视口内数十到数百条 < 1ms
completed ticks     可见且已完成的，目标 < 2ms
highlight+measure   常数时间
```

超预算先砍：远景勾 → 网格抽稀 → 完成改可见循环。

### 7.9 性能禁止项

- 一个格一个 Vue 组件
- `v-for` 画网格线 DOM
- 用 CSS `transform: scale` 放大一张大图再绝对定位 DOM 网格（必裂）
- 在 `watchEffect` 里同步 draw 全层
- 把 completed 存成 `{row,col,color,completed}[]`

---

## 8. 文件目录结构

```text
cornPerlerBeadsAssistant/
├── docs/
│   ├── PRD.md
│   ├── UI-UX.md
│   └── ARCHITECTURE.md
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── uno.config.ts
├── public/
│   └── examples/                 # 示例图纸
└── src/
    ├── main.ts
    ├── App.vue
    ├── styles/
    │   └── tokens.css            # UI-UX 颜色变量
    ├── pages/
    │   ├── HomePage.vue
    │   └── WorkspacePage.vue
    ├── components/
    │   ├── home/
    │   │   ├── HeroCTA.vue
    │   │   ├── ProjectCard.vue
    │   │   └── ExampleRail.vue
    │   ├── workspace/
    │   │   ├── BeadCanvas.vue
    │   │   ├── MiniMap.vue
    │   │   ├── WorkspaceToolbar.vue
    │   │   ├── CanvasToolbar.vue
    │   │   ├── ZoomControls.vue
    │   │   ├── ProgressPanel.vue
    │   │   ├── ColorPanel.vue
    │   │   └── StatusDock.vue
    │   └── ui/                   # Button / Sheet / Modal / Toast
    ├── composables/
    │   ├── useBeadCanvas.ts
    │   ├── useProjectPersist.ts
    │   ├── useWorkspace.ts
    │   └── useColorSample.ts
    ├── stores/
    │   ├── project.ts
    │   ├── viewport.ts
    │   ├── interaction.ts
    │   ├── progress.ts
    │   └── settings.ts
    ├── models/
    │   ├── types.ts
    │   ├── cellId.ts
    │   └── grid.ts
    ├── engine/
    │   ├── camera.ts
    │   ├── coord.ts
    │   ├── hitTest.ts
    │   ├── renderer.ts
    │   ├── layers/
    │   │   ├── ImageLayer.ts
    │   │   ├── GridLayer.ts
    │   │   ├── HighlightLayer.ts
    │   │   ├── CompletedLayer.ts
    │   │   └── MeasurementLayer.ts
    │   └── input/
    │       ├── pointerMachine.ts
    │       ├── wheel.ts
    │       └── keyboard.ts
    ├── persist/
    │   ├── db.ts
    │   ├── projectRepo.ts
    │   └── settingsRepo.ts
    └── utils/
        ├── math.ts
        └── file.ts
```

`GridOverlay` / `SelectionOverlay` / `MeasurementTool` 以 `engine/layers/*` 落地，不在 `components/` 再做一层 DOM 网格。

### 8.1 样式

`uno.config.ts`：`presetWind()` + 主题色对接 `tokens.css`。  
组件用 utility；Canvas 颜色从 `tokens` 读进 Layer，避免硬编码两套。

---

## 9. 开发顺序

每一刀都必须 **可打开浏览器看结果**，且不破坏统一坐标系。

| 切片 | 交付 | 证明什么 |
| --- | --- | --- |
| **S0** 工程骨架 | Vite + Vue3 + TS + Pinia + Router + UnoCSS | 能跑 |
| **S1** 坐标与相机 | 无业务 UI；画十字和坐标文字 | Screen↔World 可测 |
| **S2** 图片 + 缩放拖动 | 上传、滚轮/捏合锚点缩放、pan/tap 分离 | 图跟手，点击不误拖 |
| **S3** 网格 Layer | 行列、inset、LOD | 缩放后网格不离图 |
| **S4** 命中 + 当前格/行/列 | `screenToGrid` + Highlight | 「我在哪」 |
| **S5** 数格 + 测距 | MeasurementLayer + Store | 闭区间 4 格、矩形宽高 |
| **S6** 完成 + Undo/Redo | CompletedLayer + history | 不遮色、可撤销 |
| **S7** IndexedDB | 刷新恢复图/格/标记/相机 | 续拼 |
| **S8** 小地图 | 同 World 另一 Camera | 框与主视口一致 |
| **S9** 壳 UI | 首页、工具栏、进度、引导、异常 | 对照 UI-UX |
| **S10** ColorPanel | 当前格采样 | 只读 1 格，不全图扫 |
| **S11** 性能过档 | 200 / 500 压测、DPR、LOD | 跟手 |

**S3 不过，后面全部停。** 网格一漂，高亮和数格都是错的。

建议 S1 就写 10 个纯函数单测：`screenToGrid` / `gridToScreen` / `zoomAt` 锚点不变。Canvas 视觉用手工验收。

---

## 10. 关键决策（请确认）

| # | 决策 | 默认 |
| --- | --- | --- |
| D1 | 主舞台单 Canvas，逻辑 5 层 | 是 |
| D2 | 小地图独立小 Canvas，共用 coord/grid | 是 |
| D3 | zoom 并入 viewportStore | 是（避免双 scale） |
| D4 | 完成态用 `Set<CellId>`，不存 Cell 全量 | 是 |
| D5 | 颜色不入库，当前格现采 | 是 |
| D6 | 样式用 UnoCSS（Tailwind 预设） | 是 |
| D7 | 不引入 Konva/Pixi | 是 |
| D8 | 改行列清空 completed + history | 与 PRD 一致 |
| D9 | ColorPanel 放 S10，不挡 S1–S8 | 是（非看图闭环必需） |
| D10 | 小地图 MVP 要做 | 你已列为统一坐标目标，进 S8 |

若要改：双 Canvas 叠层、或 MVP 砍小地图，应在开工前拍板。

---

## 11. 验收（架构级）

1. 任意缩放拖动后，网格线与豆子边界目视不错位。
2. 同一点击：Status、高亮、小地图、`screenToGrid` 四个数字相同。
3. 滚轮/双指缩放时，锚点下的那颗豆几乎不平移。
4. 移动 3px 抬手 = 点格；移动 20px = 只拖不动选。
5. 200×200 完成 5000 格后拖动仍跟手。
6. 刷新后图、网格、完成、相机、当前格恢复。
7. 组件源码中不出现 `cellWidth` 计算公式（只允许 `models/grid` 与 `engine/coord`）。

---

方案确认后按 **S0 → S1** 开工，先把 Camera 和坐标测绿，再挂第一张图。
