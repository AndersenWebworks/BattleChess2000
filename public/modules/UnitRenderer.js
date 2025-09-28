// UnitRenderer.js - Advanced emotional warrior rendering with equipment and expressions
// Part of BattleChess2000 modularization - ULTRATHINK implementation from commit 047013a

import { GameData } from './GameData.js';

export class UnitRenderer {
    constructor() {
        this.playerIndex = 0; // Will be set by game
    }

    setPlayerIndex(playerIndex) {
        this.playerIndex = playerIndex;
    }

    drawUnit(unit, x, y, tileSize, ctx) {
        const centerX = x + tileSize / 2;
        const centerY = y + tileSize / 2;
        const size = tileSize / 3;

        // Universal emotional warrior with equipment-based differences
        this.drawEmotionalWarrior(ctx, centerX, centerY, size, unit);

        // HP bar
        const barWidth = tileSize * 0.8;
        const barHeight = 6;
        const hpRatio = unit.currentHp / unit.maxHp;

        // HP bar background
        ctx.fillStyle = '#333333';
        ctx.fillRect(centerX - barWidth / 2, centerY - size - 15, barWidth, barHeight);

        // HP bar fill (color changes based on health)
        if (hpRatio > 0.6) {
            ctx.fillStyle = '#4CAF50'; // Green
        } else if (hpRatio > 0.3) {
            ctx.fillStyle = '#FF9800'; // Orange
        } else {
            ctx.fillStyle = '#f44336'; // Red
        }
        ctx.fillRect(centerX - barWidth / 2, centerY - size - 15, barWidth * hpRatio, barHeight);

        // HP bar border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - barWidth / 2, centerY - size - 15, barWidth, barHeight);

        // Action status overlay removed - no more graying out of units

        // Summoning sickness indicator
        if (unit.justSummoned) {
            this.drawSummoningSickness(ctx, centerX, centerY, size);
        }
    }

    // Emotional Warrior System - Base model with facial expressions and equipment
    drawEmotionalWarrior(ctx, centerX, centerY, size, unit) {
        const isOwn = unit.owner === this.playerIndex; // Proper player check
        const scale = size / 25;

        // Determine emotional state
        let emotion = 'normal';
        if (unit.hasActed) emotion = 'tired';
        if (unit.currentHp < unit.maxHp * 0.3) emotion = 'hurt';

        // Base warrior body
        this.drawWarriorBody(ctx, centerX, centerY, size, isOwn, emotion);

        // Equipment based on unit type
        this.drawWarriorEquipment(ctx, centerX, centerY, size, unit.type, isOwn);
    }

