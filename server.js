const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Game state management
const games = new Map();
const waitingPlayers = [];

class GameRoom {
  constructor(player1, player2) {
    this.id = Math.random().toString(36).substring(7);
    this.players = [player1, player2];
    this.currentTurn = 0;
    this.gameState = {
      board: new Array(16).fill(null), // 4x4 grid = 16 tiles
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
    io.to(this.id).emit('gameStarted', {
      gameId: this.id,
      gameState: this.gameState,
      yourPlayerIndex: 0
    });

    player1.emit('gameStarted', {
      gameId: this.id,
      gameState: this.gameState,
      yourPlayerIndex: 0
    });

    player2.emit('gameStarted', {
      gameId: this.id,
      gameState: this.gameState,
      yourPlayerIndex: 1
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
    console.log(`❌ ${socket.playerName} disconnected`);

    // Remove from waiting queue if present
    const waitingIndex = waitingPlayers.findIndex(player => player.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
      console.log(`Removed ${socket.playerName} from queue. Queue size: ${waitingPlayers.length}`);
    }

    // Handle game disconnection (TODO: implement reconnection logic)
  });

  // Test message for initial multiplayer validation
  socket.on('testMessage', (data) => {
    console.log(`💬 Test message from ${socket.playerName}:`, data.message);
    socket.broadcast.emit('testMessage', {
      from: socket.playerName,
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