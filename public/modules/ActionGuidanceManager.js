// ActionGuidanceManager.js - Visual action guidance system
// Provides clear visual communication about what the user can and should do

export class ActionGuidanceManager {
    constructor() {
        this.gameState = null;
        this.playerIndex = null;
        this.currentActionContext = null;
        // Hint system removed for cleaner gameplay
    }

    // MAIN UPDATE FUNCTION - Called when game state changes
    updateGuidance(gameState, playerIndex, context = {}) {
        this.gameState = gameState;
        this.playerIndex = playerIndex;
        this.currentActionContext = context;

        this.updateTurnStates();
        this.updateCardStates();
        this.updateButtonStates();
        this.updateCanvasStates();
        // Hint system removed - cleaner gameplay
    }

    // TURN-BASED VISUAL STATES
    updateTurnStates() {
        if (!this.gameState) return;

        const isMyTurn = this.gameState.currentTurn === this.playerIndex;
        const turnBanner = document.getElementById('turnBanner');
        const gameContainer = document.querySelector('.game-container');

        // Update turn banner states
        if (turnBanner) {
            turnBanner.classList.remove('my-turn', 'opponent-turn');
            turnBanner.classList.add(isMyTurn ? 'my-turn' : 'opponent-turn');
        }

        // Update overall game container state
        if (gameContainer) {
            gameContainer.classList.remove('my-turn', 'opponent-turn', 'waiting-for-action');
            if (isMyTurn) {
                gameContainer.classList.add('my-turn');
            } else {
                gameContainer.classList.add('opponent-turn');
            }
        }
    }

    // CARD VISUAL GUIDANCE
    updateCardStates() {
        if (!this.gameState) return;

        const player = this.gameState.players[this.playerIndex];
        const isMyTurn = this.gameState.currentTurn === this.playerIndex;
        const cards = document.querySelectorAll('.card');

        cards.forEach((cardElement, index) => {
            const cardIndex = parseInt(cardElement.dataset.cardIndex);
            const card = player.hand[cardIndex];

            if (!card) return;

            // Clear previous states
            cardElement.classList.remove('playable', 'unplayable', 'action-available', 'action-required', 'action-invalid');

            if (!isMyTurn) {
                // Not player's turn - all cards unavailable
                cardElement.classList.add('unplayable', 'action-invalid');
            } else {
                const canPlay = player.mana >= card.cost;
                const hasValidSpawnTiles = this.hasValidSpawnTiles();

                if (canPlay && hasValidSpawnTiles) {
                    cardElement.classList.add('playable', 'action-available');

                    // Highlight if this is the only playable card
                    const playableCards = player.hand.filter(c => player.mana >= c.cost);
                    if (playableCards.length === 1) {
                        cardElement.classList.add('action-required');
                    }
                } else {
                    cardElement.classList.add('unplayable');
                    if (!canPlay) {
                        cardElement.classList.add('action-invalid');
                    }
                }
            }
        });
    }

    // BUTTON VISUAL GUIDANCE
    updateButtonStates() {
        if (!this.gameState) return;

        const endPhaseBtn = document.getElementById('endPhaseBtn');
        const isMyTurn = this.gameState.currentTurn === this.playerIndex;

        if (endPhaseBtn) {
            endPhaseBtn.classList.remove('active-action', 'waiting-action', 'action-required');

            if (isMyTurn) {
                endPhaseBtn.classList.add('active-action');

                // Check if player should end turn (no more meaningful actions)
                if (this.shouldPlayerEndTurn()) {
                    endPhaseBtn.classList.add('action-required');
                }
            } else {
                endPhaseBtn.classList.add('waiting-action');
            }
        }
    }

