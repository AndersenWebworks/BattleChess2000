const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3002;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Game state management
const games = new Map();
const waitingPlayers = [];

class GameRoom {
  constructor(player1, player2) {
    this.id = Math.random().toString(36).substring(7);
    this.players = [player1, player2];
    this.currentTurn = 0; // Player 0 starts
    this.turnNumber = 1; // Track turn number for mana progression
    this.gameState = {
      board: new Array(16).fill(null), // 4x4 grid = 16 tiles
      currentTurn: 0, // Add currentTurn to gameState for client sync
      turnNumber: 1,
      currentPhase: 'CARD', // CARD, MOVEMENT, COMBAT
      players: [
        {
          id: player1.id,
          hand: this.createStartingHand(),
          mana: 1,
          maxMana: 1
        },
        {
          id: player2.id,
          hand: this.createStartingHand(),
          mana: 1,
          maxMana: 1
        }
      ]
    };

    // Join both players to game room
    player1.join(this.id);
    player2.join(this.id);

    // Notify players that game started
    player1.emit('gameStarted', {
      gameId: this.id,
      gameState: this.gameState,
      yourPlayerIndex: 0,
      yourName: player1.playerName,
      opponentName: player2.playerName
    });

    player2.emit('gameStarted', {
      gameId: this.id,
      gameState: this.gameState,
      yourPlayerIndex: 1,
      yourName: player2.playerName,
      opponentName: player1.playerName
    });

    console.log(`🎮 Game ${this.id} started: ${player1.playerName} vs ${player2.playerName}`);
  }

  createStartingHand() {
    // MVP: Fixed deck composition
    // 6x Scout (1 mana), 6x Archer (3 mana), 3x Knight (5 mana)
    const deck = [
      ...Array(6).fill({type: 'SCOUT', cost: 1}),
      ...Array(6).fill({type: 'ARCHER', cost: 3}),
      ...Array(3).fill({type: 'KNIGHT', cost: 5})
    ];

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Return first 5 cards as starting hand
    return deck.slice(0, 5);
  }

  playCard(playerId, cardIndex, tileIndex) {
    // Find player index
    const playerIndex = this.players[0].id === playerId ? 0 : 1;

    // Validate it's player's turn
    if (this.currentTurn !== playerIndex) {
      return { success: false, error: 'Not your turn' };
    }

    const player = this.gameState.players[playerIndex];

    // Validate card index
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false, error: 'Invalid card index' };
    }

    const card = player.hand[cardIndex];

    // Validate mana
    if (player.mana < card.cost) {
      return { success: false, error: 'Not enough mana' };
    }

    // Validate tile index
    if (tileIndex < 0 || tileIndex >= 16) {
      return { success: false, error: 'Invalid tile index' };
    }

    // Validate spawn zone
    const isValidSpawn = this.isValidSpawnZone(tileIndex, playerIndex);
    if (!isValidSpawn) {
      return { success: false, error: 'Invalid spawn zone' };
    }

    // Validate tile is empty
    if (this.gameState.board[tileIndex] !== null) {
      return { success: false, error: 'Tile occupied' };
    }

    // Create unit
    const unit = this.createUnit(card.type, playerIndex, tileIndex);

    // Update game state
    this.gameState.board[tileIndex] = unit;
    player.hand.splice(cardIndex, 1); // Remove card from hand
    player.mana -= card.cost; // Spend mana

    // Switch turns and update mana (Hearthstone style)
    this.switchTurn();

    console.log(`🎮 ${card.type} spawned at tile ${tileIndex} by player ${playerIndex}`);

    return { success: true };
  }

  isValidSpawnZone(tileIndex, playerIndex) {
    if (playerIndex === 0) {
      return tileIndex >= 12 && tileIndex <= 15; // Bottom row
    } else {
      return tileIndex >= 0 && tileIndex <= 3;   // Top row
    }
  }

  createUnit(type, owner, position) {
    const unitTypes = {
      SCOUT: { hp: 60, attack: 30, movement: 2, weapon: 'SWORD' },
      ARCHER: { hp: 80, attack: 60, movement: 1, weapon: 'BOW' },
      KNIGHT: { hp: 150, attack: 90, movement: 1, weapon: 'LANCE' }
    };

    const unitData = unitTypes[type];

    return {
      id: Math.random().toString(36).substring(7),
      type: type,
      owner: owner,
      position: position,
      currentHp: unitData.hp,
      maxHp: unitData.hp,
      attack: unitData.attack,
      movement: unitData.movement,
      weapon: unitData.weapon,
      hasActed: false
    };
  }

  switchTurn() {
    // Switch to next player
    this.currentTurn = 1 - this.currentTurn;
    this.gameState.currentTurn = this.currentTurn;

    // Increment turn number when it comes back to player 0
    if (this.currentTurn === 0) {
      this.turnNumber++;
      this.gameState.turnNumber = this.turnNumber;
    }

    // Update mana for new active player (Hearthstone style)
    const activePlayer = this.gameState.players[this.currentTurn];

    // Increase max mana (up to 10)
    if (activePlayer.maxMana < 10) {
      activePlayer.maxMana++;
    }

    // Refill mana to max
    activePlayer.mana = activePlayer.maxMana;

    // Draw a card (if deck exists - simplified for MVP)
    if (activePlayer.hand.length < 10) {
      const newCard = this.drawCard();
      if (newCard) {
        activePlayer.hand.push(newCard);
      }
    }

    console.log(`🔄 Turn ${this.turnNumber}: ${this.currentTurn === 0 ? 'Player 1' : 'Player 2'} (Mana: ${activePlayer.mana}/${activePlayer.maxMana})`);
  }

  drawCard() {
    // Simplified card draw for MVP - random card from basic set
    const cardTypes = ['SCOUT', 'ARCHER', 'KNIGHT'];
    const randomType = cardTypes[Math.floor(Math.random() * cardTypes.length)];

    const cardCosts = { SCOUT: 1, ARCHER: 3, KNIGHT: 5 };

    return {
      type: randomType,
      cost: cardCosts[randomType]
    };
  }
}

