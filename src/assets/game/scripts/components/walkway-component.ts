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

        // Special handling for HOME walkway
        if (this.walkwayID === "HOME") {
            console.log(`[WalkwayComponent] initializeWalkway - Processing HOME walkway, collecting cells with notRenderInWalkway: true`);
            
            // Collect cells in specific order: NORTH first, then empty cell, then SOUTH
            this.walkwayCells = [];
            
            // Collect NORTH cells first and sort them by row (descending - highest row first)
            const northCells = gameBoardData.cells["NORTH"];
            if (northCells) {
                const cells = Object.values(northCells);
                const homeCells = cells.filter(cell => cell.notRenderInWalkway === true);
                // Sort NORTH cells by row descending (e.g., NORTH_6_1 comes before NORTH_5_1)
                homeCells.sort((a, b) => b.row - a.row);
                this.walkwayCells.push(...homeCells);
                console.log(`[WalkwayComponent] initializeWalkway - Found ${homeCells.length} HOME cells in position NORTH (sorted by row descending)`);
            }
            
            // Create empty placeholder cell between NORTH and SOUTH
            const emptyCell: Cell = {
                baseID: "",
                cellID: "HOME_EMPTY",
                column: 0,
                position: "HOME",
                row: 0,
                cellType: "NORMAL",
                horseIDs: [],
                index: -1,
                notRenderInWalkway: false
            };
            this.walkwayCells.push(emptyCell);
            console.log(`[WalkwayComponent] initializeWalkway - Added empty placeholder cell between NORTH and SOUTH`);
            
            // Collect SOUTH cells and sort them by row (ascending - lowest row first)
            const southCells = gameBoardData.cells["SOUTH"];
            if (southCells) {
                const cells = Object.values(southCells);
                const homeCells = cells.filter(cell => cell.notRenderInWalkway === true);
                // Sort SOUTH cells by row ascending (e.g., SOUTH_0_1 comes before SOUTH_1_1)
                homeCells.sort((a, b) => a.row - b.row);
                this.walkwayCells.push(...homeCells);
                console.log(`[WalkwayComponent] initializeWalkway - Found ${homeCells.length} HOME cells in position SOUTH (sorted by row ascending)`);
            }

            console.log(`[WalkwayComponent] initializeWalkway - Total HOME cells collected: ${this.walkwayCells.length}`);
            
            // For HOME walkway, determine orientation based on first cell or default to vertical
            if (this.walkwayCells.length > 0) {
                const firstCell = this.walkwayCells[0];
                // Skip empty cell for orientation check
                const realCell = firstCell.cellID === "HOME_EMPTY" && this.walkwayCells.length > 1 
                    ? this.walkwayCells[1] 
                    : firstCell;
                this.isHorizontal = realCell.position === "EAST" || realCell.position === "WEST";
            } else {
                this.isHorizontal = false; // Default to vertical
            }
            console.log(`[WalkwayComponent] initializeWalkway - HOME walkway orientation: ${this.isHorizontal ? "Horizontal" : "Vertical"}`);
        } else {
            // Normal walkway processing
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
            } else {
                console.warn(`[WalkwayComponent] initializeWalkway - No cells found for position ${this.walkwayData.position}`);
            }
        }

        // Sort cells for proper grid layout ordering
        // Skip sorting for HOME walkway - preserve the order: NORTH cells -> empty cell -> SOUTH cells
        if (this.walkwayID !== "HOME" && this.walkwayCells.length > 0) {
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
        } else if (this.walkwayID === "HOME") {
            console.log(`[WalkwayComponent] initializeWalkway - HOME walkway: preserving order (NORTH -> empty -> SOUTH)`);
        }

        // Set up container
        const container = this.cellsContainer || this.node;
        console.log(`[WalkwayComponent] initializeWalkway - Using container: ${container.name}`);
        
        // Set container size based on walkway orientation
        const transform = container.getComponent(UITransform);
        if (transform) {
            let width: number, height: number;
            
            if (this.walkwayID === "HOME") {
                // Fixed dimensions for HOME walkway
                width = 1 * CELL_DIMENSION;
                height = 3 * CELL_DIMENSION;
                console.log(`[WalkwayComponent] initializeWalkway - HOME walkway container size: ${width}x${height}`);
            } else {
                // Normal walkway: use fixed dimensions
                if (this.isHorizontal) {
                    width = WALKWAY_LENGTH * CELL_DIMENSION;
                    height = WALKWAY_WIDTH * CELL_DIMENSION;
                } else {
                    width = WALKWAY_WIDTH * CELL_DIMENSION;
                    height = WALKWAY_VERTICAL_HEIGHT * CELL_DIMENSION;
                }
            }
            
            transform.setContentSize(width, height);
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
        
        // Handle empty placeholder cell (for HOME walkway)
        if (cell.cellID === "HOME_EMPTY") {
            return this.createEmptyCellNode();
        }
        
        let cellNode: Node;

        // Get cell color based on the base it belongs to
        const cellColor = this.getCellColor(cell);
        console.log(`[WalkwayComponent] createCellNode - Cell color for ${cell.cellID}: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);

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

            // Apply cell color to prefab's sprite (if it has one)
            // First try to find a background node, otherwise use the root node's sprite
            const backgroundNode = cellNode.getChildByName("background");
            let spriteToColor: Sprite = null;
            
            if (backgroundNode) {
                spriteToColor = backgroundNode.getComponent(Sprite);
                console.log(`[WalkwayComponent] createCellNode - Found background node, applying color to its sprite`);
            } else {
                // Try root node's sprite
                spriteToColor = cellNode.getComponent(Sprite);
                if (spriteToColor) {
                    console.log(`[WalkwayComponent] createCellNode - Found sprite on root node, applying color`);
                }
            }

            if (spriteToColor) {
                spriteToColor.color = cellColor;
                console.log(`[WalkwayComponent] createCellNode - Applied cell color to sprite: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);
            } else {
                console.warn(`[WalkwayComponent] createCellNode - No sprite found on prefab to apply color. Cell color is based on base: ${cell.baseID}`);
            }

            // Handle normal node for NORMAL cell type
            if (cell.cellType === "NORMAL") {
                const normalNode = cellNode.getChildByName("normal");
                if (normalNode) {
                    const normalSprite = normalNode.getComponent(Sprite);
                    if (normalSprite) {
                        normalSprite.color = cellColor;
                        normalNode.active = true; // Enable the node (it's disabled by default)
                        console.log(`[WalkwayComponent] createCellNode - Applied cell color to normal node and enabled it: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);
                    } else {
                        console.log(`[WalkwayComponent] createCellNode - Normal node found but no Sprite component`);
                    }
                } else {
                    console.log(`[WalkwayComponent] createCellNode - No normal node found for NORMAL cell`);
                }
            }

            // Handle home-path node for HOMEPATH cell type
            if (cell.cellType === "HOMEPATH") {
                const homePathNode = cellNode.getChildByName("home-path");
                if (homePathNode) {
                    const homePathSprite = homePathNode.getComponent(Sprite);
                    if (homePathSprite) {
                        homePathSprite.color = cellColor;
                        homePathNode.active = true; // Enable the node (it's disabled by default)
                        console.log(`[WalkwayComponent] createCellNode - Applied cell color to home-path node and enabled it: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);
                    } else {
                        console.log(`[WalkwayComponent] createCellNode - Home-path node found but no Sprite component`);
                    }
                } else {
                    console.log(`[WalkwayComponent] createCellNode - No home-path node found for HOMEPATH cell`);
                }
            }

            // Handle release node for SPAWN cell type
            if (cell.cellType === "SPAWN") {
                const releaseNode = cellNode.getChildByName("release");
                if (releaseNode) {
                    const releaseSprite = releaseNode.getComponent(Sprite);
                    if (releaseSprite) {
                        releaseSprite.color = cellColor;
                        releaseNode.active = true; // Enable the node (it's disabled by default)
                        console.log(`[WalkwayComponent] createCellNode - Applied cell color to release node and enabled it: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);
                    } else {
                        console.log(`[WalkwayComponent] createCellNode - Release node found but no Sprite component`);
                    }
                } else {
                    console.log(`[WalkwayComponent] createCellNode - No release node found for SPAWN cell`);
                }
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
            sprite.color = cellColor;
            console.log(`[WalkwayComponent] createCellNode - Added Sprite with color: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);

            // Handle home-path node for HOMEPATH cell type (programmatic creation)
            if (cell.cellType === "HOMEPATH") {
                const homePathNode = cellNode.getChildByName("home-path");
                if (homePathNode) {
                    const homePathSprite = homePathNode.getComponent(Sprite);
                    if (homePathSprite) {
                        homePathSprite.color = cellColor;
                        homePathNode.active = true; // Enable the node (it's disabled by default)
                        console.log(`[WalkwayComponent] createCellNode - Applied cell color to home-path node and enabled it: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);
                    }
                }
            }

            // Handle release node for SPAWN cell type (programmatic creation)
            if (cell.cellType === "SPAWN") {
                const releaseNode = cellNode.getChildByName("release");
                if (releaseNode) {
                    const releaseSprite = releaseNode.getComponent(Sprite);
                    if (releaseSprite) {
                        releaseSprite.color = cellColor;
                        releaseNode.active = true; // Enable the node (it's disabled by default)
                        console.log(`[WalkwayComponent] createCellNode - Applied cell color to release node and enabled it: (${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.a})`);
                    }
                }
            }
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
                
                // If prefab has circle node, set it as nodeCircleBorder (for backward compatibility)
                const circleNode = cellNode.getChildByName("circle");
                if (circleNode && !cellComponent.nodeCircleBorder) {
                    cellComponent.nodeCircleBorder = circleNode;
                    console.log(`[WalkwayComponent] createCellNode - Set nodeCircleBorder from prefab`);
                }
                // Note: Normal node is handled separately for color setting
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
     * Create an empty cell node (no color, just placeholder)
     */
    private createEmptyCellNode(): Node {
        console.log(`[WalkwayComponent] createEmptyCellNode - Creating empty placeholder cell`);
        
        let emptyNode: Node;
        
        // Use prefab if available, otherwise create programmatically
        if (this.cellPrefab) {
            emptyNode = instantiate(this.cellPrefab);
            
            // Ensure proper UITransform
            let transform = emptyNode.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
                transform.setAnchorPoint(0.5, 0.5);
            } else {
                transform = emptyNode.addComponent(UITransform);
                transform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
                transform.setAnchorPoint(0.5, 0.5);
            }
            
            // Don't set color - leave it as default/transparent
            // Disable all child nodes that might have colors
            const backgroundNode = emptyNode.getChildByName("background");
            if (backgroundNode) {
                backgroundNode.active = false;
            }
            const normalNode = emptyNode.getChildByName("normal");
            if (normalNode) {
                normalNode.active = false;
            }
            const homePathNode = emptyNode.getChildByName("home-path");
            if (homePathNode) {
                homePathNode.active = false;
            }
            const releaseNode = emptyNode.getChildByName("release");
            if (releaseNode) {
                releaseNode.active = false;
            }
            const circleNode = emptyNode.getChildByName("circle");
            if (circleNode) {
                circleNode.active = false;
            }
            const labelNode = emptyNode.getChildByName("Label");
            if (labelNode) {
                labelNode.active = false;
            }
        } else {
            // Create programmatically - just an empty node with UITransform
            emptyNode = new Node("EmptyCell");
            const transform = emptyNode.addComponent(UITransform);
            transform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
            transform.setAnchorPoint(0.5, 0.5);
        }
        
        emptyNode.name = "EmptyCell_HOME_EMPTY";
        console.log(`[WalkwayComponent] createEmptyCellNode - Empty cell node created: ${CELL_DIMENSION}x${CELL_DIMENSION}`);
        
        return emptyNode;
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

        // Find the sprite to highlight (same logic as createCellNode)
        const backgroundNode = cellData.node.getChildByName("background");
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
                    Math.min(255, originalColor.r + 50),
                    Math.min(255, originalColor.g + 50),
                    Math.min(255, originalColor.b + 50),
                    255
                );
            }
        }

        // Also highlight normal node if it exists
        const normalNode = cellData.node.getChildByName("normal");
        if (normalNode) {
            const normalSprite = normalNode.getComponent(Sprite);
            if (normalSprite) {
                if (highlightColor) {
                    normalSprite.color = highlightColor;
                } else {
                    // Default highlight (brighter)
                    const originalColor = normalSprite.color;
                    normalSprite.color = new Color(
                        Math.min(255, originalColor.r + 50),
                        Math.min(255, originalColor.g + 50),
                        Math.min(255, originalColor.b + 50),
                        255
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
        const backgroundNode = cellData.node.getChildByName("background");
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
        const normalNode = cellData.node.getChildByName("normal");
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

