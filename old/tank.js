import { GAME_CONFIG } from './config.js';

export class Tank {
    constructor(color, player, position, rotation) {
        this.mesh = this.createTankMesh(color);
        this.mesh.position.copy(position);
        this.mesh.rotation.y = rotation;
        
        this.mesh.userData = {
            id: `p${player}_tank_${Math.random().toString(36).substr(2, 9)}`,
            player: player,
            originalColor: color.clone(),
            isMoving: false,
            moveTarget: null,
            targetRotationY: null,
            maxMove: GAME_CONFIG.MAX_TANK_MOVE_DISTANCE,
            movedThisTurn: false,
            selectionGlow: 0
        };
    }

    createTankMesh(color) {
        const tankGroup = new THREE.Group();
        
        // Tank Body
        const bodyMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.3
        });
        
        const bodyGeo = new THREE.BoxGeometry(
            GAME_CONFIG.TANK_BASE_SIZE.width,
            GAME_CONFIG.TANK_BASE_SIZE.height,
            GAME_CONFIG.TANK_BASE_SIZE.depth * 0.9
        );
        
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = GAME_CONFIG.TANK_BASE_SIZE.height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        tankGroup.add(body);

        // Turret
        const turretColor = new THREE.Color(color).offsetHSL(0, 0.05, -0.1);
        const turretMat = new THREE.MeshStandardMaterial({
            color: turretColor,
            roughness: 0.4,
            metalness: 0.4
        });
        
        const turretGeo = new THREE.CylinderGeometry(
            GAME_CONFIG.TANK_BASE_SIZE.width * 0.35,
            GAME_CONFIG.TANK_BASE_SIZE.width * 0.4,
            GAME_CONFIG.TANK_BASE_SIZE.height * 0.8,
            16
        );
        
        const turret = new THREE.Mesh(turretGeo, turretMat);
        turret.position.y = body.position.y + GAME_CONFIG.TANK_BASE_SIZE.height / 2 + 
                          (GAME_CONFIG.TANK_BASE_SIZE.height * 0.8) / 2 - 0.1;
        turret.castShadow = true;
        tankGroup.add(turret);
        tankGroup.userData.turret = turret;

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(
            GAME_CONFIG.TANK_BASE_SIZE.width * 0.07,
            GAME_CONFIG.TANK_BASE_SIZE.width * 0.09,
            GAME_CONFIG.TANK_BASE_SIZE.depth * 0.7,
            8
        );
        
        const barrel = new THREE.Mesh(barrelGeo, turretMat.clone());
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = GAME_CONFIG.TANK_BASE_SIZE.depth * 0.35;
        barrel.castShadow = true;
        turret.add(barrel);
        tankGroup.userData.barrel = barrel;

        // Tracks
        this.addTracks(tankGroup);

        return tankGroup;
    }

    addTracks(tankGroup) {
        const trackMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.2
        });

        const wheelRadius = GAME_CONFIG.TANK_BASE_SIZE.height * 0.35;
        const wheelDepth = GAME_CONFIG.TANK_BASE_SIZE.width * 0.15;
        const numWheels = 4;
        const wheelSpacing = (GAME_CONFIG.TANK_BASE_SIZE.depth * 0.8) / (numWheels - 1);

        for (let side = -1; side <= 1; side += 2) {
            const trackSideGroup = new THREE.Group();
            trackSideGroup.position.x = (GAME_CONFIG.TANK_BASE_SIZE.width / 2 + wheelDepth / 2) * side;
            trackSideGroup.position.y = wheelRadius - GAME_CONFIG.TANK_BASE_SIZE.height * 0.1;

            // Wheels
            for (let i = 0; i < numWheels; i++) {
                const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelDepth, 12);
                const wheel = new THREE.Mesh(wheelGeo, trackMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.z = -(GAME_CONFIG.TANK_BASE_SIZE.depth * 0.8) / 2 + i * wheelSpacing;
                wheel.castShadow = true;
                trackSideGroup.add(wheel);
            }

            // Track Belt
            const trackBeltGeo = new THREE.BoxGeometry(
                wheelDepth * 1.1,
                wheelRadius * 2.2,
                GAME_CONFIG.TANK_BASE_SIZE.depth * 0.9
            );
            const trackBelt = new THREE.Mesh(trackBeltGeo, trackMat);
            trackBelt.position.z = 0;
            trackSideGroup.add(trackBelt);

            tankGroup.add(trackSideGroup);
        }
    }

    update(deltaTime) {
        if (this.mesh.userData.isMoving && this.mesh.userData.moveTarget) {
            const target = this.mesh.userData.moveTarget;
            const speed = 8.0;

            if (this.mesh.position.distanceTo(target) > 0.15) {
                const direction = target.clone().sub(this.mesh.position).normalize();
                this.mesh.position.add(direction.clone().multiplyScalar(speed * deltaTime));
                this.mesh.position.y = Math.sin(performance.now() * 0.02) * 0.05;
            } else {
                this.mesh.position.copy(target);
                this.mesh.position.y = 0;
                this.mesh.userData.isMoving = false;
                this.mesh.userData.moveTarget = null;
                this.mesh.userData.movedThisTurn = true;
                return true; // Movement complete
            }
        }
        return false;
    }

    updateSelectionGlow(deltaTime) {
        if (this.mesh.userData.selectionGlow > 0) {
            const intensity = (Math.sin(performance.now() * 0.008) * 0.4 + 0.6) * 
                            this.mesh.userData.selectionGlow;
            
            this.mesh.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.copy(GAME_CONFIG.SELECTED_TANK_EMISSIVE)
                        .multiplyScalar(intensity);
                }
            });
        }
    }

    updateTurretSweep(deltaTime) {
        if (this.mesh.userData.turret) {
            this.mesh.userData.turret.rotation.y += GAME_CONFIG.TURRET_SWEEP_SPEED * deltaTime;
            if (this.mesh.userData.turret.rotation.y > Math.PI * 2) {
                this.mesh.userData.turret.rotation.y -= Math.PI * 2;
            }
        }
    }
} 