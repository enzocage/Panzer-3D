export class Renderer {
    /**
     * Initialisiert den Renderer
     */
    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        document.body.appendChild(this.renderer.domElement);
    }

    /**
     * Rendert die Szene
     * @param {THREE.Scene} scene - Die zu rendernde Szene
     * @param {THREE.Camera} camera - Die zu verwendende Kamera
     */
    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    /**
     * Passt die Größe des Renderers an
     */
    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Gibt den WebGL-Renderer zurück
     * @returns {THREE.WebGLRenderer} Der WebGL-Renderer
     */
    getRenderer() {
        return this.renderer;
    }
} 