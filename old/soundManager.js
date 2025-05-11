export class SoundManager {
    constructor() {
        this.masterVolume = new Tone.Volume(-10).toDestination();
        this.initialized = false;
        this.synth = null;
        this.noiseSynth = null;
        this.polySynth = null;
        this.tankEngineRumble = null;
        this.tankEngineClatter = null;
        this.tankEngineRumbleLoop = null;
        this.tankEngineClatterLoop = null;
        this.explosionSynths = [];
        this.turretSweepSynth = null;
        this.turretSweepFilter = null;
    }

    init() {
        if (this.initialized) return;

        this.synth = new Tone.Synth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.3 }
        }).connect(this.masterVolume);

        this.noiseSynth = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0 }
        }).connect(this.masterVolume);

        this.polySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
        }).connect(this.masterVolume);

        // Tank Engine Setup
        this.setupTankEngine();
        
        // Explosion Synths Setup
        this.setupExplosionSynths();
        
        // Turret Sweep Setup
        this.setupTurretSweep();

        this.initialized = true;
    }

    setupTankEngine() {
        this.tankEngineRumble = new Tone.Noise("brown");
        const rumbleFilter = new Tone.AutoFilter({
            frequency: "4n",
            baseFrequency: 60,
            octaves: 2,
            depth: 0.5
        }).connect(this.masterVolume);
        
        this.tankEngineRumble.connect(rumbleFilter);
        this.tankEngineRumble.volume.value = -15;
        
        this.tankEngineRumbleLoop = new Tone.Loop(time => {
            this.tankEngineRumble.start(time).stop(time + 0.3 + Math.random() * 0.1);
        }, "6n");
        
        rumbleFilter.start();

        this.tankEngineClatter = new Tone.Noise("white");
        const clatterFiltEnv = new Tone.FrequencyEnvelope({
            attack: 0.01,
            decay: 0.05,
            sustain: 0,
            release: 0.1,
            baseFrequency: 2000,
            octaves: 1.5,
            exponent: 2
        });
        
        const clatterFilter = new Tone.Filter(800, "bandpass").connect(this.masterVolume);
        clatterFilter.Q.value = 3;
        clatterFiltEnv.connect(clatterFilter.frequency);
        this.tankEngineClatter.connect(clatterFilter);
        this.tankEngineClatter.volume.value = -25;
        
        this.tankEngineClatterLoop = new Tone.Loop(time => {
            clatterFiltEnv.triggerAttackRelease("32n", time);
            this.tankEngineClatter.start(time).stop(time + 0.02 + Math.random() * 0.02);
        }, "24n");
    }

    setupExplosionSynths() {
        for(let i = 0; i < 3; i++) {
            const membrane = new Tone.MembraneSynth({
                pitchDecay: 0.03,
                octaves: 8,
                envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.8 }
            }).connect(this.masterVolume);
            
            const metal = new Tone.MetalSynth({
                frequency: 150,
                envelope: { attack: 0.001, decay: 0.2, release: 0.1 },
                harmonicity: 3.1,
                modulationIndex: 16,
                octaves: 0.5
            }).connect(this.masterVolume);
            
            const noise = new Tone.NoiseSynth({
                noise: { type: 'pink' },
                envelope: { attack: 0.005, decay: 0.5, sustain: 0 }
            }).connect(this.masterVolume);
            
            this.explosionSynths.push({membrane, metal, noise, lastUsed: 0});
        }
    }

    setupTurretSweep() {
        this.turretSweepSynth = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.1 },
            volume: -22
        });

        this.turretSweepFilter = new Tone.AutoFilter({
            frequency: "1n",
            baseFrequency: 400,
            octaves: 2,
            depth: 0.5,
            wet: 0.7
        }).connect(this.masterVolume);
        
        this.turretSweepSynth.connect(this.turretSweepFilter);
    }

    playSelectTank() {
        if (!this.initialized) return;
        this.synth.triggerAttackRelease("E4", "16n", Tone.now());
    }

    playTurretSweep(start) {
        if (!this.initialized) return;
        
        if (start) {
            this.turretSweepSynth.triggerAttack(Tone.now());
            if(this.turretSweepFilter.state !== "started") {
                this.turretSweepFilter.start(Tone.now());
            }
        } else {
            this.turretSweepSynth.triggerRelease(Tone.now());
            if(this.turretSweepFilter.state === "started") {
                this.turretSweepFilter.stop(Tone.now() + 0.2);
            }
        }
    }

    startTankEngine() {
        if (!this.initialized) return;
        
        if (this.tankEngineRumbleLoop.state !== "started") {
            this.tankEngineRumbleLoop.start(0);
        }
        if (this.tankEngineClatterLoop.state !== "started") {
            this.tankEngineClatterLoop.start(0);
        }
        if (Tone.Transport.state !== "started") {
            Tone.Transport.start();
        }
    }

    stopTankEngine() {
        if (!this.initialized) return;
        
        if (this.tankEngineRumbleLoop.state === "started") {
            this.tankEngineRumbleLoop.stop();
        }
        if (this.tankEngineClatterLoop.state === "started") {
            this.tankEngineClatterLoop.stop();
        }
    }

    playTankMoveEnd() {
        if (!this.initialized) return;
        this.synth.triggerAttackRelease("C3", "16n", Tone.now() + 0.05);
        this.stopTankEngine();
    }

    playExplosion() {
        if (!this.initialized || this.explosionSynths.length === 0) return;
        
        this.explosionSynths.sort((a,b) => a.lastUsed - b.lastUsed);
        const selectedSynths = this.explosionSynths[0];
        selectedSynths.lastUsed = Tone.now();
        
        selectedSynths.membrane.triggerAttackRelease("G1", "2n", Tone.now(), 1.0);
        selectedSynths.metal.triggerAttack(Tone.now() + 0.05);
        selectedSynths.noise.triggerAttackRelease("1n", Tone.now() + 0.02, 0.8);
    }

    playPlayerSwitch() {
        if (!this.initialized) return;
        this.polySynth.triggerAttackRelease(["C4", "E4", "G4"], "8n", Tone.now());
    }

    playGameOverWin() {
        if (!this.initialized) return;
        this.polySynth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "1n", Tone.now());
    }

    playGameOverGeneric() {
        if (!this.initialized) return;
        this.polySynth.triggerAttackRelease(["A3", "C4", "E4"], "1n", Tone.now());
    }
} 