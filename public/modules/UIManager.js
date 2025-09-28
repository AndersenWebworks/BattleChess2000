// UIManager.js - User interface and menu management
// Part of BattleChess2000 modularization

import { GameData } from './GameData.js';
import { ActionGuidanceManager } from './ActionGuidanceManager.js';

export class UIManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.tileSize = 0;
        this.gameState = null;
        this.playerIndex = null;
        this.selectedCard = null;
        this.inGame = false;
        this.playerName = null;
        this.opponentName = null;

        // Initialize UX Systems
        this.actionGuidanceManager = new ActionGuidanceManager();

        this.setupCanvas();
        this.setupUI();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
    }

    resizeCanvas() {
        const container = document.querySelector('.game-board-container');
        const maxWidth = container.clientWidth - 20;
        const maxHeight = container.clientHeight - 20;

        // Keep square aspect ratio for 4x4 grid
        const size = Math.min(maxWidth, maxHeight, GameData.CONFIG.MAX_CANVAS_SIZE);

        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';

        // Set actual canvas resolution (for crisp rendering)
        this.canvas.width = size;
        this.canvas.height = size;

        this.tileSize = size / GameData.CONFIG.BOARD_SIZE;

        return this.tileSize;
    }

    setupUI() {
        this.updateConnectionStatus(false);
    }

    setCallbacks(callbacks) {
        // Set up button callbacks
        document.getElementById('findMatchBtn').onclick = callbacks.findMatch;
        document.getElementById('howToPlayBtn').onclick = callbacks.showHowToPlay;
        document.getElementById('backToMenuBtn').onclick = callbacks.showMainMenu;
        document.getElementById('cancelSearchBtn').onclick = callbacks.cancelSearch;
        document.getElementById('playAgainBtn').onclick = callbacks.findMatch;
        document.getElementById('mainMenuBtn').onclick = callbacks.showMainMenu;
        document.getElementById('endPhaseBtn').onclick = callbacks.endPhase;
    }

    getTileSize() {
        return this.tileSize;
    }

    showMainMenu() {
        this.hideAllMenus();
        document.querySelector('.phase-control').classList.remove('game-active');
        document.getElementById('turnBanner').classList.remove('active');
        this.inGame = false;
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    showHowToPlay() {
        this.hideAllMenus();
        document.getElementById('howToPlayMenu').classList.remove('hidden');
    }

    showSearchingMenu() {
        this.hideAllMenus();
        document.getElementById('searchingMenu').classList.remove('hidden');
    }

    showGameOverMenu(isWinner) {
        this.hideAllMenus();
        const gameOverMenu = document.getElementById('gameOverMenu');
        const title = document.getElementById('gameOverTitle');
        const subtitle = document.getElementById('gameOverSubtitle');

        if (isWinner) {
            title.textContent = 'Victory!';
            subtitle.textContent = 'You have proven your tactical superiority!';
        } else {
            title.textContent = 'Defeat';
            subtitle.textContent = 'Your opponent has outmaneuvered you.';
        }

        gameOverMenu.classList.remove('hidden');
    }

    hideAllMenus() {
        document.querySelectorAll('.menu-screen').forEach(menu => {
            menu.classList.add('hidden');
        });
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connectionStatus');
        status.classList.toggle('connected', connected);
    }

    setGameState(gameState, playerIndex, playerName = null, opponentName = null) {
        this.gameState = gameState;
        this.playerIndex = playerIndex;
        this.playerName = playerName;
        this.opponentName = opponentName;

        if (gameState) {
            this.updateGameState();
        }
    }

    startGame() {
        this.hideAllMenus();
        document.querySelector('.phase-control').classList.add('game-active');
        document.getElementById('turnBanner').classList.add('active');
        this.inGame = true;
    }

    updateGameState() {
        if (!this.gameState) return;

        const player = this.gameState.players[this.playerIndex];

        // Update HEARTHSTONE STYLE MANA GEMS
        this.updateManaGems(player);

        // Update EPIC ACTION GUIDANCE SYSTEM
        this.actionGuidanceManager.updateGuidance(this.gameState, this.playerIndex, {
            selectedCard: this.selectedCard,
            selectedUnit: this.selectedUnit // We'll add this property
        });

        // Update game status with turn number (no phases)
        const isMyTurn = this.gameState.currentTurn === this.playerIndex;

        // Update player names if available
        if (this.playerName && this.opponentName) {
            document.getElementById('gameStatus').innerHTML =
                `<strong>${this.playerName}</strong> vs <strong>${this.opponentName}</strong><br>
                 Turn ${this.gameState.turnNumber}`;
        }

        // Update turn indicator
        if (isMyTurn) {
            document.getElementById('gameStatus').style.color = '#4CAF50';
            document.getElementById('gameStatus').innerHTML += '<br><em>Your turn - Play cards, move & attack!</em>';
        } else {
            document.getElementById('gameStatus').style.color = '#f44336';
            document.getElementById('gameStatus').innerHTML += '<br><em>Opponent\'s turn</em>';
        }

        // Update prominent turn banner
        this.updateTurnBanner(isMyTurn);

        // Update End Turn button (always "End Turn")
        const endTurnBtn = document.getElementById('endPhaseBtn'); // Keep ID for compatibility
        if (endTurnBtn) {
            if (isMyTurn) {
                endTurnBtn.disabled = false;
                endTurnBtn.textContent = 'End Turn';
            } else {
                endTurnBtn.disabled = true;
                endTurnBtn.textContent = 'End Turn';
            }
        }

        this.updateHand();
    }

    updateHand() {
        if (!this.gameState) return;

        const hand = document.getElementById('gameHand');
        const player = this.gameState.players[this.playerIndex];

        hand.innerHTML = '';

        player.hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index);
            hand.appendChild(cardElement);
        });
    }

    createCardElement(card, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'battle-card';
        cardDiv.dataset.cardIndex = index;

        const unitData = GameData.UNIT_TYPES[card.type];
        const canPlay = this.gameState.players[this.playerIndex].mana >= card.cost;

        // Add card-type specific class
        cardDiv.classList.add(`battle-card--${card.type.toLowerCase()}`);

        // Add playability states
        if (canPlay) {
            cardDiv.classList.add('battle-card--playable');
        } else {
            cardDiv.classList.add('battle-card--unplayable');
        }

        // Get unit-specific symbol and weapon icons
        let unitSymbol, weaponIcon, moveIcon;
        if (card.type === 'SCOUT') {
            unitSymbol = '🗡';
            weaponIcon = '⚔️';
            moveIcon = '🔄'; // L-shape movement
        } else if (card.type === 'ARCHER') {
            unitSymbol = '🏹';
            weaponIcon = '🎯';
            moveIcon = '📏'; // Range
        } else if (card.type === 'KNIGHT') {
            unitSymbol = '🛡';
            weaponIcon = '🗡️';
            moveIcon = '🎯'; // 8-direction
        } else if (card.type === 'MAGE') {
            unitSymbol = '🔮';
            weaponIcon = '✨';
            moveIcon = '⚡'; // Diagonal magic
        }

        // 🃏 NEW TRADING-CARD LAYOUT STRUCTURE
        cardDiv.innerHTML = `
            <div class="battle-card__header">
                <div class="battle-card__cost">${card.cost}</div>
                <div class="battle-card__type-icon">${weaponIcon}</div>
            </div>

            <div class="battle-card__art-area">
                <div class="battle-card__symbol">${unitSymbol}</div>
            </div>

            <div class="battle-card__name-bar">${card.type}</div>

            <div class="battle-card__stats">
                ${weaponIcon}${unitData.attack} ❤️${unitData.hp}
                <br>
                ${moveIcon} ${unitData.movement}
            </div>
        `;

        // Add click handler if card can be played
        if (canPlay) {
            cardDiv.addEventListener('click', () => {
                if (this.onCardSelect) {
                    this.onCardSelect(index);
                }
            });
        }

        return cardDiv;
    }

    selectCard(index) {
        // Check if it's player's turn
        if (this.gameState.currentTurn !== this.playerIndex) {
            console.log('Not your turn!');
            return;
        }

        const player = this.gameState.players[this.playerIndex];
        const card = player.hand[index];

        // Check if player has enough mana
        if (player.mana < card.cost) {
            console.log(`Not enough mana! Need ${card.cost}, have ${player.mana}`);
            return;
        }

        // Remove previous selection
        document.querySelectorAll('.battle-card').forEach(card => {
            card.classList.remove('battle-card--selected');
        });

        // Highlight selected card with new BEM class
        const cardElement = document.querySelector(`[data-card-index="${index}"]`);
        cardElement.classList.add('battle-card--selected');

        this.selectedCard = index;

        // Update action guidance for card selection
        this.actionGuidanceManager.setSelectedCard(index);

        console.log(`✅ Card selected: ${card.type} (Cost: ${card.cost})`);
        return true;
    }

    getSelectedCard() {
        return this.selectedCard;
    }

    clearCardSelection() {
        this.selectedCard = null;
        document.querySelectorAll('.battle-card').forEach(card => {
            card.classList.remove('battle-card--selected');
        });

        // Update action guidance for cleared selection
        this.actionGuidanceManager.clearSelection();
    }

    setCardSelectCallback(callback) {
        this.onCardSelect = callback;
    }

    updateTurnBanner(isMyTurn) {
        const banner = document.getElementById('turnBanner');
        const text = document.getElementById('turnText');
        const icon = document.getElementById('turnIcon');
        const context = document.getElementById('turnContext');

        // Remove previous turn classes
        banner.classList.remove('my-turn', 'opponent-turn');

        // Update main turn info
        if (isMyTurn) {
            banner.classList.add('my-turn');
            text.textContent = 'DEIN ZUG';
            icon.textContent = '⚔️';
        } else {
            banner.classList.add('opponent-turn');
            text.textContent = 'GEGNER DRAN';
            icon.textContent = '⏳';
        }

        // Update context info (players, turn number, game state)
        this.updateTurnContext(context);
    }

    updateTurnContext(contextElement) {
        if (!this.gameState || !contextElement) return;

        const playerDisplay = this.playerName || 'You';
        const opponentDisplay = this.opponentName || 'Opponent';
        const turnNumber = this.gameState.turnNumber || 1;

        // Enhanced context with all important info
        const contextText = `${playerDisplay} vs ${opponentDisplay} • Turn ${turnNumber}`;

        contextElement.textContent = contextText;
    }

    // Status and debug display methods
    updateStatus(message) {
        document.getElementById('gameStatus').textContent = message;
    }

    updateDebugInfo(message) {
        document.getElementById('debugInfo').textContent = message;
    }

    showError(message) {
        alert(message);
    }

    // HEARTHSTONE STYLE MANA GEM SYSTEM
    updateManaGems(player) {
        if (!player) return;

        const manaGemBar = document.getElementById('manaGemBar');
        if (!manaGemBar) return;

        // Generate mana gems if needed
        if (manaGemBar.children.length !== player.maxMana) {
            this.generateManaGems(player.maxMana);
        }

        // Update gem states
        const gems = manaGemBar.querySelectorAll('.mana-gem');
        gems.forEach((gem, index) => {
            if (index < player.mana) {
                gem.classList.remove('empty');
                gem.classList.add('full');
            } else {
                gem.classList.remove('full');
                gem.classList.add('empty');
            }
        });
    }

    generateManaGems(maxMana) {
        const manaGemBar = document.getElementById('manaGemBar');
        if (!manaGemBar) return;

        manaGemBar.innerHTML = '';

        for (let i = 0; i < maxMana; i++) {
            const gem = document.createElement('div');
            gem.className = 'mana-gem empty';

            const gemShape = document.createElement('div');
            gemShape.className = 'mana-gem-shape';

            const gemShine = document.createElement('div');
            gemShine.className = 'mana-gem-shine';

            gem.appendChild(gemShape);
            gem.appendChild(gemShine);
            manaGemBar.appendChild(gem);
        }
    }

    // Cleanup UX systems when destroying UIManager
    destroy() {
        if (this.actionGuidanceManager) {
            this.actionGuidanceManager.destroy();
        }
    }
}