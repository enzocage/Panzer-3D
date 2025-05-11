import { GAME_CONFIG } from '../config.js';

export class Textures {
    /**
     * Erstellt eine organische Bodentextur
     * @param {THREE.WebGLRenderer} renderer - Der WebGL-Renderer
     * @returns {THREE.Texture} Die erzeugte Textur
     */
    static createOrganicGroundTexture(renderer) {
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
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        
        return texture;
    }

    /**
     * Erstellt eine Bergtextur
     * @returns {THREE.Texture} Die erzeugte Textur
     */
    static createMountainTexture() {
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
} 