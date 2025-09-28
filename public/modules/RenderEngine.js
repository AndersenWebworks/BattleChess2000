// RenderEngine.js - Enhanced rendering with animation systems
// Part of BattleChess2000 modularization

import { GameData } from './GameData.js';
import { CardAnimationSystem } from './CardAnimationSystem.js';
import { CombatEffectsSystem } from './CombatEffectsSystem.js';

export class RenderEngine {
    constructor(canvas, coordinateSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.coordinateSystem = coordinateSystem;
        this.gameState = null;
        this.selectedUnitIndex = null;
        this.validMoves = null;
        this.validTargets = null;
        this.tileSize = 0;

        // External renderers
        this.unitRenderer = null;
        this.animationSystem = null;
        this.combatAnimations = null;

        // ✨ ENHANCED ANIMATION SYSTEMS
        this.cardAnimationSystem = new CardAnimationSystem(canvas, coordinateSystem);
        this.combatEffectsSystem = new CombatEffectsSystem(canvas, coordinateSystem);
    }

    setExternalRenderers(unitRenderer, animationSystem, combatAnimations, combatEffectsSystem) {
        this.unitRenderer = unitRenderer;
        this.animationSystem = animationSystem;
        this.combatAnimations = combatAnimations;

        // Give AnimationSystem access to UnitRenderer for move animations
        if (animationSystem && unitRenderer) {
            animationSystem.setUnitRenderer(unitRenderer);
        }

        // Replace internal combatEffectsSystem with external one
        if (combatEffectsSystem) {
            this.combatEffectsSystem = combatEffectsSystem;
        }
    }

    setGameState(gameState) {
        this.gameState = gameState;
    }

    setTileSize(tileSize) {
        this.tileSize = tileSize;
    }

    setSelection(selectedUnitIndex, validMoves, validTargets) {
        this.selectedUnitIndex = selectedUnitIndex;
        this.validMoves = validMoves;
        this.validTargets = validTargets;
    }

