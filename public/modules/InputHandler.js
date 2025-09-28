// InputHandler.js - Input handling and event management
// Part of BattleChess2000 modularization

export class InputHandler {
    constructor(canvas, coordinateSystem) {
        this.canvas = canvas;
        this.coordinateSystem = coordinateSystem;
        this.gameState = null;
        this.playerIndex = null;
        this.selectedCard = null;
        this.selectedUnit = null;
        this.selectedUnitIndex = null;

        // Callbacks for different actions
        this.callbacks = {
            tryPlayCard: null,
            showMovementOptions: null,
            showAttackOptions: null,
            tryMoveUnit: null,
            tryAttackUnit: null,
            render: null
        };

        this.setupInputHandlers();
    }

    setupInputHandlers() {
        // Touch and mouse events for canvas
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const clickEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            this.handleCanvasClick(clickEvent);
        });

        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    setGameState(gameState, playerIndex) {
        this.gameState = gameState;
        this.playerIndex = playerIndex;
    }

    setSelectedCard(cardIndex) {
        this.selectedCard = cardIndex;
    }

    getSelectedCard() {
        return this.selectedCard;
    }

    clearSelection() {
        this.selectedCard = null;
        this.selectedUnit = null;
        this.selectedUnitIndex = null;
    }

    handleCanvasClick(e) {
        if (!this.gameState) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const boardIndex = this.coordinateSystem.screenToBoard(x, y);

        console.log(`Clicked board index: ${boardIndex}`);

        // Handle actions - parallel gameplay (no phases)
        if (this.selectedCard !== null) {
            // Playing cards
            this.handleCardPlay(boardIndex);
        } else {
            // Always allow unit interaction (movement + combat based on unit status)
            this.handleUnitInteraction(boardIndex);
        }
    }

    handleCardPlay(tileIndex) {
        if (this.callbacks.tryPlayCard) {
            this.callbacks.tryPlayCard(tileIndex);
        }
    }

    handleUnitClick(tileIndex) {
        const unit = this.gameState.board[tileIndex];
        if (unit) {
            console.log(`🎯 Clicked on ${unit.type} (Owner: ${unit.owner}, HP: ${unit.currentHp}/${unit.maxHp})`);

            // In any phase, show unit info
            this.selectedUnit = unit;
            this.selectedUnitIndex = tileIndex;
            if (this.callbacks.render) {
                this.callbacks.render();
            }
        } else {
            console.log('📍 Empty tile clicked');
            this.selectedUnit = null;
            this.selectedUnitIndex = null;
            if (this.callbacks.render) {
                this.callbacks.render();
            }
        }
    }

    handleUnitInteraction(tileIndex) {
        // Check if it's player's turn
        if (!this.isPlayerTurn()) {
            console.log('❌ Not your turn!');
            return;
        }

        const unit = this.gameState.board[tileIndex];
        const targetUnit = this.gameState.board[tileIndex];

        // If no unit selected yet
        if (!this.selectedUnit || this.selectedUnitIndex === null) {
            if (unit && this.isUnitOwned(unit) && this.canUnitAct(unit)) {
                // Select own unit that can still act
                console.log(`🎯 Selected ${unit.type} for action`);
                this.selectedUnit = unit;
                this.selectedUnitIndex = tileIndex;

                // Show available options based on unit status
                if (!unit.hasMovedThisTurn && this.callbacks.showMovementOptions) {
                    this.callbacks.showMovementOptions(unit, tileIndex);
                }
                if (!unit.hasAttackedThisTurn && this.callbacks.showAttackOptions) {
                    this.callbacks.showAttackOptions(unit, tileIndex);
                }

                if (this.callbacks.render) {
                    this.callbacks.render();
                }
            } else if (unit) {
                // Just show unit info
                this.handleUnitClick(tileIndex);
            } else {
                // Empty tile
                console.log('📍 Empty tile clicked');
                this.clearUnitSelection();
                if (this.callbacks.render) {
                    this.callbacks.render();
                }
            }
        } else {
            // Unit already selected - try to perform action
            if (targetUnit && targetUnit.owner !== this.playerIndex) {
                // Attack enemy unit
                if (!this.selectedUnit.hasAttackedThisTurn && this.callbacks.tryAttackUnit) {
                    this.callbacks.tryAttackUnit(this.selectedUnitIndex, tileIndex);
                } else {
                    console.log(`❌ ${this.selectedUnit.type} has already attacked this turn`);
                }
            } else if (!targetUnit) {
                // Move to empty tile
                if (!this.selectedUnit.hasMovedThisTurn && this.callbacks.tryMoveUnit) {
                    this.callbacks.tryMoveUnit(this.selectedUnitIndex, tileIndex);
                } else {
                    console.log(`❌ ${this.selectedUnit.type} has already moved this turn`);
                }
            } else {
                // Click on another own unit - select that instead
                if (this.isUnitOwned(targetUnit) && this.canUnitAct(targetUnit)) {
                    this.selectedUnit = targetUnit;
                    this.selectedUnitIndex = tileIndex;
                    console.log(`🎯 Switched to ${targetUnit.type}`);

                    if (!targetUnit.hasMovedThisTurn && this.callbacks.showMovementOptions) {
                        this.callbacks.showMovementOptions(targetUnit, tileIndex);
                    }
                    if (!targetUnit.hasAttackedThisTurn && this.callbacks.showAttackOptions) {
                        this.callbacks.showAttackOptions(targetUnit, tileIndex);
                    }
                }
            }
        }
    }

    // Getters for selected state
    getSelectedUnit() {
        return this.selectedUnit;
    }

    getSelectedUnitIndex() {
        return this.selectedUnitIndex;
    }

    // Setters for selected state (for external control)
    setSelectedUnit(unit, index) {
        this.selectedUnit = unit;
        this.selectedUnitIndex = index;
    }

    clearUnitSelection() {
        this.selectedUnit = null;
        this.selectedUnitIndex = null;
    }

    // Input validation helpers
    isValidTileIndex(index) {
        return index >= 0 && index < 16;
    }

    isPlayerTurn() {
        return this.gameState && this.gameState.currentTurn === this.playerIndex;
    }

    isUnitOwned(unit) {
        return unit && unit.owner === this.playerIndex;
    }

    canUnitAct(unit) {
        // Unit can act if it can still move OR attack this turn AND is not just summoned
        return unit && (!unit.hasMovedThisTurn || !unit.hasAttackedThisTurn) && !unit.justSummoned;
    }
}