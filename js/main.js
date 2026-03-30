// ========================================
// Black Hole Vortex — Main Entry
// ========================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

import { CONFIG } from './config.js';
import { BranchSystem } from './BranchSystem.js';
import { BlackHole } from './BlackHole.js';

// ── Globals ──
let renderer, scene, camera, composer;
let branchSystem, blackHole;
let clock;
let cameraAngle = 0;
let cameraPhi = 0.3;
let targetCameraAngle = 0;
let targetCameraPhi = 0.3;
let paused = false;
let isDragging = false;
let previousPointerX = 0;
let previousPointerY = 0;

// ── LocalStorage persistence ──
const STORAGE_KEY = 'bhv_camera_v4';

function saveCameraSettings() {
    const data = {
        distance: CONFIG.cameraDistance,
        fov: CONFIG.cameraFov,
        hAngle: cameraAngle,
        vAngle: cameraPhi,
        rotateSpeed: CONFIG.cameraRotateSpeed,
        autoRotate: CONFIG.cameraAutoRotate,
        growthSpeed: CONFIG.growthSpeed,
        radialStrength: CONFIG.radialStrength,
        tangentialStrength: CONFIG.tangentialStrength,
        branchMaxAge: CONFIG.branchMaxAge,
        cameraVRotateSpeed: CONFIG.cameraVRotateSpeed,
        pencilJitter: CONFIG.pencilJitter,
        pencilScale: CONFIG.pencilScale,
        lineWidthVar: CONFIG.lineWidthVar,
        lineThickness: CONFIG.lineThickness,
        energyWave: CONFIG.energyWave,
        energyWaveSpeed: CONFIG.energyWaveSpeed,
        energyWaveWidth: CONFIG.energyWaveWidth,
        energyWaveIntensity: CONFIG.energyWaveIntensity,
        bloomEnabled: CONFIG.bloomEnabled,
        bloomStrength: CONFIG.bloomStrength,
        bloomRadius: CONFIG.bloomRadius,
        bloomThreshold: CONFIG.bloomThreshold,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadCameraSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.distance != null) CONFIG.cameraDistance = d.distance;
        if (d.fov != null) CONFIG.cameraFov = d.fov;
        if (d.hAngle != null) { cameraAngle = d.hAngle; targetCameraAngle = d.hAngle; }
        if (d.vAngle != null) { cameraPhi = d.vAngle; targetCameraPhi = d.vAngle; }
        if (d.rotateSpeed != null) CONFIG.cameraRotateSpeed = d.rotateSpeed;
        if (d.autoRotate != null) CONFIG.cameraAutoRotate = d.autoRotate;
        if (d.growthSpeed != null) CONFIG.growthSpeed = d.growthSpeed;
        if (d.radialStrength != null) CONFIG.radialStrength = d.radialStrength;
        if (d.tangentialStrength != null) CONFIG.tangentialStrength = d.tangentialStrength;
        if (d.branchMaxAge != null) CONFIG.branchMaxAge = d.branchMaxAge;
        if (d.cameraVRotateSpeed != null) CONFIG.cameraVRotateSpeed = d.cameraVRotateSpeed;
        if (d.pencilJitter != null) CONFIG.pencilJitter = d.pencilJitter;
        if (d.pencilScale != null) CONFIG.pencilScale = d.pencilScale;
        if (d.lineWidthVar != null) CONFIG.lineWidthVar = d.lineWidthVar;
        if (d.lineThickness != null) CONFIG.lineThickness = d.lineThickness;
        if (d.energyWave != null) CONFIG.energyWave = d.energyWave;
        if (d.energyWaveSpeed != null) CONFIG.energyWaveSpeed = d.energyWaveSpeed;
        if (d.energyWaveWidth != null) CONFIG.energyWaveWidth = d.energyWaveWidth;
        if (d.energyWaveIntensity != null) CONFIG.energyWaveIntensity = d.energyWaveIntensity;
        if (d.bloomEnabled != null) CONFIG.bloomEnabled = d.bloomEnabled;
        if (d.bloomStrength != null) CONFIG.bloomStrength = d.bloomStrength;
        if (d.bloomRadius != null) CONFIG.bloomRadius = d.bloomRadius;
        if (d.bloomThreshold != null) CONFIG.bloomThreshold = d.bloomThreshold;
    } catch (_) { /* ignore corrupt data */ }
}

