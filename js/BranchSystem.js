// ========================================
// Black Hole Vortex — Branch Growth System
// ========================================

import { CONFIG } from './config.js';
import { VortexField } from './VortexField.js';
import * as THREE from 'three';

// ── Simple seeded noise (value noise) ──
class SimpleNoise {
    constructor(seed = 0) { this.seed = seed; }
    _hash(x, y, z) {
        let h = this.seed + x * 374761393 + y * 668265263 + z * 1274126177;
        h = (h ^ (h >> 13)) * 1103515245;
        return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
    }
    _lerp(a, b, t) { return a + t * (b - a); }
    _smoothstep(t) { return t * t * (3 - 2 * t); }
    noise3D(x, y, z) {
        const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
        const fx = this._smoothstep(x - ix), fy = this._smoothstep(y - iy), fz = this._smoothstep(z - iz);
        const v000 = this._hash(ix, iy, iz), v100 = this._hash(ix+1, iy, iz);
        const v010 = this._hash(ix, iy+1, iz), v110 = this._hash(ix+1, iy+1, iz);
        const v001 = this._hash(ix, iy, iz+1), v101 = this._hash(ix+1, iy, iz+1);
        const v011 = this._hash(ix, iy+1, iz+1), v111 = this._hash(ix+1, iy+1, iz+1);
        return this._lerp(
            this._lerp(this._lerp(v000, v100, fx), this._lerp(v010, v110, fx), fy),
            this._lerp(this._lerp(v001, v101, fx), this._lerp(v011, v111, fx), fy), fz
        ) * 2 - 1;
    }
}

// ── Single Branch ──
class Branch {
    constructor(origin, direction, depth) {
        this.points = [origin.clone()];
        this.velocity = direction.clone().normalize();
        this.depth = depth;
        this.age = 0;
        this.alive = true;
        this.forkCount = 0;

        this.speedMult = 0.3 + Math.random() * 2.2;
        this.steerStrength = 0.15 + Math.random() * 0.35;
        this.widthMult = 0.5 + Math.random();

        this.maxPoints = 3000;
        this.geometry = new THREE.BufferGeometry();
        this.positionArray = new Float32Array(this.maxPoints * 3);
        this.colorArray = new Float32Array(this.maxPoints * 3);
        this.baseBrightnessArray = new Float32Array(this.maxPoints);

        // Set initial point
        this.positionArray[0] = origin.x;
        this.positionArray[1] = origin.y;
        this.positionArray[2] = origin.z;
        this.colorArray[0] = 1; this.colorArray[1] = 1; this.colorArray[2] = 1;
        this.baseBrightnessArray[0] = 1;

        this.geometry.setAttribute('position',
            new THREE.BufferAttribute(this.positionArray, 3));
        this.geometry.setAttribute('color',
            new THREE.BufferAttribute(this.colorArray, 3));
        this.geometry.setDrawRange(0, 1);

        const opacity = Math.max(0.05,
            CONFIG.lineOpacityBase - depth * CONFIG.lineOpacityDepthFalloff);

        this.material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: opacity,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.line = new THREE.Line(this.geometry, this.material);
    }

    addPoint(point, brightness) {
        const idx = this.points.length;
        if (idx >= this.maxPoints) { this.alive = false; return; }

        this.points.push(point.clone());
        this.positionArray[idx * 3]     = point.x;
        this.positionArray[idx * 3 + 1] = point.y;
        this.positionArray[idx * 3 + 2] = point.z;

        const b = Math.max(0, brightness);
        this.colorArray[idx * 3]     = b;
        this.colorArray[idx * 3 + 1] = b;
        this.colorArray[idx * 3 + 2] = b;
        this.baseBrightnessArray[idx] = b;

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.setDrawRange(0, idx + 1);
    }

    get tip() { return this.points[this.points.length - 1]; }

    /** Energy wave: sine wave glow radiating outward */
    updateWave(time) {
        if (!CONFIG.energyWave) return;
        const count = this.points.length;
        if (count < 20) return;

        const speed = CONFIG.energyWaveSpeed;
        const width = Math.max(1, CONFIG.energyWaveWidth);
        const ageFade = Math.min(1.0, this.age / 200);
        const intensity = CONFIG.energyWaveIntensity * ageFade;
        if (intensity < 0.001) return;

        const dimFactor = 1.0 - intensity * 0.4;
        const phase = this.speedMult * 5.0;
        const freq = 1.0 / width;

        for (let i = 0; i < count; i++) {
            const base = this.baseBrightnessArray[i];
            const wave = Math.sin((i * freq - time * speed * 0.5 + phase) * Math.PI * 2);
            const glow = wave > 0 ? base * intensity * wave * wave : 0;
            const val = Math.min(1.0, base * dimFactor + glow);
            this.colorArray[i * 3]     = val;
            this.colorArray[i * 3 + 1] = val;
            this.colorArray[i * 3 + 2] = val;
        }
        this.geometry.attributes.color.needsUpdate = true;
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}

// ── Branch System ──
export class BranchSystem {
    constructor(scene) {
        this.scene = scene;
        this.branches = [];
        this.vortex = new VortexField();
        this.noise = new SimpleNoise(42);
        this.frameCount = 0;
        this._tempForce = new THREE.Vector3();
        this._tempDir = new THREE.Vector3();
        this._tempNewPoint = new THREE.Vector3();
        this._spawnInitialBranches();
    }

