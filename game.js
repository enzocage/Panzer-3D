/**
 * Tank Battle Game - Ein 3D-Panzerspiel mit Three.js
 * 
 * Dieses Spiel implementiert ein rundenbasiertes Panzerkampfspiel mit folgenden Hauptfunktionen:
 * - 3D-Rendering mit Three.js
 * - Zwei Spieler, die abwechselnd ihre Panzer bewegen
 * - Kollisionserkennung mit Bergen und Bäumen
 * - Dynamische Kamerasteuerung
 * - Partikeleffekte für Explosionen
 * - Soundeffekte und Musik
 * 
 * @author [Ihr Name]
 * @version 1.0
 */

import { GAME_CONFIG, GAME_STATE } from './config.js';
import { Tank } from './tank.js';
import { Explosion } from './explosion.js';
import { SoundManager } from './soundManager.js';

export class Game {
    /**
     * Initialisiert ein neues Spiel
     * 
     * Der Constructor setzt alle notwendigen Eigenschaften und Komponenten auf:
     * - Three.js Komponenten (Scene, Camera, Renderer)
     * - Spielobjekte (Panzer, Berge, Bäume)
     * - Spielzustand und Spielerinformationen
     * - UI-Elemente
     * - Kamerasteuerung
     */
    constructor() {
        // Three.js Komponenten
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        this.mouse = null;
        this.clock = null;
        this.gamePlatform = null;
        
        // Spielobjekte
        this.tanks = [];          // Array für alle Panzer
        this.mountains = [];      // Array für Berge
        this.firTrees = [];       // Array für Tannenbäume
        this.activeExplosions = []; // Array für aktive Explosionen
        this.activeProjectiles = []; // Array für aktive Projektile
        this.projectileSpeed = 30;   // Geschwindigkeit der Projektile
        this.projectileDamage = 100; // Schaden pro Treffer
        
        // Spielzustand
        this.currentPlayer = 1;   // Aktueller Spieler (1 oder 2)
        this.selectedTank = null; // Ausgewählter Panzer
        this.tankAwaitingEndTurnClick = null; // Panzer der auf Zugende wartet
        this.currentGameState = GAME_STATE.INITIAL;
        
        // Spielerstatistiken
        this.scores = { player1: 0, player2: 0 };
        this.soundManager = new SoundManager();
        
        // Kamerasteuerung
        this.isCtrlPressed = false;
        this.isMiddleMouseButtonPressed = false;
        this.isShiftPressed = false;
        this.isDraggingForCamera = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.cameraLookAtTarget = new THREE.Vector3(0, GAME_CONFIG.PLATFORM_THICKNESS / 2, 0);
        this.cameraOrbitRadius = 60;
        this.cameraPhi = Math.PI / 3.2;
        this.cameraTheta = Math.PI;
        
        // UI-Elemente
        this.scorePlayer1Elem = document.getElementById('scorePlayer1');
        this.scorePlayer2Elem = document.getElementById('scorePlayer2');
        this.turnInfoElem = document.getElementById('turnInfo');
        this.gameOverMessageElem = document.getElementById('gameOverMessage');
        this.startMessageElem = document.getElementById('startMessage');
        
        this.audioStarted = false;
        this.aimingMarker = null;        // Rotierender Zielpunkt
        this.aimingRadius = 5;           // Radius der Zielkreisrotation
        this.aimingRotationSpeed = 2 * Math.PI; // Eine Umdrehung pro Sekunde
        this.aimingAngle = 0;            // Aktueller Rotationswinkel
        this.init();
    }

