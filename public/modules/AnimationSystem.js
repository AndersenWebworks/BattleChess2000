// AnimationSystem.js - Enhanced animation management with attack animations
// Part of BattleChess2000 modularization

export class AnimationSystem {
    constructor(coordinateSystem) {
        this.coordinateSystem = coordinateSystem;
        this.animations = [];
        this.particles = [];
        this.damageNumbers = [];
        this.weaponTrails = []; // BRUTAL weapon trails for medieval combat
        this.screenShake = { active: false, intensity: 0, duration: 0, age: 0 };
        this.impactFlashes = []; // Impact flash effects
        this.renderCallback = null;
    }

    hasActiveAnimations() {
        return this.animations.length > 0 || this.particles.length > 0 ||
               this.damageNumbers.length > 0 || this.weaponTrails.length > 0 ||
               this.screenShake.active || this.impactFlashes.length > 0;
    }

    clearAll() {
        this.animations = [];
        this.particles = [];
        this.damageNumbers = [];
        this.weaponTrails = [];
        this.screenShake = { active: false, intensity: 0, duration: 0, age: 0 };
        this.impactFlashes = [];
    }

    update() {
        const currentTime = Date.now();

        // Update active animations
        this.animations = this.animations.filter(anim => {
            anim.progress = (currentTime - anim.startTime) / anim.duration;
            return anim.progress < 1.0;
        });

        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.age += 16; // Assume ~60fps
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3; // Gravity
            particle.alpha = Math.max(0, 1 - particle.age / particle.lifetime);
            return particle.age < particle.lifetime;
        });

        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(dmg => {
            dmg.age += 16;
            dmg.y -= 1; // Float upward
            dmg.alpha = Math.max(0, 1 - dmg.age / dmg.lifetime);
            return dmg.age < dmg.lifetime;
        });

        // Update BRUTAL weapon trails
        this.weaponTrails = this.weaponTrails.filter(trail => {
            trail.age += 16;
            trail.alpha = Math.max(0, 1 - trail.age / trail.lifetime);
            return trail.age < trail.lifetime;
        });

        // Update screen shake (combat impact)
        if (this.screenShake.active) {
            this.screenShake.age += 16;
            this.screenShake.intensity = Math.max(0,
                this.screenShake.intensity * (1 - this.screenShake.age / this.screenShake.duration)
            );
            if (this.screenShake.age >= this.screenShake.duration) {
                this.screenShake.active = false;
            }
        }

        // Update impact flashes
        this.impactFlashes = this.impactFlashes.filter(flash => {
            flash.age += 16;
            flash.alpha = Math.max(0, 1 - flash.age / flash.lifetime);
            return flash.age < flash.lifetime;
        });
    }

    drawAnimations(ctx) {
        this.update();

        // Draw attack animations
        this.animations.forEach(anim => {
            if (anim.type === 'attack') {
                this.drawAttackAnimation(ctx, anim);
            }
        });

        // Draw particles
        this.particles.forEach(particle => {
            ctx.fillStyle = particle.color || `rgba(255, 0, 0, ${particle.alpha || 1})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw BRUTAL weapon trails
        this.drawWeaponTrails(ctx);

        // Draw impact flashes
        this.drawImpactFlashes(ctx);

        // Apply screen shake effect
        this.applyScreenShake(ctx);

        // Draw damage numbers (enhanced medieval style)
        this.damageNumbers.forEach(dmg => {
            const alpha = dmg.alpha || Math.max(0, 1 - dmg.age / (dmg.lifetime || 2000));
            ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
            ctx.strokeStyle = `rgba(139, 0, 0, ${alpha})`;
            ctx.font = 'bold 22px Cinzel';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeText(`-${dmg.damage}`, dmg.x, dmg.y);
            ctx.fillText(`-${dmg.damage}`, dmg.x, dmg.y);
        });
    }

    drawAttackAnimation(ctx, anim) {
        const { fromPos, toPos, weapon, progress } = anim;

        if (weapon === 'SWORD') {
            // Sword slash effect
            const currentPos = {
                x: fromPos.x + (toPos.x - fromPos.x) * Math.min(progress * 2, 1),
                y: fromPos.y + (toPos.y - fromPos.y) * Math.min(progress * 2, 1)
            };

            // Slash trail
            ctx.strokeStyle = `rgba(255, 255, 0, ${1 - progress})`;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(fromPos.x, fromPos.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();

            // Sword blade
            ctx.strokeStyle = `rgba(192, 192, 192, ${1 - progress})`;
            ctx.lineWidth = 4;
            ctx.stroke();

        } else if (weapon === 'BOW') {
            // Arrow flight
            const arrowPos = {
                x: fromPos.x + (toPos.x - fromPos.x) * progress,
                y: fromPos.y + (toPos.y - fromPos.y) * progress
            };

            // Arrow trail
            ctx.strokeStyle = `rgba(139, 69, 19, ${1 - progress})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(arrowPos.x - 10, arrowPos.y);
            ctx.lineTo(arrowPos.x + 10, arrowPos.y);
            ctx.stroke();

            // Arrow head
            ctx.fillStyle = `rgba(192, 192, 192, ${1 - progress})`;
            ctx.beginPath();
            ctx.arc(arrowPos.x, arrowPos.y, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (weapon === 'LANCE') {
            // Lance thrust
            const thrustDistance = 30 * Math.sin(progress * Math.PI);
            const thrustPos = {
                x: fromPos.x + (toPos.x - fromPos.x) * 0.7 + thrustDistance,
                y: fromPos.y + (toPos.y - fromPos.y) * 0.7
            };

            // Lance shaft
            ctx.strokeStyle = `rgba(139, 69, 19, ${1 - progress})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(fromPos.x, fromPos.y);
            ctx.lineTo(thrustPos.x, thrustPos.y);
            ctx.stroke();

            // Lance tip
            ctx.fillStyle = `rgba(192, 192, 192, ${1 - progress})`;
            ctx.beginPath();
            ctx.arc(thrustPos.x, thrustPos.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    triggerDamageNumber(x, y, damage) {
        this.damageNumbers.push({
            x: x,
            y: y,
            damage: damage,
            age: 0,
            lifetime: 2000,
            alpha: 1.0
        });
    }

    triggerParticles(x, y, count, color = '#ff0000') {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 3 + 1,
                color: color,
                age: 0,
                lifetime: 1000 + Math.random() * 1000,
                alpha: 1.0
            });
        }
    }

    // Trigger attack animation when attack happens
    triggerAttackAnimation(attackerIndex, targetIndex, damage, weaponAdvantage) {
        console.log(`🎬 Triggering attack animation: ${attackerIndex} -> ${targetIndex}, damage: ${damage}`);

        const attackerPos = this.coordinateSystem.getVisualPosition(attackerIndex);
        const targetPos = this.coordinateSystem.getVisualPosition(targetIndex);

        // Get tileSize from coordinate system
        const tileSize = this.coordinateSystem.tileSize;

        // Center positions
        const fromPos = {
            x: attackerPos.x + tileSize / 2,
            y: attackerPos.y + tileSize / 2
        };
        const toPos = {
            x: targetPos.x + tileSize / 2,
            y: targetPos.y + tileSize / 2
        };

        const weaponType = this.getWeaponFromIndex(attackerIndex);
        console.log(`🗡️ Animation weapon type: ${weaponType}`);

        // Add attack animation
        this.animations.push({
            type: 'attack',
            fromPos: fromPos,
            toPos: toPos,
            weapon: weaponType,
            damage: damage,
            weaponAdvantage: weaponAdvantage,
            startTime: Date.now(),
            duration: 800,
            progress: 0
        });

        console.log(`✨ Animation added to queue, total animations: ${this.animations.length}`);

        // TRIGGER BRUTAL WEAPON TRAIL
        this.triggerWeaponTrail(fromPos.x, fromPos.y, toPos.x, toPos.y, weaponType);

        // EPIC SCREEN SHAKE for heavy hits
        const shakeIntensity = damage > 15 ? 15 : damage > 10 ? 10 : 5;
        this.triggerScreenShake(shakeIntensity, 400);

        // IMPACT FLASH on contact
        this.triggerImpactFlash(toPos.x, toPos.y, 12);

        // Trigger impact particles (more for brutal weapons)
        const particleCount = weaponType === 'SWORD' ? 8 : weaponType === 'LANCE' ? 12 : 6;
        this.triggerParticles(toPos.x, toPos.y, particleCount, weaponAdvantage > 1.0 ? '#FFD700' : '#FF6B6B');

        // Damage number with advantage coloring
        this.triggerDamageNumber(toPos.x, toPos.y - 20, damage);

        // Trigger render loop through callback
        if (this.animations.length === 1 && this.renderCallback) {
            // Start animation loop if this is the first animation
            this.renderCallback();
        }
    }

    getWeaponFromIndex(unitIndex) {
        if (!this.gameState || !this.gameState.board[unitIndex]) {
            return 'SWORD'; // Fallback
        }

        const unit = this.gameState.board[unitIndex];
        return unit.weapon || 'SWORD';
    }

    setGameState(gameState) {
        this.gameState = gameState;
    }

    setRenderCallback(callback) {
        this.renderCallback = callback;
    }

    clear() {
        this.animations = [];
        this.particles = [];
        this.damageNumbers = [];
    }

    // BRUTAL MEDIEVAL WEAPON TRAIL SYSTEM
    drawWeaponTrails(ctx) {
        this.weaponTrails.forEach(trail => {
            ctx.save();
            ctx.globalAlpha = trail.alpha;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (trail.weapon === 'SWORD') {
                this.drawSwordTrail(ctx, trail);
            } else if (trail.weapon === 'BOW') {
                this.drawArrowTrail(ctx, trail);
            } else if (trail.weapon === 'LANCE') {
                this.drawLanceTrail(ctx, trail);
            }

            ctx.restore();
        });
    }

    drawSwordTrail(ctx, trail) {
        // Brutal bloody sword slash
        const gradient = ctx.createLinearGradient(
            trail.fromX, trail.fromY, trail.toX, trail.toY
        );
        gradient.addColorStop(0, `rgba(192, 192, 192, ${trail.alpha})`); // Silver blade
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${trail.alpha * 0.8})`); // Flash
        gradient.addColorStop(1, `rgba(139, 0, 0, ${trail.alpha * 0.6})`); // Blood

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 8;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(trail.fromX, trail.fromY);
        ctx.lineTo(trail.toX, trail.toY);
        ctx.stroke();

        // Add sparks
        for (let i = 0; i < 3; i++) {
            const sparkX = trail.fromX + (trail.toX - trail.fromX) * Math.random();
            const sparkY = trail.fromY + (trail.toY - trail.fromY) * Math.random();
            ctx.fillStyle = `rgba(255, 255, 0, ${trail.alpha})`;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawArrowTrail(ctx, trail) {
        // Whistling arrow trail
        ctx.strokeStyle = `rgba(139, 69, 19, ${trail.alpha})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#8B4513';
        ctx.shadowBlur = 5;

        ctx.beginPath();
        ctx.moveTo(trail.fromX, trail.fromY);
        ctx.lineTo(trail.toX, trail.toY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(trail.toY - trail.fromY, trail.toX - trail.fromX);
        const headLength = 15;

        ctx.fillStyle = `rgba(139, 69, 19, ${trail.alpha})`;
        ctx.beginPath();
        ctx.moveTo(trail.toX, trail.toY);
        ctx.lineTo(
            trail.toX - headLength * Math.cos(angle - Math.PI / 6),
            trail.toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            trail.toX - headLength * Math.cos(angle + Math.PI / 6),
            trail.toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    drawLanceTrail(ctx, trail) {
        // Powerful lance thrust
        const gradient = ctx.createLinearGradient(
            trail.fromX, trail.fromY, trail.toX, trail.toY
        );
        gradient.addColorStop(0, `rgba(139, 69, 19, ${trail.alpha})`); // Brown shaft
        gradient.addColorStop(0.8, `rgba(160, 82, 45, ${trail.alpha})`); // Lighter wood
        gradient.addColorStop(1, `rgba(192, 192, 192, ${trail.alpha})`); // Metal tip

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 12;
        ctx.shadowColor = '#654321';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.moveTo(trail.fromX, trail.fromY);
        ctx.lineTo(trail.toX, trail.toY);
        ctx.stroke();

        // Power blast at impact
        ctx.fillStyle = `rgba(255, 255, 255, ${trail.alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(trail.toX, trail.toY, 15, 0, Math.PI * 2);
        ctx.fill();
    }

    // EPIC IMPACT FLASHES
    drawImpactFlashes(ctx) {
        this.impactFlashes.forEach(flash => {
            ctx.save();
            ctx.globalAlpha = flash.alpha;

            const size = flash.size * (1 + (1 - flash.alpha));
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 20;

            ctx.beginPath();
            ctx.arc(flash.x, flash.y, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    // SCREEN SHAKE FOR BRUTAL COMBAT
    applyScreenShake(ctx) {
        if (this.screenShake.active) {
            const shakeX = (Math.random() - 0.5) * this.screenShake.intensity;
            const shakeY = (Math.random() - 0.5) * this.screenShake.intensity;
            ctx.translate(shakeX, shakeY);
        }
    }

    // TRIGGER EPIC WEAPON TRAIL
    triggerWeaponTrail(fromX, fromY, toX, toY, weapon) {
        this.weaponTrails.push({
            fromX, fromY, toX, toY,
            weapon: weapon,
            age: 0,
            lifetime: weapon === 'SWORD' ? 800 : weapon === 'BOW' ? 600 : 1000,
            alpha: 1.0
        });
    }

    // TRIGGER SCREEN SHAKE
    triggerScreenShake(intensity = 10, duration = 500) {
        this.screenShake = {
            active: true,
            intensity: intensity,
            duration: duration,
            age: 0
        };
    }

    // TRIGGER IMPACT FLASH
    triggerImpactFlash(x, y, size = 10) {
        this.impactFlashes.push({
            x, y, size,
            age: 0,
            lifetime: 300,
            alpha: 1.0
        });
    }
}