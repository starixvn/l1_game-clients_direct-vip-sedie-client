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
import { 
    Walkway, 
    Cell, 
    Position, 
    CellType, 
    BaseColor,
    GAME_CONSTANTS
} from "../game-board-data";
import { 
    WALKWAY_LENGTH, 
    WALKWAY_WIDTH, 
    WALKWAY_VERTICAL_HEIGHT, 
    CELL_DIMENSION,
    CELL_DIMENSION_MULTIPLIER
} from "../global-constants";
import { CellComponent } from "./cell-component";
import { gameDataService } from "../services/game-data-service";
import { getBaseColor } from "../utils/color-utils";
import { Logger } from "../utils/logger";

const { ccclass, property } = _decorator;

// Prefab node name constants
const NODE_NAME_BACKGROUND = "background";
const NODE_NAME_NORMAL = "normal";
const NODE_NAME_HOME_PATH = "home-path";
const NODE_NAME_RELEASE = "release";
const NODE_NAME_CIRCLE = "circle";
const NODE_NAME_LABEL = "Label";

// Prefab resource paths
const CELL_PREFAB_PATH = "ludo-game-code/prefabs/cell-prefab";          // Path to cell prefab resource

// UI constants
const ANCHOR_POINT_CENTER = 0.5;                       // Center anchor point (0.5, 0.5)
const LAYOUT_PADDING_ZERO = 0;                         // Zero padding/spacing for layouts
const CELL_LABEL_FONT_SIZE = 10;                       // Font size for cell labels
const CELL_LABEL_LINE_HEIGHT = 12;                     // Line height for cell labels
const CELL_LABEL_OUTLINE_WIDTH = 2;                    // Outline width for cell labels

// Color constants
const COLOR_WHITE_R = 255;                              // White color RGB values
const COLOR_WHITE_G = 255;
const COLOR_WHITE_B = 255;
const COLOR_WHITE_A = 255;
const COLOR_BLACK_R = 0;                               // Black color RGB values
const COLOR_BLACK_G = 0;
const COLOR_BLACK_B = 0;
const COLOR_BLACK_A = 255;
const COLOR_GRAY_R = 128;                              // Gray color RGB values (default cell color)
const COLOR_GRAY_G = 128;
const COLOR_GRAY_B = 128;
const COLOR_GRAY_A = 255;
const COLOR_MAX_VALUE = 255;                           // Maximum color value
const HIGHLIGHT_BRIGHTNESS_INCREMENT = 50;             // Brightness increment for cell highlighting

