// ========================================
// Black Hole Vortex — Black Hole Core Visual
// ========================================

import { CONFIG } from './config.js';
import * as THREE from 'three';

/**
 * BlackHole — a pure black sphere at the center.
 */
export class BlackHole {
    constructor(scene) {
        this.scene = scene;

        const geo = new THREE.SphereGeometry(CONFIG.blackHoleRadius, 48, 48);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x000000,
        });
        this.core = new THREE.Mesh(geo, mat);
        scene.add(this.core);
    }

    update(_time) {
        // no-op: static pure black sphere
    }

    dispose() {
        this.scene.remove(this.core);
        this.core.geometry.dispose();
        this.core.material.dispose();
    }
}
