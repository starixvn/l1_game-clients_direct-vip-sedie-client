/**
 * Walkway Component
 * 
 * Represents a walkway segment (North, South, East, West) of the game board.
 * Builds a 2D grid of cells based on data from game-board-data.ts.
 * Each cell can be of different types (NORMAL, SPAWN, HOMEPATH) and can contain horses.
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Sprite, Color, Label, UITransform, instantiate, Prefab, Vec3 } from "cc";
import { gameBoardData, Walkway, Cell, Position, CellType, BaseColor } from "../game-board-data";
import { 
    WALKWAY_LENGTH, 
    WALKWAY_WIDTH, 
    WALKWAY_VERTICAL_HEIGHT, 
    CELL_DIMENSION,
    BASE_COLORS 
} from "../global-constants";

const { ccclass, property } = _decorator;

/**
 * Walkway position type
 */
export type WalkwayPosition = "NORTH" | "EAST" | "SOUTH" | "WEST";

/**
 * Cell node data structure
 */
interface CellNodeData {
    node: Node;
    cell: Cell;
    cellID: string;
}

@ccclass("WalkwayComponent")
export class WalkwayComponent extends Component {
    /** Walkway ID (e.g., WALKWAY_1, WALKWAY_2, etc.) */
    @property({ type: String, tooltip: "Walkway ID (e.g., WALKWAY_1, WALKWAY_2, WALKWAY_3, WALKWAY_4)" })
    walkwayID: string = "";

    /** Whether to show debug text */
    @property({ type: Boolean, tooltip: "Show debug information" })
    showDebugText: boolean = true;

    /** Prefab for cell nodes (optional - if not provided, cells will be created programmatically) */
    @property({ type: Prefab, tooltip: "Cell prefab (optional)" })
    cellPrefab: Prefab = null;

    /** Container node for cells */
    @property({ type: Node, tooltip: "Container node for cells (if null, uses this node)" })
    cellsContainer: Node = null;

    /** Debug label node (optional) */
    @property({ type: Node, tooltip: "Debug label node (optional)" })
    nodeDebugInfo: Node = null;

    /** Walkway data from gameBoardData */
    private walkwayData: Walkway | null = null;

    /** Map of cellID to cell node data */
    private cellNodesMap: Map<string, CellNodeData> = new Map();

    /** All cells for this walkway position */
    private walkwayCells: Cell[] = [];

    /** Whether this walkway is horizontal (East/West) */
    private isHorizontal: boolean = false;

    onLoad() {
        console.log(`[WalkwayComponent] onLoad - walkwayID: ${this.walkwayID}`);
        this.initializeWalkway();
    }

