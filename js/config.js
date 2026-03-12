// ========================================
// Black Hole Vortex — Configuration
// ========================================

export const CONFIG = {
  // ── Growth ──
  growthSpeed: 0.125,
  maxBranches: 20000,
  branchProbability: 0.022,
  maxDepth: 6,
  noiseScale: 0.012,
  noiseStrength: 0.35,
  initialBranchCount: 12,
  spawnInterval: 60,         // frames between new root branch spawns
  branchMaxAge: 4800,          // max frames a branch lives

  // ── Vortex ──
  tangentialStrength: 0.5,
  radialStrength: 0.06,
  spiralTightness: 0.4,
  verticalSpread: 0.02,       // how much branches spread in Y axis

  // ── Black Hole ──
  blackHoleRadius: 1.5,
  glowIntensity: 1.2,
  glowColor: 0xffffff,
  distortionStrength: 0.0,    // 0 = off, >0 = gravitational lensing

  // ── Visual ──
  lineColor: 0xffffff,
  lineOpacityBase: 0.7,
  lineOpacityDepthFalloff: 0.12,
  backgroundAlpha: 0,
  pencilJitter: 0.025,           // per-vertex displacement intensity (organic feel)
  pencilScale: 0.01,             // noise frequency for pencil stroke effect
  lineWidthVar: 0.5,            // line thickness variation (0=uniform, 1=max variation)
  lineThickness: 2.0,            // global line thickness multiplier (0.5 to 8.0)

  // ── Energy Wave ──
  energyWave: true,              // toggle energy wave pulse
  energyWaveSpeed: 0.5,          // wave travel speed
  energyWaveWidth: 80,           // pulse width in vertices
  energyWaveIntensity: 0.8,      // glow brightness boost

  // ── Bloom Post-Processing ──
  bloomEnabled: true,
  bloomStrength: 1.4,
  bloomRadius: 0.5,
  bloomThreshold: 0.5,

  // ── Camera ──
  cameraDistance: 40,
  cameraAutoRotate: true,
  cameraRotateSpeed: 0.0008,
  cameraVRotateSpeed: 0.0002,   // vertical axis auto-rotate speed
  cameraFov: 60,

  // ── Bounds ──
  worldRadius: 150,            // kill branches beyond this
};
