/**
 * Game Data Service
 *
 * Service layer for accessing game board data.
 * Implements Dependency Inversion Principle by abstracting data access.
 */

import { gameBoardData, Base, Horse, Cell, Position, BaseColor, GAME_CONSTANTS, Walkway } from "../game-board-data";

/**
 * Interface for game data access
 * Allows for dependency injection and testing
 */
export interface IGameDataService {
    getBase(baseID: string): Base | null;
    getBases(): Base[];
    getHorse(horseID: string): Horse | null;
    getHorsesForBase(baseID: string): Horse[];
    getCell(cellID: string, position?: Position): Cell | null;
    getCellsForPosition(position: Position): Cell[];
    getLinksForCell(cellID: string): Array<{ cellID: string; position: string }>;
    findSpawnCellForBase(baseID: string): Cell | null;
    getWalkway(walkwayID: string): Walkway | null;
    getWalkways(): Walkway[];
}

/**
 * Implementation of game data service using gameBoardData
 */
export class GameDataService implements IGameDataService {
    getBase(baseID: string): Base | null {
        return gameBoardData.bases.find((base) => base.ID === baseID) || null;
    }

    getBases(): Base[] {
        return gameBoardData.bases;
    }

    getHorse(horseID: string): Horse | null {
        return gameBoardData.horses.find((horse) => horse.horseID === horseID) || null;
    }

    getHorsesForBase(baseID: string): Horse[] {
        return gameBoardData.horses.filter((horse) => horse.baseID === baseID);
    }

    getCell(cellID: string, position?: Position): Cell | null {
        if (position) {
            const positionCells = gameBoardData.cells[position];
            return positionCells?.[cellID] || null;
        }

        // Search through all positions
        for (const pos in gameBoardData.cells) {
            const positionCells = gameBoardData.cells[pos];
            if (positionCells[cellID]) {
                return positionCells[cellID];
            }
        }
        return null;
    }

    getCellsForPosition(position: Position): Cell[] {
        const positionCells = gameBoardData.cells[position];
        if (!positionCells) {
            return [];
        }
        return Object.values(positionCells);
    }

    getLinksForCell(cellID: string): Array<{ cellID: string; position: string }> {
        return gameBoardData.links[cellID] || [];
    }

    findSpawnCellForBase(baseID: string): Cell | null {
        for (const position in gameBoardData.cells) {
            const positionCells = gameBoardData.cells[position];
            for (const cellID in positionCells) {
                const cell = positionCells[cellID];
                if (cell.cellType === GAME_CONSTANTS.CELL_TYPE_SPAWN && cell.baseID === baseID) {
                    return cell;
                }
            }
        }
        return null;
    }

    getWalkway(walkwayID: string): Walkway | null {
        return gameBoardData.walkways.find((walkway) => walkway.ID === walkwayID) || null;
    }

    getWalkways(): Walkway[] {
        return gameBoardData.walkways;
    }
}

// Singleton instance
export const gameDataService: IGameDataService = new GameDataService();
