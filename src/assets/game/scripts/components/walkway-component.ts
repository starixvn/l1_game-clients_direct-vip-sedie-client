/**
 * Walkway Component
 * 
 * Represents a walkway segment (North, South, East, West) of the game board.
 * Builds a 2D grid of cells based on data from game-board-data.ts.
 * Each cell can be of different types (NORMAL, SPAWN, HOMEPATH) and can contain horses.
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Sprite, Color, Label, UITransform, instantiate, Prefab, Vec3, Vec2, Layout, Size, resources } from "cc";
import { gameBoardData, Walkway, Cell, Position, CellType, BaseColor } from "../game-board-data";
import { 
    WALKWAY_LENGTH, 
    WALKWAY_WIDTH, 
    WALKWAY_VERTICAL_HEIGHT, 
    CELL_DIMENSION,
    BASE_COLORS 
} from "../global-constants";
import { CellComponent } from "./cell-component";

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
        
        // Try to load cell prefab if not assigned
        if (!this.cellPrefab) {
            console.log(`[WalkwayComponent] onLoad - Cell prefab not assigned, attempting to load from resources`);
            this.loadCellPrefab(() => {
                // Initialize after prefab is loaded (or failed to load)
                this.initializeWalkway();
            });
        } else {
            console.log(`[WalkwayComponent] onLoad - Cell prefab already assigned`);
            this.initializeWalkway();
        }
    }

    /**
     * Load cell prefab from resources if not assigned
     */
    private loadCellPrefab(callback?: () => void) {
        const prefabPath = "game/prefabs/cell";
        resources.load(prefabPath, Prefab, (err, prefab) => {
            if (err) {
                console.warn(`[WalkwayComponent] loadCellPrefab - Failed to load cell prefab from ${prefabPath}: ${err.message}`);
                console.log(`[WalkwayComponent] loadCellPrefab - Will create cells programmatically instead`);
                if (callback) callback();
                return;
            }
            
            if (prefab) {
                this.cellPrefab = prefab;
                console.log(`[WalkwayComponent] loadCellPrefab - Successfully loaded cell prefab from ${prefabPath}`);
            }
            
            if (callback) callback();
        });
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

            // Sort cells for proper grid layout ordering
            // For horizontal walkways (East/West): sort by row first, then column (row-major order)
            // For vertical walkways (North/South): sort by column first, then row (column-major order)
            this.walkwayCells.sort((a, b) => {
                if (this.isHorizontal) {
                    // Horizontal: row-major order (row 0: col 0,1,2... then row 1: col 0,1,2...)
                    if (a.row !== b.row) {
                        return a.row - b.row;
                    }
                    return a.column - b.column;
                } else {
                    // Vertical: column-major order (col 0: row 0,1,2... then col 1: row 0,1,2...)
                    if (a.column !== b.column) {
                        return a.column - b.column;
                    }
                    return a.row - b.row;
                }
            });

            console.log(`[WalkwayComponent] initializeWalkway - Sorted cells (${this.isHorizontal ? "row-major" : "column-major"} order). First cell: ${this.walkwayCells[0]?.cellID}, Last cell: ${this.walkwayCells[this.walkwayCells.length - 1]?.cellID}`);
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

        // Set up Grid Layout component for automatic cell positioning
        console.log(`[WalkwayComponent] initializeWalkway - Setting up Grid Layout`);
        let layout = container.getComponent(Layout);
        if (!layout) {
            console.log(`[WalkwayComponent] initializeWalkway - Creating Layout component`);
            layout = container.addComponent(Layout);
        } else {
            console.log(`[WalkwayComponent] initializeWalkway - Layout component already exists`);
        }

        if (layout) {
            // Configure grid layout based on walkway orientation
            layout.type = Layout.Type.GRID;
            layout.resizeMode = Layout.ResizeMode.NONE; // Don't resize children
            
            if (this.isHorizontal) {
                // Horizontal walkways: cells flow horizontally (columns), then wrap to next row
                layout.startAxis = Layout.AxisDirection.HORIZONTAL;
                layout.paddingLeft = 0;
                layout.paddingRight = 0;
                layout.paddingTop = 0;
                layout.paddingBottom = 0;
                layout.spacingX = 0;
                layout.spacingY = 0;
                // Calculate grid columns based on walkway length
                layout.cellSize = new Size(CELL_DIMENSION, CELL_DIMENSION);
                console.log(`[WalkwayComponent] initializeWalkway - Grid layout configured for horizontal walkway`);
            } else {
                // Vertical walkways: cells flow vertically (rows), then wrap to next column
                layout.startAxis = Layout.AxisDirection.VERTICAL;
                layout.paddingLeft = 0;
                layout.paddingRight = 0;
                layout.paddingTop = 0;
                layout.paddingBottom = 0;
                layout.spacingX = 0;
                layout.spacingY = 0;
                layout.cellSize = new Size(CELL_DIMENSION, CELL_DIMENSION);
                console.log(`[WalkwayComponent] initializeWalkway - Grid layout configured for vertical walkway`);
            }
            
            // Enable layout
            layout.enabled = true;
            console.log(`[WalkwayComponent] initializeWalkway - Grid layout enabled`);
        } else {
            console.warn(`[WalkwayComponent] initializeWalkway - Failed to get or create Layout component`);
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

        // Create cells and add them in grid order
        // For grid layout, we need to add cells in the order they should appear in the grid
        let createdCount = 0;
        let failedCount = 0;
        
        // Create all cell nodes first
        const cellNodes: Array<{ node: Node; cell: Cell }> = [];
        this.walkwayCells.forEach((cell, index) => {
            console.log(`[WalkwayComponent] buildCells - Creating cell ${index + 1}/${this.walkwayCells.length}: ${cell.cellID} (row: ${cell.row}, column: ${cell.column}, type: ${cell.cellType})`);
            
            const cellNode = this.createCellNode(cell);
            if (cellNode) {
                cellNodes.push({ node: cellNode, cell: cell });
                createdCount++;
                console.log(`[WalkwayComponent] buildCells - Successfully created cell ${cell.cellID}`);
            } else {
                failedCount++;
                console.error(`[WalkwayComponent] buildCells - Failed to create cell ${cell.cellID}`);
            }
        });

        // Add cells to container in grid order (layout will position them)
        // For grid layout, cells should be added in row-major order (row by row, column by column)
        cellNodes.forEach(({ node, cell }) => {
            container.addChild(node);
            this.cellNodesMap.set(cell.cellID, {
                node: node,
                cell: cell,
                cellID: cell.cellID
            });
            console.log(`[WalkwayComponent] buildCells - Added cell ${cell.cellID} to container (layout will position it)`);
        });

        // Update layout to position cells
        const layout = container.getComponent(Layout);
        if (layout && layout.enabled) {
            console.log(`[WalkwayComponent] buildCells - Updating layout to position cells`);
            layout.updateLayout();
            console.log(`[WalkwayComponent] buildCells - Layout updated`);
        }
        
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
            
            // Ensure cell node has proper UITransform for grid layout
            let cellTransform = cellNode.getComponent(UITransform);
            if (cellTransform) {
                // Update size to match CELL_DIMENSION
                cellTransform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
                cellTransform.setAnchorPoint(0.5, 0.5);
                console.log(`[WalkwayComponent] createCellNode - Updated prefab UITransform: ${CELL_DIMENSION}x${CELL_DIMENSION}`);
            } else {
                console.warn(`[WalkwayComponent] createCellNode - Prefab missing UITransform, adding one`);
                cellTransform = cellNode.addComponent(UITransform);
                cellTransform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
                cellTransform.setAnchorPoint(0.5, 0.5);
            }
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

        // Store row and column information on the node for grid layout
        // Don't set position manually - let the grid layout handle it
        (cellNode as any).cellRow = cell.row;
        (cellNode as any).cellColumn = cell.column;
        
        console.log(`[WalkwayComponent] createCellNode - Cell row: ${cell.row}, column: ${cell.column} (position will be set by grid layout)`);

        // Add CellComponent to the cell node
        console.log(`[WalkwayComponent] createCellNode - Adding CellComponent to ${cell.cellID}`);
        let cellComponent = cellNode.getComponent(CellComponent);
        if (!cellComponent) {
            console.log(`[WalkwayComponent] createCellNode - Creating new CellComponent`);
            cellComponent = cellNode.addComponent(CellComponent);
        } else {
            console.log(`[WalkwayComponent] createCellNode - CellComponent already exists`);
        }

        // Set CellComponent properties
        if (cellComponent) {
            cellComponent.cellID = cell.cellID;
            cellComponent.showDebugText = this.showDebugText;
            
            // If prefab has nodeBackground, make sure it's set
            if (this.cellPrefab) {
                const backgroundNode = cellNode.getChildByName("background");
                if (backgroundNode && !cellComponent.nodeBackground) {
                    cellComponent.nodeBackground = backgroundNode;
                    console.log(`[WalkwayComponent] createCellNode - Set nodeBackground from prefab`);
                }
                
                // If prefab has circle node, set it as nodeCircleBorder
                const circleNode = cellNode.getChildByName("circle");
                if (circleNode && !cellComponent.nodeCircleBorder) {
                    cellComponent.nodeCircleBorder = circleNode;
                    console.log(`[WalkwayComponent] createCellNode - Set nodeCircleBorder from prefab`);
                }
            }
            
            console.log(`[WalkwayComponent] createCellNode - Set CellComponent properties: cellID=${cell.cellID}, showDebugText=${this.showDebugText}`);
        } else {
            console.warn(`[WalkwayComponent] createCellNode - Failed to get or create CellComponent`);
        }

        // Handle Label - check if prefab already has one, otherwise create new
        let labelNode = cellNode.getChildByName("Label");
        let cellLabel: Label = null;
        
        if (labelNode) {
            // Prefab already has Label node, use it
            console.log(`[WalkwayComponent] createCellNode - Using existing Label node from prefab`);
            cellLabel = labelNode.getComponent(Label);
            
            // Update Label UITransform to match cell size
            const labelTransform = labelNode.getComponent(UITransform);
            if (labelTransform) {
                labelTransform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
                labelTransform.setAnchorPoint(0.5, 0.5);
            }
        } else {
            // Create new Label node if prefab doesn't have one
            console.log(`[WalkwayComponent] createCellNode - Creating new Label node for cell ID`);
            labelNode = new Node(`Label_${cell.cellID}`);
            cellNode.addChild(labelNode);
            
            // Add UITransform to label node
            const labelTransform = labelNode.addComponent(UITransform);
            labelTransform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
            labelTransform.setAnchorPoint(0.5, 0.5);
            labelNode.setPosition(0, 0, 0); // Center in parent
            
            // Add Label component
            cellLabel = labelNode.addComponent(Label);
        }
        
        // Configure Label properties (update existing or configure new)
        if (cellLabel) {
            // Set text content
            cellLabel.string = cell.cellID;
            
            // Font settings - use system font
            cellLabel.fontSize = 10; // Small font size to fit in cell
            cellLabel.fontFamily = "Arial"; // Use system font
            cellLabel.lineHeight = 12; // Line height
            
            // Color settings
            cellLabel.color = new Color(255, 255, 255, 255); // White color
            
            // Outline for visibility
            cellLabel.enableOutline = true;
            cellLabel.outlineColor = new Color(0, 0, 0, 255); // Black outline for visibility
            cellLabel.outlineWidth = 2;
            
            // Alignment
            cellLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            cellLabel.verticalAlign = Label.VerticalAlign.CENTER;
            
            // Overflow handling
            cellLabel.overflow = Label.Overflow.SHRINK; // Shrink to fit
            
            // Enable wrapping
            cellLabel.enableWrapText = false; // Don't wrap, keep on one line
            
            // Use system font (important for rendering)
            (cellLabel as any)._isSystemFontUsed = true;
            (cellLabel as any)._font = null; // Use system font instead of font asset
            
            console.log(`[WalkwayComponent] createCellNode - Label configured with cell ID: ${cell.cellID}, fontSize: ${cellLabel.fontSize}, fontFamily: ${cellLabel.fontFamily}`);
        } else {
            console.warn(`[WalkwayComponent] createCellNode - Failed to get or create Label component`);
        }

        // Add cell data as user data (optional, for debugging)
        (cellNode as any).cellData = cell;

        console.log(`[WalkwayComponent] createCellNode - Cell node creation complete for ${cell.cellID}`);
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

