// AnimationSystem.js - Enhanced animation management with attack animations
// Part of BattleChess2000 modularization

export class AnimationSystem {
    constructor(coordinateSystem) {
        this.coordinateSystem = coordinateSystem;
        this.animations = [];
        this.particles = [];
        this.damageNumbers = [];
        this.renderCallback = null;
    }

    hasActiveAnimations() {
        return this.animations.length > 0 || this.particles.length > 0 || this.damageNumbers.length > 0;
    }

    clearAll() {
        this.animations = [];
        this.particles = [];
        this.damageNumbers = [];
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

        // Draw damage numbers
        this.damageNumbers.forEach(dmg => {
            const alpha = dmg.alpha || Math.max(0, 1 - dmg.age / (dmg.lifetime || 2000));
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.lineWidth = 2;
            ctx.strokeText(dmg.damage.toString(), dmg.x, dmg.y);
            ctx.fillText(dmg.damage.toString(), dmg.x, dmg.y);
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

        // Trigger impact particles
        this.triggerParticles(toPos.x, toPos.y, 5, weaponAdvantage > 1.0 ? '#FFD700' : '#FF6B6B');

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
}