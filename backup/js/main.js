// ========================================
// Black Hole Vortex — Main Entry
// ========================================

import * as THREE from 'three';

import { CONFIG } from './config.js';
import { BranchSystem } from './BranchSystem.js';
import { BlackHole } from './BlackHole.js';
import { StarParticles } from './StarParticles.js';

// ── Globals ──
let renderer, scene, camera;
let branchSystem, blackHole, starParticles;
let clock;
let cameraAngle = 0;
let cameraPhi = 0.3;

// ── LocalStorage persistence ──
const STORAGE_KEY = 'bhv_camera';

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
        if (d.hAngle != null) cameraAngle = d.hAngle;
        if (d.vAngle != null) cameraPhi = d.vAngle;
        if (d.rotateSpeed != null) CONFIG.cameraRotateSpeed = d.rotateSpeed;
        if (d.autoRotate != null) CONFIG.cameraAutoRotate = d.autoRotate;
        if (d.growthSpeed != null) CONFIG.growthSpeed = d.growthSpeed;
        if (d.radialStrength != null) CONFIG.radialStrength = d.radialStrength;
        if (d.tangentialStrength != null) CONFIG.tangentialStrength = d.tangentialStrength;
        if (d.branchMaxAge != null) CONFIG.branchMaxAge = d.branchMaxAge;
    } catch (_) { /* ignore corrupt data */ }
}

// ── Init ──
function init() {
    clock = new THREE.Clock();

    // Renderer — high-quality anti-aliasing
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        logarithmicDepthBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);   // full native DPI
    renderer.setClearColor(0x000000, 1);
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

    // Star Particles
    starParticles = new StarParticles(scene);

    // Hide loading
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');

    // Events
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);

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
    const hSlider = makeSlider('H-Angle', 'cam-h', -3.14, 3.14, 0.01, cameraAngle, (v) => {
        cameraAngle = v;
        CONFIG.cameraAutoRotate = false;
        autoChk.checked = false;
        saveCameraSettings();
    });

    // Vertical angle
    makeSlider('V-Angle', 'cam-v', -1.5, 1.5, 0.01, cameraPhi, (v) => {
        cameraPhi = v;
        CONFIG.cameraAutoRotate = false;
        autoChk.checked = false;
        saveCameraSettings();
    });

    // Rotate speed (negative = reverse)
    makeSlider('Rotate Speed', 'cam-speed', -0.01, 0.01, 0.0001, CONFIG.cameraRotateSpeed, (v) => {
        CONFIG.cameraRotateSpeed = v;
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

    // ── Particles Toggle ──
    const pRow = document.createElement('div');
    pRow.className = 'ctrl-row ctrl-chk';

    const pChk = document.createElement('input');
    pChk.type = 'checkbox';
    pChk.id = 'chk-particles';
    pChk.checked = true;
    pChk.addEventListener('change', () => {
        starParticles.setVisible(pChk.checked);
    });

    const pLabel = document.createElement('label');
    pLabel.htmlFor = 'chk-particles';
    pLabel.textContent = 'Star Particles';

    pRow.appendChild(pChk);
    pRow.appendChild(pLabel);
    panel.appendChild(pRow);
}

// ── Reset: regenerate branches + particles, keep camera ──
function resetBranches() {
    branchSystem.dispose();
    branchSystem = new BranchSystem(scene);
    const wasVisible = starParticles.visible;
    starParticles.dispose();
    starParticles = new StarParticles(scene);
    starParticles.setVisible(wasVisible);
}

// ── H key: toggle UI visibility ──
function onKeyDown(e) {
    if (e.key === 'h' || e.key === 'H') {
        const ui = document.getElementById('ui-wrapper');
        if (ui) ui.style.display = ui.style.display === 'none' ? '' : 'none';
    }
}

// ── Animation Loop ──
function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Camera auto-rotate
    if (CONFIG.cameraAutoRotate) {
        cameraAngle += CONFIG.cameraRotateSpeed;
        // Sync UI slider
        const panel = document.getElementById('camera-panel');
        if (panel && panel._hSlider) {
            panel._hSlider.value = cameraAngle % Math.PI;
        }
    }
    updateCameraPosition();

    // Update systems
    blackHole.update(elapsed);
    branchSystem.update();
    starParticles.update();

    // Render directly (no post-processing)
    renderer.render(scene, camera);
}

// ── Resize Handler ──
function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

// ── Start ──
init();
animate();
