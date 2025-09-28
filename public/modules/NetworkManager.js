// NetworkManager.js - Socket.IO communication and network management
// Part of BattleChess2000 modularization

export class NetworkManager {
    constructor() {
        this.socket = io();
        this.isConnected = false;
        this.playerIndex = null;
        this.playerName = null;
        this.opponentName = null;

        // Callbacks for different events
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onSearching: null,
            onGameStarted: null,
            onGameUpdate: null,
            onGameError: null,
            onGameOver: null,
            onTestMessage: null
        };

        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.isConnected = true;
            if (this.callbacks.onConnect) {
                this.callbacks.onConnect(this.socket.id);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            if (this.callbacks.onDisconnect) {
                this.callbacks.onDisconnect();
            }
        });

        this.socket.on('searching', (data) => {
            console.log('🔍 Searching for opponent:', data);
            if (this.callbacks.onSearching) {
                this.callbacks.onSearching(data);
            }
        });

        this.socket.on('gameStarted', (data) => {
            console.log('🎮 Game started:', data);
            this.playerIndex = data.yourPlayerIndex;
            this.playerName = data.yourName;
            this.opponentName = data.opponentName;

            console.log(`You are: ${this.playerName}`);
            console.log(`Opponent: ${this.opponentName}`);

            if (this.callbacks.onGameStarted) {
                this.callbacks.onGameStarted(data);
            }
        });

        this.socket.on('gameUpdate', (newGameState) => {
            console.log('🔄 Game state updated:', newGameState);
            if (this.callbacks.onGameUpdate) {
                this.callbacks.onGameUpdate(newGameState);
            }
        });

        this.socket.on('gameError', (data) => {
            console.log('❌ Game error:', data.message);
            if (this.callbacks.onGameError) {
                this.callbacks.onGameError(data);
            }
        });

        this.socket.on('gameOver', (data) => {
            console.log('🏆 Game Over!', data);
            if (this.callbacks.onGameOver) {
                this.callbacks.onGameOver(data);
            }
        });

        this.socket.on('testMessage', (data) => {
            console.log('Test message received:', data);
            if (this.callbacks.onTestMessage) {
                this.callbacks.onTestMessage(data);
            }
        });
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Connection status
    getConnectionStatus() {
        return this.isConnected;
    }

    getSocketId() {
        return this.socket.id;
    }

    // Player information
    getPlayerIndex() {
        return this.playerIndex;
    }

    getPlayerName() {
        return this.playerName;
    }

    getOpponentName() {
        return this.opponentName;
    }

    // Game actions
    findMatch() {
        console.log('🎮 Finding match...');
        console.log('Socket connected:', this.socket.connected);

        if (!this.socket.connected) {
            throw new Error('Not connected to server! Please refresh.');
        }

        this.socket.emit('findMatch');
        console.log('✅ findMatch event sent to server');
        return true;
    }

    cancelSearch() {
        console.log('Cancelling search...');
        // TODO: Implement cancel search on server
        // this.socket.emit('cancelSearch');
        return true;
    }

    endTurn() {
        console.log('🔄 Ending turn...');
        this.socket.emit('nextPhase'); // Server still expects nextPhase for now
        return true;
    }

    // Card actions
    playCard(cardIndex, tileIndex) {
        console.log(`🃏 Playing card ${cardIndex} at tile ${tileIndex}`);
        this.socket.emit('playCard', {
            cardIndex: cardIndex,
            tileIndex: tileIndex
        });
        return true;
    }

    // Unit actions
    moveUnit(fromIndex, toIndex) {
        console.log(`🚶 Moving unit from ${fromIndex} to ${toIndex}`);
        this.socket.emit('moveUnit', {
            fromIndex: fromIndex,
            toIndex: toIndex
        });
        return true;
    }

    attackUnit(attackerIndex, targetIndex) {
        console.log(`⚔️ Attacking with unit at ${attackerIndex} targeting ${targetIndex}`);
        this.socket.emit('attackUnit', {
            attackerIndex: attackerIndex,
            targetIndex: targetIndex
        });
        return true;
    }

    // Test functions
    sendTestMessage() {
        this.socket.emit('testMessage', {
            message: 'Hello from BattleChess2000!',
            timestamp: new Date().toISOString()
        });
        console.log('🧪 Test message sent');
    }

    // Helper methods for error handling
    isReady() {
        return this.socket.connected;
    }

    requireConnection() {
        if (!this.socket.connected) {
            throw new Error('Not connected to server!');
        }
    }

    // Disconnect (cleanup)
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}