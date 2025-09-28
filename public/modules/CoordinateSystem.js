// CoordinateSystem.js - Board coordinate management and pathfinding
// Part of BattleChess2000 modularization

import { GameData } from './GameData.js';

export class CoordinateSystem {
    constructor(playerIndex, tileSize) {
        this.playerIndex = playerIndex;
        this.tileSize = tileSize;
    }

    setTileSize(tileSize) {
        this.tileSize = tileSize;
    }

    setPlayerIndex(playerIndex) {
        this.playerIndex = playerIndex;
    }

    // Convert board index to visual index based on player perspective
    boardIndexToVisualIndex(boardIndex) {
        if (this.playerIndex === 0) {
            return boardIndex;
        } else {
            return 24 - boardIndex; // 5x5 board has 25 tiles (0-24)
        }
    }

    // Convert visual index back to board index
    visualIndexToBoardIndex(visualIndex) {
        if (this.playerIndex === 0) {
            return visualIndex;
        } else {
            return 24 - visualIndex; // 5x5 board has 25 tiles (0-24)
        }
    }

    // Get visual x,y coordinates for rendering
    getVisualPosition(boardIndex) {
        const visualIndex = this.boardIndexToVisualIndex(boardIndex);
        const x = (visualIndex % 5) * this.tileSize;
        const y = Math.floor(visualIndex / 5) * this.tileSize;
        return { x, y };
    }

    // Convert screen coordinates to board index
    screenToBoard(screenX, screenY) {
        const tileX = Math.floor(screenX / this.tileSize);
        const tileY = Math.floor(screenY / this.tileSize);
        const visualIndex = tileY * 5 + tileX;
        return this.visualIndexToBoardIndex(visualIndex);
    }

    // Check if tile is in player's spawn zone (5x5 board)
    isValidSpawnZone(tileIndex) {
        if (this.playerIndex === 0) {
            return tileIndex >= 20 && tileIndex <= 24; // Bottom row only (20-24)
        } else {
            return tileIndex >= 0 && tileIndex <= 4;   // Top row only (0-4)
        }
    }

