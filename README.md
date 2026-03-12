# Black Hole Vortex — Generative Art

以 Three.js 打造的漩渦生長式生成藝術，白色線條從中心向外螺旋生長，搭配有機的鉛筆筆觸質感。

---

## 快捷鍵

| 按鍵 | 功能 |
|:----:|------|
| `H` | 顯示 / 隱藏 UI 面板 |
| `Space` | 暫停 / 繼續生長動畫 |
| `↑` | V-Rot Speed +0.0001 |
| `↓` | V-Rot Speed −0.0001 |

---

## 所有參數一覽

### Camera（攝影機）

| 參數 | UI 控制 | 範圍 | 步進 | 預設值 | 說明 |
|------|:------:|------|------|--------|------|
| `cameraDistance` | ✅ 滑桿 | — | — | 40 | 攝影機與原點的距離 |
| `cameraFov` | ✅ 滑桿 | — | — | 60 | 視野角度（度） |
| H-Angle | ✅ 滑桿 | — | — | — | 水平旋轉角度（弧度） |
| V-Angle | ✅ 滑桿 | — | — | 0.3 | 垂直旋轉角度（弧度） |
| `cameraRotateSpeed` | ✅ 滑桿 | −0.01 ~ 0.01 | 0.0001 | 0.0008 | 水平自動旋轉速度（負值=反向） |
| `cameraVRotateSpeed` | ✅ 滑桿 + ↑↓ | −0.005 ~ 0.005 | 0.0001 | 0.0002 | 垂直自動旋轉速度 |
| `cameraAutoRotate` | ✅ 勾選框 | — | — | true | 是否啟用自動旋轉 |

### Vortex（漩渦）— UI 可調

| 參數 | UI 控制 | 範圍 | 步進 | 預設值 | 說明 |
|------|:------:|------|------|--------|------|
| `growthSpeed` | ✅ 滑桿 | 0.01 ~ 0.5 | 0.005 | 0.125 | 線條生長速度 |
| `radialStrength` | ✅ 滑桿 | −0.2 ~ 0.5 | 0.005 | 0.06 | 徑向推力（正=外推，負=內吸） |
| `tangentialStrength` | ✅ 滑桿 | 0.0 ~ 2.0 | 0.01 | 0.5 | 切向力強度（驅動螺旋旋轉） |
| `branchMaxAge` | ✅ 數字輸入 | 100 ~ 20000 | 100 | 4800 | 線條最大生命幀數（越大越長） |

### Pencil（筆觸效果）— UI 可調

| 參數 | UI 控制 | 範圍 | 步進 | 預設值 | 說明 |
|------|:------:|------|------|--------|------|
| `pencilJitter` | ✅ 滑桿 | 0.0 ~ 0.1 | 0.001 | 0.015 | 鉛筆筆觸抖動強度（每頂點位移量） |
| `pencilScale` | ✅ 滑桿 | 0.001 ~ 0.05 | 0.0005 | 0.008 | 筆觸噪聲頻率（越大越碎，越小越平滑） |
| `lineWidthVar` | ✅ 滑桿 | 0.0 ~ 1.0 | 0.01 | 0.5 | 粗細變化程度（0=均勻，1=最大變化） |

### Growth（生長）— 僅 config.js

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `maxBranches` | 20000 | 最大線條數量上限 |
| `branchProbability` | 0.022 | 每幀分岔機率 |
| `maxDepth` | 6 | 分岔最大深度層級 |
| `noiseScale` | 0.012 | 路徑擾動 noise 頻率 |
| `noiseStrength` | 0.35 | 路徑擾動強度 |
| `initialBranchCount` | 12 | 初始線條數（12 = 鐘面全方位） |
| `spawnInterval` | 60 | 每 N 幀產生新的根線條 |
| `spiralTightness` | 0.4 | 螺旋緊密度 |
| `verticalSpread` | 0.02 | Y 軸隨機擴散量 |

### Black Hole（黑洞）— 僅 config.js

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `blackHoleRadius` | 1.5 | 中心黑洞球體半徑 |
| `glowIntensity` | 1.2 | 發光強度 |
| `glowColor` | 0xffffff | 發光顏色 |
| `distortionStrength` | 0.0 | 重力透鏡效果（0=關閉） |

### Visual（視覺）— 僅 config.js

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `lineColor` | 0xffffff | 線條顏色 |
| `lineOpacityBase` | 0.7 | 基礎不透明度 |
| `lineOpacityDepthFalloff` | 0.12 | 每深度層級不透明度遞減 |
| `backgroundAlpha` | 0 | 背景透明度 |

### Bloom（後處理泛光）— 僅 config.js

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `bloomStrength` | 1.4 | 泛光強度 |
| `bloomRadius` | 0.5 | 泛光擴散半徑 |
| `bloomThreshold` | 0.1 | 泛光亮度閥值 |

### Bounds（邊界）— 僅 config.js

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `worldRadius` | 150 | 世界邊界半徑（超過則線條終止） |

---

## 啟動方式

### 🌐 線上瀏覽

直接開啟 GitHub Pages：

👉 https://zzzhilu.github.io/black-hole-vortex/

### 💻 本地開發

```bash
npx -y http-server . -p 3000 -c-1
```

開啟 http://127.0.0.1:3000/
