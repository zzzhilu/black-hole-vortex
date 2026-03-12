// ========================================
// Black Hole Vortex — Vortex Force Field (Planar Spiral)
// ========================================

import { CONFIG } from './config.js';
import * as THREE from 'three';

/**
 * VortexField — creates a flat, planar spiral (galaxy-like).
 * Strong tangential force in XZ plane with consistent spin direction.
 * Minimal vertical displacement for a disc-like vortex.
 */
export class VortexField {
    constructor() {
        this._tempRadial = new THREE.Vector3();
        this._tempTangent = new THREE.Vector3();
        this._up = new THREE.Vector3(0, 1, 0);
    }

    /**
     * Compute the vortex force at a given position.
     */
    getForce(position, outForce) {
        // Radial in XZ plane (flat disc)
        this._tempRadial.set(position.x, 0, position.z);
        const dist = this._tempRadial.length();

        if (dist < 0.001) {
            outForce.set(
                (Math.random() - 0.5) * 0.1,
                0,
                (Math.random() - 0.5) * 0.1
            );
            return outForce;
        }

        this._tempRadial.normalize();

        // Tangential = cross(up, radial) → consistent CCW spiral in XZ
        this._tempTangent.crossVectors(this._up, this._tempRadial).normalize();

        // Falloff: stronger near center → tighter inner spiral
        const falloff = 1.0 / (1.0 + dist * 0.03);

        outForce.set(0, 0, 0);

        // Strong tangential — drives the spiral curve
        outForce.addScaledVector(
            this._tempTangent,
            CONFIG.tangentialStrength * falloff
        );

        // Gentle radial outward push
        outForce.addScaledVector(
            this._tempRadial,
            CONFIG.radialStrength
        );

        // Very subtle vertical drift for slight 3D depth
        outForce.y += (Math.random() - 0.5) * CONFIG.verticalSpread;

        return outForce;
    }
}