// ── Init ──
function init() {
    clock = new THREE.Clock();

    // Renderer — high-quality anti-aliasing
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);   // full native DPI
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = THREE.NoToneMapping;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();

    // Load saved camera settings before creating camera
    loadCameraSettings();

    // Camera
    camera = new THREE.PerspectiveCamera(
        CONFIG.cameraFov,
        window.innerWidth / window.innerHeight,
        0.1,
        200
    );
    updateCameraPosition();

    // Black Hole
    blackHole = new BlackHole(scene);

    // Branch System
    branchSystem = new BranchSystem(scene);

    // Bloom Post-Processing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.bloomStrength,
        CONFIG.bloomRadius * CONFIG.lineThickness,
        CONFIG.bloomThreshold
    );
    composer.addPass(bloomPass);
    composer._bloomPass = bloomPass; // keep reference for UI

    // FXAA anti-aliasing (fixes jagged thin lines)
    const fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.set(
        1 / (window.innerWidth * pixelRatio),
        1 / (window.innerHeight * pixelRatio)
    );
    composer.addPass(fxaaPass);
    composer._fxaaPass = fxaaPass; // keep reference for resize

    // Organic Noise + Edge Chromatic Aberration + Gravitational Lens Pass
    const NoiseAbeShader = {
        uniforms: {
            'tDiffuse': { value: null },
            'time': { value: 0 },
            'amount': { value: 0.0035 }, // chromatic aberration amount
            'noiseIntensity': { value: 0.045 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float time;
            uniform float amount;
            uniform float noiseIntensity;
            varying vec2 vUv;
            
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }
            
            void main() {
                vec2 center = vec2(0.5);
                vec2 offset = vUv - center;
                float dist = length(offset);
                vec2 dir = normalize(offset);
                if (dist == 0.0) dir = vec2(0.0);
                
                // ── 1. Chromatic Aberration (Edges Only) ──
                // Normal edge shift without central gravitational distortion
                float shift = amount * dist * dist * 4.0;
                
                float r = texture2D(tDiffuse, vUv + dir * shift).r;
                float g = texture2D(tDiffuse, vUv).g;
                float b = texture2D(tDiffuse, vUv - dir * shift).b;
                vec3 color = vec3(r, g, b);
                
                // ── 3. Center Glow ──
                // A very soft ambient glow around the center
                float haloMask = pow(max(0.0, 1.0 - (dist / 0.2)), 2.0);
                // Keep intensity low to not blow out the original 3D black hole mesh
                color += vec3(0.6, 0.8, 1.0) * haloMask * 0.06;
                
                // ── 4. Film Grain Noise ──
                float noise = random(vUv * 150.0 + fract(time)) * 2.0 - 1.0;
                color += noise * noiseIntensity;
                
                // ── 5. Vignette ──
                float vignette = 1.0 - smoothstep(0.3, 1.4, dist);
                color *= vignette * 1.1; // boost brightness slightly to compensate
                
                gl_FragColor = vec4(color, 1.0);
            }
        `
    };
    const noisePass = new ShaderPass(NoiseAbeShader);
    composer.addPass(noisePass);
    composer._noisePass = noisePass;


    // Hide loading
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');

    // Events
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);

    // Mouse/Touch Drag for Camera
    window.addEventListener('pointerdown', (e) => {
        // Prevent dragging if clicking on the UI panel
        if (e.target.closest('#ui-wrapper')) return;
        isDragging = true;
        previousPointerX = e.clientX;
        previousPointerY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - previousPointerX;
        const deltaY = e.clientY - previousPointerY;
        
        // Apply to target instead of directly to camera (damping effect)
        targetCameraAngle -= deltaX * 0.002;
        targetCameraPhi -= deltaY * 0.002;
        targetCameraPhi = Math.max(-1.4, Math.min(1.4, targetCameraPhi));
        
        // Sync sliders if UI is open
        const panel = document.getElementById('camera-panel');
        if (panel && panel._hSlider) panel._hSlider.value = targetCameraAngle % (Math.PI * 2);
        const vSlider = document.getElementById('cam-v');
        if (vSlider) vSlider.value = targetCameraPhi;
        
        previousPointerX = e.clientX;
        previousPointerY = e.clientY;
    });
    window.addEventListener('pointerup', () => {
        isDragging = false;
    });

    // Build UI
    buildCameraUI();
}

// ── Camera Position ──
function updateCameraPosition() {
    const dist = CONFIG.cameraDistance;
    camera.position.x = Math.sin(cameraAngle) * Math.cos(cameraPhi) * dist;
    camera.position.y = Math.sin(cameraPhi) * dist;
    camera.position.z = Math.cos(cameraAngle) * Math.cos(cameraPhi) * dist;
    camera.lookAt(0, 0, 0);
}

// ── Camera UI ──
function buildCameraUI() {
    const panel = document.getElementById('camera-panel');
    if (!panel) return;

    // Helper: create a slider row
    function makeSlider(label, id, min, max, step, value, onChange) {
        const row = document.createElement('div');
        row.className = 'ctrl-row';

        const lbl = document.createElement('label');
        lbl.textContent = label;
        lbl.htmlFor = id;

        const val = document.createElement('span');
        val.className = 'ctrl-val';
        val.id = id + '-val';
        val.textContent = value;

        const input = document.createElement('input');
        input.type = 'range';
        input.id = id;
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;
        input.addEventListener('input', () => {
            const v = parseFloat(input.value);
            val.textContent = v.toFixed(step < 1 ? 2 : 0);
            onChange(v);
        });

        row.appendChild(lbl);
        row.appendChild(input);
        row.appendChild(val);
        panel.appendChild(row);
        return input;
    }

    // Distance
    makeSlider('Distance', 'cam-dist', 10, 100, 1, CONFIG.cameraDistance, (v) => {
        CONFIG.cameraDistance = v;
        saveCameraSettings();
    });

    // FOV
    makeSlider('FOV', 'cam-fov', 20, 120, 1, CONFIG.cameraFov, (v) => {
        CONFIG.cameraFov = v;
        camera.fov = v;
        camera.updateProjectionMatrix();
        saveCameraSettings();
    });

    // Horizontal angle
    const hSlider = makeSlider('H-Angle', 'cam-h', -3.14, 3.14, 0.01, targetCameraAngle, (v) => {
        targetCameraAngle = v;
        cameraAngle = v; // Instant update for slider
        CONFIG.cameraAutoRotate = false;
        autoChk.checked = false;
        saveCameraSettings();
    });

    // Vertical angle
    makeSlider('V-Angle', 'cam-v', -1.5, 1.5, 0.01, targetCameraPhi, (v) => {
        targetCameraPhi = v;
        cameraPhi = v; // Instant update for slider
        CONFIG.cameraAutoRotate = false;
        autoChk.checked = false;
        saveCameraSettings();
    });

    // Rotate speed (negative = reverse)
    makeSlider('Rotate Speed', 'cam-speed', -0.01, 0.01, 0.0001, CONFIG.cameraRotateSpeed, (v) => {
        CONFIG.cameraRotateSpeed = v;
        saveCameraSettings();
    });

    // Vertical rotate speed
    makeSlider('V-Rot Speed', 'cam-vspeed', -0.005, 0.005, 0.0001, CONFIG.cameraVRotateSpeed, (v) => {
        CONFIG.cameraVRotateSpeed = v;
        saveCameraSettings();
    });

    // Auto-rotate checkbox
    const chkRow = document.createElement('div');
    chkRow.className = 'ctrl-row ctrl-chk';

    const autoChk = document.createElement('input');
    autoChk.type = 'checkbox';
    autoChk.id = 'cam-auto';
    autoChk.checked = CONFIG.cameraAutoRotate;
    autoChk.addEventListener('change', () => {
        CONFIG.cameraAutoRotate = autoChk.checked;
        saveCameraSettings();
    });

    const chkLabel = document.createElement('label');
    chkLabel.htmlFor = 'cam-auto';
    chkLabel.textContent = 'Auto Rotate';

    chkRow.appendChild(autoChk);
    chkRow.appendChild(chkLabel);
    panel.appendChild(chkRow);

    // Store reference for syncing h-angle slider during auto-rotate
    panel._hSlider = hSlider;

    // ── Reset (Regenerate) Button ──
    const btnRow = document.createElement('div');
    btnRow.className = 'ctrl-row';
    btnRow.style.marginTop = '8px';

    const resetBtn = document.createElement('button');
    resetBtn.id = 'btn-reset';
    resetBtn.textContent = '↻ Regenerate';
    resetBtn.addEventListener('click', () => {
        resetBranches();
    });

    btnRow.appendChild(resetBtn);
    panel.appendChild(btnRow);

    // ── Pause Button ──
    const pauseRow = document.createElement('div');
    pauseRow.className = 'ctrl-row';
    pauseRow.style.marginTop = '4px';

    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'btn-pause';
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.addEventListener('click', () => {
        paused = !paused;
        pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
    });

    pauseRow.appendChild(pauseBtn);
    panel.appendChild(pauseRow);
    // Store reference for key toggle sync
    panel._pauseBtn = pauseBtn;

    // ── Vortex Parameters Section ──
    const divider = document.createElement('div');
    divider.className = 'ctrl-divider';
    divider.textContent = '⚙ Vortex';
    panel.appendChild(divider);

    // Growth Speed
    makeSlider('Growth Speed', 'vortex-growth', 0.01, 0.5, 0.005, CONFIG.growthSpeed, (v) => {
        CONFIG.growthSpeed = v;
        saveCameraSettings();
    });

    // Radial Strength
    makeSlider('Radial Str.', 'vortex-radial', -0.2, 0.5, 0.005, CONFIG.radialStrength, (v) => {
        CONFIG.radialStrength = v;
        saveCameraSettings();
    });

    // Tangential Strength
    makeSlider('Tangent Str.', 'vortex-tangent', 0.0, 2.0, 0.01, CONFIG.tangentialStrength, (v) => {
        CONFIG.tangentialStrength = v;
        saveCameraSettings();
    });

    // Growth Length (branchMaxAge) — number input
    const ageRow = document.createElement('div');
    ageRow.className = 'ctrl-row';

    const ageLbl = document.createElement('label');
    ageLbl.textContent = 'Max Age';
    ageLbl.htmlFor = 'vortex-age';

    const ageInput = document.createElement('input');
    ageInput.type = 'number';
    ageInput.id = 'vortex-age';
    ageInput.min = 100;
    ageInput.max = 20000;
    ageInput.step = 100;
    ageInput.value = CONFIG.branchMaxAge;
    ageInput.placeholder = '預設: 4800';
    ageInput.title = '預設值: 4800';
    ageInput.addEventListener('input', () => {
        const v = parseInt(ageInput.value, 10);
        if (!isNaN(v) && v >= 100) {
            CONFIG.branchMaxAge = v;
            saveCameraSettings();
        }
    });

    ageRow.appendChild(ageLbl);
    ageRow.appendChild(ageInput);
    panel.appendChild(ageRow);

    // Pencil Jitter (noise displacement intensity)
    makeSlider('Pencil Jitter', 'pencil-jitter', 0.0, 0.5, 0.01, CONFIG.pencilJitter, (v) => {
        CONFIG.pencilJitter = v;
        saveCameraSettings();
    });

    // Pencil Scale (noise frequency)
    makeSlider('Pencil Scale', 'pencil-scale', 0.001, 0.2, 0.001, CONFIG.pencilScale, (v) => {
        CONFIG.pencilScale = v;
        saveCameraSettings();
    });

    // Line Width Variation (thickness variation)
    makeSlider('Width Var', 'line-width-var', 0.0, 1.0, 0.01, CONFIG.lineWidthVar, (v) => {
        CONFIG.lineWidthVar = v;
        saveCameraSettings();
    });

    // Line Thickness → controls bloom radius for visual thickness
    // (WebGL linewidth > 1 not supported on Windows)
    makeSlider('Thickness', 'line-thickness', 0.5, 8.0, 0.1, CONFIG.lineThickness, (v) => {
        CONFIG.lineThickness = v;
        if (composer && composer._bloomPass) {
            composer._bloomPass.radius = CONFIG.bloomRadius * v;
        }
        saveCameraSettings();
    });

    // ── Energy Wave Section ──
    const waveDivider = document.createElement('div');
    waveDivider.className = 'ctrl-divider';
    waveDivider.textContent = '⚡ Energy Wave';
    panel.appendChild(waveDivider);

    // Energy Wave toggle
    const ewRow = document.createElement('div');
    ewRow.className = 'ctrl-row ctrl-chk';
    const ewChk = document.createElement('input');
    ewChk.type = 'checkbox';
    ewChk.id = 'chk-energy-wave';
    ewChk.checked = CONFIG.energyWave;
    ewChk.addEventListener('change', () => {
        CONFIG.energyWave = ewChk.checked;
        saveCameraSettings();
    });
    const ewLabel = document.createElement('label');
    ewLabel.htmlFor = 'chk-energy-wave';
    ewLabel.textContent = 'Energy Wave';
    ewRow.appendChild(ewChk);
    ewRow.appendChild(ewLabel);
    panel.appendChild(ewRow);

    // Wave Speed
    makeSlider('Wave Speed', 'ew-speed', 0.05, 3.0, 0.05, CONFIG.energyWaveSpeed, (v) => {
        CONFIG.energyWaveSpeed = v;
        saveCameraSettings();
    });

    // Wave Width
    makeSlider('Wave Width', 'ew-width', 10, 300, 5, CONFIG.energyWaveWidth, (v) => {
        CONFIG.energyWaveWidth = v;
        saveCameraSettings();
    });

    // Wave Intensity
    makeSlider('Wave Glow', 'ew-intensity', 0.05, 1.0, 0.05, CONFIG.energyWaveIntensity, (v) => {
        CONFIG.energyWaveIntensity = v;
        saveCameraSettings();
    });

    // ── Bloom Section ──
    const bloomDivider = document.createElement('div');
    bloomDivider.className = 'ctrl-divider';
    bloomDivider.textContent = '✦ Bloom';
    panel.appendChild(bloomDivider);

    // Bloom toggle
    const bRow = document.createElement('div');
    bRow.className = 'ctrl-row ctrl-chk';
    const bChk = document.createElement('input');
    bChk.type = 'checkbox';
    bChk.id = 'chk-bloom';
    bChk.checked = CONFIG.bloomEnabled;
    bChk.addEventListener('change', () => {
        CONFIG.bloomEnabled = bChk.checked;
        saveCameraSettings();
    });
    const bLabel = document.createElement('label');
    bLabel.htmlFor = 'chk-bloom';
    bLabel.textContent = 'Bloom';
    bRow.appendChild(bChk);
    bRow.appendChild(bLabel);
    panel.appendChild(bRow);

    // Bloom Threshold
    makeSlider('Threshold', 'bloom-threshold', 0.0, 1.0, 0.01, CONFIG.bloomThreshold, (v) => {
        CONFIG.bloomThreshold = v;
        if (composer && composer._bloomPass) composer._bloomPass.threshold = v;
        saveCameraSettings();
    });

    // Bloom Strength
    makeSlider('Strength', 'bloom-strength', 0.0, 3.0, 0.1, CONFIG.bloomStrength, (v) => {
        CONFIG.bloomStrength = v;
        if (composer && composer._bloomPass) composer._bloomPass.strength = v;
        saveCameraSettings();
    });

    // Bloom Radius
    makeSlider('Radius', 'bloom-radius', 0.0, 2.0, 0.05, CONFIG.bloomRadius, (v) => {
        CONFIG.bloomRadius = v;
        if (composer && composer._bloomPass) composer._bloomPass.radius = v;
        saveCameraSettings();
    });
}

// ── Reset: regenerate branches + particles, keep camera ──
function resetBranches() {
    branchSystem.dispose();
    branchSystem = new BranchSystem(scene);
}

// ── H key: toggle UI visibility ──
function onKeyDown(e) {
    if (e.key === 'h' || e.key === 'H') {
        const ui = document.getElementById('ui-wrapper');
        if (ui) ui.style.display = ui.style.display === 'none' ? '' : 'none';
    }
    if (e.key === ' ') {
        e.preventDefault();
        paused = !paused;
        const panel = document.getElementById('camera-panel');
        if (panel && panel._pauseBtn) {
            panel._pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
        }
    }
    // Up/Down arrows: adjust V-Rot Speed
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = 0.0001;
        CONFIG.cameraVRotateSpeed += (e.key === 'ArrowUp') ? step : -step;
        CONFIG.cameraVRotateSpeed = Math.round(CONFIG.cameraVRotateSpeed * 10000) / 10000; // avoid float drift
        // Sync slider
        const slider = document.getElementById('cam-vspeed');
        if (slider) slider.value = CONFIG.cameraVRotateSpeed;
        const valSpan = slider && slider.parentElement.querySelector('.ctrl-val');
        if (valSpan) valSpan.textContent = CONFIG.cameraVRotateSpeed;
        saveCameraSettings();
    }
}

// ── Animation Loop ──
function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    if (composer && composer._noisePass) {
        composer._noisePass.uniforms.time.value = elapsed;
    }

    // Camera auto-rotate applies to the target angles
    if (CONFIG.cameraAutoRotate) {
        targetCameraAngle += CONFIG.cameraRotateSpeed;
        targetCameraPhi += CONFIG.cameraVRotateSpeed;
        targetCameraPhi = Math.max(-1.4, Math.min(1.4, targetCameraPhi));
        
        // Sync UI slider only if not dragging to avoid jumping
        const panel = document.getElementById('camera-panel');
        if (panel && panel._hSlider && !isDragging) {
            panel._hSlider.value = targetCameraAngle % (Math.PI * 2);
        }
    }
    
    // Damping: smoothly interpolate current angle towards target
    cameraAngle += (targetCameraAngle - cameraAngle) * 0.08;
    cameraPhi += (targetCameraPhi - cameraPhi) * 0.08;

    updateCameraPosition();

    // Update systems (skip when paused, but still render)
    if (!paused) {
        blackHole.update(elapsed);
        branchSystem.update();
    }

    // Render always through composer for consistent color
    if (composer) {
        // Toggle bloom by zeroing strength
        if (composer._bloomPass) {
            composer._bloomPass.strength = CONFIG.bloomEnabled ? CONFIG.bloomStrength : 0;
        }
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

// ── Resize Handler ──
function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) {
        composer.setSize(w, h);
        if (composer._fxaaPass) {
            const pr = renderer.getPixelRatio();
            composer._fxaaPass.material.uniforms['resolution'].value.set(
                1 / (w * pr), 1 / (h * pr)
            );
        }
    }
}

// ── Audio Setup ──
function initAudio() {
    const bgm = document.getElementById('bgm');
    const soundBtn = document.getElementById('sound-btn');
    if (!bgm || !soundBtn) return;

    let hasInteracted = false;
    let isPlaying = false;

    const playMusic = () => {
        if (!hasInteracted) {
            hasInteracted = true;
            bgm.volume = 0.5;
            // Attempt to play
            bgm.play().then(() => {
                isPlaying = true;
                soundBtn.textContent = '🎵 Sound: ON';
            }).catch(() => {
                // Autoplay blocked
            });
            window.removeEventListener('pointerdown', playMusic);
            window.removeEventListener('keydown', playMusic);
        }
    };

    // First interaction plays music
    window.addEventListener('pointerdown', playMusic, { once: true });
    window.addEventListener('keydown', playMusic, { once: true });

    // Toggle button handler
    soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hasInteracted = true;
        if (isPlaying) {
            bgm.pause();
            isPlaying = false;
            soundBtn.textContent = '🎵 Sound: OFF';
        } else {
            bgm.volume = 0.5;
            bgm.play().then(() => {
                isPlaying = true;
                soundBtn.textContent = '🎵 Sound: ON';
            }).catch(() => {});
        }
    });
}

// ── Start ──
init();
initAudio();
animate();