// Empty cell constants
const EMPTY_CELL_COLUMN = 0;                           // Empty cell column value
const EMPTY_CELL_ROW = 0;                              // Empty cell row value
const EMPTY_CELL_INDEX = -1;                           // Empty cell index value

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

    /** Prefab for cell nodes (optional - if not provided, cells will be created programmatically) */
    @property({ type: Prefab, tooltip: "Cell prefab (optional)" })
    cellPrefab: Prefab = null;

    /** Container node for cells */
    @property({ type: Node, tooltip: "Container node for cells (if null, uses this node)" })
    cellsContainer: Node = null;

    /** Walkway data from gameBoardData */
    private walkwayData: Walkway | null = null;

    /** Map of cellID to cell node data */
    private cellNodesMap: Map<string, CellNodeData> = new Map();

    /** All cells for this walkway position */
    private walkwayCells: Cell[] = [];

    /** Whether this walkway is horizontal (East/West) */
    private isHorizontal: boolean = false;

    onLoad() {
        if (!this.cellPrefab) {
            this.loadCellPrefab(() => {
                this.initializeWalkway();
            });
        } else {
            this.initializeWalkway();
        }
    }

    /**
     * Load cell prefab from resources if not assigned
     */
    private loadCellPrefab(callback?: () => void) {
        resources.load(CELL_PREFAB_PATH, Prefab, (err, prefab) => {
            if (err) {
                Logger.warn("WalkwayComponent", `Failed to load cell prefab from ${CELL_PREFAB_PATH}: ${err.message}`);
                if (callback) callback();
                return;
            }
            
            if (prefab) {
                this.cellPrefab = prefab;
            }
            
            if (callback) callback();
        });
    }

    /**
     * Initialize the walkway with data from gameBoardData
     */
    private initializeWalkway() {
        if (!this.walkwayID) {
            Logger.warn("WalkwayComponent", "walkwayID is not set");
            return;
        }

        if (this.walkwayID === GAME_CONSTANTS.HOME_WALKWAY_ID) {
            this.initializeHomeWalkway();
        } else {
            this.initializeNormalWalkway();
        }
    }

    /**
     * Initialize HOME walkway (special case)
     */
    private initializeHomeWalkway(): void {
        this.walkwayCells = [];
        
        // Collect NORTH cells (sorted descending)
        const northCells = gameDataService.getCellsForPosition(GAME_CONSTANTS.POSITION_NORTH);
        const homeCellsNorth = northCells
            .filter(cell => cell.notRenderInWalkway === true)
            .sort((a, b) => b.row - a.row);
        this.walkwayCells.push(...homeCellsNorth);
        
        // Add empty placeholder cell
        this.walkwayCells.push(this.createEmptyHomeCell());
        
        // Collect SOUTH cells (sorted ascending)
        const southCells = gameDataService.getCellsForPosition(GAME_CONSTANTS.POSITION_SOUTH);
        const homeCellsSouth = southCells
            .filter(cell => cell.notRenderInWalkway === true)
            .sort((a, b) => a.row - b.row);
        this.walkwayCells.push(...homeCellsSouth);

        this.determineHomeWalkwayOrientation();
        
        this.sortWalkwayCells();
        this.setupContainer();
        this.setupGridLayout();
        this.buildCells();
    }

    /**
     * Create empty placeholder cell for HOME walkway
     */
    private createEmptyHomeCell(): Cell {
        return {
            baseID: "",
            cellID: GAME_CONSTANTS.HOME_EMPTY_CELL_ID,
            column: EMPTY_CELL_COLUMN,
            position: GAME_CONSTANTS.POSITION_HOME,
            row: EMPTY_CELL_ROW,
            cellType: GAME_CONSTANTS.CELL_TYPE_NORMAL,
            horseIDs: [],
            index: EMPTY_CELL_INDEX,
            notRenderInWalkway: false
        };
    }

    /**
     * Determine orientation for HOME walkway
     */
    private determineHomeWalkwayOrientation(): void {
        if (this.walkwayCells.length === 0) {
            this.isHorizontal = false;
            return;
        }

        const firstCell = this.walkwayCells[0];
        const realCell = firstCell.cellID === GAME_CONSTANTS.HOME_EMPTY_CELL_ID && this.walkwayCells.length > 1 
            ? this.walkwayCells[1] 
            : firstCell;
        
        this.isHorizontal = realCell.position === GAME_CONSTANTS.POSITION_EAST || 
                           realCell.position === GAME_CONSTANTS.POSITION_WEST;
    }

    /**
     * Initialize normal walkway
     */
    private initializeNormalWalkway(): void {
        this.walkwayData = gameDataService.getWalkway(this.walkwayID);
        
        if (!this.walkwayData) {
            Logger.warn("WalkwayComponent", `Walkway data not found for ${this.walkwayID}`);
            return;
        }

        this.isHorizontal = this.walkwayData.position === GAME_CONSTANTS.POSITION_EAST || 
                           this.walkwayData.position === GAME_CONSTANTS.POSITION_WEST;

        const allCells = gameDataService.getCellsForPosition(this.walkwayData.position);
        this.walkwayCells = allCells.filter(cell => !cell.notRenderInWalkway);
        
        this.sortWalkwayCells();
        this.setupContainer();
        this.setupGridLayout();
        this.buildCells();
    }

    /**
     * Sort cells for proper grid layout ordering
     */
    private sortWalkwayCells(): void {
        if (this.walkwayID === GAME_CONSTANTS.HOME_WALKWAY_ID || this.walkwayCells.length === 0) {
            return; // Preserve order for HOME walkway
        }

        this.walkwayCells.sort((a, b) => {
            if (this.isHorizontal) {
                return a.row !== b.row ? a.row - b.row : a.column - b.column;
            } else {
                return a.column !== b.column ? a.column - b.column : a.row - b.row;
            }
        });
    }

    /**
     * Set up container size
     */
    private setupContainer(): void {
        const container = this.cellsContainer || this.node;
        const transform = container.getComponent(UITransform);
        
        if (!transform) {
            Logger.warn("WalkwayComponent", "No UITransform found on container");
            return;
        }

        const { width, height } = this.calculateContainerSize();
        transform.setContentSize(width, height);
    }

    /**
     * Calculate container size based on walkway type
     */
    private calculateContainerSize(): { width: number; height: number } {
        if (this.walkwayID === GAME_CONSTANTS.HOME_WALKWAY_ID) {
            // Calculate container size based on actual cell sizes
            // HOME walkway cells have width = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            // Empty cell has width = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION, height = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            // Max width = maximum width of any cell
            // Max height = sum of all cell heights (cells are stacked vertically)
            let maxWidth = CELL_DIMENSION;
            let totalHeight = 0;
            
            if (this.walkwayCells && this.walkwayCells.length > 0) {
                this.walkwayCells.forEach(cell => {
                    const { width, height } = this.calculateCellSize(cell);
                    maxWidth = Math.max(maxWidth, width);
                    totalHeight += height;
                });
            } else {
                // Fallback: HOME walkway cells are CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION wide
                // Height depends on number of cells
                maxWidth = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
                totalHeight = GAME_CONSTANTS.HOME_WALKWAY_HEIGHT * CELL_DIMENSION;
            }
            
            return {
                width: maxWidth,
                height: totalHeight
            };
        }

        if (this.isHorizontal) {
            return {
                width: WALKWAY_LENGTH * CELL_DIMENSION,
                height: WALKWAY_WIDTH * CELL_DIMENSION
            };
        }

        return {
            width: WALKWAY_WIDTH * CELL_DIMENSION,
            height: WALKWAY_VERTICAL_HEIGHT * CELL_DIMENSION
        };
    }

    /**
     * Set up grid layout component
     */
    private setupGridLayout(): void {
        const container = this.cellsContainer || this.node;
        let layout = container.getComponent(Layout);
        
        if (!layout) {
            layout = container.addComponent(Layout);
        }

        if (!layout) {
            Logger.warn("WalkwayComponent", "Failed to get or create Layout component");
            return;
        }

        layout.type = Layout.Type.GRID;
        layout.resizeMode = Layout.ResizeMode.NONE;
        layout.startAxis = this.isHorizontal ? Layout.AxisDirection.HORIZONTAL : Layout.AxisDirection.VERTICAL;
        layout.paddingLeft = LAYOUT_PADDING_ZERO;
        layout.paddingRight = LAYOUT_PADDING_ZERO;
        layout.paddingTop = LAYOUT_PADDING_ZERO;
        layout.paddingBottom = LAYOUT_PADDING_ZERO;
        layout.spacingX = LAYOUT_PADDING_ZERO;
        layout.spacingY = LAYOUT_PADDING_ZERO;
        
        // Calculate cell size based on walkway type
        // For HOME walkway, use max cell size, otherwise use standard CELL_DIMENSION
        if (this.walkwayID === GAME_CONSTANTS.HOME_WALKWAY_ID) {
            // HOME walkway cells have width = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            // Use max cell size for grid layout
            let maxCellWidth = CELL_DIMENSION;
            let maxCellHeight = CELL_DIMENSION;
            
            if (this.walkwayCells && this.walkwayCells.length > 0) {
                this.walkwayCells.forEach(cell => {
                    const { width, height } = this.calculateCellSize(cell);
                    maxCellWidth = Math.max(maxCellWidth, width);
                    maxCellHeight = Math.max(maxCellHeight, height);
                });
            } else {
                // Fallback: HOME walkway cells are CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION wide
                maxCellWidth = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
            }
            
            layout.cellSize = new Size(maxCellWidth, maxCellHeight);
        } else {
            layout.cellSize = new Size(CELL_DIMENSION, CELL_DIMENSION);
        }
        
        layout.enabled = true;
    }

    /**
     * Build all cells for this walkway
     */
    private buildCells() {
        const container = this.cellsContainer || this.node;
        this.cellNodesMap.clear();
        container.removeAllChildren();

        const cellNodes: Array<{ node: Node; cell: Cell }> = [];
        this.walkwayCells.forEach(cell => {
            const cellNode = this.createCellNode(cell);
            if (cellNode) {
                cellNodes.push({ node: cellNode, cell: cell });
            } else {
                Logger.warn("WalkwayComponent", `Failed to create cell ${cell.cellID}`);
            }
        });

        cellNodes.forEach(({ node, cell }) => {
            container.addChild(node);
            this.cellNodesMap.set(cell.cellID, {
                node: node,
                cell: cell,
                cellID: cell.cellID
            });
        });

        const layout = container.getComponent(Layout);
        if (layout && layout.enabled) {
            layout.updateLayout();
        }
    }

    /**
     * Calculate cell size based on cell type and position
     * @param cell Cell data
     * @returns Object with width and height
     */
    private calculateCellSize(cell: Cell): { width: number; height: number } {
        // Default size
        let width = CELL_DIMENSION;
        let height = CELL_DIMENSION;

        // Check for empty cell in HOME walkway
        if (cell.cellID === GAME_CONSTANTS.HOME_EMPTY_CELL_ID) {
            // Empty cell: height = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            height = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
            width = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
        }
        // Check if cell is in HOME walkway (cells with notRenderInWalkway === true)
        else if (cell.notRenderInWalkway === true) {
            // HOME walkway cells: width = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            width = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
        }
        // Check for specific cell IDs
        else if (cell.cellID === "NORTH_0_1" || cell.cellID === "SOUTH_6_1") {
            // NORTH_0_1 and SOUTH_6_1: width = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            width = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
        } else if (cell.cellID === "EAST_1_6" || cell.cellID === "WEST_1_0") {
            // EAST_1_6 and WEST_1_0: height = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            height = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
        }
        // For HOMEPATH cells, adjust size based on position
        else if (cell.cellType === GAME_CONSTANTS.CELL_TYPE_HOMEPATH) {
            const position = cell.position;
            
            // NORTH/SOUTH: width = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            if (position === "NORTH" || position === "SOUTH") {
                width = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
                height = CELL_DIMENSION;
            }
            // EAST/WEST: height = CELL_DIMENSION_MULTIPLIER * CELL_DIMENSION
            else if (position === "EAST" || position === "WEST") {
                width = CELL_DIMENSION;
                height = CELL_DIMENSION * CELL_DIMENSION_MULTIPLIER;
            }
        }

        return { width, height };
    }

    /**
     * Create a cell node for the given cell data
     */
    private createCellNode(cell: Cell): Node | null {
        console.log(`[WalkwayComponent] createCellNode - Creating cell node for ${cell.cellID}`);
        
        // Handle empty placeholder cell (for HOME walkway)
        if (cell.cellID === GAME_CONSTANTS.HOME_EMPTY_CELL_ID) {
            return this.createEmptyCellNode();
        }
        
        let cellNode: Node;

        // Use prefab if available, otherwise create node programmatically
        if (this.cellPrefab) {
            console.log(`[WalkwayComponent] createCellNode - Using prefab for ${cell.cellID}`);
            cellNode = instantiate(this.cellPrefab);
            
            // Ensure cell node has proper UITransform for grid layout
            let cellTransform = cellNode.getComponent(UITransform);
            if (cellTransform) {
                // Calculate size based on cell type and position
                const { width, height } = this.calculateCellSize(cell);
                cellTransform.setContentSize(width, height);
                cellTransform.setAnchorPoint(ANCHOR_POINT_CENTER, ANCHOR_POINT_CENTER);
                console.log(`[WalkwayComponent] createCellNode - Updated prefab UITransform: ${width}x${height}`);
            } else {
                console.warn(`[WalkwayComponent] createCellNode - Prefab missing UITransform, adding one`);
                cellTransform = cellNode.addComponent(UITransform);
                const { width, height } = this.calculateCellSize(cell);
                cellTransform.setContentSize(width, height);
                cellTransform.setAnchorPoint(ANCHOR_POINT_CENTER, ANCHOR_POINT_CENTER);
            }
        } else {
            console.log(`[WalkwayComponent] createCellNode - Creating node programmatically for ${cell.cellID}`);
            cellNode = new Node(`Cell_${cell.cellID}`);
            
            // Add UITransform
            const transform = cellNode.addComponent(UITransform);
            const { width, height } = this.calculateCellSize(cell);
            transform.setContentSize(width, height);
            transform.setAnchorPoint(ANCHOR_POINT_CENTER, ANCHOR_POINT_CENTER);
            console.log(`[WalkwayComponent] createCellNode - Added UITransform: ${width}x${height}`);

            // Add Sprite for visual representation (basic fallback)
            const sprite = cellNode.addComponent(Sprite);
            console.log(`[WalkwayComponent] createCellNode - Added Sprite component`);
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
        }

        // Set CellComponent properties and let it handle all UI updates
        if (cellComponent) {
            cellComponent.cellID = cell.cellID;
        } else {
            Logger.warn("WalkwayComponent", "Failed to get or create CellComponent");
        }

        this.setupCellLabel(cellNode, cell);
        (cellNode as any).cellData = cell;

        return cellNode;
    }

    /**
     * Setup cell label
     */
    private setupCellLabel(cellNode: Node, cell: Cell): void {
        let labelNode = cellNode.getChildByName(NODE_NAME_LABEL);
        let cellLabel: Label = null;
        
        if (labelNode) {
            cellLabel = labelNode.getComponent(Label);
            const labelTransform = labelNode.getComponent(UITransform);
            if (labelTransform) {
                labelTransform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
                labelTransform.setAnchorPoint(ANCHOR_POINT_CENTER, ANCHOR_POINT_CENTER);
            }
        } else {
            labelNode = new Node(`${NODE_NAME_LABEL}_${cell.cellID}`);
            cellNode.addChild(labelNode);
            
            const labelTransform = labelNode.addComponent(UITransform);
            labelTransform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
            labelTransform.setAnchorPoint(ANCHOR_POINT_CENTER, ANCHOR_POINT_CENTER);
            labelNode.setPosition(LAYOUT_PADDING_ZERO, LAYOUT_PADDING_ZERO, LAYOUT_PADDING_ZERO);
            
            cellLabel = labelNode.addComponent(Label);
        }
        
        if (cellLabel) {
            this.configureLabel(cellLabel, cell.cellID);
        } else {
            Logger.warn("WalkwayComponent", "Failed to get or create Label component");
        }
    }

    /**
     * Configure label properties
     */
    private configureLabel(label: Label, cellID: string): void {
        label.string = cellID;
        label.fontSize = CELL_LABEL_FONT_SIZE;
        label.fontFamily = "Arial";
        label.lineHeight = CELL_LABEL_LINE_HEIGHT;
        label.color = new Color(COLOR_WHITE_R, COLOR_WHITE_G, COLOR_WHITE_B, COLOR_WHITE_A);
        label.enableOutline = true;
        label.outlineColor = new Color(COLOR_BLACK_R, COLOR_BLACK_G, COLOR_BLACK_B, COLOR_BLACK_A);
        label.outlineWidth = CELL_LABEL_OUTLINE_WIDTH;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = false;
        (label as any)._isSystemFontUsed = true;
        (label as any)._font = null;
    }

    /**
     * Create an empty cell node (no color, just placeholder)
     */
    private createEmptyCellNode(): Node {
        // Create the empty cell data to calculate size
        const emptyCell = this.createEmptyHomeCell();
        const { width, height } = this.calculateCellSize(emptyCell);
        
        let emptyNode: Node;
        
        // Use prefab if available, otherwise create programmatically
        if (this.cellPrefab) {
            emptyNode = instantiate(this.cellPrefab);
            
            // Ensure proper UITransform with calculated size
            let transform = emptyNode.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(width, height);
                transform.setAnchorPoint(ANCHOR_POINT_CENTER, ANCHOR_POINT_CENTER);
            } else {
                transform = emptyNode.addComponent(UITransform);
                transform.setContentSize(width, height);
                transform.setAnchorPoint(ANCHOR_POINT_CENTER, ANCHOR_POINT_CENTER);
            }
            
            // Don't set color - leave it as default/transparent
            // Disable all child nodes that might have colors
            const backgroundNode = emptyNode.getChildByName(NODE_NAME_BACKGROUND);
            if (backgroundNode) {
                backgroundNode.active = false;
            }
            const normalNode = emptyNode.getChildByName(NODE_NAME_NORMAL);
            if (normalNode) {
                normalNode.active = false;
            }
            const homePathNode = emptyNode.getChildByName(NODE_NAME_HOME_PATH);
            if (homePathNode) {
                homePathNode.active = false;
            }
            const releaseNode = emptyNode.getChildByName(NODE_NAME_RELEASE);
            if (releaseNode) {
                releaseNode.active = false;
            }
            const circleNode = emptyNode.getChildByName(NODE_NAME_CIRCLE);
            if (circleNode) {
                circleNode.active = false;
            }
            const labelNode = emptyNode.getChildByName(NODE_NAME_LABEL);
            if (labelNode) {
                labelNode.active = false;
            }
        } else {
            // Create programmatically - just an empty node with UITransform
            emptyNode = new Node("EmptyCell");
            const transform = emptyNode.addComponent(UITransform);
            transform.setContentSize(width, height);
            transform.setAnchorPoint(ANCHOR_POINT_CENTER, ANCHOR_POINT_CENTER);
        }
        
        emptyNode.name = `EmptyCell_${GAME_CONSTANTS.HOME_EMPTY_CELL_ID}`;
        console.log(`[WalkwayComponent] createEmptyCellNode - Empty cell node created: ${width}x${height}`);
        
        return emptyNode;
    }

    /**
     * Get color for a cell based on its type and base
     */
    private getCellColor(cell: Cell): Color {
        console.log(`[WalkwayComponent] getCellColor - Getting color for cell ${cell.cellID}, type: ${cell.cellType}, baseID: ${cell.baseID}`);
        
        // Find base for this cell using service
        const base = gameDataService.getBase(cell.baseID);
        const baseColor = base ? base.color : null;
        
        console.log(`[WalkwayComponent] getCellColor - Found base: ${base ? base.ID : "null"}, baseColor: ${baseColor}`);

        // Determine cell color based on type
        switch (cell.cellType) {
            case GAME_CONSTANTS.CELL_TYPE_SPAWN:
            case GAME_CONSTANTS.CELL_TYPE_HOMEPATH:
            case GAME_CONSTANTS.CELL_TYPE_NORMAL:
                if (baseColor) {
                    const color = getBaseColor(baseColor);
                    if (color) {
                        console.log(`[WalkwayComponent] getCellColor - Using base color: (${color.r}, ${color.g}, ${color.b})`);
                        return color;
                    }
                }
                console.log(`[WalkwayComponent] getCellColor - No base color found, using default`);
                break;
        }

        // Default color (gray)
        console.log(`[WalkwayComponent] getCellColor - Returning default gray color`);
        return new Color(COLOR_GRAY_R, COLOR_GRAY_G, COLOR_GRAY_B, COLOR_GRAY_A);
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

        // Find the sprite to highlight (same logic as createCellNode)
        const backgroundNode = cellData.node.getChildByName(NODE_NAME_BACKGROUND);
        let spriteToHighlight: Sprite = null;
        
        if (backgroundNode) {
            spriteToHighlight = backgroundNode.getComponent(Sprite);
        } else {
            // Try root node's sprite
            spriteToHighlight = cellData.node.getComponent(Sprite);
        }

        if (spriteToHighlight) {
            if (highlightColor) {
                spriteToHighlight.color = highlightColor;
            } else {
                // Default highlight (brighter)
                const originalColor = spriteToHighlight.color;
                spriteToHighlight.color = new Color(
                    Math.min(COLOR_MAX_VALUE, originalColor.r + HIGHLIGHT_BRIGHTNESS_INCREMENT),
                    Math.min(COLOR_MAX_VALUE, originalColor.g + HIGHLIGHT_BRIGHTNESS_INCREMENT),
                    Math.min(COLOR_MAX_VALUE, originalColor.b + HIGHLIGHT_BRIGHTNESS_INCREMENT),
                    COLOR_MAX_VALUE
                );
            }
        }

        // Also highlight normal node if it exists
        const normalNode = cellData.node.getChildByName(NODE_NAME_NORMAL);
        if (normalNode) {
            const normalSprite = normalNode.getComponent(Sprite);
            if (normalSprite) {
                if (highlightColor) {
                    normalSprite.color = highlightColor;
                } else {
                    // Default highlight (brighter)
                    const originalColor = normalSprite.color;
                    normalSprite.color = new Color(
                        Math.min(COLOR_MAX_VALUE, originalColor.r + HIGHLIGHT_BRIGHTNESS_INCREMENT),
                        Math.min(COLOR_MAX_VALUE, originalColor.g + HIGHLIGHT_BRIGHTNESS_INCREMENT),
                        Math.min(COLOR_MAX_VALUE, originalColor.b + HIGHLIGHT_BRIGHTNESS_INCREMENT),
                        COLOR_MAX_VALUE
                    );
                }
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

        // Get the original base color for this cell
        const originalColor = this.getCellColor(cellData.cell);
        
        // Find the sprite to restore color (same logic as createCellNode)
        const backgroundNode = cellData.node.getChildByName(NODE_NAME_BACKGROUND);
        let spriteToRestore: Sprite = null;
        
        if (backgroundNode) {
            spriteToRestore = backgroundNode.getComponent(Sprite);
        } else {
            // Try root node's sprite
            spriteToRestore = cellData.node.getComponent(Sprite);
        }

        if (spriteToRestore) {
            // Restore original base color
            spriteToRestore.color = originalColor;
        }

        // Also restore normal node color if it exists
        const normalNode = cellData.node.getChildByName(NODE_NAME_NORMAL);
        if (normalNode) {
            const normalSprite = normalNode.getComponent(Sprite);
            if (normalSprite) {
                // Restore original base color
                normalSprite.color = originalColor;
            }
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
        return this.getCellsByType(GAME_CONSTANTS.CELL_TYPE_SPAWN);
    }

    /**
     * Get homepath cells
     */
    public getHomepathCells(): Cell[] {
        return this.getCellsByType(GAME_CONSTANTS.CELL_TYPE_HOMEPATH);
    }

    /**
     * Get normal cells
     */
    public getNormalCells(): Cell[] {
        return this.getCellsByType(GAME_CONSTANTS.CELL_TYPE_NORMAL);
    }
}

