import { GAME_CONFIG, GAME_STATE } from '../config.js';
import { Tank } from '../game/Tank.js';
import { Explosion } from '../game/Explosion.js';
import { SoundManager } from '../audio/SoundManager.js';
import { UIManager } from '../ui/UIManager.js';
import { GameState } from '../utils/GameState.js';
import { InputManager } from '../utils/InputManager.js';
import { Renderer } from '../rendering/Renderer.js';
import { Camera } from '../rendering/Camera.js';
import { Scene } from '../rendering/Scene.js';

export class Game {
    /**
     * Initialisiert ein neues Spiel
     */
    constructor() {
        // Core-Komponenten
        this.renderer = new Renderer();
        this.camera = new Camera();
        this.scene = new Scene(this.renderer.getRenderer());
        this.gameState = new GameState();
        this.inputManager = new InputManager();
        this.uiManager = new UIManager();
        this.soundManager = new SoundManager();
        
        // Spielobjekte
        this.tanks = [];
        this.mountains = [];
        this.firTrees = [];
        this.activeExplosions = [];
        this.gamePlatform = null;
        
        this.audioStarted = false;
        this.init();
    }

    /**
     * Initialisiert alle Spielkomponenten
     */
    init() {
        this.setupPlatform();
        this.createTanks();
        this.createMountains();
        this.createFirTrees();
        this.createClouds();
        this.setupEventListeners();
    }

    /**
     * Richtet die Spielfläche ein
     */
    setupPlatform() {
        this.gamePlatform = this.scene.createPlatform();
    }

    /**
     * Erstellt die Panzer für beide Spieler
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
            
            const mountainTexture = Textures.createMountainTexture();
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
     */
    createClouds() {
        this.scene.createClouds();
    }

