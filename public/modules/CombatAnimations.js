// CombatAnimations.js - Advanced combat animations with death sequences and blood effects
// Part of BattleChess2000 modularization - ULTRATHINK implementation from commit 047013a

export class CombatAnimations {
    constructor(coordinateSystem) {
        this.coordinateSystem = coordinateSystem;
        this.deathAnimations = [];
        this.hurtAnimations = [];
        this.bloodPools = [];
        this.weaponDrops = [];
        this.corpses = [];
    }

    hasActiveAnimations() {
        return this.deathAnimations.length > 0 ||
               this.hurtAnimations.length > 0;
    }

    clearAll() {
        this.deathAnimations = [];
        this.hurtAnimations = [];
        this.bloodPools = [];
        this.weaponDrops = [];
        this.corpses = [];
    }

    checkForAttackAnimations(oldState, newState, animationSystem) {
        console.log('🔍 checkForAttackAnimations started');
        console.log('📊 Board comparison - oldState vs newState');

        // Compare each unit's HP to detect attacks and deaths
        for (let i = 0; i < 16; i++) {
            const oldUnit = oldState.board[i];
            const newUnit = newState.board[i];

            // Check for unit death (unit existed, now it's gone)
            if (oldUnit && !newUnit) {
                // Find who killed this unit by looking for units that just acted
                for (let j = 0; j < 16; j++) {
                    const attacker = newState.board[j];
                    const oldAttacker = oldState.board[j];

                    if (attacker && oldAttacker &&
                        !oldAttacker.hasAttackedThisTurn && attacker.hasAttackedThisTurn) {

                        console.log(`💀 DEATH ANIMATION: ${oldUnit.type} killed by ${attacker.weapon} at position ${i}`);

                        // Trigger epic death animation
                        this.triggerDeathAnimation(i, oldUnit.type, attacker.weapon);
                        console.log(`🎭 Death animation triggered for ${oldUnit.type}`);

                        if (animationSystem) {
                            const pos = this.coordinateSystem.getVisualPosition(i);
                            animationSystem.triggerDamageNumber(
                                pos.x + 50, pos.y + 50, oldUnit.currentHp
                            );
                            animationSystem.triggerParticles(
                                pos.x + 50, pos.y + 50, 10, '#ff0000'
                            );
                        }
                        break;
                    }
                }
            }
            // Check for damage (but unit survives)
            else if (oldUnit && newUnit && oldUnit.currentHp > newUnit.currentHp) {
                const damage = oldUnit.currentHp - newUnit.currentHp;

                // Find who attacked by looking for units that just acted
                for (let j = 0; j < 16; j++) {
                    const attacker = newState.board[j];
                    const oldAttacker = oldState.board[j];

                    if (attacker && oldAttacker &&
                        !oldAttacker.hasAttackedThisTurn && attacker.hasAttackedThisTurn) {

                        // Calculate weapon advantage for visual feedback
                        const weaponAdvantage = this.calculateWeaponAdvantage(
                            attacker.weapon, oldUnit.weapon
                        );

                        console.log(`⚔️ ATTACK ANIMATION: ${attacker.weapon} vs ${oldUnit.weapon}, damage: ${damage}`);

                        // Trigger attack animation (non-lethal)
                        if (animationSystem) {
                            animationSystem.triggerAttackAnimation(j, i, damage, weaponAdvantage);
                            console.log(`🎯 Attack animation triggered: ${attacker.weapon} -> ${oldUnit.type}`);
                        }

                        // Also trigger hurt animation for emotional feedback
                        this.triggerHurtAnimation(i, damage, attacker.weapon);
                        break;
                    }
                }
            }
        }
    }

    calculateWeaponAdvantage(attackerWeapon, defenderWeapon) {
        // Weapon Triangle: SWORD > BOW > LANCE > SWORD
        const advantages = {
            'SWORD': { 'BOW': 1.2, 'LANCE': 1.0, 'SWORD': 1.0 },
            'BOW': { 'LANCE': 1.2, 'SWORD': 1.0, 'BOW': 1.0 },
            'LANCE': { 'SWORD': 1.2, 'BOW': 1.0, 'LANCE': 1.0 }
        };
        return advantages[attackerWeapon][defenderWeapon] || 1.0;
    }