    /**
     * Initialisiert alle Spielkomponenten
     * Wird nach dem Constructor aufgerufen und richtet alle notwendigen
     * Spielkomponenten ein.
     */
    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupPlatform();
        this.createTanks();
        this.createMountains();
        this.createFirTrees();
        this.createClouds();
        this.setupEventListeners();
        this.initSoundManager();
    }

    /**
     * Richtet die 3D-Szene ein
     * Erstellt die Hauptszene mit Himmelsgradient und Nebel
     */
    setupScene() {
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        
        // Erstelle Himmelsgradient
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
        this.scene.fog = new THREE.FogExp2(0x0A3D62, 0.007);
    }

    /**
     * Richtet die Kamera ein
     * Erstellt eine Perspektivkamera mit den definierten Parametern
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            50, // Sichtwinkel
            window.innerWidth / window.innerHeight, // Seitenverhältnis
            0.1, // Near clipping plane
            2000 // Far clipping plane
        );
        
        this.updateCameraPosition();
    }

    /**
     * Richtet den Renderer ein
     * Erstellt einen WebGL-Renderer mit Schatten und Antialiasing
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        document.body.appendChild(this.renderer.domElement);
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    /**
     * Richtet die Beleuchtung ein
     * Erstellt Umgebungslicht und Sonnenlicht mit Schatten
     */
    setupLights() {
        // Umgebungslicht für grundlegende Beleuchtung
        const ambientLight = new THREE.AmbientLight(0x8090a0, 1.0);
        this.scene.add(ambientLight);
        
        // Hauptlichtquelle (Sonne)
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
        
        // Sonnenmesh für visuelle Darstellung
        const sunGeo = new THREE.SphereGeometry(15, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff5e1, fog: false });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.copy(sunLight.position.clone().normalize().multiplyScalar(-800));
        this.scene.add(sunMesh);
    }

    /**
     * Erstellt die Spielfläche
     * Erstellt eine Box mit organischer Textur als Spielfläche
     */
    setupPlatform() {
        const platformTexture = this.createOrganicGroundTexture();
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
        
        this.gamePlatform = new THREE.Mesh(platformGeometry, platformMaterial);
        this.gamePlatform.position.y = -GAME_CONFIG.PLATFORM_THICKNESS / 2;
        this.gamePlatform.receiveShadow = true;
        this.scene.add(this.gamePlatform);
    }

    /**
     * Erstellt die Panzer für beide Spieler
     * Platziert die Panzer an den Startpositionen
     */
    createTanks() {
        const playableWidth = GAME_CONFIG.FIELD_WIDTH * 0.8;
        const spacingX = GAME_CONFIG.NUM_TANKS_PER_PLAYER > 1 ? 
            playableWidth / (GAME_CONFIG.NUM_TANKS_PER_PLAYER - 1) : 0;
        const startX = GAME_CONFIG.NUM_TANKS_PER_PLAYER > 1 ? -playableWidth / 2 : 0;
        const offsetZFromEdge = GAME_CONFIG.TANK_BASE_SIZE.depth * 0.7;

        for (let i = 0; i < GAME_CONFIG.NUM_TANKS_PER_PLAYER; i++) {
            const posX = startX + i * spacingX;

            // Spieler 1 Panzer (rot)
            const tank1 = new Tank(
                new THREE.Color(GAME_CONFIG.PLAYER1_TANK_COLOR),
                1,
                new THREE.Vector3(posX, 0, -GAME_CONFIG.FIELD_DEPTH/2 + offsetZFromEdge),
                0
            );
            this.tanks.push(tank1);
            this.scene.add(tank1.mesh);

            // Spieler 2 Panzer (orange)
            const tank2 = new Tank(
                new THREE.Color(GAME_CONFIG.PLAYER2_TANK_COLOR),
                2,
                new THREE.Vector3(posX, 0, GAME_CONFIG.FIELD_DEPTH/2 - offsetZFromEdge),
                Math.PI
            );
            this.tanks.push(tank2);
            this.scene.add(tank2.mesh);
        }
    }

    /**
     * Erstellt die Berge auf dem Spielfeld
     * Generiert zufällig verteilte Berge mit unterschiedlichen Größen
     */
    createMountains() {
        const baseMountainHeight = GAME_CONFIG.TANK_BASE_SIZE.height * 1.2;
        
        for (let i = 0; i < GAME_CONFIG.NUM_MOUNTAINS; i++) {
            const mountainRadiusTop = Math.random() * 2.5 + 1.5;
            const mountainRadiusBottom = mountainRadiusTop + Math.random() * 1.5 + 0.5;
            const mountainHeight = baseMountainHeight + Math.random() * 1.5;
            const radialSegments = 5 + Math.floor(Math.random() * 3);

            const mountainGeo = new THREE.CylinderGeometry(
                mountainRadiusTop,
                mountainRadiusBottom,
                mountainHeight,
                radialSegments
            );
            
            const mountainTexture = this.createMountainTexture();
            const mountainMat = new THREE.MeshStandardMaterial({
                map: mountainTexture,
                roughness: 0.9,
                metalness: 0.0,
                flatShading: true
            });
            
            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.set(
                (Math.random() - 0.5) * (GAME_CONFIG.FIELD_WIDTH * 0.5),
                mountainHeight / 2,
                (Math.random() - 0.5) * (GAME_CONFIG.FIELD_DEPTH * 0.7)
            );
            
            mountain.castShadow = true;
            mountain.receiveShadow = true;
            this.mountains.push(mountain);
            this.scene.add(mountain);
        }
    }

    /**
     * Erstellt die Tannenbäume auf dem Spielfeld
     * Platziert Bäume zufällig, aber mit Kollisionserkennung
     */
    createFirTrees() {
        const mountainAvgHeight = GAME_CONFIG.TANK_BASE_SIZE.height * 1.5 + 1;
        const treeHeightTarget = mountainAvgHeight * 2;
        
        for (let i = 0; i < GAME_CONFIG.NUM_FIR_TREES; i++) {
            const tree = this.createFirTreeMesh();
            let actualTreeHeight = 0;
            
            // Berechne die tatsächliche Baumhöhe
            tree.children.forEach(child => {
                if (child.geometry.type === "ConeGeometry") {
                    actualTreeHeight += child.geometry.parameters.height * 0.8;
                }
                if (child.geometry.type === "CylinderGeometry" && tree.children.indexOf(child) === 0) {
                    actualTreeHeight += child.geometry.parameters.height;
                }
            });
            
            // Skaliere den Baum auf die Zielhöhe
            const scale = treeHeightTarget / Math.max(1, actualTreeHeight);
            tree.scale.set(scale, scale, scale);
            
            // Finde eine gültige Position für den Baum
            let validPosition = false;
            let x, z;
            
            while (!validPosition) {
                x = (Math.random() - 0.5) * (GAME_CONFIG.FIELD_WIDTH * 0.85);
                z = (Math.random() - 0.5) * (GAME_CONFIG.FIELD_DEPTH * 0.85);
                validPosition = true;
                
                // Prüfe Kollisionen mit Bergen
                for (const mountain of this.mountains) {
                    if (mountain.position.distanceTo(new THREE.Vector3(x, 0, z)) < 
                        mountain.geometry.parameters.radiusBottom + GAME_CONFIG.TANK_BASE_SIZE.width) {
                        validPosition = false;
                        break;
                    }
                }
                
                // Prüfe Kollisionen mit Panzern
                for (const tank of this.tanks) {
                    if (tank.mesh.position.distanceTo(new THREE.Vector3(x, 0, z)) < 
                        GAME_CONFIG.TANK_BASE_SIZE.depth * 2) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            tree.position.set(x, 0, z);
            this.scene.add(tree);
            this.firTrees.push(tree);
        }
    }

    /**
     * Erstellt die Wolken im Himmel
     * Generiert zufällig verteilte, halbtransparente Wolken
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
     * Richtet alle Event-Listener ein
     * Registriert Handler für Maus-, Tastatur- und Fensterereignisse
     */
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('mousedown', this.onDocumentMouseDown.bind(this));
        document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this));
        document.addEventListener('mouseup', this.onDocumentMouseUp.bind(this));
        document.addEventListener('keydown', this.onDocumentKeyDown.bind(this));
        document.addEventListener('keyup', this.onDocumentKeyUp.bind(this));
        document.addEventListener('wheel', this.onDocumentMouseWheel.bind(this));
        this.startMessageElem.addEventListener('click', this.startGameAudio.bind(this));
    }

    /**
     * Startet die Audiowiedergabe
     * Wird nach der ersten Benutzerinteraktion aufgerufen
     */
    startGameAudio() {
        if (!this.audioStarted) {
            const startAudio = async () => {
                try {
                    await Tone.start();
                    this.audioStarted = true;
                    this.soundManager.init();
                    console.log("Audio context started.");
                    this.startMessageElem.style.display = 'none';
                    this.currentGameState = GAME_STATE.SELECT_TANK;
                    this.updateTurnInfo();
                } catch (e) {
                    console.error("Tone.start failed:", e);
                }
            };

            this.startMessageElem.removeEventListener('click', startAudio);
            this.startMessageElem.addEventListener('click', startAudio);
        }
    }

    /**
     * Aktualisiert die Kameraposition
     * Berechnet die neue Position basierend auf Orbit-Parametern
     */
    updateCameraPosition() {
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
     * Handler für Mausrad-Ereignisse
     * Steuert den Kamerazoom
     */
    onDocumentMouseWheel(event) {
        if (this.currentGameState === GAME_STATE.INITIAL) return;
        
        event.preventDefault();
        const zoomSpeed = 0.05;
        
        if (event.deltaY < 0) {
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
        
        this.updateCameraPosition();
    }

    /**
     * Handler für Tastendruck-Ereignisse
     * Verarbeitet Steuerungstasten (Ctrl, Shift)
     */
    onDocumentKeyDown(event) {
        if (event.key === 'Control') this.isCtrlPressed = true;
        if (event.key === 'Shift') this.isShiftPressed = true;
    }

    /**
     * Handler für Tastenloslassen-Ereignisse
     * Aktualisiert den Zustand der Steuerungstasten
     */
    onDocumentKeyUp(event) {
        if (event.key === 'Control') {
            this.isCtrlPressed = false;
            if (!this.isMiddleMouseButtonPressed && !this.isShiftPressed) {
                this.isDraggingForCamera = false;
            }
        }
        if (event.key === 'Shift') {
            this.isShiftPressed = false;
            if (!this.isCtrlPressed && !this.isMiddleMouseButtonPressed) {
                this.isDraggingForCamera = false;
            }
        }
    }

    /**
     * Handler für Mausklick-Ereignisse
     * Verarbeitet Spielinteraktionen und Kamerasteuerung
     */
    onDocumentMouseDown(event) {
        if (this.currentGameState === GAME_STATE.INITIAL) return;
        
        // Kamerasteuerung
        if (event.button === 1 || 
            (this.isCtrlPressed && event.button === 0) || 
            (this.isShiftPressed && event.button === 0)) {
            this.isMiddleMouseButtonPressed = (event.button === 1);
            this.isDraggingForCamera = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            event.preventDefault();
            return;
        }

        if (this.currentGameState === GAME_STATE.GAME_OVER) return;
        
        // Zug beenden
        if (this.currentGameState === GAME_STATE.AWAITING_END_TURN_CLICK && this.tankAwaitingEndTurnClick) {
            this.soundManager.playTurretSweep(false);
            this.tankAwaitingEndTurnClick = null;
            this.switchPlayer();
            return;
        }

        // Spielinteraktionen
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersectsPlatform = this.raycaster.intersectObject(this.gamePlatform);

        if (this.currentGameState === GAME_STATE.SELECT_TANK) {
            this.handleSelectTank();
        } else if (this.currentGameState === GAME_STATE.MOVE_TANK && 
                  this.selectedTank && 
                  intersectsPlatform.length > 0) {
            this.handleMoveTankOrder(intersectsPlatform[0].point);
        } else if (this.currentGameState === GAME_STATE.AIMING) {
            this.handleAimingClick();
        }
    }

    /**
     * Handler für Mausbewegungs-Ereignisse
     * Steuert die Kamerabewegung
     */
    onDocumentMouseMove(event) {
        if (this.isDraggingForCamera) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;

            if (this.isShiftPressed) {
                // Kamera verschieben
                const panSpeed = 0.1 * (this.cameraOrbitRadius / 90);
                const forward = new THREE.Vector3();
                this.camera.getWorldDirection(forward);
                forward.y = 0;
                forward.normalize();
                const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
                this.cameraLookAtTarget.add(right.multiplyScalar(-deltaX * panSpeed));
                const panDirectionZ = forward.clone();
                this.cameraLookAtTarget.add(panDirectionZ.multiplyScalar(deltaY * panSpeed));
            } else {
                // Kamera rotieren
                this.cameraTheta -= deltaX * 0.005;
                this.cameraPhi -= deltaY * 0.005;
                this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));
            }
            
            this.updateCameraPosition();
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }
    }

    /**
     * Handler für Mausloslassen-Ereignisse
     * Aktualisiert den Zustand der Kamerasteuerung
     */
    onDocumentMouseUp(event) {
        if (event.button === 1) {
            this.isMiddleMouseButtonPressed = false;
        }
        if (!this.isCtrlPressed && !this.isMiddleMouseButtonPressed && !this.isShiftPressed) {
            this.isDraggingForCamera = false;
        }
    }

    /**
     * Verarbeitet die Panzerauswahl
     * Prüft, ob ein gültiger Panzer des aktuellen Spielers angeklickt wurde
     */
    handleSelectTank() {
        const tankBodies = this.tanks.map(tank => tank.mesh.children[0]);
        const intersects = this.raycaster.intersectObjects(tankBodies);
        
        if (intersects.length > 0) {
            const clickedBody = intersects[0].object;
            const clickedTank = this.tanks.find(t => t.mesh.children[0] === clickedBody);
            
            if (clickedTank && clickedTank.mesh.userData.player === this.currentPlayer) {
                // Vorherige Auswahl zurücksetzen
                if (this.selectedTank) {
                    this.selectedTank.mesh.userData.selectionGlow = 0;
                    this.selectedTank.mesh.children.forEach(child => {
                        if (child.material && child.material.emissive) {
                            child.material.emissive.set(0x000000);
                        }
                    });
                }
                
                // Neue Auswahl setzen
                this.selectedTank = clickedTank;
                this.selectedTank.mesh.userData.selectionGlow = 1;
                this.soundManager.playSelectTank();
                this.currentGameState = GAME_STATE.MOVE_TANK;
                this.updateTurnInfo();
            }
        }
    }

    /**
     * Verarbeitet die Panzerbewegung und leitet zur Zielauswahl über
     */
    handleMoveTankOrder(targetPointOnPlatform) {
        if (!this.selectedTank) return;
        
        const targetPoint = targetPointOnPlatform.clone();
        targetPoint.y = 0;

        const originalPosition = this.selectedTank.mesh.position.clone();
        let directionToTarget = targetPoint.clone().sub(originalPosition);
        let distanceToTarget = directionToTarget.length();

        // Prüfe, ob der Zug zu kurz ist
        if (distanceToTarget < GAME_CONFIG.MIN_MOVE_THRESHOLD) {
            this.selectedTank.mesh.userData.movedThisTurn = true;
            this.selectedTank.mesh.userData.selectionGlow = 0;
            this.selectedTank.mesh.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.set(0x000000);
                }
            });
            
            this.tankAwaitingEndTurnClick = this.selectedTank;
            this.currentGameState = GAME_STATE.AWAITING_END_TURN_CLICK;
            this.soundManager.playTurretSweep(true);
            this.selectedTank = null;
            this.updateTurnInfo();
            return;
        }

        // Berechne neue Position und Rotation
        this.selectedTank.mesh.rotation.y = Math.atan2(directionToTarget.x, directionToTarget.z);
        let moveDistance = Math.min(distanceToTarget, this.selectedTank.mesh.userData.maxMove);
        directionToTarget.normalize();
        this.selectedTank.mesh.userData.moveTarget = originalPosition.clone()
            .add(directionToTarget.multiplyScalar(moveDistance));
        this.selectedTank.mesh.userData.moveTarget.y = 0;

        // Kollisionserkennung
        const destinationBox = new THREE.Box3();
        const tankBodySize = new THREE.Vector3(
            GAME_CONFIG.TANK_BASE_SIZE.width,
            GAME_CONFIG.TANK_BASE_SIZE.height * 2,
            GAME_CONFIG.TANK_BASE_SIZE.depth
        );
        
        destinationBox.setFromCenterAndSize(
            new THREE.Vector3(
                this.selectedTank.mesh.userData.moveTarget.x,
                GAME_CONFIG.TANK_BASE_SIZE.height,
                this.selectedTank.mesh.userData.moveTarget.z
            ),
            tankBodySize
        );

        // Prüfe Kollisionen mit Bergen
        let collisionWithMountain = false;
        for (const mountain of this.mountains) {
            const mountainBox = new THREE.Box3().setFromObject(mountain);
            if (destinationBox.intersectsBox(mountainBox)) {
                collisionWithMountain = true;
                break;
            }
        }

        // Prüfe Kollisionen mit Bäumen
        let collisionWithTree = false;
        for (const tree of this.firTrees) {
            const treeBox = new THREE.Box3().setFromObject(tree);
            if (destinationBox.intersectsBox(treeBox)) {
                collisionWithTree = true;
                break;
            }
        }

        // Bei Kollision: Zug ungültig
        if (collisionWithMountain || collisionWithTree) {
            this.updateTurnInfoWithMessage("Ungültiger Zug: Ziel blockiert!");
            setTimeout(() => this.updateTurnInfo(), 2000);
            return;
        }

        // Starte Bewegung
        this.selectedTank.mesh.userData.isMoving = true;
        this.selectedTank.mesh.userData.selectionGlow = 0;
        this.selectedTank.mesh.children.forEach(child => {
            if (child.material && child.material.emissive) {
                child.material.emissive.set(0x000000);
            }
        });
        
        this.soundManager.startTankEngine();
        this.currentGameState = GAME_STATE.TANK_MOVING;
        this.updateTurnInfo();
    }

    /**
     * Wird aufgerufen, wenn der Panzer seine Bewegung abgeschlossen hat
     */
    onTankMovementComplete() {
        console.log("Tank movement complete - previous state:", this.currentGameState);
        this.soundManager.playTankMoveEnd();
        
        // Setze den Spielzustand explizit
        this.currentGameState = GAME_STATE.AIMING;
        console.log("New game state set to:", this.currentGameState);
        console.log("GAME_STATE.AIMING value:", GAME_STATE.AIMING);
        
        // Erstelle rotierenden Zielpunkt
        this.createAimingMarker();
        
        // Debug-Ausgabe
        console.log("Tank movement complete, state set to AIMING");
        console.log("Aiming marker created:", this.aimingMarker);
        
        this.updateTurnInfo();
    }

    /**
     * Erstellt den rotierenden Zielpunkt
     */
    createAimingMarker() {
        if (this.aimingMarker) {
            this.scene.remove(this.aimingMarker);
        }

        const geometry = new THREE.SphereGeometry(0.3, 8, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        this.aimingMarker = new THREE.Mesh(geometry, material);
        this.aimingMarker.position.copy(this.selectedTank.mesh.position);
        this.aimingMarker.position.y = GAME_CONFIG.TANK_BASE_SIZE.height * 0.8;
        this.scene.add(this.aimingMarker);
        
        // Initialisiere Rotationsparameter
        this.aimingAngle = 0;
        this.aimingRadius = 5;
        this.aimingRotationSpeed = 2 * Math.PI; // Eine Umdrehung pro Sekunde
        
        console.log("Aiming marker created with angle:", this.aimingAngle);
        console.log("Initial position:", this.aimingMarker.position);
    }

    /**
     * Aktualisiert die Position des Zielpunkts
     */
    updateAimingMarker(deltaTime) {
        if (!this.aimingMarker || !this.selectedTank) {
            console.log("Cannot update aiming marker - missing marker or tank");
            return;
        }

        // Aktualisiere Rotationswinkel
        this.aimingAngle += this.aimingRotationSpeed * deltaTime;
        
        // Berechne neue Position auf dem Kreis
        const center = this.selectedTank.mesh.position;
        const newX = center.x + Math.cos(this.aimingAngle) * this.aimingRadius;
        const newZ = center.z + Math.sin(this.aimingAngle) * this.aimingRadius;
        
        // Debug-Ausgabe
        console.log("Updating aiming marker:", {
            deltaTime,
            angle: this.aimingAngle,
            center: center,
            newPosition: { x: newX, z: newZ },
            currentPosition: this.aimingMarker.position,
            gameState: this.currentGameState,
            aimingRotationSpeed: this.aimingRotationSpeed
        });
        
        // Setze neue Position
        this.aimingMarker.position.set(newX, GAME_CONFIG.TANK_BASE_SIZE.height * 0.8, newZ);
        
        // Überprüfe, ob die Position tatsächlich aktualisiert wurde
        console.log("New marker position:", this.aimingMarker.position);
    }

    /**
     * Verarbeitet Mausklicks während der Zielphase
     */
    handleAimingClick() {
        if (!this.aimingMarker || !this.selectedTank) {
            console.log("Cannot handle aiming click - missing marker or tank");
            return;
        }

        console.log("Handling aiming click");
        
        // Berechne Schussrichtung
        const direction = new THREE.Vector3(
            this.aimingMarker.position.x - this.selectedTank.mesh.position.x,
            0,
            this.aimingMarker.position.z - this.selectedTank.mesh.position.z
        ).normalize();

        console.log("Firing projectile in direction:", direction);

        // Starte Schusssequenz
        this.currentGameState = GAME_STATE.SHOOTING;
        this.fireProjectile(this.selectedTank, direction);
        
        // Entferne Zielpunkt
        this.scene.remove(this.aimingMarker);
        this.aimingMarker = null;
    }

    /**
     * Erstellt und feuert ein Projektil ab
     */
    fireProjectile(tank, direction) {
        console.log("Creating projectile");
        
        const projectile = {
            mesh: this.createProjectileMesh(),
            direction: direction,
            position: tank.mesh.position.clone(),
            speed: this.projectileSpeed,
            owner: tank.mesh.userData.player
        };
        
        projectile.position.y = GAME_CONFIG.TANK_BASE_SIZE.height * 0.8;
        this.activeProjectiles.push(projectile);
        this.scene.add(projectile.mesh);
        
        console.log("Projectile created and added to scene");
        this.soundManager.playTankFire();
    }

    /**
     * Erstellt das Mesh für ein Projektil
     */
    createProjectileMesh() {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * Aktualisiert die Projektile und prüft auf Kollisionen
     */
    updateProjectiles(deltaTime) {
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.activeProjectiles[i];
            
            // Bewege Projektil
            projectile.position.add(
                projectile.direction.clone().multiplyScalar(projectile.speed * deltaTime)
            );
            projectile.mesh.position.copy(projectile.position);
            
            // Prüfe Kollisionen
            if (this.checkProjectileCollisions(projectile)) {
                this.scene.remove(projectile.mesh);
                this.activeProjectiles.splice(i, 1);
            }
        }
    }

    /**
     * Prüft Kollisionen für ein Projektil
     */
    checkProjectileCollisions(projectile) {
        // Prüfe Kollision mit Spielfeldgrenzen
        if (Math.abs(projectile.position.x) > GAME_CONFIG.FIELD_WIDTH/2 ||
            Math.abs(projectile.position.z) > GAME_CONFIG.FIELD_DEPTH/2) {
            this.createExplosion(projectile.position, 0x808080, 0.3);
            return true;
        }
        
        // Prüfe Kollision mit Bergen
        for (const mountain of this.mountains) {
            if (this.checkProjectileMountainCollision(projectile, mountain)) {
                this.createExplosion(projectile.position, 0x808080, 0.5);
                return true;
            }
        }
        
        // Prüfe Kollision mit Bäumen
        for (const tree of this.firTrees) {
            if (this.checkProjectileTreeCollision(projectile, tree)) {
                this.createExplosion(projectile.position, 0x2E7D32, 0.5);
                return true;
            }
        }
        
        // Prüfe Kollision mit Panzern
        for (const tank of this.tanks) {
            if (tank.mesh.userData.player !== projectile.owner && 
                this.checkProjectileTankCollision(projectile, tank)) {
                this.handleTankHit(tank, projectile);
                return true;
            }
        }
        
        return false;
    }

    /**
     * Prüft Kollision zwischen Projektil und Berg
     */
    checkProjectileMountainCollision(projectile, mountain) {
        const mountainBox = new THREE.Box3().setFromObject(mountain);
        const projectileBox = new THREE.Box3().setFromObject(projectile.mesh);
        return mountainBox.intersectsBox(projectileBox);
    }

    /**
     * Prüft Kollision zwischen Projektil und Baum
     */
    checkProjectileTreeCollision(projectile, tree) {
        const treeBox = new THREE.Box3().setFromObject(tree);
        const projectileBox = new THREE.Box3().setFromObject(projectile.mesh);
        return treeBox.intersectsBox(projectileBox);
    }

    /**
     * Prüft Kollision zwischen Projektil und Panzer
     */
    checkProjectileTankCollision(projectile, tank) {
        const tankBox = new THREE.Box3().setFromObject(tank.mesh);
        const projectileBox = new THREE.Box3().setFromObject(projectile.mesh);
        return tankBox.intersectsBox(projectileBox);
    }

    /**
     * Verarbeitet einen Panzertreffer
     */
    handleTankHit(tank, projectile) {
        this.createExplosion(
            projectile.position,
            tank.mesh.userData.originalColor,
            1.0
        );
        
        // Entferne Panzer
        const tankIndex = this.tanks.indexOf(tank);
        if (tankIndex > -1) {
            this.tanks.splice(tankIndex, 1);
        }
        this.scene.remove(tank.mesh);
        
        this.soundManager.playExplosion();
        this.checkGameOver();
    }

    /**
     * Wechselt den aktiven Spieler
     * Aktualisiert den Spielzustand und prüft auf Rundenende
     */
    switchPlayer() {
        const oldPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.currentGameState = GAME_STATE.SELECT_TANK;
        this.soundManager.playPlayerSwitch();
        
        // Reset Auswahl
        if (this.selectedTank) {
            this.selectedTank.mesh.userData.selectionGlow = 0;
            this.selectedTank.mesh.children.forEach(c => {
                if (c.material && c.material.emissive) {
                    c.material.emissive.set(0x000000);
                }
            });
            this.selectedTank = null;
        }
        
        if (this.tankAwaitingEndTurnClick) {
            this.soundManager.playTurretSweep(false);
            this.tankAwaitingEndTurnClick = null;
        }

        // Prüfe Rundenende
        const tanksOfOldPlayer = this.tanks.filter(t => t.mesh.userData.player === oldPlayer);
        const oldPlayerAllTanksMoved = tanksOfOldPlayer.length > 0 && 
            tanksOfOldPlayer.every(t => t.mesh.userData.movedThisTurn);

        const tanksOfNewPlayer = this.tanks.filter(t => t.mesh.userData.player === this.currentPlayer);
        const newPlayerAllTanksMoved = tanksOfNewPlayer.length > 0 && 
            tanksOfNewPlayer.every(t => t.mesh.userData.movedThisTurn);

        if (oldPlayerAllTanksMoved && newPlayerAllTanksMoved) {
            this.updateTurnInfoWithMessage(`Neue Runde für alle! Spieler ${this.currentPlayer} beginnt.`);
            this.tanks.forEach(tank => {
                tank.mesh.userData.movedThisTurn = false;
            });
        } else {
            this.updateTurnInfo();
        }
        
        this.checkGameOver();
    }

    /**
     * Aktualisiert die Spieler-Punktestände in der UI
     */
    updateScoresUI() {
        this.scorePlayer1Elem.textContent = `Spieler 1 (Rot): ${this.scores.player1}`;
        this.scorePlayer2Elem.textContent = `Spieler 2 (Orange): ${this.scores.player2}`;
    }

    /**
     * Aktualisiert die Spielinformationen in der UI
     * Zeigt den aktuellen Spielzustand und Spieler an
     */
    updateTurnInfo() {
        if (this.currentGameState === GAME_STATE.INITIAL) {
            this.turnInfoElem.textContent = "Warte auf Spielstart...";
            return;
        }
        
        if (this.currentGameState === GAME_STATE.GAME_OVER) {
            this.turnInfoElem.textContent = "Spiel beendet!";
            return;
        }
        
        let message = `Spieler ${this.currentPlayer} (${this.currentPlayer === 1 ? "Rot" : "Orange"}) ist am Zug: `;
        
        switch (this.currentGameState) {
            case GAME_STATE.SELECT_TANK:
                const tanksOfCurrentPlayer = this.tanks.filter(t => t.mesh.userData.player === this.currentPlayer);
                const allTanksMovedThisGrandRound = tanksOfCurrentPlayer.length > 0 && 
                    tanksOfCurrentPlayer.every(t => t.mesh.userData.movedThisTurn);
                
                if (tanksOfCurrentPlayer.length === 0) {
                    message += "Keine Panzer mehr!";
                } else if (allTanksMovedThisGrandRound && 
                    this.tanks.filter(t => t.mesh.userData.player !== this.currentPlayer && 
                    !t.mesh.userData.movedThisTurn).length === 0) {
                    message += "Alle Panzer haben agiert. Neue Runde beginnt gleich...";
                } else if (allTanksMovedThisGrandRound) {
                    message += "Alle Panzer haben agiert. Warte auf Gegner.";
                } else {
                    message += "Panzer auswählen.";
                }
                break;
                
            case GAME_STATE.MOVE_TANK:
                message += "Ziel für Panzerbewegung auswählen.";
                break;
                
            case GAME_STATE.TANK_MOVING:
                message += "Panzer bewegt sich...";
                break;
                
            case GAME_STATE.AIMING:
                message += "Ziel für Schuss auswählen.";
                break;
                
            case GAME_STATE.SHOOTING:
                message += "Schuss wird ausgeführt...";
                break;
                
            case GAME_STATE.AWAITING_END_TURN_CLICK:
                message += "Klicken, um Zug zu beenden (Turm rotiert).";
                break;
        }
        
        this.turnInfoElem.textContent = message;
    }

    /**
     * Zeigt eine benutzerdefinierte Nachricht in der UI an
     * @param {string} customMessage - Die anzuzeigende Nachricht
     */
    updateTurnInfoWithMessage(customMessage) {
        this.turnInfoElem.textContent = customMessage;
    }

    /**
     * Prüft, ob das Spiel beendet ist
     * Ermittelt den Gewinner basierend auf den verbleibenden Panzern
     */
    checkGameOver() {
        if (this.currentGameState === GAME_STATE.GAME_OVER) return;
        
        const player1TanksLeft = this.tanks.filter(t => t.mesh.userData.player === 1).length;
        const player2TanksLeft = this.tanks.filter(t => t.mesh.userData.player === 2).length;
        let gameOver = false;
        
        if (player1TanksLeft === 0 && player2TanksLeft > 0) {
            this.displayGameOverMessage("Spieler 2 (Orange) gewinnt!");
            this.soundManager.playGameOverWin();
            gameOver = true;
        } else if (player2TanksLeft === 0 && player1TanksLeft > 0) {
            this.displayGameOverMessage("Spieler 1 (Rot) gewinnt!");
            this.soundManager.playGameOverWin();
            gameOver = true;
        } else if (player1TanksLeft === 0 && player2TanksLeft === 0) {
            this.displayGameOverMessage("Unentschieden!");
            this.soundManager.playGameOverGeneric();
            gameOver = true;
        }
        
        if (gameOver) {
            this.currentGameState = GAME_STATE.GAME_OVER;
        }
    }

    /**
     * Zeigt die Game-Over-Nachricht an
     * @param {string} message - Die Game-Over-Nachricht
     */
    displayGameOverMessage(message) {
        this.gameOverMessageElem.textContent = message;
        this.gameOverMessageElem.style.display = 'block';
        
        if (this.selectedTank) {
            this.selectedTank.mesh.userData.selectionGlow = 0;
            this.selectedTank.mesh.children.forEach(c => {
                if (c.material && c.material.emissive) {
                    c.material.emissive.set(0x000000);
                }
            });
        }
        
        this.selectedTank = null;
        this.tankAwaitingEndTurnClick = null;
        this.soundManager.playTurretSweep(false);
        this.updateTurnInfo();
    }

    /**
     * Hauptanimationsschleife
     * Aktualisiert den Spielzustand und rendert die Szene
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const deltaTime = this.clock.getDelta();

        // Debug-Ausgabe für Spielzustand
        if (this.currentGameState !== GAME_STATE.GAME_OVER && 
            this.currentGameState !== GAME_STATE.INITIAL) {
            
            // Aktualisiere bewegenden Panzer
            if (this.currentGameState === GAME_STATE.TANK_MOVING && this.selectedTank) {
                if (this.selectedTank.update(deltaTime)) {
                    this.onTankMovementComplete();
                }
            }
            
            // Aktualisiere Zielpunkt
            if (this.currentGameState === GAME_STATE.AIMING && this.aimingMarker) {
                console.log("Animation loop - Current game state:", this.currentGameState);
                console.log("Animation loop - GAME_STATE.AIMING:", GAME_STATE.AIMING);
                console.log("Animation loop - States match:", this.currentGameState === GAME_STATE.AIMING);
                console.log("Aiming marker exists:", !!this.aimingMarker);
                console.log("Selected tank exists:", !!this.selectedTank);
                this.updateAimingMarker(deltaTime);
            }
            
            // Aktualisiere Projektile
            if (this.currentGameState === GAME_STATE.SHOOTING) {
                this.updateProjectiles(deltaTime);
                
                // Wenn keine Projektile mehr aktiv sind, wechsle zum nächsten Spieler
                if (this.activeProjectiles.length === 0) {
                    this.selectedTank.mesh.userData.movedThisTurn = true;
                    this.tankAwaitingEndTurnClick = this.selectedTank;
                    this.currentGameState = GAME_STATE.AWAITING_END_TURN_CLICK;
                    this.soundManager.playTurretSweep(true);
                    this.selectedTank = null;
                    this.updateTurnInfo();
                }
            }
            
            // Aktualisiere Turmrotation
            if (this.currentGameState === GAME_STATE.AWAITING_END_TURN_CLICK && 
                this.tankAwaitingEndTurnClick) {
                this.tankAwaitingEndTurnClick.updateTurretSweep(deltaTime);
            }
            
            // Aktualisiere Auswahlglühen
            if (this.selectedTank) {
                this.selectedTank.updateSelectionGlow(deltaTime);
            }
        }

        // Aktualisiere Explosionen
        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            if (this.activeExplosions[i].update(deltaTime)) {
                this.activeExplosions[i].dispose();
                this.activeExplosions.splice(i, 1);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Erstellt eine organische Bodentextur
     * Generiert eine prozedural erzeugte Textur für die Spielfläche
     * @returns {THREE.Texture} Die erzeugte Textur
     */
    createOrganicGroundTexture() {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Basis-Farbe
        ctx.fillStyle = `rgb(${50 + Math.random()*10}, ${40 + Math.random()*10}, ${30 + Math.random()*10})`;
        ctx.fillRect(0, 0, size, size);
        
        // Erzeuge verschiedene Texturschichten
        for (let k = 0; k < 3; k++) {
            const patchSize = 20 + k * 15;
            const numPatches = Math.floor(size*size / (patchSize*patchSize * 2));
            
            for (let i = 0; i < numPatches; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const w = Math.random() * patchSize + patchSize / 2;
                const h = Math.random() * patchSize + patchSize / 2;
                const angle = Math.random() * Math.PI * 2;
                const r_off = (Math.random() - 0.5) * 30;
                const g_off = (Math.random() - 0.5) * 30;
                const b_off = (Math.random() - 0.5) * 30;
                const alpha = 0.1 + Math.random() * 0.2;
                
                ctx.save();
                ctx.translate(x + w/2, y + h/2);
                ctx.rotate(angle);
                ctx.fillStyle = `rgba(${50+r_off}, ${45+g_off}, ${35+b_off}, ${alpha})`;
                ctx.fillRect(-w/2, -h/2, w, h);
                ctx.restore();
            }
        }
        
        // Füge Kieselsteine hinzu
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const pebbleSize = Math.random() * 2 + 0.5;
            const shade = 30 + Math.random() * 40;
            ctx.fillStyle = `rgba(${shade},${shade - 5},${shade - 10}, ${0.3 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(x, y, pebbleSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(GAME_CONFIG.FIELD_WIDTH / 30, GAME_CONFIG.FIELD_DEPTH / 30);
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        
        return texture;
    }

    /**
     * Erstellt eine Bergtextur
     * Generiert eine prozedural erzeugte Textur für die Berge
     * @returns {THREE.Texture} Die erzeugte Textur
     */
    createMountainTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Basis-Felsfarbe
        const baseRockR = 60 + Math.random() * 30;
        const baseRockG = 55 + Math.random() * 30;
        const baseRockB = 50 + Math.random() * 30;
        
        context.fillStyle = `rgb(${baseRockR},${baseRockG},${baseRockB})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Erzeuge Felschichten
        const numLayers = 6 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < numLayers; i++) {
            const y = (i / numLayers) * canvas.height + 
                     (Math.random() - 0.5) * (canvas.height / numLayers) * 0.4;
            const layerHeight = (canvas.height / numLayers) * (0.2 + Math.random() * 0.5);
            const r = Math.max(0, Math.min(255, baseRockR + (Math.random() - 0.5) * 50));
            const g = Math.max(0, Math.min(255, baseRockG + (Math.random() - 0.5) * 50));
            const b = Math.max(0, Math.min(255, baseRockB + (Math.random() - 0.5) * 50));
            
            context.fillStyle = `rgba(${r},${g},${b}, ${0.5 + Math.random() * 0.4})`;
            context.beginPath();
            context.moveTo(0, y);
            
            for (let x_coord = 0; x_coord < canvas.width; x_coord += 15) {
                context.lineTo(
                    x_coord + (Math.random() - 0.5) * 8,
                    y + (Math.random() - 0.5) * layerHeight * 0.4
                );
            }
            
            context.lineTo(canvas.width, y + (Math.random() - 0.5) * 8);
            context.lineTo(canvas.width, y + layerHeight + (Math.random() - 0.5) * 8);
            context.lineTo(0, y + layerHeight + (Math.random() - 0.5) * 8);
            context.closePath();
            context.fill();
        }
        
        // Füge Risse hinzu
        for (let i = 0; i < 1500; i++) {
            const crack_x = Math.random() * canvas.width;
            const crack_y = Math.random() * canvas.height;
            const shade = Math.floor(Math.random() * 25);
            context.fillStyle = `rgba(${shade},${shade},${shade}, ${0.15 + Math.random() * 0.35})`;
            context.fillRect(crack_x, crack_y, Math.random() * 4 + 1, Math.random() * 4 + 1);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Erstellt ein Tannenbaum-Mesh
     * Generiert ein 3D-Modell eines Tannenbaums
     * @returns {THREE.Group} Die Tannenbaum-Gruppe
     */
    createFirTreeMesh() {
        const treeGroup = new THREE.Group();
        
        // Stamm
        const trunkHeight = GAME_CONFIG.TANK_BASE_SIZE.height * 0.8;
        const trunkRadius = GAME_CONFIG.TANK_BASE_SIZE.width * 0.1;
        const trunkMat = new THREE.MeshStandardMaterial({
            color: 0x5C3A21,
            roughness: 0.8
        });
        
        const trunkGeo = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // Nadeln
        const leavesMat = new THREE.MeshStandardMaterial({
            color: 0x2E7D32,
            roughness: 0.7,
            flatShading: true
        });
        
        let currentHeight = trunkHeight;
        const numLeafSections = 3 + Math.floor(Math.random() * 2);
        let baseLeafRadius = GAME_CONFIG.TANK_BASE_SIZE.width * 0.4;
        
        for (let i = 0; i < numLeafSections; i++) {
            const leafHeight = (GAME_CONFIG.TANK_BASE_SIZE.height * 2.5 + 1) * 1.5 / numLeafSections;
            const leafRadius = baseLeafRadius * (1 - i * 0.2);
            const leafGeo = new THREE.ConeGeometry(leafRadius, leafHeight, 6 + Math.floor(Math.random()*2));
            const leaves = new THREE.Mesh(leafGeo, leavesMat);
            leaves.position.y = currentHeight + leafHeight / 2 - i*0.2;
            leaves.castShadow = true;
            treeGroup.add(leaves);
            currentHeight += leafHeight * 0.7;
            baseLeafRadius *= 0.85;
        }
        
        return treeGroup;
    }

    /**
     * Handler für Fenstergrößenänderungen
     * Passt Kamera und Renderer an die neue Fenstergröße an
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createExplosion(position, color, scale) {
        const explosion = new Explosion(position, color, scale);
        this.activeExplosions.push(explosion);
        this.scene.add(explosion.mesh);
        return explosion;
    }

    /**
     * Initialisiert den SoundManager
     */
    initSoundManager() {
        this.soundManager = new SoundManager();
        this.soundManager.init();
    }

    /**
     * Spielt den Schuss-Sound ab
     */
    playTankFire() {
        if (this.soundManager) {
            this.soundManager.playTankFire();
        }
    }
} 