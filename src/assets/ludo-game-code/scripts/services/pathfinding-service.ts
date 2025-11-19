/**
 * Pathfinding Service
 * 
 * Handles pathfinding logic for horses moving on the board.
 * Extracted from HorseComponent to follow Single Responsibility Principle.
 */

import { Cell, BaseColor, GAME_CONSTANTS } from "../game-board-data";
import { IGameDataService } from "./game-data-service";

/**
 * Pathfinding service for determining next cell in horse movement
 */
export class PathfindingService {
    constructor(private dataService: IGameDataService) {}

    /**
     * Find the next cell for a horse based on current cell and base
     * @param currentCellID Current cell ID
     * @param baseID Horse's base ID
     * @returns Next cell or null if not found
     */
    findNextCell(currentCellID: string, baseID: string): Cell | null {
        const links = this.dataService.getLinksForCell(currentCellID);
        
        if (links.length === 0) {
            return null;
        }

        // If only one link, use it
        if (links.length === 1) {
            return this.getCellFromLink(links[0]);
        }

        // Multiple links - choose based on strategy
        const currentCell = this.dataService.getCell(currentCellID);
        if (!currentCell) {
            return this.getCellFromLink(links[0]); // Fallback
        }

        return this.chooseNextCell(currentCell, links, baseID);
    }

    /**
     * Choose next cell from multiple links based on game rules
     */
    private chooseNextCell(
        currentCell: Cell,
        links: Array<{ cellID: string; position: string }>,
        baseID: string
    ): Cell | null {
        // Strategy 1: If at SPAWN, prefer main walkway (not home path)
        if (currentCell.cellType === GAME_CONSTANTS.CELL_TYPE_SPAWN) {
            return this.findFirstNonHomePathCell(links);
        }

        // Strategy 2: If at own base junction, prefer home path
        if (currentCell.baseID === baseID) {
            const homePathCell = this.findHomePathCell(links, baseID);
            if (homePathCell) {
                return homePathCell;
            }
            // Otherwise continue on main walkway
            return this.findFirstNonHomePathCell(links);
        }

        // Strategy 3: If not at own base, prefer main walkway
        if (currentCell.baseID !== baseID) {
            return this.findFirstNonHomePathCell(links);
        }

        // Strategy 4: Look for home path for this base
        const homePathCell = this.findHomePathCell(links, baseID);
        if (homePathCell) {
            return homePathCell;
        }

        // Strategy 5: Prefer cells belonging to this base
        const baseCell = this.findCellForBase(links, baseID);
        if (baseCell) {
            return baseCell;
        }

        // Fallback: use first link
        return this.getCellFromLink(links[0]);
    }

    /**
     * Find first non-homepath cell from links
     */
    private findFirstNonHomePathCell(
        links: Array<{ cellID: string; position: string }>
    ): Cell | null {
        for (const link of links) {
            const cell = this.getCellFromLink(link);
            if (cell && cell.cellType !== GAME_CONSTANTS.CELL_TYPE_HOMEPATH) {
                return cell;
            }
        }
        return null;
    }

    /**
     * Find home path cell for a specific base
     */
    private findHomePathCell(
        links: Array<{ cellID: string; position: string }>,
        baseID: string
    ): Cell | null {
        for (const link of links) {
            const cell = this.getCellFromLink(link);
            if (
                cell &&
                cell.cellType === GAME_CONSTANTS.CELL_TYPE_HOMEPATH &&
                cell.baseID === baseID
            ) {
                return cell;
            }
        }
        return null;
    }

    /**
     * Find cell belonging to a specific base
     */
    private findCellForBase(
        links: Array<{ cellID: string; position: string }>,
        baseID: string
    ): Cell | null {
        for (const link of links) {
            const cell = this.getCellFromLink(link);
            if (cell && cell.baseID === baseID) {
                return cell;
            }
        }
        return null;
    }

    /**
     * Get cell from a link
     */
    private getCellFromLink(link: { cellID: string; position: string }): Cell | null {
        return this.dataService.getCell(link.cellID, link.position as any);
    }
}

