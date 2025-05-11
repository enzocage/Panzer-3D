import { GAME_CONFIG } from '../config.js';
import { Textures } from './Textures.js';

export class Scene {
    /**
     * Initialisiert die Szene
     * @param {THREE.WebGLRenderer} renderer - Der WebGL-Renderer
     */
    constructor(renderer) {
        this.scene = new THREE.Scene();
        this.renderer = renderer;
        this.clock = new THREE.Clock();
        
        this.setupSkybox();
        this.setupFog();
        this.setupLights();
    }

    /**
     * Richtet den Himmel ein
     */
    setupSkybox() {
        const canvasSky = document.createElement('canvas');
        canvasSky.width = 2;
        canvasSky.height = 128;
        const contextSky = canvasSky.getContext('2d');
        const gradientSky = contextSky.createLinearGradient(0, 0, 0, 128);
        gradientSky.addColorStop(0, '#6DD5FA');
        gradientSky.addColorStop(0.5, '#2980B9');
        gradientSky.addColorStop(1, '#0A3D62');
        contextSky.fillStyle = gradientSky;
        contextSky.fillRect(0, 0, 2, 128);
        
        const skyTexture = new THREE.CanvasTexture(canvasSky);
        this.scene.background = skyTexture;
    }

    /**
     * Richtet den Nebel ein
     */
    setupFog() {
        this.scene.fog = new THREE.FogExp2(0x0A3D62, 0.007);
    }

    /**
     * Richtet die Beleuchtung ein
     */
    setupLights() {
        // Umgebungslicht
        const ambientLight = new THREE.AmbientLight(0x8090a0, 1.0);
        this.scene.add(ambientLight);
        
        // Sonnenlicht
        const sunLight = new THREE.DirectionalLight(0xfff5e1, 1.5);
        sunLight.position.set(80, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 20;
        sunLight.shadow.camera.far = 300;
        sunLight.shadow.camera.left = -GAME_CONFIG.FIELD_WIDTH;
        sunLight.shadow.camera.right = GAME_CONFIG.FIELD_WIDTH;
        sunLight.shadow.camera.top = GAME_CONFIG.FIELD_DEPTH;
        sunLight.shadow.camera.bottom = -GAME_CONFIG.FIELD_DEPTH;
        this.scene.add(sunLight);
        
        // Sonnenmesh
        const sunGeo = new THREE.SphereGeometry(15, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff5e1, fog: false });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.copy(sunLight.position.clone().normalize().multiplyScalar(-800));
        this.scene.add(sunMesh);
    }

    /**
     * Erstellt die Spielfläche
     * @returns {THREE.Mesh} Die Spielfläche
     */
    createPlatform() {
        const platformTexture = Textures.createOrganicGroundTexture(this.renderer);
        const platformMaterial = new THREE.MeshStandardMaterial({
            map: platformTexture,
            roughness: 0.85,
            metalness: 0.1
        });
        
        const platformGeometry = new THREE.BoxGeometry(
            GAME_CONFIG.FIELD_WIDTH,
            GAME_CONFIG.PLATFORM_THICKNESS,
            GAME_CONFIG.FIELD_DEPTH
        );
        
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = -GAME_CONFIG.PLATFORM_THICKNESS / 2;
        platform.receiveShadow = true;
        this.scene.add(platform);
        
        return platform;
    }

    /**
     * Erstellt Wolken
     */
    createClouds() {
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            fog: false
        });
        
        for (let i = 0; i < 15; i++) {
            const cloudPlane = new THREE.PlaneGeometry(
                Math.random() * 30 + 20,
                Math.random() * 15 + 10
            );
            
            const cloud = new THREE.Mesh(cloudPlane, cloudMaterial.clone());
            cloud.position.set(
                (Math.random() - 0.5) * GAME_CONFIG.FIELD_WIDTH * 2.5,
                100 + Math.random() * 40,
                (Math.random() - 0.5) * GAME_CONFIG.FIELD_DEPTH * 2.5
            );
            
            cloud.rotation.x = Math.PI / 2;
            cloud.rotation.z = Math.random() * Math.PI;
            this.scene.add(cloud);
        }
    }

    /**
     * Fügt ein Objekt zur Szene hinzu
     * @param {THREE.Object3D} object - Das hinzuzufügende Objekt
     */
    add(object) {
        this.scene.add(object);
    }

    /**
     * Entfernt ein Objekt aus der Szene
     * @param {THREE.Object3D} object - Das zu entfernende Objekt
     */
    remove(object) {
        this.scene.remove(object);
    }

    /**
     * Gibt die Delta-Zeit zurück
     * @returns {number} Die Delta-Zeit
     */
    getDeltaTime() {
        return this.clock.getDelta();
    }
} 