    render() {
        if (!this.gameState) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // ATMOSPHERIC MEDIEVAL BACKGROUND
        this.drawMedievalAtmosphere();

        // Draw game elements in order
        this.drawGrid();
        this.drawHighlights();

        // Draw blood pools (permanent until cleaned)
        if (this.combatAnimations) {
            this.combatAnimations.drawBloodPools(this.ctx);
        }

        // Draw corpses (permanent battlefield decoration)
        if (this.combatAnimations) {
            this.combatAnimations.drawCorpses(this.ctx);
        }

        // Draw weapon drops
        if (this.combatAnimations) {
            this.combatAnimations.drawWeaponDrops(this.ctx);
        }

        this.drawUnits();

        // Draw FLOATING HEALTH BARS over units
        this.drawFloatingHealthBars();

        // Draw hurt overlays (pain expressions over units)
        if (this.combatAnimations) {
            this.combatAnimations.drawHurtOverlays(this.ctx);
        }

        // Draw combat animations (attack sequences)
        if (this.animationSystem) {
            this.animationSystem.drawAnimations(this.ctx);
        }

        // Draw death animations (dramatic sequences)
        if (this.combatAnimations) {
            this.combatAnimations.drawDeathAnimations(this.ctx);
        }

        // ✨ Draw card animations (flying cards, impacts)
        if (this.cardAnimationSystem) {
            this.cardAnimationSystem.renderAnimations();
        }

        // ⚔️ Draw combat effects (screen shake, impacts, damage numbers)
        if (this.combatEffectsSystem) {
            this.combatEffectsSystem.renderEffects();
        }

        // Particles and damage numbers are drawn within drawAnimations

        this.drawUI();

        // Update animations
        if (this.animationSystem) {
            this.animationSystem.update();
        }
        if (this.combatAnimations) {
            this.combatAnimations.update();
        }
        if (this.cardAnimationSystem) {
            this.cardAnimationSystem.update();
        }
        if (this.combatEffectsSystem) {
            this.combatEffectsSystem.update();
        }

        // Keep rendering if animations are active
        if (this.hasActiveAnimations()) {
            requestAnimationFrame(() => this.render());
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;

        // Draw grid lines
        for (let i = 0; i <= GameData.CONFIG.BOARD_SIZE; i++) {
            const pos = i * this.tileSize;

            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();

            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();
        }

        // Draw spawn zones
        this.drawSpawnZones();
    }

    drawSpawnZones() {
        // Player 0 spawn zone (bottom row for 5x5 board)
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        this.ctx.fillRect(0, 4 * this.tileSize, this.canvas.width, this.tileSize);

        // Player 1 spawn zone (top row for 5x5 board)
        this.ctx.fillStyle = 'rgba(244, 67, 54, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.tileSize);

        // Spawn zone labels removed for cleaner look
    }

    drawHighlights() {
        // Highlight selected unit
        if (this.selectedUnitIndex !== null) {
            const { x, y } = this.coordinateSystem.getVisualPosition(this.selectedUnitIndex);

            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

            this.ctx.strokeStyle = '#FFFF00';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
        }

        // Highlight valid moves (green)
        if (this.validMoves) {
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            this.validMoves.forEach(boardIndex => {
                const { x, y } = this.coordinateSystem.getVisualPosition(boardIndex);
                this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

                this.ctx.strokeStyle = '#00FF00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            });
        }

        // Highlight valid attack targets (red)
        if (this.validTargets) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.validTargets.forEach(boardIndex => {
                const { x, y } = this.coordinateSystem.getVisualPosition(boardIndex);
                this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

                this.ctx.strokeStyle = '#FF0000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            });
        }
    }

    drawUnits() {
        if (!this.unitRenderer) return;

        this.gameState.board.forEach((unit, boardIndex) => {
            if (unit) {
                const { x, y } = this.coordinateSystem.getVisualPosition(boardIndex);
                this.unitRenderer.drawUnit(unit, x, y, this.tileSize, this.ctx);
            }
        });
    }

    drawUI() {
        // Draw any overlay UI elements
        this.drawDebugInfo();
    }

    drawDebugInfo() {
        // Debug info removed for cleaner gameplay
    }

    hasActiveAnimations() {
        let hasAnimations = false;

        if (this.animationSystem && this.animationSystem.hasActiveAnimations()) {
            hasAnimations = true;
        }

        if (this.combatAnimations && this.combatAnimations.hasActiveAnimations()) {
            hasAnimations = true;
        }

        // ✨ Check card animations
        if (this.cardAnimationSystem && this.cardAnimationSystem.hasActiveAnimations()) {
            hasAnimations = true;
        }

        // ⚔️ Check combat effects
        if (this.combatEffectsSystem && this.combatEffectsSystem.hasActiveEffects()) {
            hasAnimations = true;
        }

        // Check for particles, damage numbers, death animations, etc.
        if (this.animationSystem) {
            const system = this.animationSystem;
            if (system.animations.length > 0 ||
                system.particles.length > 0 ||
                system.damageNumbers.length > 0) {
                hasAnimations = true;
            }
        }

        if (this.combatAnimations) {
            const combat = this.combatAnimations;
            if (combat.deathAnimations.length > 0 ||
                combat.hurtAnimations.length > 0) {
                hasAnimations = true;
            }
        }

        return hasAnimations;
    }

    // BRUTAL MEDIEVAL ATMOSPHERE
    drawMedievalAtmosphere() {
        // Generate atmospheric particles if not exists
        if (!this.atmosphericParticles) {
            this.atmosphericParticles = [];
            this.generateAtmosphericParticles();
        }

        // Update and draw floating dust/debris
        this.updateAtmosphericParticles();
        this.drawAtmosphericParticles();

        // Draw flickering shadows
        this.drawFlickeringShadows();
    }

    generateAtmosphericParticles() {
        const particleCount = 25;
        for (let i = 0; i < particleCount; i++) {
            this.atmosphericParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.3 + 0.1,
                type: Math.random() > 0.7 ? 'spark' : 'dust',
                age: Math.random() * 1000
            });
        }
    }

    updateAtmosphericParticles() {
        this.atmosphericParticles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.age += 16;

            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;

            // Flicker effect
            particle.opacity = Math.max(0.05, particle.opacity + (Math.random() - 0.5) * 0.02);
        });
    }

