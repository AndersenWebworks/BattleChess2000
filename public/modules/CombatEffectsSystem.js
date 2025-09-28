// CombatEffectsSystem.js - Epic combat visual effects
// Part of BattleChess2000 Visual Polish System

export class CombatEffectsSystem {
    constructor(canvas, coordinateSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.coordinateSystem = coordinateSystem;

        // Screen shake system
        this.screenShake = {
            active: false,
            intensity: 0,
            duration: 0,
            elapsed: 0,
            offsetX: 0,
            offsetY: 0
        };

        // Active effects
        this.impactWaves = [];
        this.damageNumbers = [];
        this.weaponEffects = [];
        this.combatParticles = [];
    }

    // 🎯 COMBAT HIT: Main combat effect trigger
    triggerCombatHit(attackerPos, targetPos, weaponType, damage, isCritical = false) {
        const targetPixelPos = this.coordinateSystem.getVisualPosition(targetPos);
        const centerX = targetPixelPos.x + this.coordinateSystem.tileSize / 2;
        const centerY = targetPixelPos.y + this.coordinateSystem.tileSize / 2;

        // Screen shake based on damage
        const shakeIntensity = Math.min(12, 3 + damage * 0.8);
        const shakeDuration = isCritical ? 400 : 250;
        this.triggerScreenShake(shakeIntensity, shakeDuration);

        // Impact wave
        this.createImpactWave(centerX, centerY, isCritical);

        // Damage number
        this.createDamageNumber(centerX, centerY, damage, isCritical);

        // Weapon-specific effects
        this.createWeaponEffect(attackerPos, targetPos, weaponType, isCritical);

        // Combat particles
        this.createCombatParticles(centerX, centerY, weaponType, isCritical);
    }

    // 💥 SCREEN SHAKE: Physical feedback for hits
    triggerScreenShake(intensity, duration) {
        this.screenShake.active = true;
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
        this.screenShake.elapsed = 0;
    }

    updateScreenShake(deltaTime) {
        if (!this.screenShake.active) return;

        this.screenShake.elapsed += deltaTime;
        const progress = this.screenShake.elapsed / this.screenShake.duration;

        if (progress >= 1) {
            this.screenShake.active = false;
            this.screenShake.offsetX = 0;
            this.screenShake.offsetY = 0;
            return;
        }

        // Decay shake intensity over time
        const currentIntensity = this.screenShake.intensity * (1 - progress);

        // Random shake direction
        const angle = Math.random() * Math.PI * 2;
        this.screenShake.offsetX = Math.cos(angle) * currentIntensity;
        this.screenShake.offsetY = Math.sin(angle) * currentIntensity;
    }

    // 🌊 IMPACT WAVE: Visual ripple effect
    createImpactWave(x, y, isCritical) {
        const wave = {
            x,
            y,
            radius: 0,
            maxRadius: isCritical ? 80 : 50,
            thickness: isCritical ? 8 : 5,
            duration: isCritical ? 600 : 400,
            startTime: Date.now(),
            color: isCritical ? '#ff6b35' : '#d4af37',
            isCritical
        };

        this.impactWaves.push(wave);
    }

    // 💢 DAMAGE NUMBERS: Floating damage display
    createDamageNumber(x, y, damage, isCritical) {
        const number = {
            x: x + (Math.random() - 0.5) * 20,
            y: y - 10,
            vx: (Math.random() - 0.5) * 30,
            vy: -60 - Math.random() * 30,
            damage,
            life: 1.0,
            decay: 0.008,
            scale: isCritical ? 1.5 : 1.0,
            color: isCritical ? '#ff3030' : '#ffff00',
            isCritical,
            startTime: Date.now()
        };

        this.damageNumbers.push(number);
    }

    // ⚔️ WEAPON EFFECTS: Type-specific combat visuals
    createWeaponEffect(attackerPos, targetPos, weaponType, isCritical) {
        const attackerPixel = this.coordinateSystem.getVisualPosition(attackerPos);
        const targetPixel = this.coordinateSystem.getVisualPosition(targetPos);

        const startX = attackerPixel.x + this.coordinateSystem.tileSize / 2;
        const startY = attackerPixel.y + this.coordinateSystem.tileSize / 2;
        const endX = targetPixel.x + this.coordinateSystem.tileSize / 2;
        const endY = targetPixel.y + this.coordinateSystem.tileSize / 2;

        switch (weaponType) {
            case 'SWORD':
                this.createSwordEffect(startX, startY, endX, endY, isCritical);
                break;
            case 'BOW':
                this.createArrowEffect(startX, startY, endX, endY, isCritical);
                break;
            case 'LANCE':
                this.createLanceEffect(startX, startY, endX, endY, isCritical);
                break;
            case 'STAFF':
                this.createMagicEffect(startX, startY, endX, endY, isCritical);
                break;
            default:
                this.createGenericEffect(startX, startY, endX, endY, isCritical);
        }
    }

