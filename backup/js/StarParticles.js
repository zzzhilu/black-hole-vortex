// ========================================
// Black Hole Vortex — Star Particles
// ========================================

import { CONFIG } from './config.js';
import { VortexField } from './VortexField.js';
import * as THREE from 'three';

/**
 * StarParticles — small glowing dots ejected from the black hole center,
 * following the same vortex field as the lines.
 */
export class StarParticles {
    constructor(scene) {
        this.scene = scene;
        this.vortex = new VortexField();
        this.maxParticles = 2500;
        this.spawnRate = 2;
        this.particleSpeed = 0.003;      // ultra slow drift
        this.particleLifespan = 20000;   // very long life

        // Particle data arrays
        this.positions = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.velocities = [];        // THREE.Vector3 per particle
        this.ages = new Float32Array(this.maxParticles);
        this.alive = new Uint8Array(this.maxParticles);
        this.count = 0;

        this._tempForce = new THREE.Vector3();

        // Initialize all as dead
        for (let i = 0; i < this.maxParticles; i++) {
            this.velocities.push(new THREE.Vector3());
            this.ages[i] = 0;
            this.alive[i] = 0;
        }

        // Geometry
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setDrawRange(0, 0);

        // Material — small additive points
        this.material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        });

        this.points = new THREE.Points(this.geometry, this.material);
        scene.add(this.points);

        this.visible = true;
    }

    setVisible(v) {
        this.visible = v;
        this.points.visible = v;
    }

    _findFreeSlot() {
        for (let i = 0; i < this.maxParticles; i++) {
            if (!this.alive[i]) return i;
        }
        return -1;
    }

    _spawn() {
        const idx = this._findFreeSlot();
        if (idx === -1) return;

        // Random position throughout the visible space (sphere r=1..50)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.5 + Math.random() * 48;
        const px = Math.sin(phi) * Math.cos(theta) * r;
        const py = Math.sin(phi) * Math.sin(theta) * r * 0.3;  // flatter disc
        const pz = Math.cos(phi) * r;

        this.positions[idx * 3] = px;
        this.positions[idx * 3 + 1] = py;
        this.positions[idx * 3 + 2] = pz;

        // Very gentle outward drift from center
        const dist = Math.sqrt(px * px + py * py + pz * pz);
        const speed = this.particleSpeed * (0.3 + Math.random() * 0.7);
        this.velocities[idx].set(
            (px / dist) * speed,
            (py / dist) * speed * 0.3,
            (pz / dist) * speed
        );

        // White color
        this.colors[idx * 3] = 1;
        this.colors[idx * 3 + 1] = 1;
        this.colors[idx * 3 + 2] = 1;

        this.ages[idx] = 0;
        this.alive[idx] = 1;
    }

    update() {
        if (!this.visible) return;

        // Spawn new particles
        for (let s = 0; s < this.spawnRate; s++) {
            this._spawn();
        }

        let maxDrawIdx = 0;

        for (let i = 0; i < this.maxParticles; i++) {
            if (!this.alive[i]) continue;

            this.ages[i]++;

            // Kill old particles
            if (this.ages[i] > this.particleLifespan) {
                this.alive[i] = 0;
                // Move off-screen
                this.positions[i * 3] = 0;
                this.positions[i * 3 + 1] = -9999;
                this.positions[i * 3 + 2] = 0;
                continue;
            }

            // Independent movement: gentle CCW rotation + slow outward drift
            const px = this.positions[i * 3];
            const py = this.positions[i * 3 + 1];
            const pz = this.positions[i * 3 + 2];

            // CCW rotation in XZ plane (small angle per frame)
            const rotSpeed = -0.0002;
            const cosR = Math.cos(rotSpeed);
            const sinR = Math.sin(rotSpeed);
            const nx = px * cosR - pz * sinR;
            const nz = px * sinR + pz * cosR;

            // Slow radial expansion
            const dist = Math.sqrt(nx * nx + nz * nz);
            const expand = dist > 0.01 ? 0.002 : 0;
            const ex = dist > 0.01 ? (nx / dist) * expand : 0;
            const ez = dist > 0.01 ? (nz / dist) * expand : 0;

            this.positions[i * 3] = nx + ex;
            this.positions[i * 3 + 1] = py;
            this.positions[i * 3 + 2] = nz + ez;

            // Fade: brightness decreases with age
            const life = 1.0 - this.ages[i] / this.particleLifespan;
            const b = Math.max(0, life);
            this.colors[i * 3] = b;
            this.colors[i * 3 + 1] = b;
            this.colors[i * 3 + 2] = b;

            if (i > maxDrawIdx) maxDrawIdx = i;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.setDrawRange(0, maxDrawIdx + 1);
    }

    dispose() {
        this.scene.remove(this.points);
        this.geometry.dispose();
        this.material.dispose();
    }
}
