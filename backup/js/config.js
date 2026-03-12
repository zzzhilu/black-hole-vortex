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

  // ── Bloom Post-Processing ──
  bloomStrength: 1.4,
  bloomRadius: 0.5,
  bloomThreshold: 0.1,

  // ── Camera ──
  cameraDistance: 40,
  cameraAutoRotate: true,
  cameraRotateSpeed: 0.0008,
  cameraFov: 60,

  // ── Bounds ──
  worldRadius: 150,            // kill branches beyond this
};