    // Trigger death animation based on KILLER WEAPON (Diablo-style)
    triggerDeathAnimation(victimIndex, victimType, killerWeapon) {
        const victimPos = this.coordinateSystem.getVisualPosition(victimIndex);
        const tileSize = this.coordinateSystem.tileSize;
        const centerX = victimPos.x + tileSize / 2;
        const centerY = victimPos.y + tileSize / 2;

        let phases = [];
        let totalDuration = 2000; // 2 seconds

        // 3 Weapon-specific death types (regardless of victim)
        if (killerWeapon === 'SWORD') {
            // SWORD DEATH: Swift slice, side fall, blood spray
            phases = [
                { type: 'sword_slice', duration: 300 },
                { type: 'sword_blood', duration: 400 },
                { type: 'fall_right', duration: 600 },
                { type: 'final_twitch', duration: 700 }
            ];
        } else if (killerWeapon === 'BOW') {
            // BOW DEATH: Arrow impact, stumble back, collapse
            phases = [
                { type: 'arrow_impact', duration: 200 },
                { type: 'stumble_back', duration: 500 },
                { type: 'collapse_back', duration: 800 },
                { type: 'arrow_stuck', duration: 500 }
            ];
        } else if (killerWeapon === 'LANCE') {
            // LANCE DEATH: Pierce through, lift up, slam down
            phases = [
                { type: 'pierce_through', duration: 400 },
                { type: 'lift_impaled', duration: 600 },
                { type: 'slam_down', duration: 600 },
                { type: 'lance_remove', duration: 400 }
            ];
        }

        this.deathAnimations.push({
            x: centerX,
            y: centerY,
            victimIndex: victimIndex,
            victimType: victimType,
            killerWeapon: killerWeapon,
            phases: phases,
            currentPhase: 0,
            age: 0,
            totalDuration: totalDuration,
            progress: 0,
            phaseStartTime: Date.now()
        });

        // Create massive blood spray immediately for SWORD
        let bloodCount = killerWeapon === 'SWORD' ? 15 : 8;
        for (let i = 0; i < bloodCount; i++) {
            this.bloodPools.push({
                x: centerX + (Math.random() - 0.5) * 60,
                y: centerY + (Math.random() - 0.5) * 60,
                size: Math.random() * 15 + 5,
                opacity: 0.8 + Math.random() * 0.2,
                shape: killerWeapon === 'SWORD' ? 'spray' : 'pool',
                age: 0
            });
        }

        // Drop weapons (equipment falls off)
        const weaponType = this.getUnitWeapon(victimType);
        this.weaponDrops.push({
            x: centerX + (Math.random() - 0.5) * 25,
            y: centerY + (Math.random() - 0.5) * 25,
            weaponType: weaponType,
            rotation: Math.random() * Math.PI * 2,
            age: 0,
            wobbleSpeed: (Math.random() - 0.5) * 0.2
        });

        // Add corpse after death animation completes
        setTimeout(() => {
            this.corpses.push({
                x: centerX,
                y: centerY,
                victimType: victimType,
                killedBy: killerWeapon,
                rotation: killerWeapon === 'LANCE' ? 0 : (Math.random() - 0.5) * 0.4
            });
        }, totalDuration);
    }

    triggerHurtAnimation(targetIndex, damage, killerWeapon) {
        const targetPos = this.coordinateSystem.getVisualPosition(targetIndex);
        const tileSize = this.coordinateSystem.tileSize;
        const centerX = targetPos.x + tileSize / 2;
        const centerY = targetPos.y + tileSize / 2;

        // Create hurt overlay
        this.hurtAnimations.push({
            x: centerX,
            y: centerY,
            unitIndex: targetIndex,
            age: 0,
            duration: 1000, // 1 second of hurt expression
            damage: damage,
            killerWeapon: killerWeapon,
            intensity: 1.0
        });

        // Small blood splatter for hurt (non-lethal)
        const bloodCount = Math.min(damage / 10, 5);
        for (let i = 0; i < bloodCount; i++) {
            this.bloodPools.push({
                x: centerX + (Math.random() - 0.5) * 30,
                y: centerY + (Math.random() - 0.5) * 30,
                size: Math.random() * 8 + 2,
                opacity: 0.6,
                shape: 'splatter',
                age: 0
            });
        }
    }

    getUnitWeapon(unitType) {
        const weapons = {
            'SCOUT': 'SWORD',
            'ARCHER': 'BOW',
            'KNIGHT': 'LANCE'
        };
        return weapons[unitType] || 'SWORD';
    }

