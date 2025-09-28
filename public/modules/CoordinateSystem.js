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
            return 15 - boardIndex;
        }
    }

    // Convert visual index back to board index
    visualIndexToBoardIndex(visualIndex) {
        if (this.playerIndex === 0) {
            return visualIndex;
        } else {
            return 15 - visualIndex;
        }
    }

    // Get visual x,y coordinates for rendering
    getVisualPosition(boardIndex) {
        const visualIndex = this.boardIndexToVisualIndex(boardIndex);
        const x = (visualIndex % 4) * this.tileSize;
        const y = Math.floor(visualIndex / 4) * this.tileSize;
        return { x, y };
    }

    // Convert screen coordinates to board index
    screenToBoard(screenX, screenY) {
        const tileX = Math.floor(screenX / this.tileSize);
        const tileY = Math.floor(screenY / this.tileSize);
        const visualIndex = tileY * 4 + tileX;
        return this.visualIndexToBoardIndex(visualIndex);
    }

    // Check if tile is in player's spawn zone
    isValidSpawnZone(tileIndex) {
        if (this.playerIndex === 0) {
            return tileIndex >= 12 && tileIndex <= 15; // Bottom row
        } else {
            return tileIndex >= 0 && tileIndex <= 3;   // Top row
        }
    }

    // Calculate valid movement tiles
    calculateValidMoves(fromIndex, movementPoints, gameBoard) {
        const validMoves = [];
        const fromX = fromIndex % 4;
        const fromY = Math.floor(fromIndex / 4);

        for (let dy = -movementPoints; dy <= movementPoints; dy++) {
            for (let dx = -movementPoints; dx <= movementPoints; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy); // Manhattan distance

                if (distance === 0 || distance > movementPoints) continue;

                const toX = fromX + dx;
                const toY = fromY + dy;
                const toIndex = toY * 4 + toX;

                // Check bounds
                if (toX < 0 || toX >= 4 || toY < 0 || toY >= 4) continue;

                // Check if tile is empty
                if (!gameBoard[toIndex]) {
                    validMoves.push(toIndex);
                }
            }
        }

        return validMoves;
    }

    // Calculate valid attack targets
    calculateValidTargets(fromIndex, unit, gameBoard, playerIndex) {
        const validTargets = [];
        const fromX = fromIndex % 4;
        const fromY = Math.floor(fromIndex / 4);

        // Different attack ranges based on weapon
        let range = 1; // Default melee range
        if (unit.weapon === 'BOW') {
            range = 2; // Archers have longer range
        }

        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);

                if (distance === 0 || distance > range) continue;

                const toX = fromX + dx;
                const toY = fromY + dy;
                const toIndex = toY * 4 + toX;

                // Check bounds
                if (toX < 0 || toX >= 4 || toY < 0 || toY >= 4) continue;

                // Check if there's an enemy unit
                const target = gameBoard[toIndex];
                if (target && target.owner !== playerIndex) {
                    validTargets.push(toIndex);
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