    _makeFlatDir(angle) {
        return new THREE.Vector3(
            Math.cos(angle), (Math.random() - 0.5) * 0.3, Math.sin(angle)
        ).normalize();
    }

    _spawnInitialBranches() {
        const count = CONFIG.initialBranchCount;
        const spawnOffset = Math.max(2.0, CONFIG.blackHoleRadius * 1.25);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
            const dir = this._makeFlatDir(angle);
            const origin = dir.clone().multiplyScalar(spawnOffset);
            origin.y = 0;
            this._createBranch(origin, dir, 0);
        }
    }

    _createBranch(origin, direction, depth) {
        if (this.branches.length >= CONFIG.maxBranches) return null;
        if (depth > CONFIG.maxDepth) return null;
        const branch = new Branch(origin, direction, depth);
        this.branches.push(branch);
        this.scene.add(branch.line);
        return branch;
    }

    update() {
        this.frameCount++;

        if (this.frameCount % CONFIG.spawnInterval === 0) {
            const angle = Math.random() * Math.PI * 2;
            const dir = this._makeFlatDir(angle);
            const spawnOffset = Math.max(2.0, CONFIG.blackHoleRadius * 1.25);
            const origin = dir.clone().multiplyScalar(spawnOffset);
            origin.y = 0;
            this._createBranch(origin, dir, 0);
        }

        const effectiveMaxAge = CONFIG.branchMaxAge;
        const fadeDuration = 300;
        const fadeStart = effectiveMaxAge - fadeDuration;

        for (let i = 0; i < this.branches.length; i++) {
            const branch = this.branches[i];
            if (!branch.alive) continue;

            branch.age++;
            if (branch.age > effectiveMaxAge) { branch.alive = false; continue; }
            if (branch.tip.length() > CONFIG.worldRadius) { branch.alive = false; continue; }

            this.vortex.getForce(branch.tip, this._tempForce);
            const ns = CONFIG.noiseScale;
            const tip = branch.tip;
            const nx = this.noise.noise3D(tip.x*ns, tip.y*ns, tip.z*ns + this.frameCount*0.001);
            const ny = this.noise.noise3D(tip.x*ns+100, tip.y*ns, tip.z*ns + this.frameCount*0.001);
            const nz = this.noise.noise3D(tip.x*ns, tip.y*ns+100, tip.z*ns + this.frameCount*0.001);

            this._tempDir.copy(branch.velocity);
            this._tempDir.addScaledVector(this._tempForce, 1.0);
            this._tempDir.x += nx * CONFIG.noiseStrength;
            this._tempDir.y += ny * CONFIG.noiseStrength;
            this._tempDir.z += nz * CONFIG.noiseStrength;
            this._tempDir.normalize();

            branch.velocity.lerp(this._tempDir, branch.steerStrength);
            branch.velocity.normalize();

            const speed = CONFIG.growthSpeed * branch.speedMult * (1.0 - branch.depth * 0.1);
            this._tempNewPoint.copy(branch.tip);
            this._tempNewPoint.addScaledVector(branch.velocity, speed);

            // Pencil jitter
            if (CONFIG.pencilJitter > 0) {
                const ps = CONFIG.pencilScale;
                const ox = tip.x, oy = tip.y, oz = tip.z;
                const tp = this._tempNewPoint;
                tp.x += this.noise.noise3D(ox*ps+200, oy*ps, oz*ps+branch.age*0.02) * CONFIG.pencilJitter;
                tp.y += this.noise.noise3D(ox*ps, oy*ps+200, oz*ps+branch.age*0.02) * CONFIG.pencilJitter;
                tp.z += this.noise.noise3D(ox*ps, oy*ps, oz*ps+200+branch.age*0.02) * CONFIG.pencilJitter;
            }

            let brightness = 1.0;
            if (branch.age > fadeStart) {
                brightness = 1.0 - (branch.age - fadeStart) / (effectiveMaxAge - fadeStart);
                brightness = Math.max(0, brightness);
            }

            if (CONFIG.lineWidthVar > 0) {
                const wn = this.noise.noise3D(
                    branch.age*0.005 + branch.speedMult*100, branch.widthMult*50, branch.depth*10);
                const widthFactor = 1.0 - CONFIG.lineWidthVar * 0.5 * (1.0 - wn);
                brightness *= Math.max(0.1, widthFactor);
            }

            branch.addPoint(this._tempNewPoint, brightness);
        }

        // Energy wave
        if (CONFIG.energyWave) {
            const time = this.frameCount / 60;
            for (let i = 0; i < this.branches.length; i++) {
                this.branches[i].updateWave(time);
            }
        }
    }

    getStats() {
        const alive = this.branches.filter(b => b.alive).length;
        return { total: this.branches.length, alive };
    }

    dispose() {
        for (const branch of this.branches) {
            this.scene.remove(branch.line);
            branch.dispose();
        }
        this.branches.length = 0;
    }
}
