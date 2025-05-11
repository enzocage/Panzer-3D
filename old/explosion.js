export class Explosion {
    constructor(position, baseColor, scale = 1.0) {
        this.particleCount = Math.floor(30 * scale);
        this.life = 0.6 + scale * 0.4;
        this.startTime = performance.now();
        this.createParticleSystem(position, baseColor, scale);
    }

    createParticleSystem(position, baseColor, scale) {
        const particlesGeo = new THREE.BufferGeometry();
        const posArray = new Float32Array(this.particleCount * 3);
        const colorsArray = new Float32Array(this.particleCount * 3);
        
        const fireColors = [
            new THREE.Color(0xff4500),
            new THREE.Color(0xffa500),
            new THREE.Color(0xffff00),
            baseColor
        ];

        // Initialize positions and colors
        for (let i = 0; i < this.particleCount; i++) {
            posArray[i * 3 + 0] = 0;
            posArray[i * 3 + 1] = 0;
            posArray[i * 3 + 2] = 0;

            const particleColor = fireColors[Math.floor(Math.random() * fireColors.length)];
            colorsArray[i * 3 + 0] = particleColor.r;
            colorsArray[i * 3 + 1] = particleColor.g;
            colorsArray[i * 3 + 2] = particleColor.b;
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 1.2 * scale,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            vertexColors: true,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(particlesGeo, particleMaterial);
        this.particleSystem.position.copy(position);

        // Initialize velocities
        this.velocities = [];
        for (let i = 0; i < this.particleCount; i++) {
            const speed = (Math.random() * 8 + 4) * scale;
            this.velocities.push(
                (Math.random() - 0.5) * speed,
                (Math.random() * 0.8) * speed,
                (Math.random() - 0.5) * speed
            );
        }
    }

    update(deltaTime) {
        const timeElapsed = (performance.now() - this.startTime) / 1000;
        const progress = timeElapsed / this.life;

        if (progress >= 1) {
            return true; // Explosion is done
        }

        this.particleSystem.material.opacity = 1.0 - progress;
        this.particleSystem.material.size = (1.0 - progress) * (1.5 * (this.life / 1.0));

        const positions = this.particleSystem.geometry.attributes.position.array;
        
        for (let j = 0; j < positions.length / 3; j++) {
            positions[j * 3 + 0] += this.velocities[j * 3 + 0] * deltaTime;
            positions[j * 3 + 1] += this.velocities[j * 3 + 1] * deltaTime - (2.0 * progress * deltaTime);
            positions[j * 3 + 2] += this.velocities[j * 3 + 2] * deltaTime;
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        return false;
    }

    dispose() {
        this.particleSystem.geometry.dispose();
        this.particleSystem.material.dispose();
    }
} 