// CardAnimationSystem.js - Epic card play animations
// Part of BattleChess2000 Visual Polish System

export class CardAnimationSystem {
    constructor(canvas, coordinateSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.coordinateSystem = coordinateSystem;

        // Active animations
        this.cardFlightAnimations = [];
        this.spawnAnimations = [];
        this.impactEffects = [];

        // Animation settings
        this.animationSpeed = 1.0;
        this.enableEffects = true;
    }

    // 🚀 CARD FLIGHT: From hand to board
    playCardToBoard(cardElement, targetBoardIndex, onComplete) {
        if (!cardElement || targetBoardIndex === null) return Promise.resolve();

        return new Promise((resolve) => {
            // Get positions
            const startRect = cardElement.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            const targetPos = this.coordinateSystem.getVisualPosition(targetBoardIndex);

            // Calculate relative positions to canvas
            const startX = startRect.left + startRect.width / 2 - canvasRect.left;
            const startY = startRect.top + startRect.height / 2 - canvasRect.top;
            const endX = targetPos.x + this.coordinateSystem.tileSize / 2;
            const endY = targetPos.y + this.coordinateSystem.tileSize / 2;

            // Create flight animation
            const animation = {
                startX,
                startY,
                endX,
                endY,
                currentX: startX,
                currentY: startY,
                progress: 0,
                duration: 500, // 500ms flight time
                startTime: Date.now(),
                cardData: this.extractCardData(cardElement),
                onComplete: () => {
                    resolve();
                    if (onComplete) onComplete();
                }
            };

            this.cardFlightAnimations.push(animation);

            // Hide original card during animation
            cardElement.style.opacity = '0.3';
            cardElement.style.pointerEvents = 'none';

            // Start impact effect at target
            setTimeout(() => {
                this.createImpactEffect(endX, endY);
            }, animation.duration - 100);
        });
    }

    // 📊 Extract visual data from card element
    extractCardData(cardElement) {
        const cost = cardElement.querySelector('.battle-card__cost')?.textContent || '?';
        const symbol = cardElement.querySelector('.battle-card__symbol')?.textContent || '🗡';
        const name = cardElement.querySelector('.battle-card__name-bar')?.textContent || 'UNIT';

        // Get computed styles
        const computedStyle = window.getComputedStyle(cardElement);
        const background = computedStyle.background;
        const borderColor = computedStyle.borderColor;

        return {
            cost,
            symbol,
            name,
            background,
            borderColor,
            width: 60, // Scaled for animation
            height: 80
        };
    }

    // ✨ IMPACT EFFECT: Sparks and glow when card lands
    createImpactEffect(x, y) {
        const effect = {
            x,
            y,
            particles: [],
            glowRadius: 0,
            maxGlowRadius: 40,
            duration: 300,
            startTime: Date.now()
        };

        // Create spark particles
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const speed = 50 + Math.random() * 30;

            effect.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02,
                size: 2 + Math.random() * 3,
                color: '#d4af37'
            });
        }

        this.impactEffects.push(effect);
    }

    // 🎨 Render all active animations
    renderAnimations() {
        this.renderCardFlights();
        this.renderImpactEffects();
    }

    renderCardFlights() {
        this.cardFlightAnimations.forEach((animation, index) => {
            const elapsed = Date.now() - animation.startTime;
            animation.progress = Math.min(elapsed / animation.duration, 1);

            // Smooth easing curve
            const easeProgress = this.easeOutCubic(animation.progress);

            // Update position
            animation.currentX = animation.startX + (animation.endX - animation.startX) * easeProgress;
            animation.currentY = animation.startY + (animation.endY - animation.startY) * easeProgress;

            // Add slight arc to flight path
            const arcHeight = 30;
            const arcOffset = Math.sin(animation.progress * Math.PI) * arcHeight;
            animation.currentY -= arcOffset;

            // Render flying card
            this.renderFlyingCard(animation);

            // Check completion
            if (animation.progress >= 1) {
                animation.onComplete();
                this.cardFlightAnimations.splice(index, 1);
            }
        });
    }

    renderFlyingCard(animation) {
        this.ctx.save();

        // Apply transformations
        this.ctx.translate(animation.currentX, animation.currentY);

        // Rotation during flight
        const rotation = animation.progress * Math.PI * 0.3;
        this.ctx.rotate(rotation);

        // Scale effect
        const scale = 0.8 + Math.sin(animation.progress * Math.PI) * 0.2;
        this.ctx.scale(scale, scale);

        // Draw card shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 5;
        this.ctx.shadowOffsetY = 5;

        // Draw card background
        this.ctx.fillStyle = '#3e2723';
        this.ctx.strokeStyle = '#d4af37';
        this.ctx.lineWidth = 2;

        const cardWidth = animation.cardData.width;
        const cardHeight = animation.cardData.height;

        this.ctx.fillRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight);
        this.ctx.strokeRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight);

        // Draw card symbol
        this.ctx.shadowColor = 'transparent';
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(animation.cardData.symbol, 0, 8);

        // Draw card cost
        this.ctx.fillStyle = '#ff6b35';
        this.ctx.beginPath();
        this.ctx.arc(-cardWidth/2 + 12, -cardHeight/2 + 12, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.fillText(animation.cardData.cost, -cardWidth/2 + 12, -cardHeight/2 + 16);

        this.ctx.restore();
    }

    renderImpactEffects() {
        this.impactEffects.forEach((effect, index) => {
            const elapsed = Date.now() - effect.startTime;
            const progress = elapsed / effect.duration;

            if (progress >= 1) {
                this.impactEffects.splice(index, 1);
                return;
            }

            // Update and render particles
            effect.particles.forEach(particle => {
                particle.x += particle.vx * 0.016; // 60fps timing
                particle.y += particle.vy * 0.016;
                particle.life -= particle.decay;
                particle.vy += 100 * 0.016; // Gravity

                if (particle.life > 0) {
                    this.ctx.save();
                    this.ctx.globalAlpha = particle.life;
                    this.ctx.fillStyle = particle.color;
                    this.ctx.shadowColor = particle.color;
                    this.ctx.shadowBlur = 8;

                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            });

            // Central glow effect
            effect.glowRadius = effect.maxGlowRadius * Math.sin(progress * Math.PI);

            this.ctx.save();
            this.ctx.globalAlpha = (1 - progress) * 0.3;

            const gradient = this.ctx.createRadialGradient(
                effect.x, effect.y, 0,
                effect.x, effect.y, effect.glowRadius
            );
            gradient.addColorStop(0, '#d4af37');
            gradient.addColorStop(0.5, 'rgba(212, 175, 55, 0.3)');
            gradient.addColorStop(1, 'transparent');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.glowRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    // 📈 Smooth easing function
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // 🔄 Update system
    update() {
        // Animations are rendered in render loop
        return this.hasActiveAnimations();
    }

    hasActiveAnimations() {
        return this.cardFlightAnimations.length > 0 ||
               this.impactEffects.length > 0;
    }

    // 🧹 Cleanup
    clear() {
        this.cardFlightAnimations = [];
        this.impactEffects = [];
    }

    // ⚙️ Settings
    setAnimationSpeed(speed) {
        this.animationSpeed = Math.max(0.1, Math.min(2.0, speed));
    }

    setEffectsEnabled(enabled) {
        this.enableEffects = enabled;
    }
}