    drawCombatEffects(ctx) {
        this.update();

        // Draw blood pools (permanent until cleaned)
        this.drawBloodPools(ctx);

        // Draw corpses (permanent battlefield decoration)
        this.drawCorpses(ctx);

        // Draw weapon drops
        this.drawWeaponDrops(ctx);

        // Draw death animations (dramatic sequences)
        this.drawDeathAnimations(ctx);

        // Draw hurt overlays (pain expressions)
        this.drawHurtOverlays(ctx);
    }

    drawBloodPools(ctx) {
        this.bloodPools.forEach(pool => {
            ctx.globalAlpha = pool.opacity;

            if (pool.shape === 'spray') {
                // Sword spray pattern - dramatic streaks
                ctx.fillStyle = '#8B0000';
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const length = pool.size * (0.5 + Math.random() * 0.5);
                    const width = pool.size * 0.2;

                    ctx.save();
                    ctx.translate(pool.x, pool.y);
                    ctx.rotate(angle);
                    ctx.fillRect(-width/2, 0, width, length);
                    ctx.restore();
                }
            } else if (pool.shape === 'splatter') {
                // Hurt splatter - small irregular spots
                ctx.fillStyle = '#A0522D';
                for (let i = 0; i < 4; i++) {
                    const offsetX = (Math.random() - 0.5) * pool.size;
                    const offsetY = (Math.random() - 0.5) * pool.size;
                    ctx.beginPath();
                    ctx.arc(pool.x + offsetX, pool.y + offsetY, pool.size * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Regular pool - death pool
                ctx.fillStyle = '#8B0000';
                ctx.beginPath();
                // Irregular pool shape
                ctx.moveTo(pool.x, pool.y - pool.size);
                for (let i = 0; i < 10; i++) {
                    const angle = (i / 10) * Math.PI * 2;
                    const radius = pool.size * (0.7 + Math.random() * 0.3);
                    const x = pool.x + Math.cos(angle) * radius;
                    const y = pool.y + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
            }

            ctx.globalAlpha = 1.0;
        });
    }

    drawCorpses(ctx) {
        this.corpses.forEach(corpse => {
            ctx.save();
            ctx.translate(corpse.x, corpse.y);
            ctx.rotate(corpse.rotation);

            // Draw corpse based on unit type and death cause
            if (corpse.killedBy === 'BOW') {
                // Arrow sticking out
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.lineTo(15, 0);
                ctx.stroke();

                // Arrow fletching
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(-18, -2, 6, 4);
            }

            // Base corpse body
            this.drawCorpseByType(ctx, corpse.victimType, corpse.killedBy);

            ctx.restore();
        });
    }

    drawCorpseByType(ctx, victimType, killedBy) {
        if (victimType === 'SCOUT') {
            this.drawCorpseScout(ctx, 0, 0, killedBy);
        } else if (victimType === 'ARCHER') {
            this.drawCorpseArcher(ctx, 0, 0, killedBy);
        } else if (victimType === 'KNIGHT') {
            this.drawCorpseKnight(ctx, 0, 0, killedBy);
        }
    }

    drawCorpseScout(ctx, x, y, killedBy) {
        // Collapsed scout body
        ctx.fillStyle = '#666666';
        ctx.fillRect(x - 10, y - 5, 20, 10);

        // Scout's broken sword nearby
        if (killedBy !== 'SWORD') { // If not sword vs sword
            ctx.strokeStyle = '#C0C0C0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 15, y - 8);
            ctx.lineTo(x + 25, y + 2);
            ctx.stroke();
        }

        // Arrow through body if killed by bow
        if (killedBy === 'BOW') {
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 12, y);
            ctx.lineTo(x + 12, y);
            ctx.stroke();
        }
    }

    drawCorpseArcher(ctx, x, y, killedBy) {
        // Collapsed archer with broken bow
        ctx.fillStyle = '#555555';
        ctx.fillRect(x - 12, y - 6, 24, 12);

        // Broken bow pieces
        if (killedBy === 'LANCE' || killedBy === 'SWORD') {
            for (let i = 0; i < 3; i++) {
                const pieceX = x + (i - 1) * 8;
                const pieceY = y + (Math.random() - 0.5) * 10;
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(pieceX - 3, pieceY);
                ctx.lineTo(pieceX + 3, pieceY);
                ctx.stroke();
            }
        }
    }

    drawCorpseKnight(ctx, x, y, killedBy) {
        // Heavy knight corpse - larger
        ctx.fillStyle = '#444444';
        ctx.fillRect(x - 15, y - 8, 30, 16);

        // Shattered shield pieces around
        for (let i = 0; i < 4; i++) {
            const shardX = x + (Math.random() - 0.5) * 30;
            const shardY = y + (Math.random() - 0.5) * 20;
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(shardX - 2, shardY - 2, 4, 4);
        }
    }

    drawWeaponDrops(ctx) {
        this.weaponDrops.forEach(weapon => {
            ctx.save();
            ctx.translate(weapon.x, weapon.y);
            ctx.rotate(weapon.rotation);

            if (weapon.weaponType === 'SWORD') {
                // Dropped sword
                ctx.strokeStyle = '#C0C0C0';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(0, 10);
                ctx.stroke();

                // Hilt
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-4, 8);
                ctx.lineTo(4, 8);
                ctx.stroke();
            } else if (weapon.weaponType === 'BOW') {
                // Broken bow
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 8, -Math.PI/3, Math.PI/3, false);
                ctx.stroke();
            } else if (weapon.weaponType === 'LANCE') {
                // Dropped lance
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(0, 12);
                ctx.stroke();

                // Lance tip
                ctx.fillStyle = '#C0C0C0';
                ctx.beginPath();
                ctx.arc(0, -12, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });
    }

    drawDeathAnimations(ctx) {
        this.deathAnimations.forEach(deathAnim => {
            const currentPhase = deathAnim.phases[deathAnim.currentPhase];
            if (!currentPhase) return;

            const phaseProgress = Math.min(1, deathAnim.age / currentPhase.duration);

            ctx.save();
            ctx.translate(deathAnim.x, deathAnim.y);

            // Apply phase-specific transformations
            if (currentPhase.type.includes('fall') || currentPhase.type.includes('slide')) {
                ctx.rotate(phaseProgress * Math.PI / 4);
            }

            // Draw dying unit with current phase effects
            this.drawDyingEmotionalWarrior(ctx, 0, 0, deathAnim.victimType, currentPhase, phaseProgress, deathAnim.killerWeapon);

            ctx.restore();
        });
    }

    drawDyingEmotionalWarrior(ctx, x, y, unitType, currentPhase, progress, killerWeapon) {
        // Base dying warrior - simplified version showing pain
        const size = 25;

        // Draw with pain/death expression
        if (currentPhase.type.includes('grab') || currentPhase.type.includes('fall')) {
            // Show hands clutching wound
            this.drawDyingBody(ctx, x, y, size, progress);
        }

        // Weapon-specific death effects
        if (killerWeapon === 'SWORD' && currentPhase.type === 'sword_blood') {
            // Blood fountain effect
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const distance = progress * 20;
                const bloodX = x + Math.cos(angle) * distance;
                const bloodY = y + Math.sin(angle) * distance;

                // Blood droplet
                // this.ctx.fillStyle = `rgba(139, 0, 0, ${1 - progress})`;
                // this.ctx.beginPath();
                // this.ctx.arc(bloodX, bloodY, 3, 0, Math.PI * 2);
                // this.ctx.fill();
            }
        }

        // Draw specific death by unit type
        if (unitType === 'SCOUT') {
            this.drawDyingScout(x, y, progress, currentPhase, killerWeapon);
        } else if (unitType === 'ARCHER') {
            this.drawDyingArcher(x, y, progress, currentPhase, killerWeapon);
        } else if (unitType === 'KNIGHT') {
            this.drawDyingKnight(x, y, progress, currentPhase, killerWeapon);
        }
    }

