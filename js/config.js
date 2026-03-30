// ========================================
// Black Hole Vortex — Configuration
// ========================================

export const CONFIG = {
  // ── Growth ──
  growthSpeed: 0.25,
  maxBranches: 20000,
  branchProbability: 0.022,
  maxDepth: 6,
  noiseScale: 0.012,
  noiseStrength: 0.35,
  initialBranchCount: 12,
  spawnInterval: 60,         // frames between new root branch spawns
  branchMaxAge: 480000,          // max frames a branch lives

  // ── Vortex ──
  tangentialStrength: 0.6,
  radialStrength: 0.2,
  spiralTightness: 0.4,
  verticalSpread: 0.02,       // how much branches spread in Y axis

  // ── Black Hole ──
  blackHoleRadius: 4.5,
  glowIntensity: 1.2,
  glowColor: 0xffffff,
  distortionStrength: 0.0,    // 0 = off, >0 = gravitational lensing

  // ── Visual ──
  lineColor: 0xffffff,
  lineOpacityBase: 0.7,
  lineOpacityDepthFalloff: 0.12,
  backgroundAlpha: 0,
  pencilJitter: 0.25,           // per-vertex displacement intensity (organic feel)
  pencilScale: 0.1,             // noise frequency for pencil stroke effect
  lineWidthVar: 1.0,            // line thickness variation (0=uniform, 1=max variation)
  lineThickness: 3.0,            // global line thickness multiplier (0.5 to 8.0)

  // ── Energy Wave ──
  energyWave: true,              // toggle energy wave pulse
  energyWaveSpeed: 0.6,          // wave travel speed
  energyWaveWidth: 155,           // pulse width in vertices
  energyWaveIntensity: 1.0,      // glow brightness boost

  // ── Bloom Post-Processing ──
  bloomEnabled: true,
  bloomStrength: 1.0,
  bloomRadius: 0.25,
  bloomThreshold: 0.25,

  // ── Camera ──
  cameraDistance: 55,
  cameraAutoRotate: true,
  cameraRotateSpeed: 0.0008,
  cameraVRotateSpeed: 0.0002,   // vertical axis auto-rotate speed
  cameraFov: 60,

  // ── Bounds ──
  worldRadius: 150,            // kill branches beyond this
};