    /**
     * Initialize the walkway with data from gameBoardData
     */
    private initializeWalkway() {
        console.log(`[WalkwayComponent] initializeWalkway - Starting initialization for walkwayID: ${this.walkwayID}`);
        
        if (!this.walkwayID) {
            console.warn("[WalkwayComponent] initializeWalkway - walkwayID is not set");
            return;
        }

        // Find walkway data
        this.walkwayData = gameBoardData.walkways.find(walkway => walkway.ID === this.walkwayID) || null;
        
        if (!this.walkwayData) {
            console.warn(`[WalkwayComponent] initializeWalkway - Walkway data not found for ${this.walkwayID}`);
            return;
        }

        console.log(`[WalkwayComponent] initializeWalkway - Found walkway data:`, {
            ID: this.walkwayData.ID,
            position: this.walkwayData.position,
            baseID: this.walkwayData.baseID
        });

        // Determine if walkway is horizontal (East/West) or vertical (North/South)
        this.isHorizontal = this.walkwayData.position === "EAST" || this.walkwayData.position === "WEST";
        console.log(`[WalkwayComponent] initializeWalkway - Walkway orientation: ${this.isHorizontal ? "Horizontal" : "Vertical"}`);

        // Get all cells for this walkway position
        const positionCells = gameBoardData.cells[this.walkwayData.position];
        console.log(`[WalkwayComponent] initializeWalkway - Found ${positionCells ? Object.keys(positionCells).length : 0} cells for position ${this.walkwayData.position}`);
        
        if (positionCells) {
            const allCells = Object.values(positionCells);
            console.log(`[WalkwayComponent] initializeWalkway - Total cells before filtering: ${allCells.length}`);
            
            this.walkwayCells = allCells.filter(cell => {
                // Filter out cells that should not be rendered in walkway
                const shouldRender = !cell.notRenderInWalkway;
                if (!shouldRender) {
                    console.log(`[WalkwayComponent] initializeWalkway - Filtering out cell ${cell.cellID} (notRenderInWalkway: true)`);
                }
                return shouldRender;
            });

            console.log(`[WalkwayComponent] initializeWalkway - Cells after filtering: ${this.walkwayCells.length}`);

            // Sort cells by row and column for proper ordering
            this.walkwayCells.sort((a, b) => {
                if (a.row !== b.row) {
                    return a.row - b.row;
                }
                return a.column - b.column;
            });

            console.log(`[WalkwayComponent] initializeWalkway - Sorted cells. First cell: ${this.walkwayCells[0]?.cellID}, Last cell: ${this.walkwayCells[this.walkwayCells.length - 1]?.cellID}`);
        } else {
            console.warn(`[WalkwayComponent] initializeWalkway - No cells found for position ${this.walkwayData.position}`);
        }

        // Set up container
        const container = this.cellsContainer || this.node;
        console.log(`[WalkwayComponent] initializeWalkway - Using container: ${container.name}`);
        
        // Set container size based on walkway orientation
        const transform = container.getComponent(UITransform);
        if (transform) {
            let width: number, height: number;
            if (this.isHorizontal) {
                width = WALKWAY_LENGTH * CELL_DIMENSION;
                height = WALKWAY_WIDTH * CELL_DIMENSION;
                transform.setContentSize(width, height);
            } else {
                width = WALKWAY_WIDTH * CELL_DIMENSION;
                height = WALKWAY_VERTICAL_HEIGHT * CELL_DIMENSION;
                transform.setContentSize(width, height);
            }
            console.log(`[WalkwayComponent] initializeWalkway - Container size set: ${width}x${height}`);
        } else {
            console.warn(`[WalkwayComponent] initializeWalkway - No UITransform found on container`);
        }

        // Build cells
        console.log(`[WalkwayComponent] initializeWalkway - Building ${this.walkwayCells.length} cells...`);
        this.buildCells();

        // Update debug info
        if (this.showDebugText) {
            this.updateDebugInfo();
        }
        
        console.log(`[WalkwayComponent] initializeWalkway - Initialization complete for ${this.walkwayID}`);
    }

    /**
     * Build all cells for this walkway
     */
    private buildCells() {
        console.log(`[WalkwayComponent] buildCells - Starting to build cells`);
        const container = this.cellsContainer || this.node;

        // Clear existing cells
        const existingChildrenCount = container.children.length;
        console.log(`[WalkwayComponent] buildCells - Clearing ${existingChildrenCount} existing children`);
        this.cellNodesMap.clear();
        container.removeAllChildren();

        // Create cells
        let createdCount = 0;
        let failedCount = 0;
        
        this.walkwayCells.forEach((cell, index) => {
            console.log(`[WalkwayComponent] buildCells - Creating cell ${index + 1}/${this.walkwayCells.length}: ${cell.cellID} (row: ${cell.row}, column: ${cell.column}, type: ${cell.cellType})`);
            
            const cellNode = this.createCellNode(cell);
            if (cellNode) {
                container.addChild(cellNode);
                this.cellNodesMap.set(cell.cellID, {
                    node: cellNode,
                    cell: cell,
                    cellID: cell.cellID
                });
                createdCount++;
                console.log(`[WalkwayComponent] buildCells - Successfully created and added cell ${cell.cellID} at position (${cellNode.position.x}, ${cellNode.position.y})`);
            } else {
                failedCount++;
                console.error(`[WalkwayComponent] buildCells - Failed to create cell ${cell.cellID}`);
            }
        });
        
        console.log(`[WalkwayComponent] buildCells - Completed: ${createdCount} created, ${failedCount} failed, total in map: ${this.cellNodesMap.size}`);
    }