// Helper function to find game by player ID
function findPlayerGame(playerId) {
  for (const game of games.values()) {
    if (game.players.some(player => player.id === playerId)) {
      return game;
    }
  }
  return null;
}

// Random name generator for players
const playerNames = [
  'TacticalMaster', 'ChessWarrior', 'BattleKnight', 'StrategicMind', 'GridCommander',
  'CardCrusader', 'TacticalGenius', 'BattleMage', 'ChessLord', 'WarChief',
  'GridMaster', 'TacticianX', 'BattleAce', 'ChessHero', 'WarStrategist',
  'TacticalBeast', 'GridWarrior', 'BattleProud', 'ChessKing', 'WarMaster'
];

function generatePlayerName() {
  return playerNames[Math.floor(Math.random() * playerNames.length)] + Math.floor(Math.random() * 999);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  socket.playerName = generatePlayerName();
  console.log(`🎮 ${socket.playerName} (${socket.id}) connected`);
  console.log(`Debug: Player name assigned: ${socket.playerName}`);

  // Player wants to find a match
  socket.on('findMatch', () => {
    console.log(`🎮 ${socket.playerName} looking for match`);
    console.log(`Current queue size: ${waitingPlayers.length}`);

    if (waitingPlayers.length > 0) {
      // Match found! Create game with waiting player
      const opponent = waitingPlayers.shift();
      console.log(`🎯 MATCH FOUND! ${opponent.playerName} vs ${socket.playerName}`);

      const game = new GameRoom(opponent, socket);
      games.set(game.id, game);
    } else {
      // No opponent available, add to waiting queue
      waitingPlayers.push(socket);
      socket.emit('searching', { message: 'Searching for opponent...' });
      console.log(`➕ ${socket.playerName} added to queue. Queue size: ${waitingPlayers.length}`);
    }
  });

  // Player disconnects
  socket.on('disconnect', () => {
    console.log(`❌ ${socket.playerName || socket.id} disconnected`);

    // Remove from waiting queue if present
    const waitingIndex = waitingPlayers.findIndex(player => player.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
      console.log(`Removed ${socket.playerName || socket.id} from queue. Queue size: ${waitingPlayers.length}`);
    }

    // Handle game disconnection (TODO: implement reconnection logic)
  });

  // Handle card play
  socket.on('playCard', (data) => {
    console.log(`🃏 ${socket.playerName} playing card:`, data);

    // Find the game this player is in
    const game = findPlayerGame(socket.id);
    if (!game) {
      console.log('❌ Player not in a game');
      return;
    }

    const result = game.playCard(socket.id, data.cardIndex, data.tileIndex);
    if (result.success) {
      // Broadcast game state update to both players
      io.to(game.id).emit('gameUpdate', game.gameState);
      console.log(`✅ Card played successfully`);
    } else {
      // Send error to player
      socket.emit('gameError', { message: result.error });
      console.log(`❌ Card play failed: ${result.error}`);
    }
  });

  // Test message for initial multiplayer validation
  socket.on('testMessage', (data) => {
    console.log(`💬 Test message from ${socket.playerName || socket.id}:`, data.message);
    socket.broadcast.emit('testMessage', {
      from: socket.playerName || socket.id,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });
});

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check for deployment
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    games: games.size,
    waiting: waitingPlayers.length,
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  console.log(`🚀 BattleChess2000 MVP Server running on port ${PORT}`);
  console.log(`🎮 Ready to create the first Tactical Card Battler!`);
  console.log(`📱 Mobile-optimized and multiplayer-ready!`);
});