    drawAtmosphericParticles() {
        this.atmosphericParticles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.opacity;

            if (particle.type === 'spark') {
                // Golden sparks for medieval atmosphere
                this.ctx.fillStyle = '#d4af37';
                this.ctx.shadowColor = '#ffff00';
                this.ctx.shadowBlur = 5;
            } else {
                // Dusty particles
                this.ctx.fillStyle = '#8b7355';
            }

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    drawFlickeringShadows() {
        // Flickering shadow overlay for torch/candle light effect
        const flicker = Math.sin(Date.now() * 0.01) * 0.1 + Math.random() * 0.05;
        const shadowOpacity = 0.15 + flicker;

        this.ctx.save();
        this.ctx.globalAlpha = shadowOpacity;

        // Create radial gradient from corners
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.restore();
    }

    // Battle damage to tiles
    drawBattleDamage() {
        if (!this.battleDamage) {
            this.battleDamage = [];
        }

        // Add cracks and scorch marks to tiles with lots of combat
        this.battleDamage.forEach(damage => {
            this.ctx.save();
            this.ctx.globalAlpha = damage.opacity;
            this.ctx.strokeStyle = '#444';
            this.ctx.lineWidth = 2;

            // Draw crack patterns
            for (let i = 0; i < damage.cracks; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(damage.x + Math.random() * this.tileSize, damage.y + Math.random() * this.tileSize);
                this.ctx.lineTo(damage.x + Math.random() * this.tileSize, damage.y + Math.random() * this.tileSize);
                this.ctx.stroke();
            }

            this.ctx.restore();
        });
    }

    // Add damage to battlefield tile
    addBattleDamage(tileIndex) {
        if (!this.battleDamage) this.battleDamage = [];

        const pos = this.coordinateSystem.getVisualPosition(tileIndex);
        this.battleDamage.push({
            x: pos.x,
            y: pos.y,
            cracks: Math.random() * 3 + 1,
            opacity: 0.3 + Math.random() * 0.3
        });
    }

    // DIABLO 2 STYLE FLOATING HEALTH BARS
    drawFloatingHealthBars() {
        if (!this.gameState) return;

        this.gameState.board.forEach((unit, boardIndex) => {
            if (unit) {
                this.drawUnitHealthBar(unit, boardIndex);
            }
        });
    }

    drawUnitHealthBar(unit, boardIndex) {
        const { x, y } = this.coordinateSystem.getVisualPosition(boardIndex);
        const centerX = x + this.tileSize / 2;
        const healthBarY = y - 8; // Position above unit

        // Health bar dimensions
        const barWidth = this.tileSize * 0.8;
        const barHeight = 8;
        const barX = centerX - barWidth / 2;

        // Calculate health percentage
        const healthPercent = unit.currentHp / unit.maxHp;

        // Health bar background (dark stone frame)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(barX - 2, healthBarY - 2, barWidth + 4, barHeight + 4);

        // Health bar background (inner)
        this.ctx.fillStyle = 'rgba(60, 30, 30, 0.9)';
        this.ctx.fillRect(barX, healthBarY, barWidth, barHeight);

        // Health bar fill (gradient from green to red)
        if (healthPercent > 0) {
            const fillWidth = barWidth * healthPercent;
            const gradient = this.ctx.createLinearGradient(barX, healthBarY, barX + barWidth, healthBarY);

            if (healthPercent > 0.6) {
                // Healthy - green to yellow
                gradient.addColorStop(0, '#f44336'); // Player 0 = Red
                gradient.addColorStop(1, '#66BB6A');
            } else if (healthPercent > 0.3) {
                // Injured - yellow to orange
                gradient.addColorStop(0, '#FF9800');
                gradient.addColorStop(1, '#FFB74D');
            } else {
                // Critical - red gradient
                gradient.addColorStop(0, '#f44336');
                gradient.addColorStop(1, '#ff6b6b');
            }

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(barX, healthBarY, fillWidth, barHeight);

            // Health bar shine effect
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(barX, healthBarY, fillWidth, 2);
        }

        // Health bar border
        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, healthBarY, barWidth, barHeight);

        // Info displays removed for cleaner look
    }

    drawUnitInfo(unit, centerX, infoY) {
        // Weapon icon and HP text
        const weaponIcon = this.getWeaponIcon(unit.weapon);
        const hpText = `${unit.currentHp}/${unit.maxHp}`;

        // Background for info
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(centerX - 25, infoY - 8, 50, 12);

        // Weapon icon
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = '12px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(weaponIcon, centerX - 15, infoY);

        // HP text
        this.ctx.fillStyle = unit.currentHp <= unit.maxHp * 0.3 ? '#ff6b6b' : '#ffffff';
        this.ctx.font = 'bold 10px Cinzel, serif';
        this.ctx.fillText(hpText, centerX + 8, infoY);
    }

