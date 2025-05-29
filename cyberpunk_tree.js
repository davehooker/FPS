class CyberpunkTree {
    constructor(model) {
        this.model = model;
        this.initialPositions = new Map();
        this.initialMatrices = new Map();
        this.time = 0;
        
        // Cyberpunk parameters
        this.glitchIntensity = 0;
        this.glitchTimer = 0;
        this.dataFlowSpeed = 2.0;
        this.neonPulse = 0;
        this.corruptionZones = [];
        
        // Energy field parameters
        this.energyField = new THREE.Vector3(0, 1, 0);
        this.plasmaIntensity = 1.0;
        
        // Digital wind simulation
        this.digitalWind = {
            direction: new THREE.Vector2(1, 0).normalize(),
            strength: 0.5,
            frequency: 3.0,
            dataStreams: []
        };
        
        // Holographic flicker
        this.hologramPhase = 0;
        this.flickerIntensity = 0;
        
        this.saveInitialState();
        this.initializeCyberpunkEffects();
    }

    saveInitialState() {
        this.model.updateWorldMatrix(true, true);
        
        this.model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const positions = child.geometry.attributes.position.array;
                this.initialPositions.set(child, Float32Array.from(positions));
                this.initialMatrices.set(child, child.matrixWorld.clone());
                
                // Add emissive material properties for neon glow
                if (child.material) {
                    child.material.emissive = new THREE.Color(0x9D00FF); // Purple neon
                    child.material.emissiveIntensity = 0.2;
                }
            }
        });
    }

    initializeCyberpunkEffects() {
        // Generate random corruption zones
        for (let i = 0; i < 5; i++) {
            this.corruptionZones.push({
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * 20,
                    Math.random() * 15,
                    (Math.random() - 0.5) * 20
                ),
                radius: Math.random() * 5 + 2,
                intensity: Math.random() * 0.5 + 0.5,
                frequency: Math.random() * 2 + 1
            });
        }
        
        // Initialize data streams
        for (let i = 0; i < 10; i++) {
            this.digitalWind.dataStreams.push({
                offset: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.5 + 0.5,
                amplitude: Math.random() * 0.3 + 0.1
            });
        }
    }

    updateGlitch(deltaTime) {
        this.glitchTimer += deltaTime;
        
        // Random glitch spikes
        if (Math.random() < 0.01) { // 1% chance per frame
            this.glitchIntensity = Math.random() * 2 + 1;
            this.flickerIntensity = Math.random();
        }
        
        // Decay glitch
        this.glitchIntensity *= 0.92;
        this.flickerIntensity *= 0.95;
        
        // Periodic glitch waves
        const glitchWave = Math.sin(this.glitchTimer * 8) * 0.1;
        this.glitchIntensity += Math.max(0, glitchWave);
    }

    updateHologram(deltaTime) {
        this.hologramPhase += deltaTime * 10;
        this.neonPulse = Math.sin(this.time * 4) * 0.5 + 0.5;
        
        // Update material emissive intensity
        this.model.traverse((child) => {
            if (child.isMesh && child.material) {
                const basePulse = 0.2 + this.neonPulse * 0.3;
                const flicker = this.flickerIntensity * Math.random();
                child.material.emissiveIntensity = basePulse + flicker;
            }
        });
    }

    calculateDigitalDistortion(worldPos, baseOffset) {
        let distortion = new THREE.Vector3(0, 0, 0);
        
        // Data corruption zones
        for (const zone of this.corruptionZones) {
            const distance = worldPos.distanceTo(zone.position);
            if (distance < zone.radius) {
                const influence = 1 - (distance / zone.radius);
                const corruption = Math.sin(this.time * zone.frequency + distance) * influence * zone.intensity;
                
                distortion.x += corruption * 0.5;
                distortion.y += Math.abs(corruption) * 0.3;
                distortion.z += corruption * 0.5;
            }
        }
        
        // Digital wind with data streams
        let streamEffect = 0;
        for (const stream of this.digitalWind.dataStreams) {
            streamEffect += Math.sin(this.time * stream.speed + baseOffset + stream.offset) * stream.amplitude;
        }
        
        distortion.x += this.digitalWind.direction.x * streamEffect * this.digitalWind.strength;
        distortion.z += this.digitalWind.direction.y * streamEffect * this.digitalWind.strength;
        
        // Glitch displacement
        if (this.glitchIntensity > 0.1) {
            const glitchOffset = new THREE.Vector3(
                (Math.random() - 0.5) * this.glitchIntensity,
                (Math.random() - 0.5) * this.glitchIntensity * 0.5,
                (Math.random() - 0.5) * this.glitchIntensity
            );
            distortion.add(glitchOffset);
        }
        
        // Holographic scan lines
        const scanLine = Math.sin(worldPos.y * 10 + this.hologramPhase) * 0.02;
        distortion.x += scanLine;
        
        return distortion;
    }

    update(deltaTime) {
        this.time += deltaTime;
        this.updateGlitch(deltaTime);
        this.updateHologram(deltaTime);
        
        // Update energy field
        this.energyField.x = Math.sin(this.time * 0.7) * 0.3;
        this.energyField.z = Math.cos(this.time * 0.5) * 0.3;
        
        const tempVector = new THREE.Vector3();
        const tempMatrix = new THREE.Matrix4();
        const invMatrix = new THREE.Matrix4();

        this.model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const positions = child.geometry.attributes.position.array;
                const originalPositions = this.initialPositions.get(child);
                const originalMatrix = this.initialMatrices.get(child);

                child.updateWorldMatrix(true, false);
                invMatrix.copy(child.matrixWorld).invert();

                for (let i = 0; i < positions.length; i += 3) {
                    // Get original vertex position in world space
                    tempVector.set(
                        originalPositions[i],
                        originalPositions[i + 1],
                        originalPositions[i + 2]
                    );
                    tempVector.applyMatrix4(originalMatrix);

                    const worldY = tempVector.y;
                    const heightFactor = Math.pow(worldY / 10, 1.2);
                    
                    // Calculate cyberpunk distortion
                    const distortion = this.calculateDigitalDistortion(tempVector, worldY * 0.1);
                    
                    // Energy field influence (stronger at top)
                    const energyInfluence = heightFactor * this.plasmaIntensity;
                    tempVector.x += this.energyField.x * energyInfluence;
                    tempVector.z += this.energyField.z * energyInfluence;
                    
                    // Apply digital distortion
                    tempVector.add(distortion.multiplyScalar(heightFactor));
                    
                    // Transform back to local space
                    tempVector.applyMatrix4(invMatrix);

                    positions[i] = tempVector.x;
                    positions[i + 1] = tempVector.y;
                    positions[i + 2] = tempVector.z;
                }

                child.geometry.attributes.position.needsUpdate = true;
                
                // Randomly flicker geometry visibility for hologram effect
                if (this.flickerIntensity > 0.5 && Math.random() < this.flickerIntensity * 0.1) {
                    child.visible = Math.random() > 0.3;
                } else {
                    child.visible = true;
                }
            }
        });
        
        // Update digital wind
        this.digitalWind.direction.x += (Math.random() - 0.5) * 0.1 * deltaTime;
        this.digitalWind.direction.y += (Math.random() - 0.5) * 0.1 * deltaTime;
        this.digitalWind.direction.normalize();
    }
    
    // Method to trigger a data burst effect
    triggerDataBurst(position, intensity = 1.0) {
        this.corruptionZones.push({
            position: position.clone(),
            radius: intensity * 10,
            intensity: intensity * 2,
            frequency: 10,
            temporary: true,
            lifetime: 2.0
        });
    }
    
    // Method to change neon color
    setNeonColor(color) {
        this.model.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(color);
            }
        });
    }
}

// Usage example:
const cyberpunkTree = new CyberpunkTree(treeModel);

// Set custom neon colors
cyberpunkTree.setNeonColor(0xFF00FF); // Magenta
// cyberpunkTree.setNeonColor(0x00FFFF); // Cyan
// cyberpunkTree.setNeonColor(0x9D00FF); // Purple (default)

// In your animation loop:
function animate(time) {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    cyberpunkTree.update(deltaTime);
    
    // Example: Trigger random data bursts
    if (Math.random() < 0.001) {
        const burstPos = new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            Math.random() * 10,
            (Math.random() - 0.5) * 20
        );
        cyberpunkTree.triggerDataBurst(burstPos, Math.random() + 0.5);
    }
    
    renderer.render(scene, camera);
}