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

    /**
     * Find path from source cell to destination cell
     * Uses BFS to find the shortest path
     * @param sourceCellID Starting cell ID
     * @param targetCellID Destination cell ID
     * @param baseID Horse's base ID (for pathfinding strategy)
     * @returns Array of cells representing the path, or empty array if no path found
     */
    findPath(sourceCellID: string, targetCellID: string, baseID: string): Cell[] {
        // If source and target are the same, return empty path
        if (sourceCellID === targetCellID) {
            return [];
        }

        const visited = new Set<string>();
        const queue: Array<{ cellID: string; path: Cell[] }> = [];
        
        const sourceCell = this.dataService.getCell(sourceCellID);
        if (!sourceCell) {
            return [];
        }

        queue.push({ cellID: sourceCellID, path: [sourceCell] });
        visited.add(sourceCellID);

        while (queue.length > 0) {
            const { cellID, path } = queue.shift()!;
            const currentCell = this.dataService.getCell(cellID);
            
            if (!currentCell) {
                continue;
            }

            // Get all possible next cells from current cell
            const links = this.dataService.getLinksForCell(cellID);
            
            for (const link of links) {
                const nextCell = this.getCellFromLink(link);
                
                if (!nextCell || visited.has(nextCell.cellID)) {
                    continue;
                }

                // Check if we reached the target
                if (nextCell.cellID === targetCellID) {
                    return [...path, nextCell];
                }

                // Add to queue for further exploration
                visited.add(nextCell.cellID);
                queue.push({ cellID: nextCell.cellID, path: [...path, nextCell] });
            }
        }

        // No path found - try direct approach using index comparison
        return this.findPathByIndex(sourceCellID, targetCellID, baseID);
    }

    /**
     * Alternative pathfinding using index comparison when direct pathfinding fails
     * This handles cases where we need to move through the board sequentially
     */
    private findPathByIndex(sourceCellID: string, targetCellID: string, baseID: string): Cell[] {
        const sourceCell = this.dataService.getCell(sourceCellID);
        const targetCell = this.dataService.getCell(targetCellID);
        
        if (!sourceCell || !targetCell) {
            return [];
        }

        const path: Cell[] = [];
        let currentCell = sourceCell;
        const maxSteps = 100; // Prevent infinite loops
        let steps = 0;

        while (currentCell.cellID !== targetCellID && steps < maxSteps) {
            path.push(currentCell);
            
            // Find next cell using existing logic
            const nextCell = this.findNextCell(currentCell.cellID, baseID);
            
            if (!nextCell) {
                break;
            }

            // Check if we're getting closer to target (by index)
            const currentIndex = currentCell.index;
            const nextIndex = nextCell.index;
            const targetIndex = targetCell.index;

            // If we're moving away from target, might need different strategy
            // For now, just follow the path
            currentCell = nextCell;
            steps++;
        }

        // Add target cell if we reached it
        if (currentCell.cellID === targetCellID) {
            path.push(currentCell);
        }

        return path;
    }
}