    drawDyingBody(ctx, x, y, size, progress) {
        // Simple dying body representation
        for (let i = 0; i < 4; i++) {
            const offsetX = (Math.random() - 0.5) * size * progress;
            const offsetY = (Math.random() - 0.5) * size * progress;

            ctx.fillStyle = `rgba(139, 0, 0, ${1 - progress})`;
            ctx.beginPath();
            ctx.arc(x + offsetX, y + offsetY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawDyingScout(x, y, progress, phase, killedBy) {
        // Scout death details
        if (phase.type === 'recoil') {
            // Scout recoiling from hit
            const recoilDistance = progress * 10;
            x -= recoilDistance;
        }

        // Scout's final moments - fast and desperate
        // Additional scout-specific death animation details would go here
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = progress * 15;

            // Movement lines showing desperate struggle
            // More implementation details...
        }
    }

    drawDyingArcher(x, y, progress, phase, killedBy) {
        // Archer death details
        if (phase.type === 'bow_break') {
            // Show bow snapping
            // Implementation details...
        }

        // Archer-specific death sequence
        // More implementation details...
    }

    drawDyingKnight(x, y, progress, phase, killedBy) {
        // Knight death details
        if (phase.type === 'weapon_drop') {
            // Heavy equipment falling
            // Implementation details...
        }

        // Knight-specific death sequence with armor
        for (let i = 0; i < 6; i++) {
            const shardX = x + (Math.random() - 0.5) * 20 * progress;
            const shardY = y + (Math.random() - 0.5) * 20 * progress;

            // Armor pieces flying off
            // More implementation details...
        }
    }

    drawHurtOverlays(ctx) {
        this.hurtAnimations.forEach(hurt => {
            const unit = this.gameState?.board[hurt.unitIndex];
            if (!unit) return; // Unit might have died

            const alpha = hurt.intensity;
            const pulseEffect = Math.sin(hurt.age / 100) * 0.3 + 0.7;

            // Pain overlay effect
            ctx.globalAlpha = alpha * pulseEffect * 0.5;
            ctx.fillStyle = '#FFFF00'; // Yellow pain flash
            ctx.fillRect(hurt.x - 25, hurt.y - 25, 50, 50);

            // Weapon-specific hurt effects
            if (hurt.killerWeapon === 'SWORD') {
                // Sword cut - red slash mark
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 3;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(hurt.x - 15, hurt.y - 10);
                ctx.lineTo(hurt.x + 15, hurt.y + 10);
                ctx.stroke();
            } else if (hurt.killerWeapon === 'BOW') {
                // Arrow graze - small blood trail
                for (let i = 0; i < 3; i++) {
                    const trailX = hurt.x + i * 3;
                    const trailY = hurt.y;
                    ctx.fillStyle = '#8B0000';
                    ctx.globalAlpha = alpha * (1 - i * 0.3);
                    ctx.beginPath();
                    ctx.arc(trailX, trailY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (hurt.killerWeapon === 'LANCE') {
                // Lance puncture - deep wound effect
                ctx.fillStyle = '#8B0000';
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(hurt.x, hurt.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1.0;
        });
    }

    update() {
        const currentTime = Date.now();

        // Update death animations
        this.deathAnimations = this.deathAnimations.filter(deathAnim => {
            deathAnim.age += 16;
            deathAnim.progress = deathAnim.age / deathAnim.totalDuration;

            // Check if we need to advance to next phase
            const phaseIndex = Math.floor(deathAnim.progress * deathAnim.phases.length);
            if (phaseIndex !== deathAnim.currentPhase && phaseIndex < deathAnim.phases.length) {
                deathAnim.currentPhase = phaseIndex;
                deathAnim.phaseStartTime = currentTime;
            }

            return deathAnim.progress < 1.0;
        });

        // Update hurt animations (temporary pain expressions)
        this.hurtAnimations = this.hurtAnimations.filter(hurt => {
            hurt.age += 16;
            hurt.intensity = Math.max(0, 1 - hurt.age / hurt.duration);
            return hurt.age < hurt.duration;
        });

        // Update weapon drops (they wobble and settle)
        this.weaponDrops.forEach(weapon => {
            if (weapon.age < 1000) { // First second: wobble
                weapon.age += 16;
                weapon.rotation += weapon.wobbleSpeed;
                weapon.wobbleSpeed *= 0.95; // Damping
            }
        });

        // Blood pools fade very slowly
        this.bloodPools.forEach(pool => {
            pool.opacity = Math.max(0, pool.opacity - 0.0005);
        });
        this.bloodPools = this.bloodPools.filter(pool => pool.opacity > 0.1);
    }

    setGameState(gameState) {
        this.gameState = gameState;
    }

    clear() {
        this.deathAnimations = [];
        this.hurtAnimations = [];
        this.bloodPools = [];
        this.weaponDrops = [];
        this.corpses = [];
    }
}