    /**
     * Richtet alle Event-Listener ein
     */
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('mousedown', this.onDocumentMouseDown.bind(this));
        document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this));
        document.addEventListener('mouseup', this.onDocumentMouseUp.bind(this));
        document.addEventListener('keydown', this.onDocumentKeyDown.bind(this));
        document.addEventListener('keyup', this.onDocumentKeyUp.bind(this));
        document.addEventListener('wheel', this.onDocumentMouseWheel.bind(this));
        this.uiManager.addStartListener(this.startGameAudio.bind(this));
    }

    /**
     * Startet die Audiowiedergabe
     */
    startGameAudio() {
        if (!this.audioStarted) {
            const startAudio = async () => {
                try {
                    await Tone.start();
                    this.audioStarted = true;
                    this.soundManager.init();
                    console.log("Audio context started.");
                    this.uiManager.hideStartMessage();
                    this.gameState.setState(GAME_STATE.SELECT_TANK);
                    this.updateTurnInfo();
                } catch (e) {
                    console.error("Tone.start failed:", e);
                }
            };

            this.uiManager.removeStartListener(startAudio);
            this.uiManager.addStartListener(startAudio);
        }
    }

    /**
     * Handler für Fenstergrößenänderungen
     */
    onWindowResize() {
        this.camera.onWindowResize();
        this.renderer.onWindowResize();
    }

    /**
     * Handler für Mausklick-Ereignisse
     */
    onDocumentMouseDown(event) {
        if (this.gameState.getCurrentState() === GAME_STATE.INITIAL) return;
        
        const result = this.inputManager.onMouseDown(event, this.camera.camera);
        
        if (result.isCameraControl) return;
        
        if (this.gameState.getCurrentState() === GAME_STATE.GAME_OVER) return;
        
        // Zug beenden
        if (this.gameState.getCurrentState() === GAME_STATE.AWAITING_END_TURN_CLICK && 
            this.gameState.tankAwaitingEndTurnClick) {
            this.soundManager.playTurretSweep(false);
            this.gameState.tankAwaitingEndTurnClick = null;
            this.switchPlayer();
            return;
        }

        const intersectsPlatform = result.raycaster.intersectObject(this.gamePlatform);

        if (this.gameState.getCurrentState() === GAME_STATE.SELECT_TANK) {
            this.handleSelectTank(result.raycaster);
        } else if (this.gameState.getCurrentState() === GAME_STATE.MOVE_TANK && 
                  this.gameState.selectedTank && 
                  intersectsPlatform.length > 0) {
            this.handleMoveTankOrder(intersectsPlatform[0].point);
        }
    }

    /**
     * Handler für Mausbewegungs-Ereignisse
     */
    onDocumentMouseMove(event) {
        const result = this.inputManager.onMouseMove(event);
        if (result) {
            if (result.isShiftPressed) {
                this.camera.pan(result.deltaX, result.deltaY);
            } else {
                this.camera.rotate(result.deltaX, result.deltaY);
            }
        }
    }

    /**
     * Handler für Mausloslassen-Ereignisse
     */
    onDocumentMouseUp(event) {
        this.inputManager.onMouseUp(event);
    }

    /**
     * Handler für Tastendruck-Ereignisse
     */
    onDocumentKeyDown(event) {
        this.inputManager.onKeyDown(event);
    }

    /**
     * Handler für Tastenloslassen-Ereignisse
     */
    onDocumentKeyUp(event) {
        this.inputManager.onKeyUp(event);
    }

    /**
     * Handler für Mausrad-Ereignisse
     */
    onDocumentMouseWheel(event) {
        if (this.gameState.getCurrentState() === GAME_STATE.INITIAL) return;
        
        event.preventDefault();
        const delta = this.inputManager.onMouseWheel(event);
        this.camera.zoom(delta);
    }

    /**
     * Verarbeitet die Panzerauswahl
     */
    handleSelectTank(raycaster) {
        const tankBodies = this.tanks.map(tank => tank.mesh.children[0]);
        const intersects = raycaster.intersectObjects(tankBodies);
        
        if (intersects.length > 0) {
            const clickedBody = intersects[0].object;
            const clickedTank = this.tanks.find(t => t.mesh.children[0] === clickedBody);
            
            if (clickedTank && clickedTank.mesh.userData.player === this.gameState.getCurrentPlayer()) {
                // Vorherige Auswahl zurücksetzen
                if (this.gameState.selectedTank) {
                    this.gameState.selectedTank.mesh.userData.selectionGlow = 0;
                    this.gameState.selectedTank.mesh.children.forEach(child => {
                        if (child.material && child.material.emissive) {
                            child.material.emissive.set(0x000000);
                        }
                    });
                }
                
                // Neue Auswahl setzen
                this.gameState.selectedTank = clickedTank;
                this.gameState.selectedTank.mesh.userData.selectionGlow = 1;
                this.soundManager.playSelectTank();
                this.gameState.setState(GAME_STATE.MOVE_TANK);
                this.updateTurnInfo();
            }
        }
    }

    /**
     * Verarbeitet die Panzerbewegung
     */
    handleMoveTankOrder(targetPointOnPlatform) {
        if (!this.gameState.selectedTank) return;
        
        const targetPoint = targetPointOnPlatform.clone();
        targetPoint.y = 0;

        const originalPosition = this.gameState.selectedTank.mesh.position.clone();
        let directionToTarget = targetPoint.clone().sub(originalPosition);
        let distanceToTarget = directionToTarget.length();

        // Prüfe, ob der Zug zu kurz ist
        if (distanceToTarget < GAME_CONFIG.MIN_MOVE_THRESHOLD) {
            this.gameState.selectedTank.mesh.userData.movedThisTurn = true;
            this.gameState.selectedTank.mesh.userData.selectionGlow = 0;
            this.gameState.selectedTank.mesh.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.set(0x000000);
                }
            });
            
            this.gameState.tankAwaitingEndTurnClick = this.gameState.selectedTank;
            this.gameState.setState(GAME_STATE.AWAITING_END_TURN_CLICK);
            this.soundManager.playTurretSweep(true);
            this.gameState.selectedTank = null;
            this.updateTurnInfo();
            return;
        }

        // Berechne neue Position und Rotation
        this.gameState.selectedTank.mesh.rotation.y = Math.atan2(directionToTarget.x, directionToTarget.z);
        let moveDistance = Math.min(distanceToTarget, this.gameState.selectedTank.mesh.userData.maxMove);
        directionToTarget.normalize();
        this.gameState.selectedTank.mesh.userData.moveTarget = originalPosition.clone()
            .add(directionToTarget.multiplyScalar(moveDistance));
        this.gameState.selectedTank.mesh.userData.moveTarget.y = 0;

        // Kollisionserkennung
        const destinationBox = new THREE.Box3();
        const tankBodySize = new THREE.Vector3(
            GAME_CONFIG.TANK_BASE_SIZE.width,
            GAME_CONFIG.TANK_BASE_SIZE.height * 2,
            GAME_CONFIG.TANK_BASE_SIZE.depth
        );
        
        destinationBox.setFromCenterAndSize(
            new THREE.Vector3(
                this.gameState.selectedTank.mesh.userData.moveTarget.x,
                GAME_CONFIG.TANK_BASE_SIZE.height,
                this.gameState.selectedTank.mesh.userData.moveTarget.z
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
            this.uiManager.showMessage("Ungültiger Zug: Ziel blockiert!");
            setTimeout(() => this.updateTurnInfo(), 2000);
            return;
        }

        // Starte Bewegung
        this.gameState.selectedTank.mesh.userData.isMoving = true;
        this.gameState.selectedTank.mesh.userData.selectionGlow = 0;
        this.gameState.selectedTank.mesh.children.forEach(child => {
            if (child.material && child.material.emissive) {
                child.material.emissive.set(0x000000);
            }
        });
        
        this.soundManager.startTankEngine();
        this.gameState.setState(GAME_STATE.TANK_MOVING);
        this.updateTurnInfo();
    }

    /**
     * Verarbeitet Kollisionen
     */
    handleTankCollision(collidingTank, objectType) {
        console.log(`KOLLISION! Panzer ${collidingTank.mesh.userData.id} kollidierte mit ${objectType}.`);
        this.soundManager.playExplosion();
        this.createExplosion(
            collidingTank.mesh.position.clone(),
            collidingTank.mesh.userData.originalColor,
            1.0
        );

        // Entferne Panzer
        const tankIndex = this.tanks.indexOf(collidingTank);
        if (tankIndex > -1) {
            this.tanks.splice(tankIndex, 1);
        }
        this.scene.remove(collidingTank.mesh);

        // Reset Spielzustand
        collidingTank.mesh.userData.isMoving = false;
        if (this.gameState.selectedTank === collidingTank) {
            this.gameState.selectedTank = null;
        }
        if (this.gameState.tankAwaitingEndTurnClick === collidingTank) {
            this.soundManager.playTurretSweep(false);
            this.gameState.tankAwaitingEndTurnClick = null;
        }

        this.soundManager.stopTankEngine();
        this.checkGameOver();
        this.switchPlayer();
    }

    /**
     * Erstellt eine Explosion
     */
    createExplosion(position, baseColor, scale) {
        const explosion = new Explosion(position, baseColor, scale);
        this.activeExplosions.push(explosion);
        this.scene.add(explosion.particleSystem);
    }

    /**
     * Wechselt den aktiven Spieler
     */
    switchPlayer() {
        const newRound = this.gameState.switchPlayer(this.tanks);
        this.soundManager.playPlayerSwitch();
        
        if (newRound) {
            this.uiManager.showMessage(`Neue Runde für alle! Spieler ${this.gameState.getCurrentPlayer()} beginnt.`);
        }
        
        this.updateTurnInfo();
        this.checkGameOver();
    }

    /**
     * Aktualisiert die Spielinformationen
     */
    updateTurnInfo() {
        this.uiManager.updateTurnInfo(
            this.gameState.getCurrentPlayer(),
            this.gameState.getCurrentState(),
            this.tanks
        );
    }

    /**
     * Prüft, ob das Spiel beendet ist
     */
    checkGameOver() {
        const gameOverMessage = this.gameState.checkGameOver(this.tanks);
        if (gameOverMessage) {
            this.uiManager.showGameOverMessage(gameOverMessage);
            if (gameOverMessage.includes("gewinn")) {
                this.soundManager.playGameOverWin();
            } else {
                this.soundManager.playGameOverGeneric();
            }
        }
    }

    /**
     * Hauptanimationsschleife
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const deltaTime = this.scene.getDeltaTime();

        if (this.gameState.getCurrentState() !== GAME_STATE.GAME_OVER && 
            this.gameState.getCurrentState() !== GAME_STATE.INITIAL) {
            
            // Aktualisiere bewegenden Panzer
            if (this.gameState.getCurrentState() === GAME_STATE.TANK_MOVING && 
                this.gameState.selectedTank) {
                if (this.gameState.selectedTank.update(deltaTime)) {
                    this.soundManager.playTankMoveEnd();
                    this.gameState.tankAwaitingEndTurnClick = this.gameState.selectedTank;
                    this.gameState.setState(GAME_STATE.AWAITING_END_TURN_CLICK);
                    this.soundManager.playTurretSweep(true);
                    this.gameState.selectedTank = null;
                    this.updateTurnInfo();
                }
            }
            
            // Aktualisiere Turmrotation
            if (this.gameState.getCurrentState() === GAME_STATE.AWAITING_END_TURN_CLICK && 
                this.gameState.tankAwaitingEndTurnClick) {
                this.gameState.tankAwaitingEndTurnClick.updateTurretSweep(deltaTime);
            }
            
            // Aktualisiere Auswahlglühen
            if (this.gameState.selectedTank) {
                this.gameState.selectedTank.updateSelectionGlow(deltaTime);
            }
        }

        // Aktualisiere Explosionen
        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            if (this.activeExplosions[i].update(deltaTime)) {
                this.activeExplosions[i].dispose();
                this.activeExplosions.splice(i, 1);
            }
        }

        this.renderer.render(this.scene.scene, this.camera.camera);
    }
} 