    drawUnitStatusIndicators(unit, centerX, statusY) {
        const indicators = [];

        // Status effect indicators
        if (unit.hasMovedThisTurn) {
            indicators.push({ icon: '🦶', color: '#64b5f6' });
        }
        if (unit.hasAttackedThisTurn) {
            indicators.push({ icon: '⚔️', color: '#ff6b6b' });
        }

        // Owner indicator (color-coded) - Fixed colors: Player 0 = Red, Player 1 = Blue
        const ownerColor = unit.owner === 0 ? '#f44336' : '#2196F3';
        indicators.push({ icon: '●', color: ownerColor });

        // Draw indicators
        indicators.forEach((indicator, index) => {
            const indicatorX = centerX - (indicators.length * 8) / 2 + index * 8;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(indicatorX - 3, statusY - 1, 6, 8);

            this.ctx.fillStyle = indicator.color;
            this.ctx.font = '8px serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(indicator.icon, indicatorX, statusY + 5);
        });
    }

    getWeaponIcon(weapon) {
        const icons = {
            'SWORD': '⚔️',
            'BOW': '🏹',
            'LANCE': '🗡️'
        };
        return icons[weapon] || '⚔️';
    }

    // Enhanced Unit Rendering with Health Integration
    drawUnits() {
        if (!this.unitRenderer) return;

        this.gameState.board.forEach((unit, boardIndex) => {
            if (unit) {
                // Skip units that are currently being animated
                if (this.animationSystem && this.animationSystem.isUnitAnimating &&
                    this.animationSystem.isUnitAnimating(boardIndex)) {
                    return; // Skip rendering this unit, it's being animated
                }

                const { x, y } = this.coordinateSystem.getVisualPosition(boardIndex);

                // Draw unit with health-based effects
                this.drawUnitWithHealthEffects(unit, x, y, boardIndex);
            }
        });
    }

    drawUnitWithHealthEffects(unit, x, y, boardIndex) {
        // Save context for effects
        this.ctx.save();

        // Apply health-based visual effects
        const healthPercent = unit.currentHp / unit.maxHp;

        if (healthPercent <= 0.3) {
            // Critical health - red tint and slight shake
            this.ctx.filter = 'sepia(1) saturate(2) hue-rotate(320deg)';

            // Subtle shake effect for critical units
            const shakeX = Math.sin(Date.now() * 0.01) * 1;
            const shakeY = Math.cos(Date.now() * 0.01) * 1;
            this.ctx.translate(shakeX, shakeY);
        } else if (healthPercent <= 0.6) {
            // Injured - slight red tint
            this.ctx.filter = 'sepia(0.3) saturate(1.2) hue-rotate(320deg)';
        }

        // Draw the actual unit
        this.unitRenderer.drawUnit(unit, x, y, this.tileSize, this.ctx);

        this.ctx.restore();
    }

    // ✨ CARD ANIMATION API
    playCardToBoard(cardElement, targetBoardIndex, onComplete) {
        if (this.cardAnimationSystem) {
            return this.cardAnimationSystem.playCardToBoard(cardElement, targetBoardIndex, onComplete);
        }
        return Promise.resolve();
    }

    setCardAnimationSpeed(speed) {
        if (this.cardAnimationSystem) {
            this.cardAnimationSystem.setAnimationSpeed(speed);
        }
    }

    setCardEffectsEnabled(enabled) {
        if (this.cardAnimationSystem) {
            this.cardAnimationSystem.setEffectsEnabled(enabled);
        }
    }

    clearCardAnimations() {
        if (this.cardAnimationSystem) {
            this.cardAnimationSystem.clear();
        }
    }

    // ⚔️ COMBAT EFFECTS API
    triggerCombatHit(attackerPos, targetPos, weaponType, damage, isCritical = false) {
        if (this.combatEffectsSystem) {
            this.combatEffectsSystem.triggerCombatHit(attackerPos, targetPos, weaponType, damage, isCritical);
        }
    }

    triggerScreenShake(intensity, duration) {
        if (this.combatEffectsSystem) {
            this.combatEffectsSystem.triggerScreenShake(intensity, duration);
        }
    }

    clearCombatEffects() {
        if (this.combatEffectsSystem) {
            this.combatEffectsSystem.clear();
        }
    }

    // Utility methods
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;

        // Update card animation system with new canvas size
        if (this.cardAnimationSystem) {
            this.cardAnimationSystem.coordinateSystem = this.coordinateSystem;
        }
    }
}