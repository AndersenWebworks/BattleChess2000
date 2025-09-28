// RenderEngine.js - Basic rendering and drawing coordination
// Part of BattleChess2000 modularization

import { GameData } from './GameData.js';

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
    }

    setExternalRenderers(unitRenderer, animationSystem, combatAnimations) {
        this.unitRenderer = unitRenderer;
        this.animationSystem = animationSystem;
        this.combatAnimations = combatAnimations;
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

        // Particles and damage numbers are drawn within drawAnimations

        this.drawUI();

        // Update animations
        if (this.animationSystem) {
            this.animationSystem.update();
        }
        if (this.combatAnimations) {
            this.combatAnimations.update();
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
        // Player 0 spawn zone (bottom row)
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        this.ctx.fillRect(0, 3 * this.tileSize, this.canvas.width, this.tileSize);

        // Player 1 spawn zone (top row)
        this.ctx.fillStyle = 'rgba(244, 67, 54, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.tileSize);

        // Add spawn zone labels
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Your Spawn Zone', this.canvas.width / 2, 3.8 * this.tileSize);
        this.ctx.fillText('Enemy Spawn Zone', this.canvas.width / 2, 0.7 * this.tileSize);
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
        if (!this.gameState) return;

        // Show current turn and phase
        this.ctx.fillStyle = '#000';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';

        const turnText = `Turn: ${this.gameState.turnNumber}`;
        const phaseText = `Phase: ${this.gameState.currentPhase || 'CARD'}`;
        const playerText = `Player: ${this.gameState.currentTurn}`;

        this.ctx.fillText(turnText, 10, 20);
        this.ctx.fillText(phaseText, 10, 40);
        this.ctx.fillText(playerText, 10, 60);
    }

    hasActiveAnimations() {
        let hasAnimations = false;

        if (this.animationSystem && this.animationSystem.hasActiveAnimations()) {
            hasAnimations = true;
        }

        if (this.combatAnimations && this.combatAnimations.hasActiveAnimations()) {
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

    // Utility methods
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
}