    // CANVAS VISUAL GUIDANCE
    updateCanvasStates() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas || !this.gameState) return;

        const isMyTurn = this.gameState.currentTurn === this.playerIndex;
        const hasSelectedCard = this.currentActionContext?.selectedCard !== null;
        const hasSelectedUnit = this.currentActionContext?.selectedUnit !== null;

        canvas.classList.remove('has-actions', 'no-actions', 'action-available');

        if (!isMyTurn) {
            canvas.classList.add('no-actions');
        } else if (hasSelectedCard || hasSelectedUnit) {
            canvas.classList.add('has-actions', 'action-available');
        } else {
            // Check if any actions are possible on the board
            const hasInteractableElements = this.hasInteractableBoardElements();
            canvas.classList.add(hasInteractableElements ? 'has-actions' : 'no-actions');
        }
    }

    // GLOBE VISUAL GUIDANCE
    updateGlobeStates() {
        if (!this.gameState) return;

        const player = this.gameState.players[this.playerIndex];
        const manaGlobe = document.querySelector('.mana-globe');
        const healthGlobe = document.querySelector('.health-globe');

        // Mana globe attention
        if (manaGlobe) {
            manaGlobe.classList.remove('needs-attention');

            const isMyTurn = this.gameState.currentTurn === this.playerIndex;
            const lowMana = player.mana <= 2;
            const hasExpensiveCards = player.hand.some(card => card.cost > player.mana);

            if (isMyTurn && lowMana && hasExpensiveCards) {
                manaGlobe.classList.add('needs-attention');
            }
        }

        // Health globe attention (when losing units)
        if (healthGlobe) {
            healthGlobe.classList.remove('needs-attention');

            const playerUnits = this.gameState.board.filter(unit =>
                unit && unit.owner === this.playerIndex
            ).length;

            if (playerUnits <= 2) {
                healthGlobe.classList.add('needs-attention');
            }
        }
    }

    // Hint system removed for cleaner gameplay experience

    // UTILITY FUNCTIONS FOR GAME STATE ANALYSIS
    hasValidSpawnTiles() {
        if (!this.gameState) return false;

        const playerSpawnRow = this.playerIndex === 0 ? 3 : 0;
        for (let col = 0; col < 4; col++) {
            const tileIndex = playerSpawnRow * 4 + col;
            if (!this.gameState.board[tileIndex]) {
                return true; // Found empty spawn tile
            }
        }
        return false;
    }

    shouldPlayerEndTurn() {
        if (!this.gameState) return false;

        const player = this.gameState.players[this.playerIndex];

        // Should end turn if:
        // 1. No playable cards
        // 2. No movable units
        // 3. No attackable targets
        const canPlayCards = player.hand.some(card => player.mana >= card.cost && this.hasValidSpawnTiles());
        const hasMovableUnits = this.hasMovableUnits();
        const hasAttackableTargets = this.hasAttackableTargets();

        return !canPlayCards && !hasMovableUnits && !hasAttackableTargets;
    }

    hasMovableUnits() {
        if (!this.gameState) return false;

        return this.gameState.board.some(unit =>
            unit &&
            unit.owner === this.playerIndex &&
            !unit.hasMovedThisTurn &&
            this.hasValidMoveTargets(unit)
        );
    }

    hasAttackableTargets() {
        if (!this.gameState) return false;

        return this.gameState.board.some(unit =>
            unit &&
            unit.owner === this.playerIndex &&
            !unit.hasAttackedThisTurn &&
            this.hasValidAttackTargets(unit)
        );
    }

    hasValidMoveTargets(unit) {
        // This would need to be implemented based on game logic
        // For now, simplified check
        return true; // Assume units can always move somewhere
    }

    hasValidAttackTargets(unit) {
        // Check if there are enemy units in attack range
        return this.gameState.board.some(enemy =>
            enemy &&
            enemy.owner !== this.playerIndex &&
            this.isInAttackRange(unit, enemy)
        );
    }

    isInAttackRange(attacker, target) {
        // Simplified attack range check
        // This would need proper implementation based on game rules
        return true; // Assume units can attack if targets exist
    }

    hasInteractableBoardElements() {
        if (!this.gameState) return false;

        // Check if player has units that can be selected
        return this.gameState.board.some(unit =>
            unit && unit.owner === this.playerIndex
        );
    }

    // UPDATE SELECTED CONTEXT
    setSelectedCard(cardIndex) {
        this.currentActionContext = { ...this.currentActionContext, selectedCard: cardIndex };
        this.updateGuidance(this.gameState, this.playerIndex, this.currentActionContext);
    }

    setSelectedUnit(unitIndex) {
        this.currentActionContext = { ...this.currentActionContext, selectedUnit: unitIndex };
        this.updateGuidance(this.gameState, this.playerIndex, this.currentActionContext);
    }

    clearSelection() {
        this.currentActionContext = { selectedCard: null, selectedUnit: null };
        this.updateGuidance(this.gameState, this.playerIndex, this.currentActionContext);
    }

    // CLEANUP
    destroy() {
        // Hint system removed - nothing to clean up
    }
}