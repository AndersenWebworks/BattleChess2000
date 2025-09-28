// GameCore.js - Main game coordinator using modular architecture
// Part of BattleChess2000 modularization

import { GameData } from './modules/GameData.js';
import { CoordinateSystem } from './modules/CoordinateSystem.js';
import { UIManager } from './modules/UIManager.js';
import { InputHandler } from './modules/InputHandler.js';
import { NetworkManager } from './modules/NetworkManager.js';
import { GameLogic } from './modules/GameLogic.js';
import { RenderEngine } from './modules/RenderEngine.js';
import { UnitRenderer } from './modules/UnitRenderer.js';
import { AnimationSystem } from './modules/AnimationSystem.js';
import { CombatAnimations } from './modules/CombatAnimations.js';

export class BattleChess2000 {
    constructor() {
        // Get canvas reference
        this.canvas = document.getElementById('gameCanvas');

        // Initialize core modules
        this.coordinateSystem = new CoordinateSystem(0, 100); // Will be updated
        this.uiManager = new UIManager(this.canvas);
        this.networkManager = new NetworkManager();
        this.gameLogic = new GameLogic(this.coordinateSystem, this.networkManager);
        this.inputHandler = new InputHandler(this.canvas, this.coordinateSystem);

        // Initialize rendering modules with proper dependencies
        this.unitRenderer = new UnitRenderer();
        this.animationSystem = new AnimationSystem(this.coordinateSystem);
        this.combatAnimations = new CombatAnimations(this.coordinateSystem);
        this.renderEngine = new RenderEngine(this.canvas, this.coordinateSystem);

        // Game state
        this.gameState = null;
        this.playerIndex = null;
        this.playerName = null;
        this.opponentName = null;
        this.inGame = false;

        this.init();
    }

    init() {
        console.log('🚀 BattleChess2000 MVP Loading...');
        console.log('📱 Mobile-optimized Tactical Card Battler');
        console.log('🎮 Modular Architecture Active!');

        this.setupModuleConnections();
        this.setupEventHandlers();
        this.uiManager.showMainMenu();
    }

    setupModuleConnections() {
        // Connect rendering modules
        this.renderEngine.setExternalRenderers(
            this.unitRenderer,
            this.animationSystem,
            this.combatAnimations
        );

        // Setup UI callbacks
        this.uiManager.setCallbacks({
            findMatch: () => this.findMatch(),
            showHowToPlay: () => this.uiManager.showHowToPlay(),
            showMainMenu: () => this.uiManager.showMainMenu(),
            cancelSearch: () => this.cancelSearch(),
            endPhase: () => this.gameLogic.endTurn() // Changed to endTurn
        });

        // Setup card selection callback
        this.uiManager.setCardSelectCallback((index) => this.selectCard(index));

        // Setup input callbacks
        this.inputHandler.setCallbacks({
            tryPlayCard: (tileIndex) => this.tryPlayCard(tileIndex),
            showMovementOptions: (unit, index) => this.gameLogic.showMovementOptions(unit, index),
            showAttackOptions: (unit, index) => this.gameLogic.showAttackOptions(unit, index),
            tryMoveUnit: (from, to) => this.gameLogic.tryMoveUnit(from, to),
            tryAttackUnit: (from, to) => this.gameLogic.tryAttackUnit(from, to),
            render: () => this.render()
        });

        // Setup game logic callbacks
        this.gameLogic.setCallbacks({
            render: () => this.render(),
            clearSelection: () => this.clearSelection()
        });

        // Setup network callbacks
        this.networkManager.setCallbacks({
            onConnect: (socketId) => this.onConnect(socketId),
            onDisconnect: () => this.onDisconnect(),
            onSearching: (data) => this.onSearching(data),
            onGameStarted: (data) => this.onGameStarted(data),
            onGameUpdate: (newGameState) => this.onGameUpdate(newGameState),
            onGameError: (data) => this.onGameError(data),
            onGameOver: (data) => this.onGameOver(data)
        });
    }

    setupEventHandlers() {
        // Canvas resize handling
        const tileSize = this.uiManager.resizeCanvas();
        this.coordinateSystem.setTileSize(tileSize);
        this.renderEngine.setTileSize(tileSize);
    }

    // Network event handlers
    onConnect(socketId) {
        this.uiManager.updateConnectionStatus(true);
        this.uiManager.updateStatus('Connected');
        this.uiManager.updateDebugInfo(`Debug: Connected (${socketId})`);
    }

    onDisconnect() {
        this.uiManager.updateConnectionStatus(false);
        this.uiManager.updateStatus('Disconnected');
    }

    onSearching(data) {
        this.uiManager.updateStatus('Searching...');
        this.uiManager.showSearchingMenu();
    }