    createSwordEffect(startX, startY, endX, endY, isCritical) {
        // Sword slash with metal sparks
        const effect = {
            type: 'sword_slash',
            startX, startY, endX, endY,
            progress: 0,
            duration: 200,
            startTime: Date.now(),
            sparks: [],
            isCritical
        };

        // Create metal sparks
        for (let i = 0; i < (isCritical ? 15 : 8); i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 40;

            effect.sparks.push({
                x: endX,
                y: endY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20, // Slight upward bias
                life: 1.0,
                decay: 0.015,
                size: 1 + Math.random() * 2,
                color: '#ffaa00'
            });
        }

        this.weaponEffects.push(effect);
    }

    createArrowEffect(startX, startY, endX, endY, isCritical) {
        // Arrow trail effect
        const effect = {
            type: 'arrow_trail',
            startX, startY, endX, endY,
            progress: 0,
            duration: 150,
            startTime: Date.now(),
            trailParticles: [],
            isCritical
        };

        // Create arrow trail
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.floor(distance / 5);

        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            effect.trailParticles.push({
                x: startX + dx * t,
                y: startY + dy * t,
                life: 1.0 - t * 0.5,
                decay: 0.02,
                size: 2
            });
        }

        this.weaponEffects.push(effect);
    }

    createLanceEffect(startX, startY, endX, endY, isCritical) {
        // Lance thrust with force lines
        const effect = {
            type: 'lance_thrust',
            startX, startY, endX, endY,
            progress: 0,
            duration: 180,
            startTime: Date.now(),
            forceLines: [],
            isCritical
        };

        // Create force impact lines
        for (let i = 0; i < (isCritical ? 8 : 5); i++) {
            const angle = (Math.PI * 2 * i) / (isCritical ? 8 : 5);
            const length = isCritical ? 40 : 25;

            effect.forceLines.push({
                angle,
                length,
                life: 1.0,
                decay: 0.012
            });
        }

        this.weaponEffects.push(effect);
    }

    createMagicEffect(startX, startY, endX, endY, isCritical) {
        // Magic spell with energy particles
        const effect = {
            type: 'magic_blast',
            startX, startY, endX, endY,
            progress: 0,
            duration: 300,
            startTime: Date.now(),
            energyParticles: [],
            isCritical
        };

        // Create energy particles
        for (let i = 0; i < (isCritical ? 20 : 12); i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 30;
            const speed = 30 + Math.random() * 20;

            effect.energyParticles.push({
                x: endX + Math.cos(angle) * radius,
                y: endY + Math.sin(angle) * radius,
                vx: Math.cos(angle) * speed * 0.5,
                vy: Math.sin(angle) * speed * 0.5,
                life: 1.0,
                decay: 0.008,
                size: 2 + Math.random() * 3,
                color: isCritical ? '#ff00ff' : '#9c27b0'
            });
        }

        this.weaponEffects.push(effect);
    }

    createGenericEffect(startX, startY, endX, endY, isCritical) {
        // Generic impact effect
        this.createSwordEffect(startX, startY, endX, endY, isCritical);
    }

    // ✨ COMBAT PARTICLES: Additional hit feedback
    createCombatParticles(x, y, weaponType, isCritical) {
        const particleCount = isCritical ? 15 : 8;

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 30;

            this.combatParticles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 10,
                life: 1.0,
                decay: 0.01,
                size: 1 + Math.random() * 2,
                color: isCritical ? '#ff4444' : '#ffffff',
                gravity: 80
            });
        }
    }

    // 🎨 RENDER ALL EFFECTS
    renderEffects() {
        // Apply screen shake
        this.ctx.save();
        if (this.screenShake.active) {
            this.ctx.translate(this.screenShake.offsetX, this.screenShake.offsetY);
        }

        this.renderImpactWaves();
        this.renderDamageNumbers();
        this.renderWeaponEffects();
        this.renderCombatParticles();

        this.ctx.restore();
    }

    renderImpactWaves() {
        this.impactWaves.forEach((wave, index) => {
            const elapsed = Date.now() - wave.startTime;
            const progress = elapsed / wave.duration;

            if (progress >= 1) {
                this.impactWaves.splice(index, 1);
                return;
            }

            wave.radius = wave.maxRadius * this.easeOutQuart(progress);
            const alpha = (1 - progress) * 0.8;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.strokeStyle = wave.color;
            this.ctx.lineWidth = wave.thickness * (1 - progress * 0.7);
            this.ctx.shadowColor = wave.color;
            this.ctx.shadowBlur = 15;

            this.ctx.beginPath();
            this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.restore();
        });
    }

    renderDamageNumbers() {
        this.damageNumbers.forEach((number, index) => {
            // Update physics
            number.x += number.vx * 0.016;
            number.y += number.vy * 0.016;
            number.vy += 30 * 0.016; // Gravity
            number.life -= number.decay;

            if (number.life <= 0) {
                this.damageNumbers.splice(index, 1);
                return;
            }

            // Render damage number
            this.ctx.save();
            this.ctx.globalAlpha = number.life;
            this.ctx.fillStyle = number.color;
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.font = `bold ${24 * number.scale}px Cinzel, serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Shadow for readability
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;

            // Critical hit styling
            if (number.isCritical) {
                this.ctx.shadowColor = number.color;
                this.ctx.shadowBlur = 15;

                // Pulsing effect for critical hits
                const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 1;
                this.ctx.scale(pulse, pulse);
            }

            this.ctx.strokeText(number.damage.toString(), number.x, number.y);
            this.ctx.fillText(number.damage.toString(), number.x, number.y);

            this.ctx.restore();
        });
    }

    renderWeaponEffects() {
        this.weaponEffects.forEach((effect, index) => {
            const elapsed = Date.now() - effect.startTime;
            const progress = elapsed / effect.duration;

            if (progress >= 1) {
                this.weaponEffects.splice(index, 1);
                return;
            }

            switch (effect.type) {
                case 'sword_slash':
                    this.renderSwordSlash(effect, progress);
                    break;
                case 'arrow_trail':
                    this.renderArrowTrail(effect, progress);
                    break;
                case 'lance_thrust':
                    this.renderLanceThrust(effect, progress);
                    break;
                case 'magic_blast':
                    this.renderMagicBlast(effect, progress);
                    break;
            }
        });
    }

    renderSwordSlash(effect, progress) {
        // Render sword slash line
        this.ctx.save();
        this.ctx.globalAlpha = (1 - progress) * 0.8;
        this.ctx.strokeStyle = effect.isCritical ? '#ff6600' : '#ffaa00';
        this.ctx.lineWidth = effect.isCritical ? 6 : 4;
        this.ctx.shadowColor = effect.isCritical ? '#ff6600' : '#ffaa00';
        this.ctx.shadowBlur = 10;

        this.ctx.beginPath();
        this.ctx.moveTo(effect.startX, effect.startY);
        this.ctx.lineTo(effect.endX, effect.endY);
        this.ctx.stroke();

        // Render sparks
        effect.sparks.forEach(spark => {
            spark.x += spark.vx * 0.016;
            spark.y += spark.vy * 0.016;
            spark.vy += 100 * 0.016; // Gravity
            spark.life -= spark.decay;

            if (spark.life > 0) {
                this.ctx.globalAlpha = spark.life;
                this.ctx.fillStyle = spark.color;
                this.ctx.shadowColor = spark.color;
                this.ctx.shadowBlur = 5;

                this.ctx.beginPath();
                this.ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        this.ctx.restore();
    }

    renderArrowTrail(effect, progress) {
        this.ctx.save();

        effect.trailParticles.forEach(particle => {
            particle.life -= particle.decay;

            if (particle.life > 0) {
                this.ctx.globalAlpha = particle.life;
                this.ctx.fillStyle = '#8b4513';
                this.ctx.shadowColor = '#ffaa00';
                this.ctx.shadowBlur = 3;

                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        this.ctx.restore();
    }

    renderLanceThrust(effect, progress) {
        this.ctx.save();
        this.ctx.globalAlpha = (1 - progress) * 0.7;

        effect.forceLines.forEach(line => {
            line.life -= line.decay;

            if (line.life > 0) {
                this.ctx.strokeStyle = effect.isCritical ? '#ff4444' : '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.shadowColor = this.ctx.strokeStyle;
                this.ctx.shadowBlur = 8;

                const endX = effect.endX + Math.cos(line.angle) * line.length;
                const endY = effect.endY + Math.sin(line.angle) * line.length;

                this.ctx.beginPath();
                this.ctx.moveTo(effect.endX, effect.endY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
        });

        this.ctx.restore();
    }

    renderMagicBlast(effect, progress) {
        this.ctx.save();

        effect.energyParticles.forEach(particle => {
            particle.x += particle.vx * 0.016;
            particle.y += particle.vy * 0.016;
            particle.life -= particle.decay;

            if (particle.life > 0) {
                this.ctx.globalAlpha = particle.life;
                this.ctx.fillStyle = particle.color;
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = 10;

                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        this.ctx.restore();
    }

    renderCombatParticles() {
        this.combatParticles.forEach((particle, index) => {
            particle.x += particle.vx * 0.016;
            particle.y += particle.vy * 0.016;
            particle.vy += particle.gravity * 0.016;
            particle.life -= particle.decay;

            if (particle.life <= 0) {
                this.combatParticles.splice(index, 1);
                return;
            }

            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 5;

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    // 🔄 UPDATE SYSTEM
    update(deltaTime = 16) {
        this.updateScreenShake(deltaTime);
    }

    hasActiveEffects() {
        return this.screenShake.active ||
               this.impactWaves.length > 0 ||
               this.damageNumbers.length > 0 ||
               this.weaponEffects.length > 0 ||
               this.combatParticles.length > 0;
    }

    // 📈 EASING FUNCTIONS
    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    // 🧹 CLEANUP
    clear() {
        this.screenShake.active = false;
        this.impactWaves = [];
        this.damageNumbers = [];
        this.weaponEffects = [];
        this.combatParticles = [];
    }
}