    /**
     * Create a cell node for the given cell data
     */
    private createCellNode(cell: Cell): Node | null {
        console.log(`[WalkwayComponent] createCellNode - Creating cell node for ${cell.cellID}`);
        
        let cellNode: Node;

        // Use prefab if available, otherwise create node programmatically
        if (this.cellPrefab) {
            console.log(`[WalkwayComponent] createCellNode - Using prefab for ${cell.cellID}`);
            cellNode = instantiate(this.cellPrefab);
        } else {
            console.log(`[WalkwayComponent] createCellNode - Creating node programmatically for ${cell.cellID}`);
            cellNode = new Node(`Cell_${cell.cellID}`);
            
            // Add UITransform
            const transform = cellNode.addComponent(UITransform);
            transform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
            transform.setAnchorPoint(0.5, 0.5);
            console.log(`[WalkwayComponent] createCellNode - Added UITransform: ${CELL_DIMENSION}x${CELL_DIMENSION}`);

            // Add Sprite for visual representation
            const sprite = cellNode.addComponent(Sprite);
            const cellColor = this.getCellColor(cell);
            sprite.color = cellColor;
            console.log(`[WalkwayComponent] createCellNode - Added Sprite with color: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);
        }

        // Set cell name
        cellNode.name = `Cell_${cell.cellID}`;

        // Position the cell based on row and column
        // For horizontal walkways (East/West), row is Y, column is X
        // For vertical walkways (North/South), row is Y, column is X
        const x = cell.column * CELL_DIMENSION;
        const y = -cell.row * CELL_DIMENSION; // Negative Y because Cocos uses top-left origin
        
        console.log(`[WalkwayComponent] createCellNode - Raw position calculation: x=${x}, y=${y} (row=${cell.row}, column=${cell.column})`);
        
        // Adjust position based on walkway orientation
        let finalX: number, finalY: number;
        if (this.isHorizontal) {
            // For horizontal walkways, center the cells
            const offsetX = (WALKWAY_LENGTH - 1) * CELL_DIMENSION / 2;
            const offsetY = (WALKWAY_WIDTH - 1) * CELL_DIMENSION / 2;
            finalX = x - offsetX;
            finalY = -y + offsetY;
            console.log(`[WalkwayComponent] createCellNode - Horizontal walkway offsets: offsetX=${offsetX}, offsetY=${offsetY}`);
        } else {
            // For vertical walkways, center the cells
            const offsetX = (WALKWAY_WIDTH - 1) * CELL_DIMENSION / 2;
            const offsetY = (WALKWAY_VERTICAL_HEIGHT - 1) * CELL_DIMENSION / 2;
            finalX = x - offsetX;
            finalY = -y + offsetY;
            console.log(`[WalkwayComponent] createCellNode - Vertical walkway offsets: offsetX=${offsetX}, offsetY=${offsetY}`);
        }
        
        cellNode.setPosition(finalX, finalY, 0);
        console.log(`[WalkwayComponent] createCellNode - Final position set: (${finalX}, ${finalY}, 0) for ${cell.cellID}`);

        // Add cell data as user data (optional, for debugging)
        (cellNode as any).cellData = cell;

        return cellNode;
    }

    /**
     * Get color for a cell based on its type and base
     */
    private getCellColor(cell: Cell): Color {
        console.log(`[WalkwayComponent] getCellColor - Getting color for cell ${cell.cellID}, type: ${cell.cellType}, baseID: ${cell.baseID}`);
        
        // Find base for this cell
        const base = gameBoardData.bases.find(b => b.ID === cell.baseID);
        const baseColor = base ? base.color : null;
        
        console.log(`[WalkwayComponent] getCellColor - Found base: ${base ? base.ID : "null"}, baseColor: ${baseColor}`);

        // Determine cell color based on type
        switch (cell.cellType) {
            case "SPAWN":
            case "HOMEPATH":
            case "NORMAL":
                if (baseColor && BASE_COLORS[baseColor]) {
                    const hexColor = BASE_COLORS[baseColor];
                    const color = this.hexToColor(hexColor);
                    console.log(`[WalkwayComponent] getCellColor - Using base color: ${hexColor} -> (${color.r}, ${color.g}, ${color.b})`);
                    return color;
                } else {
                    console.log(`[WalkwayComponent] getCellColor - No base color found, using default`);
                }
                break;
        }

        // Default color (gray)
        console.log(`[WalkwayComponent] getCellColor - Returning default gray color`);
        return new Color(128, 128, 128, 255);
    }

    /**
     * Convert hex color string to Color object
     */
    private hexToColor(hex: string): Color {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return new Color(r, g, b, 255);
    }

    /**
     * Update debug information display
     */
    private updateDebugInfo() {
        console.log(`[WalkwayComponent] updateDebugInfo - Updating debug info`);
        
        if (!this.nodeDebugInfo || !this.walkwayData) {
            console.log(`[WalkwayComponent] updateDebugInfo - Skipping (nodeDebugInfo: ${!!this.nodeDebugInfo}, walkwayData: ${!!this.walkwayData})`);
            return;
        }

        const label = this.nodeDebugInfo.getComponent(Label);
        if (!label) {
            console.warn(`[WalkwayComponent] updateDebugInfo - No Label component found on debug info node`);
            return;
        }

        const cellCount = this.walkwayCells.length;
        const debugText = [
            this.walkwayData.ID.replace("_", " "),
            `Position: ${this.walkwayData.position}`,
            `Base: ${this.walkwayData.baseID}`,
            `Cells: ${cellCount}`,
            `Orientation: ${this.isHorizontal ? "Horizontal" : "Vertical"}`
        ].join("\n");

        label.string = debugText;
        console.log(`[WalkwayComponent] updateDebugInfo - Debug text updated: ${debugText.replace(/\n/g, " | ")}`);
    }

    /**
     * Get cell node by cell ID
     */
    public getCellNode(cellID: string): Node | undefined {
        return this.cellNodesMap.get(cellID)?.node;
    }

    /**
     * Get cell data by cell ID
     */
    public getCellData(cellID: string): Cell | undefined {
        return this.cellNodesMap.get(cellID)?.cell;
    }

    /**
     * Get all cell nodes
     */
    public getAllCellNodes(): Node[] {
        return Array.from(this.cellNodesMap.values()).map(data => data.node);
    }

    /**
     * Get all cell data
     */
    public getAllCellData(): Cell[] {
        return Array.from(this.cellNodesMap.values()).map(data => data.cell);
    }

    /**
     * Highlight a cell (change visual appearance)
     */
    public highlightCell(cellID: string, highlightColor?: Color) {
        const cellData = this.cellNodesMap.get(cellID);
        if (!cellData) {
            return;
        }

        const sprite = cellData.node.getComponent(Sprite);
        if (sprite) {
            if (highlightColor) {
                sprite.color = highlightColor;
            } else {
                // Default highlight (brighter)
                const originalColor = sprite.color;
                sprite.color = new Color(
                    Math.min(255, originalColor.r + 50),
                    Math.min(255, originalColor.g + 50),
                    Math.min(255, originalColor.b + 50),
                    255
                );
            }
        }
    }

    /**
     * Remove highlight from a cell
     */
    public unhighlightCell(cellID: string) {
        const cellData = this.cellNodesMap.get(cellID);
        if (!cellData) {
            return;
        }

        const sprite = cellData.node.getComponent(Sprite);
        if (sprite) {
            // Restore original color
            sprite.color = this.getCellColor(cellData.cell);
        }
    }

    /**
     * Highlight multiple cells
     */
    public highlightCells(cellIDs: string[], highlightColor?: Color) {
        cellIDs.forEach(cellID => this.highlightCell(cellID, highlightColor));
    }

    /**
     * Remove highlight from multiple cells
     */
    public unhighlightCells(cellIDs: string[]) {
        cellIDs.forEach(cellID => this.unhighlightCell(cellID));
    }

    /**
     * Refresh walkway (rebuild cells)
     * Call this when cell data changes
     */
    public refreshWalkway() {
        console.log(`[WalkwayComponent] refreshWalkway - Refreshing walkway ${this.walkwayID}`);
        
        // Rebuild cells
        this.buildCells();
        
        // Update debug info
        if (this.showDebugText) {
            this.updateDebugInfo();
        }
        
        console.log(`[WalkwayComponent] refreshWalkway - Refresh complete`);
    }

    /**
     * Get walkway data
     */
    public getWalkwayData(): Walkway | null {
        return this.walkwayData;
    }

    /**
     * Get walkway position
     */
    public getWalkwayPosition(): Position | null {
        return this.walkwayData?.position || null;
    }

    /**
     * Check if walkway is horizontal
     */
    public isHorizontalWalkway(): boolean {
        return this.isHorizontal;
    }

    /**
     * Get cells by type
     */
    public getCellsByType(cellType: CellType): Cell[] {
        return this.walkwayCells.filter(cell => cell.cellType === cellType);
    }

    /**
     * Get spawn cells
     */
    public getSpawnCells(): Cell[] {
        return this.getCellsByType("SPAWN");
    }

    /**
     * Get homepath cells
     */
    public getHomepathCells(): Cell[] {
        return this.getCellsByType("HOMEPATH");
    }

    /**
     * Get normal cells
     */
    public getNormalCells(): Cell[] {
        return this.getCellsByType("NORMAL");
    }
}

