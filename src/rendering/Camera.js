import { GAME_CONFIG } from '../config.js';

export class Camera {
    /**
     * Initialisiert die Kamera
     */
    constructor() {
        this.camera = new THREE.PerspectiveCamera(
            50, // Sichtwinkel
            window.innerWidth / window.innerHeight, // Seitenverhältnis
            0.1, // Near clipping plane
            2000 // Far clipping plane
        );
        
        this.cameraLookAtTarget = new THREE.Vector3(0, GAME_CONFIG.PLATFORM_THICKNESS / 2, 0);
        this.cameraOrbitRadius = 60;
        this.cameraPhi = Math.PI / 3.2;
        this.cameraTheta = Math.PI;
        
        this.updatePosition();
    }

    /**
     * Aktualisiert die Kameraposition
     */
    updatePosition() {
        if (!this.camera) return;
        
        this.camera.position.x = this.cameraLookAtTarget.x + 
            this.cameraOrbitRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
        this.camera.position.y = this.cameraLookAtTarget.y + 
            this.cameraOrbitRadius * Math.cos(this.cameraPhi);
        this.camera.position.z = this.cameraLookAtTarget.z + 
            this.cameraOrbitRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
        this.camera.lookAt(this.cameraLookAtTarget);
    }

    /**
     * Zoomt die Kamera
     * @param {number} delta - Zoom-Faktor
     */
    zoom(delta) {
        const zoomSpeed = 0.05;
        if (delta < 0) {
            this.cameraOrbitRadius = Math.max(
                GAME_CONFIG.MIN_CAMERA_RADIUS,
                this.cameraOrbitRadius * (1 - zoomSpeed)
            );
        } else {
            this.cameraOrbitRadius = Math.min(
                GAME_CONFIG.MAX_CAMERA_RADIUS,
                this.cameraOrbitRadius * (1 + zoomSpeed)
            );
        }
        this.updatePosition();
    }

    /**
     * Rotiert die Kamera
     * @param {number} deltaX - X-Rotation
     * @param {number} deltaY - Y-Rotation
     */
    rotate(deltaX, deltaY) {
        this.cameraTheta -= deltaX * 0.005;
        this.cameraPhi -= deltaY * 0.005;
        this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));
        this.updatePosition();
    }

    /**
     * Verschiebt die Kamera
     * @param {number} deltaX - X-Verschiebung
     * @param {number} deltaY - Y-Verschiebung
     */
    pan(deltaX, deltaY) {
        const panSpeed = 0.1 * (this.cameraOrbitRadius / 90);
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
        this.cameraLookAtTarget.add(right.multiplyScalar(-deltaX * panSpeed));
        const panDirectionZ = forward.clone();
        this.cameraLookAtTarget.add(panDirectionZ.multiplyScalar(deltaY * panSpeed));
        this.updatePosition();
    }

    /**
     * Passt die Kamera an die Fenstergröße an
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
} 