    onGameStarted(data) {
        this.gameState = data.gameState;
        this.playerIndex = data.yourPlayerIndex;
        this.playerName = data.yourName;
        this.opponentName = data.opponentName;

        console.log(`You are: ${this.playerName}`);
        console.log(`Opponent: ${this.opponentName}`);

        // Update all modules with new game state
        this.updateAllModules();

        this.uiManager.startGame();
        this.inGame = true;
        this.render();
    }

    onGameUpdate(newGameState) {
        console.log('🔄 onGameUpdate called - checking for animations');

        // Check for combat animations with ULTRATHINK bloody combat system
        if (this.gameState) {
            console.log('🎭 Checking combat animations with old/new state');
            this.combatAnimations.checkForAttackAnimations(
                this.gameState,
                newGameState,
                this.animationSystem
            );
        } else {
            console.log('⚠️ No previous game state - skipping animation check');
        }

        this.gameState = newGameState;
        this.updateAllModules();
        this.render();
    }

    onGameError(data) {
        console.log('❌ Game error:', data.message);
        this.uiManager.showError(data.message);
    }

    onGameOver(data) {
        const isWinner = data.winner === this.playerIndex;
        this.uiManager.showGameOverMenu(isWinner);
        this.inGame = false;
    }

    // Game actions
    resetGame() {
        // Reset all game state variables
        this.gameState = null;
        this.playerIndex = null;
        this.playerName = null;
        this.opponentName = null;
        this.inGame = false;

        // Clear UI selections and states
        this.uiManager.clearCardSelection();
        this.inputHandler.clearSelection();

        // Reset game logic state
        this.gameLogic.resetState();

        // Clear any animations
        this.animationSystem.clearAll();
        this.combatAnimations.clearAll();

        console.log('🔄 Game state reset for new match');
    }

    findMatch() {
        try {
            this.resetGame(); // Reset everything before finding new match
            this.networkManager.findMatch();
            this.uiManager.showSearchingMenu();
        } catch (error) {
            this.uiManager.showError(error.message);
        }
    }

    cancelSearch() {
        this.networkManager.cancelSearch();
        this.uiManager.showMainMenu();
    }

    selectCard(index) {
        const success = this.uiManager.selectCard(index);
        if (success) {
            this.inputHandler.setSelectedCard(index);
        }
    }

    tryPlayCard(tileIndex) {
        const cardIndex = this.uiManager.getSelectedCard();
        if (cardIndex === null) return;

        const success = this.gameLogic.tryPlayCard(tileIndex, cardIndex);
        if (success) {
            this.uiManager.clearCardSelection();
            this.inputHandler.setSelectedCard(null);
        }
    }

    clearSelection() {
        this.inputHandler.clearSelection();
        this.uiManager.clearCardSelection();
    }

    // Rendering
    render() {
        if (!this.gameState) return;

        // Update render engine with current state
        this.renderEngine.setSelection(
            this.inputHandler.getSelectedUnitIndex(),
            this.gameLogic.getValidMoves(),
            this.gameLogic.getValidTargets()
        );

        this.renderEngine.render();
    }

    // Helper method to update all modules with current game state
    updateAllModules() {
        if (!this.gameState) return;

        this.coordinateSystem.setPlayerIndex(this.playerIndex);
        this.uiManager.setGameState(this.gameState, this.playerIndex, this.playerName, this.opponentName);
        this.inputHandler.setGameState(this.gameState, this.playerIndex);
        this.gameLogic.setGameState(this.gameState, this.playerIndex);
        this.renderEngine.setGameState(this.gameState);

        // Update animation systems with game state
        this.animationSystem.setGameState(this.gameState);
        this.combatAnimations.setGameState(this.gameState);

        // Set render callback for animations
        this.animationSystem.setRenderCallback(() => this.render());

        // Update unit renderer with player index for proper colors
        this.unitRenderer.setPlayerIndex(this.playerIndex);
    }

    // Debug methods
    sendTestMessage() {
        this.networkManager.sendTestMessage();
    }

    testFindMatch() {
        console.log('🧪 Manual findMatch test');
        this.findMatch();
    }

    // Cleanup
    destroy() {
        this.networkManager.disconnect();
        this.animationSystem.clear();
        this.combatAnimations.clear();
    }

    // Add global window reference for debugging
    getDebugInfo() {
        return {
            gameState: this.gameState,
            playerIndex: this.playerIndex,
            animations: this.animationSystem.animations.length,
            particles: this.animationSystem.particles.length,
            deathAnimations: this.combatAnimations.deathAnimations.length,
            bloodPools: this.combatAnimations.bloodPools.length,
            corpses: this.combatAnimations.corpses.length
        };
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BattleChess2000();
});