    // Calculate valid movement tiles with chess-like patterns
    calculateValidMoves(fromIndex, unit, gameBoard) {
        const validMoves = [];
        const fromX = fromIndex % 5;
        const fromY = Math.floor(fromIndex / 5);
        const movementType = unit.movement;

        if (movementType === 'L_SHAPE') {
            // Scout: Knight/Springer pattern - can jump over units
            const lShapeMoves = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];

            for (const [dx, dy] of lShapeMoves) {
                const toX = fromX + dx;
                const toY = fromY + dy;
                const toIndex = toY * 5 + toX;

                // Check bounds
                if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

                // Check if tile is empty (L-shape can jump over units)
                if (!gameBoard[toIndex]) {
                    validMoves.push(toIndex);
                }
            }
        } else if (movementType === 'STRAIGHT') {
            // Archer: Rook pattern - straight lines 1-2 tiles
            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

            for (const [dx, dy] of directions) {
                for (let range = 1; range <= 2; range++) {
                    const toX = fromX + dx * range;
                    const toY = fromY + dy * range;
                    const toIndex = toY * 5 + toX;

                    // Check bounds
                    if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) break;

                    // Check if blocked by unit
                    if (gameBoard[toIndex]) break;

                    validMoves.push(toIndex);
                }
            }
        } else if (movementType === 'ADJACENT') {
            // Knight: King pattern - 1 tile in all 8 directions
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            for (const [dx, dy] of directions) {
                const toX = fromX + dx;
                const toY = fromY + dy;
                const toIndex = toY * 5 + toX;

                // Check bounds
                if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

                // Check if tile is empty
                if (!gameBoard[toIndex]) {
                    validMoves.push(toIndex);
                }
            }
        } else if (movementType === 'DIAGONAL') {
            // Mage: Bishop pattern - diagonal only 1-3 tiles
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dx, dy] of directions) {
                for (let range = 1; range <= 3; range++) {
                    const toX = fromX + dx * range;
                    const toY = fromY + dy * range;
                    const toIndex = toY * 5 + toX;

                    // Check bounds
                    if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) break;

                    // Check if blocked by unit
                    if (gameBoard[toIndex]) break;

                    validMoves.push(toIndex);
                }
            }
        }

        return validMoves;
    }

    // Calculate valid attack targets with chess-like patterns
    calculateValidTargets(fromIndex, unit, gameBoard, playerIndex) {
        const validTargets = [];
        const fromX = fromIndex % 5;
        const fromY = Math.floor(fromIndex / 5);

        if (unit.weapon === 'SWORD') {
            // Scout: Melee range 1 (adjacent)
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            for (const [dx, dy] of directions) {
                const toX = fromX + dx;
                const toY = fromY + dy;
                const toIndex = toY * 5 + toX;

                // Check bounds
                if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

                // Check if there's an enemy unit
                const target = gameBoard[toIndex];
                if (target && target.owner !== playerIndex) {
                    validTargets.push(toIndex);
                }
            }
        } else if (unit.weapon === 'BOW') {
            // Archer: All directions range 2
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            for (const [dx, dy] of directions) {
                for (let range = 1; range <= 2; range++) {
                    const toX = fromX + dx * range;
                    const toY = fromY + dy * range;
                    const toIndex = toY * 5 + toX;

                    // Check bounds
                    if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) break;

                    const target = gameBoard[toIndex];
                    if (target) {
                        // If enemy, can attack
                        if (target.owner !== playerIndex) {
                            validTargets.push(toIndex);
                        }
                        // Stop line regardless (blocked by any unit)
                        break;
                    }
                }
            }
        } else if (unit.weapon === 'LANCE') {
            // Knight: Melee range 1 (adjacent)
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            for (const [dx, dy] of directions) {
                const toX = fromX + dx;
                const toY = fromY + dy;
                const toIndex = toY * 5 + toX;

                // Check bounds
                if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) continue;

                // Check if there's an enemy unit
                const target = gameBoard[toIndex];
                if (target && target.owner !== playerIndex) {
                    validTargets.push(toIndex);
                }
            }
        } else if (unit.weapon === 'STAFF') {
            // Mage: Diagonal range 4
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dx, dy] of directions) {
                for (let range = 1; range <= 4; range++) {
                    const toX = fromX + dx * range;
                    const toY = fromY + dy * range;
                    const toIndex = toY * 5 + toX;

                    // Check bounds
                    if (toX < 0 || toX >= 5 || toY < 0 || toY >= 5) break;

                    const target = gameBoard[toIndex];
                    if (target) {
                        // If enemy, can attack
                        if (target.owner !== playerIndex) {
                            validTargets.push(toIndex);
                        }
                        // Stop line regardless (blocked by any unit)
                        break;
                    }
                }
            }
        }

        return validTargets;
    }

    // Get distance between two tiles (Manhattan distance)
    getDistance(fromIndex, toIndex) {
        const fromX = fromIndex % 4;
        const fromY = Math.floor(fromIndex / 4);
        const toX = toIndex % 4;
        const toY = Math.floor(toIndex / 4);

        return Math.abs(toX - fromX) + Math.abs(toY - fromY);
    }

    // Check if two tiles are adjacent
    areAdjacent(index1, index2) {
        return this.getDistance(index1, index2) === 1;
    }

    // Get all adjacent tiles to a given index
    getAdjacentTiles(index) {
        const x = index % 4;
        const y = Math.floor(index / 4);
        const adjacent = [];

        const directions = [
            { dx: 0, dy: -1 }, // Up
            { dx: 1, dy: 0 },  // Right
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }  // Left
        ];

        directions.forEach(dir => {
            const newX = x + dir.dx;
            const newY = y + dir.dy;

            if (newX >= 0 && newX < 4 && newY >= 0 && newY < 4) {
                adjacent.push(newY * 4 + newX);
            }
        });

        return adjacent;
    }

    // Convert index to row and column
    indexToRowCol(index) {
        return {
            row: Math.floor(index / 4),
            col: index % 4
        };
    }

    // Convert row and column to index
    rowColToIndex(row, col) {
        return row * 4 + col;
    }
}