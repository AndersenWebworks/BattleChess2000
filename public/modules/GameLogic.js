// GameLogic.js - Game rules, validation, and logic processing
// Part of BattleChess2000 modularization

import { GameData } from './GameData.js';

export class GameLogic {
    constructor(coordinateSystem, networkManager) {
        this.coordinateSystem = coordinateSystem;
        this.networkManager = networkManager;
        this.gameState = null;
        this.playerIndex = null;
        this.validMoves = null;
        this.validTargets = null;

        // Callbacks for UI updates
        this.callbacks = {
            render: null,
            clearSelection: null
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    setGameState(gameState, playerIndex) {
        this.gameState = gameState;
        this.playerIndex = playerIndex;
    }

    resetState() {
        this.gameState = null;
        this.playerIndex = null;
        this.validMoves = null;
        this.validTargets = null;
    }

    // Card playing logic (parallel with movement/combat)
    tryPlayCard(tileIndex, cardIndex) {
        // Check if it's player's turn
        if (!this.isPlayerTurn()) {
            console.log('❌ Not your turn!');
            return false;
        }

        // Check if tile is in player's spawn zone
        const isValidSpawn = this.coordinateSystem.isValidSpawnZone(tileIndex);
        if (!isValidSpawn) {
            console.log('❌ You can only spawn units in your spawn zone!');
            return false;
        }

        // Check if tile is empty
        if (this.gameState.board[tileIndex] !== null) {
            console.log('❌ Tile already occupied!');
            return false;
        }

        const player = this.gameState.players[this.playerIndex];
        const card = player.hand[cardIndex];

        // Check if player has enough mana
        if (player.mana < card.cost) {
            console.log(`❌ Not enough mana! Need ${card.cost}, have ${player.mana}`);
            return false;
        }

        console.log(`🃏 Playing ${card.type} at tile ${tileIndex} (Cost: ${card.cost})`);

        // Send card play to server
        this.networkManager.playCard(cardIndex, tileIndex);

        // Clear selection handled by caller
        return true;
    }

    // Movement logic
    showMovementOptions(unit, fromIndex) {
        console.log(`🔍 Showing movement options for ${unit.type} (Movement: ${unit.movement})`);

        // Calculate valid movement tiles
        this.validMoves = this.coordinateSystem.calculateValidMoves(
            fromIndex,
            unit.movement,
            this.gameState.board
        );

        console.log(`📍 Valid moves: ${this.validMoves.join(', ')}`);

        if (this.callbacks.render) {
            this.callbacks.render();
        }
    }

    tryMoveUnit(fromIndex, toIndex) {
        // Validate move
        if (!this.validMoves || !this.validMoves.includes(toIndex)) {
            console.log('❌ Invalid move target');
            return false;
        }

        console.log(`🚶 Moving unit from ${fromIndex} to ${toIndex}`);

        // Send move to server
        this.networkManager.moveUnit(fromIndex, toIndex);

        // Clear selection
        this.validMoves = null;
        if (this.callbacks.clearSelection) {
            this.callbacks.clearSelection();
        }

        return true;
    }

    // Combat logic
    showAttackOptions(unit, fromIndex) {
        console.log(`🎯 Showing attack options for ${unit.type} (Weapon: ${unit.weapon})`);

        // Calculate valid attack targets
        this.validTargets = this.coordinateSystem.calculateValidTargets(
            fromIndex,
            unit,
            this.gameState.board,
            this.playerIndex
        );

        console.log(`⚔️ Valid targets: ${this.validTargets.join(', ')}`);

        if (this.callbacks.render) {
            this.callbacks.render();
        }
    }

    tryAttackUnit(fromIndex, toIndex) {
        // Validate target
        if (!this.validTargets || !this.validTargets.includes(toIndex)) {
            console.log('❌ Invalid attack target');
            return false;
        }

        const attacker = this.gameState.board[fromIndex];
        const target = this.gameState.board[toIndex];

        console.log(`⚔️ ${attacker.type} attacking ${target.type}`);

        // Send attack to server
        this.networkManager.attackUnit(fromIndex, toIndex);

        // Clear selection
        this.validTargets = null;
        if (this.callbacks.clearSelection) {
            this.callbacks.clearSelection();
        }

        return true;
    }

    // Game rule calculations
    calculateWeaponAdvantage(attackerWeapon, defenderWeapon) {
        const advantages = {
            'SWORD': { 'BOW': 1.2, 'LANCE': 1.0, 'SWORD': 1.0 },
            'BOW': { 'LANCE': 1.2, 'SWORD': 1.0, 'BOW': 1.0 },
            'LANCE': { 'SWORD': 1.2, 'BOW': 1.0, 'LANCE': 1.0 }
        };
        return advantages[attackerWeapon][defenderWeapon] || 1.0;
    }

    // Validation helpers
    isPlayerTurn() {
        return this.gameState && this.gameState.currentTurn === this.playerIndex;
    }

    canUnitAct(unit) {
        // Unit can act if it can still move OR attack this turn
        return unit && (!unit.hasMovedThisTurn || !unit.hasAttackedThisTurn);
    }

    isUnitOwned(unit) {
        return unit && unit.owner === this.playerIndex;
    }

    hasValidMoves() {
        return this.validMoves && this.validMoves.length > 0;
    }

    hasValidTargets() {
        return this.validTargets && this.validTargets.length > 0;
    }

    // Turn management (no phases)
    canEndTurn() {
        return this.isPlayerTurn();
    }

    endTurn() {
        if (!this.canEndTurn()) {
            console.log('❌ Cannot end turn - not your turn');
            return false;
        }

        console.log('🔄 Ending turn...');
        this.networkManager.endTurn();
        return true;
    }

    // Getters for current state
    getValidMoves() {
        return this.validMoves;
    }

    getValidTargets() {
        return this.validTargets;
    }

    clearValidActions() {
        this.validMoves = null;
        this.validTargets = null;
    }

    // Game state analysis
    getPlayerUnits() {
        if (!this.gameState) return [];

        return this.gameState.board
            .map((unit, index) => ({ unit, index }))
            .filter(({ unit }) => unit && unit.owner === this.playerIndex);
    }

    getEnemyUnits() {
        if (!this.gameState) return [];

        return this.gameState.board
            .map((unit, index) => ({ unit, index }))
            .filter(({ unit }) => unit && unit.owner !== this.playerIndex);
    }

    getUnitsInRange(fromIndex, range) {
        if (!this.gameState) return [];

        const unitsInRange = [];

        for (let i = 0; i < 16; i++) {
            const unit = this.gameState.board[i];
            if (unit && this.coordinateSystem.getDistance(fromIndex, i) <= range) {
                unitsInRange.push({ unit, index: i });
            }
        }

        return unitsInRange;
    }

    // Utility functions
    canPlayCard(cardIndex) {
        if (!this.gameState || !this.isPlayerTurn()) return false;

        const player = this.gameState.players[this.playerIndex];
        const card = player.hand[cardIndex];

        return card && player.mana >= card.cost;
    }

    getCurrentTurn() {
        return this.gameState ? this.gameState.currentTurn : null;
    }
}