    drawWarriorBody(ctx, centerX, centerY, size, isOwn, emotion) {
        const scale = size / 25;

        // Player-specific colors for clear identification
        const skinColor = '#FFDBAC'; // Skin tone
        const eyeColor = '#000000';

        // CLEAR PLAYER COLORS
        const bodyColor = isOwn
            ? '#2E7D32'  // Own units: Dark Green
            : '#C62828'; // Enemy units: Dark Red

        // HEAD - Larger and more expressive
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY - size * 0.6, size * 0.3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = Math.max(1, scale);
        ctx.stroke();

        // EYES - The key to emotion!
        this.drawWarriorEyes(ctx, centerX, centerY - size * 0.6, size, emotion);

        // MOUTH - Emotional expression
        this.drawWarriorMouth(ctx, centerX, centerY - size * 0.6, size, emotion);

        // BODY - Rounded torso
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - size * 0.1, size * 0.25, size * 0.35, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = isOwn ? '#1B5E20' : '#B71C1C'; // Darker outline
        ctx.lineWidth = Math.max(1, scale * 2);
        ctx.stroke();

        // ARMS - Rounded
        ctx.fillStyle = skinColor;
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = Math.max(1, scale * 1.5);

        // Left arm
        ctx.beginPath();
        ctx.arc(centerX - size * 0.4, centerY - size * 0.1, size * 0.12, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Right arm
        ctx.beginPath();
        ctx.arc(centerX + size * 0.4, centerY - size * 0.1, size * 0.12, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // LEGS - Rounded thighs and shins
        // Left leg
        ctx.beginPath();
        ctx.ellipse(centerX - size * 0.15, centerY + size * 0.35, size * 0.1, size * 0.25, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Right leg
        ctx.beginPath();
        ctx.ellipse(centerX + size * 0.15, centerY + size * 0.35, size * 0.1, size * 0.25, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // FEET - Simple boots
        ctx.fillStyle = '#654321';
        ctx.fillRect(centerX - size * 0.2, centerY + size * 0.55, size * 0.1, size * 0.15);
        ctx.fillRect(centerX + size * 0.1, centerY + size * 0.55, size * 0.1, size * 0.15);
    }

    drawWarriorEyes(ctx, centerX, centerY, size, emotion) {
        const eyeSize = size * 0.08;
        const eyeOffset = size * 0.1;

        ctx.fillStyle = '#FFFFFF';

        if (emotion === 'hurt' || emotion === 'pain') {
            // X-shaped hurt eyes
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;

            // Left eye X
            ctx.beginPath();
            ctx.moveTo(centerX - eyeOffset - eyeSize/2, centerY - eyeSize/2);
            ctx.lineTo(centerX - eyeOffset + eyeSize/2, centerY + eyeSize/2);
            ctx.moveTo(centerX - eyeOffset + eyeSize/2, centerY - eyeSize/2);
            ctx.lineTo(centerX - eyeOffset - eyeSize/2, centerY + eyeSize/2);
            ctx.stroke();

            // Right eye X
            ctx.beginPath();
            ctx.moveTo(centerX + eyeOffset - eyeSize/2, centerY - eyeSize/2);
            ctx.lineTo(centerX + eyeOffset + eyeSize/2, centerY + eyeSize/2);
            ctx.moveTo(centerX + eyeOffset + eyeSize/2, centerY - eyeSize/2);
            ctx.lineTo(centerX + eyeOffset - eyeSize/2, centerY + eyeSize/2);
            ctx.stroke();

        } else if (emotion === 'tired') {
            // Half-closed sleepy eyes
            ctx.beginPath();
            ctx.ellipse(centerX - eyeOffset, centerY, eyeSize, eyeSize/2, 0, 0, Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(centerX + eyeOffset, centerY, eyeSize, eyeSize/2, 0, 0, Math.PI);
            ctx.fill();

        } else if (emotion === 'shock') {
            // Wide open shocked eyes
            ctx.beginPath();
            ctx.arc(centerX - eyeOffset, centerY, eyeSize * 1.2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + eyeOffset, centerY, eyeSize * 1.2, 0, 2 * Math.PI);
            ctx.fill();

            // Large pupils (shocked)
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(centerX - eyeOffset, centerY, eyeSize * 0.7, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + eyeOffset, centerY, eyeSize * 0.7, 0, 2 * Math.PI);
            ctx.fill();

        } else if (emotion === 'dying') {
            // Spiral death eyes
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;

            // Left eye spiral
            ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 4;
                const radius = (i / 20) * eyeSize * 0.8;
                const x = centerX - eyeOffset + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Right eye spiral
            ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 4;
                const radius = (i / 20) * eyeSize * 0.8;
                const x = centerX + eyeOffset + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

        } else {
            // Normal alert eyes
            ctx.beginPath();
            ctx.arc(centerX - eyeOffset, centerY, eyeSize, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + eyeOffset, centerY, eyeSize, 0, 2 * Math.PI);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(centerX - eyeOffset, centerY, eyeSize * 0.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + eyeOffset, centerY, eyeSize * 0.5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawWarriorMouth(ctx, centerX, centerY, size, emotion) {
        const mouthY = centerY + size * 0.15;

        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();

        if (emotion === 'hurt' || emotion === 'pain') {
            // Sad downward mouth
            ctx.arc(centerX, mouthY - size * 0.05, size * 0.08, 0.2 * Math.PI, 0.8 * Math.PI);
        } else if (emotion === 'tired') {
            // Neutral small line
            ctx.moveTo(centerX - size * 0.05, mouthY);
            ctx.lineTo(centerX + size * 0.05, mouthY);
        } else if (emotion === 'shock') {
            // Open shocked mouth (O shape)
            ctx.arc(centerX, mouthY, size * 0.06, 0, 2 * Math.PI);
        } else if (emotion === 'dying') {
            // Drooping dying mouth
            ctx.arc(centerX, mouthY - size * 0.08, size * 0.1, 0.3 * Math.PI, 0.7 * Math.PI);
        } else {
            // Determined small smile
            ctx.arc(centerX, mouthY + size * 0.02, size * 0.06, 1.2 * Math.PI, 1.8 * Math.PI);
        }

        ctx.stroke();
    }

    drawWarriorEquipment(ctx, centerX, centerY, size, unitType, isOwn) {
        if (unitType === 'SCOUT') {
            this.drawScoutEquipment(ctx, centerX, centerY, size, isOwn);
        } else if (unitType === 'ARCHER') {
            this.drawArcherEquipment(ctx, centerX, centerY, size, isOwn);
        } else if (unitType === 'KNIGHT') {
            this.drawKnightEquipment(ctx, centerX, centerY, size, isOwn);
        } else if (unitType === 'MAGE') {
            this.drawMageEquipment(ctx, centerX, centerY, size, isOwn);
        }
    }

    drawScoutEquipment(ctx, centerX, centerY, size, isOwn) {
        // Player-colored scout helm
        ctx.fillStyle = isOwn ? '#4CAF50' : '#FF5252'; // Green vs Red
        ctx.beginPath();
        ctx.arc(centerX, centerY - size * 0.6, size * 0.32, Math.PI, 2 * Math.PI);
        ctx.fill();

        // Small sword at side
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.45, centerY - size * 0.2);
        ctx.lineTo(centerX + size * 0.45, centerY + size * 0.15);
        ctx.stroke();

        // Sword hilt
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.4, centerY + size * 0.15);
        ctx.lineTo(centerX + size * 0.5, centerY + size * 0.15);
        ctx.stroke();
    }

    drawArcherEquipment(ctx, centerX, centerY, size, isOwn) {
        // Player-colored archer helm with feather
        ctx.fillStyle = isOwn ? '#2196F3' : '#E91E63'; // Blue vs Pink
        ctx.beginPath();
        ctx.arc(centerX, centerY - size * 0.6, size * 0.32, Math.PI, 2 * Math.PI);
        ctx.fill();

        // Feather on helm
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.2, centerY - size * 0.8);
        ctx.lineTo(centerX + size * 0.15, centerY - size * 0.9);
        ctx.stroke();

        // Bow on left shoulder
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX - size * 0.5, centerY - size * 0.2, size * 0.25, -Math.PI/3, Math.PI/3, false);
        ctx.stroke();

        // Quiver on back
        ctx.fillStyle = '#654321';
        ctx.fillRect(centerX + size * 0.25, centerY - size * 0.4, size * 0.12, size * 0.3);

        // Arrow tips sticking out
        for (let i = 0; i < 3; i++) {
            const arrowX = centerX + size * 0.27 + i * size * 0.03;
            const arrowY = centerY - size * 0.42;
            ctx.fillStyle = '#C0C0C0';
            ctx.beginPath();
            ctx.arc(arrowX, arrowY, size * 0.02, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawKnightEquipment(ctx, centerX, centerY, size, isOwn) {
        // Player-colored heavy helm with visor
        ctx.fillStyle = isOwn ? '#FF9800' : '#9C27B0'; // Orange vs Purple
        ctx.beginPath();
        ctx.arc(centerX, centerY - size * 0.6, size * 0.35, Math.PI, 2 * Math.PI);
        ctx.fill();

        // Visor line
        ctx.strokeStyle = '#BF360C';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - size * 0.25, centerY - size * 0.65);
        ctx.lineTo(centerX + size * 0.25, centerY - size * 0.65);
        ctx.stroke();

        // Shield on left arm
        ctx.fillStyle = '#C0C0C0';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(centerX - size * 0.6, centerY - size * 0.1, size * 0.18, size * 0.25, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Shield cross
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - size * 0.6, centerY - size * 0.25);
        ctx.lineTo(centerX - size * 0.6, centerY + size * 0.05);
        ctx.moveTo(centerX - size * 0.72, centerY - size * 0.1);
        ctx.lineTo(centerX - size * 0.48, centerY - size * 0.1);
        ctx.stroke();

        // Lance in right hand
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.5, centerY - size * 0.1);
        ctx.lineTo(centerX + size * 0.8, centerY - size * 0.6);
        ctx.stroke();

        // Lance tip
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.8, centerY - size * 0.6);
        ctx.lineTo(centerX + size * 0.75, centerY - size * 0.55);
        ctx.lineTo(centerX + size * 0.85, centerY - size * 0.55);
        ctx.closePath();
        ctx.fill();
    }

    drawMageEquipment(ctx, centerX, centerY, size, isOwn) {
        // Player-colored mystical hood
        ctx.fillStyle = isOwn ? '#9C27B0' : '#E91E63'; // Purple vs Pink
        ctx.beginPath();
        ctx.arc(centerX, centerY - size * 0.6, size * 0.35, Math.PI, 2 * Math.PI);
        ctx.fill();

        // Hood shadow
        ctx.fillStyle = isOwn ? '#7B1FA2' : '#C2185B';
        ctx.beginPath();
        ctx.arc(centerX, centerY - size * 0.65, size * 0.25, Math.PI, 2 * Math.PI);
        ctx.fill();

        // Mystical staff in right hand
        ctx.strokeStyle = '#8B4513'; // Brown wood
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.5, centerY - size * 0.1);
        ctx.lineTo(centerX + size * 0.5, centerY - size * 0.8);
        ctx.stroke();

        // Crystal orb at staff top
        ctx.fillStyle = '#E1F5FE';
        ctx.strokeStyle = '#00BCD4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX + size * 0.5, centerY - size * 0.8, size * 0.08, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Magical sparkles around orb
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const sparkleX = centerX + size * 0.5 + Math.cos(angle) * size * 0.15;
            const sparkleY = centerY - size * 0.8 + Math.sin(angle) * size * 0.15;

            ctx.fillStyle = '#FFD700'; // Gold sparkles
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, size * 0.02, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Mystical robe
        ctx.fillStyle = isOwn ? '#673AB7' : '#9C27B0';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + size * 0.1, size * 0.3, size * 0.4, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Robe belt with magical symbols
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - size * 0.25, centerY);
        ctx.lineTo(centerX + size * 0.25, centerY);
        ctx.stroke();

        // Magical symbol on belt (star)
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const starSize = size * 0.06;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * starSize;
            const y = centerY + Math.sin(angle) * starSize;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // Tired/acted state visual effects
    drawTiredEffect(ctx, centerX, centerY, size) {
        // Tired effect removed - only keep summoning sickness zZz
        // Units that have acted this turn are shown with gray overlay only
    }

    drawArcherTiredEffect(ctx, centerX, centerY, size) {
        // Archer checking arrows
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.3, centerY - size * 0.3);
        ctx.lineTo(centerX + size * 0.35, centerY - size * 0.4);
        ctx.stroke();
    }

    drawKnightTiredEffect(ctx, centerX, centerY, size) {
        // Knight leaning on shield
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - size * 0.5, centerY + size * 0.2);
        ctx.lineTo(centerX - size * 0.3, centerY);
        ctx.stroke();
    }

    drawSummoningSickness(ctx, centerX, centerY, size) {
        // zZz symbol above unit for summoning sickness
        ctx.fillStyle = 'rgba(100, 149, 237, 0.9)'; // Cornflower blue
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.font = `bold ${size * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Position above unit
        const textY = centerY - size * 1.2;

        // Draw outline
        ctx.strokeText('zZz', centerX, textY);
        // Draw fill
        ctx.fillText('zZz', centerX, textY);

        // Add a subtle glow effect
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgba(100, 149, 237, 0.5)';
        ctx.fillText('zZz', centerX, textY);
        ctx.shadowBlur = 0; // Reset shadow
    }

    // Legacy support - simplified drawing methods
    drawScout(ctx, centerX, centerY, size, unit) {
        this.drawEmotionalWarrior(ctx, centerX, centerY, size, unit);
    }

    drawArcher(ctx, centerX, centerY, size, unit) {
        this.drawEmotionalWarrior(ctx, centerX, centerY, size, unit);
    }

    drawKnight(ctx, centerX, centerY, size, unit) {
        this.drawEmotionalWarrior(ctx, centerX, centerY, size, unit);
    }

    drawMage(ctx, centerX, centerY, size, unit) {
        this.drawEmotionalWarrior(ctx, centerX, centerY, size, unit);
    }
}