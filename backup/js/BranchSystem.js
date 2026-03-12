// ========================================
// Black Hole Vortex — Branch Growth System
// ========================================

import { CONFIG } from './config.js';
import { VortexField } from './VortexField.js';
import * as THREE from 'three';

// ── Simple seeded noise (value noise) ──
class SimpleNoise {
    constructor(seed = 0) {
        this.seed = seed;
    }

    _hash(x, y, z) {
        let h = this.seed + x * 374761393 + y * 668265263 + z * 1274126177;
        h = (h ^ (h >> 13)) * 1103515245;
        return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
    }

    _lerp(a, b, t) {
        return a + t * (b - a);
    }

    _smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    noise3D(x, y, z) {
        const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
        const fx = this._smoothstep(x - ix);
        const fy = this._smoothstep(y - iy);
        const fz = this._smoothstep(z - iz);

        const v000 = this._hash(ix, iy, iz);
        const v100 = this._hash(ix + 1, iy, iz);
        const v010 = this._hash(ix, iy + 1, iz);
        const v110 = this._hash(ix + 1, iy + 1, iz);
        const v001 = this._hash(ix, iy, iz + 1);
        const v101 = this._hash(ix + 1, iy, iz + 1);
        const v011 = this._hash(ix, iy + 1, iz + 1);
        const v111 = this._hash(ix + 1, iy + 1, iz + 1);

        return this._lerp(
            this._lerp(
                this._lerp(v000, v100, fx),
                this._lerp(v010, v110, fx), fy),
            this._lerp(
                this._lerp(v001, v101, fx),
                this._lerp(v011, v111, fx), fy),
            fz
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

        // Per-branch randomized speed (0.3x ~ 2.5x) for interleaving chaos
        this.speedMult = 0.3 + Math.random() * 2.2;
        // Per-branch steering sensitivity (how fast it turns)
        this.steerStrength = 0.15 + Math.random() * 0.35;

        // Create the Three.js line object with per-vertex color for fade-out
        this.maxPoints = 3000;
        this.geometry = new THREE.BufferGeometry();
        this.positionArray = new Float32Array(this.maxPoints * 3);
        this.colorArray = new Float32Array(this.maxPoints * 3);

        // Set initial point
        this.positionArray[0] = origin.x;
        this.positionArray[1] = origin.y;
        this.positionArray[2] = origin.z;
        // Initial color: white
        this.colorArray[0] = 1;
        this.colorArray[1] = 1;
        this.colorArray[2] = 1;

        this.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(this.positionArray, 3)
        );
        this.geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(this.colorArray, 3)
        );
        this.geometry.setDrawRange(0, 1);

        const opacity = Math.max(
            0.05,
            CONFIG.lineOpacityBase - depth * CONFIG.lineOpacityDepthFalloff
        );

        // Standard line material
        this.material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: opacity,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.line = new THREE.Line(this.geometry, this.material);
    }

    /**
     * Add a new point to the branch with a brightness value [0..1].
     */
    addPoint(point, brightness) {
        const idx = this.points.length;
        if (idx >= this.maxPoints) {
            this.alive = false;
            return;
        }
        this.points.push(point.clone());
        this.positionArray[idx * 3] = point.x;
        this.positionArray[idx * 3 + 1] = point.y;
        this.positionArray[idx * 3 + 2] = point.z;

        // Per-vertex color: white * brightness → fades to black
        const b = Math.max(0, brightness);
        this.colorArray[idx * 3] = b;
        this.colorArray[idx * 3 + 1] = b;
        this.colorArray[idx * 3 + 2] = b;

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.setDrawRange(0, idx + 1);
    }

    get tip() {
        return this.points[this.points.length - 1];
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

        // Spawn initial branches
        this._spawnInitialBranches();
    }

    _makeFlatDir(angle) {
        // Mostly in XZ plane with slight Y variance for depth
        return new THREE.Vector3(
            Math.cos(angle),
            (Math.random() - 0.5) * 0.3,
            Math.sin(angle)
        ).normalize();
    }

    _spawnInitialBranches() {
        const count = CONFIG.initialBranchCount;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const dir = this._makeFlatDir(angle);
            this._createBranch(new THREE.Vector3(0, 0, 0), dir, 0);
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

    /**
     * Main update — called every frame.
     */
    update() {
        this.frameCount++;

        // Periodically spawn new root branches
        if (this.frameCount % CONFIG.spawnInterval === 0) {
            const angle = Math.random() * Math.PI * 2;
            const dir = this._makeFlatDir(angle);
            this._createBranch(new THREE.Vector3(0, 0, 0), dir, 0);
        }

        // Use branchMaxAge directly from CONFIG (UI controlled)
        const effectiveMaxAge = CONFIG.branchMaxAge;
        // Fade-out only in the last 300 frames
        const fadeDuration = 300;
        const fadeStart = effectiveMaxAge - fadeDuration;

        for (let i = 0; i < this.branches.length; i++) {
            const branch = this.branches[i];
            if (!branch.alive) continue;

            branch.age++;

            // Death: only when reaching doubled max age or world boundary
            if (branch.age > effectiveMaxAge) {
                branch.alive = false;
                continue;
            }
            if (branch.tip.length() > CONFIG.worldRadius) {
                branch.alive = false;
                continue;
            }

            // Get vortex force at current tip position
            this.vortex.getForce(branch.tip, this._tempForce);

            // Noise perturbation
            const ns = CONFIG.noiseScale;
            const tip = branch.tip;
            const nx = this.noise.noise3D(tip.x * ns, tip.y * ns, tip.z * ns + this.frameCount * 0.001);
            const ny = this.noise.noise3D(tip.x * ns + 100, tip.y * ns, tip.z * ns + this.frameCount * 0.001);
            const nz = this.noise.noise3D(tip.x * ns, tip.y * ns + 100, tip.z * ns + this.frameCount * 0.001);

            // Combine direction
            this._tempDir.copy(branch.velocity);
            this._tempDir.addScaledVector(this._tempForce, 1.0);
            this._tempDir.x += nx * CONFIG.noiseStrength;
            this._tempDir.y += ny * CONFIG.noiseStrength;
            this._tempDir.z += nz * CONFIG.noiseStrength;
            this._tempDir.normalize();

            // Smooth steering — per-branch sensitivity
            branch.velocity.lerp(this._tempDir, branch.steerStrength);
            branch.velocity.normalize();

            // Speed — each branch has its own random multiplier
            const speed = CONFIG.growthSpeed * branch.speedMult * (1.0 - branch.depth * 0.1);
            this._tempNewPoint.copy(branch.tip);
            this._tempNewPoint.addScaledVector(branch.velocity, speed);

            // Compute brightness: full white until fadeStart, then fade to black
            let brightness = 1.0;
            if (branch.age > fadeStart) {
                brightness = 1.0 - (branch.age - fadeStart) / (effectiveMaxAge - fadeStart);
                brightness = Math.max(0, brightness);
            }

            branch.addPoint(this._tempNewPoint, brightness);
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
