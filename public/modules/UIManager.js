// UIManager.js - User interface and menu management
// Part of BattleChess2000 modularization

import { GameData } from './GameData.js';

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
        this.inGame = true;
    }

    updateGameState() {
        if (!this.gameState) return;

        const player = this.gameState.players[this.playerIndex];

        // Update mana display
        document.getElementById('manaDisplay').textContent = `Mana: ${player.mana}/${player.maxMana}`;

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
        cardDiv.className = 'card';
        cardDiv.dataset.cardIndex = index;

        const unitData = GameData.UNIT_TYPES[card.type];
        const canPlay = this.gameState.players[this.playerIndex].mana >= card.cost;

        cardDiv.classList.add(`card-${card.type.toLowerCase()}`);

        if (!canPlay) {
            cardDiv.classList.add('disabled');
        }

        // Get unit-specific symbol and weapon
        let unitSymbol, weaponIcon;
        if (card.type === 'SCOUT') {
            unitSymbol = '🗡';
            weaponIcon = '⚔️';
        } else if (card.type === 'ARCHER') {
            unitSymbol = '🏹';
            weaponIcon = '🎯';
        } else if (card.type === 'KNIGHT') {
            unitSymbol = '🛡';
            weaponIcon = '🗡️';
        }

        cardDiv.innerHTML = `
            <div class="card-header">
                <span class="card-symbol">${unitSymbol}</span>
                <span class="card-cost">${card.cost}</span>
            </div>
            <div class="card-title">${card.type}</div>
            <div class="card-stats">
                HP: ${unitData.hp} | ATK: ${unitData.attack}
                <br>
                Move: ${unitData.movement} | ${weaponIcon} ${unitData.weapon}
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
        document.querySelectorAll('.card').forEach(card => {
            card.style.transform = '';
            card.classList.remove('selected');
        });

        // Highlight selected card
        const cardElement = document.querySelector(`[data-card-index="${index}"]`);
        cardElement.style.transform = 'translateY(-10px)';
        cardElement.classList.add('selected');

        this.selectedCard = index;

        console.log(`✅ Card selected: ${card.type} (Cost: ${card.cost})`);
        return true;
    }

    getSelectedCard() {
        return this.selectedCard;
    }

    clearCardSelection() {
        this.selectedCard = null;
        document.querySelectorAll('.card').forEach(card => {
            card.style.transform = '';
            card.classList.remove('selected');
        });
    }

    setCardSelectCallback(callback) {
        this.onCardSelect = callback;
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
}