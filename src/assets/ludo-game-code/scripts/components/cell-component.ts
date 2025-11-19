/**
 * Cell Component
 * 
 * Represents a single cell/space on the Ludo game board walkway.
 * Cells can contain horses, have different types (normal, spawn, homepath, etc.).
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Sprite, Color, Label, UITransform, Button, Graphics } from "cc";
import { Cell, CellType, Position, BaseColor, GAME_CONSTANTS } from "../game-board-data";
import { 
    CELL_DIMENSION,
    WALKWAY_LENGTH
} from "../global-constants";
import { gameDataService } from "../services/game-data-service";
import { getBaseColor } from "../utils/color-utils";
import { Logger } from "../utils/logger";

const { ccclass, property } = _decorator;

@ccclass("CellComponent")
export class CellComponent extends Component {
    /** Cell ID (e.g., NORTH_0_0, EAST_1_5, etc.) */
    @property({ type: String, tooltip: "Cell ID (e.g., NORTH_0_0, EAST_1_5)" })
    cellID: string = "";

    /** Circle border node (for SPAWN and NORMAL cells) */
    @property({ type: Node, tooltip: "Circle border node" })
    nodeCircleBorder: Node = null;

    /** Normal node (for NORMAL cell type) */
    @property({ type: Node, tooltip: "Normal node (for NORMAL cell type)" })
    nodeNormal: Node = null;

    /** Home-path node (for HOMEPATH cell type) */
    @property({ type: Node, tooltip: "Home-path node (for HOMEPATH cell type)" })
    nodeHomePath: Node = null;

    /** Release node (for SPAWN cell type) */
    @property({ type: Node, tooltip: "Release node (for SPAWN cell type)" })
    nodeRelease: Node = null;

    /** Debug info container node */
    @property({ type: Node, tooltip: "Debug info container node" })
    nodeDebugInfo: Node = null;

    /** Homepath index label node */
    @property({ type: Node, tooltip: "Homepath index label node" })
    nodeHomepathIndex: Node = null;

    /** Button component for click handling */
    private button: Button = null;

    /** Circle graphics component */
    private circleGraphics: Graphics = null;

    /** Cell data from gameBoardData */
    private cellData: Cell | null = null;

    /** Homepath index (calculated) */
    private homePathIndex: number | undefined = undefined;

    onLoad() {
        this.initializeCell();
    }

    /**
     * Initialize the cell with data from gameBoardData
     */
    private initializeCell() {
        if (!this.cellID) {
            Logger.warn("CellComponent", "cellID is not set");
            return;
        }

        this.cellData = gameDataService.getCell(this.cellID);
        if (!this.cellData) {
            Logger.warn("CellComponent", `Cell data not found for ${this.cellID}`);
            return;
        }

        this.findChildNodes();
        this.setupButton();
        this.calculateHomepathIndex();
        this.updateVisualState();
    }

    /**
     * Find child nodes by name if not assigned
     */
    private findChildNodes() {
        if (!this.nodeNormal) {
            this.nodeNormal = this.node.getChildByName("normal");
        }

        if (!this.nodeHomePath) {
            this.nodeHomePath = this.node.getChildByName("home-path");
        }

        if (!this.nodeRelease) {
            this.nodeRelease = this.node.getChildByName("release");
        }

        if (!this.nodeCircleBorder) {
            this.nodeCircleBorder = this.node.getChildByName("circle");
        }

        if (!this.nodeHomepathIndex && this.nodeHomePath) {
            this.nodeHomepathIndex = this.nodeHomePath.getChildByName("home-path-index-value");
        }
    }

    /**
     * Set up button component for click handling
     */
    private setupButton() {
        this.button = this.node.getComponent(Button);
        if (!this.button) {
            this.button = this.node.addComponent(Button);
        }
    }

    /**
     * Calculate homepath index based on walkway position
     */
    private calculateHomepathIndex() {
        if (!this.cellData || this.cellData.cellType !== GAME_CONSTANTS.CELL_TYPE_HOMEPATH) {
            this.homePathIndex = undefined;
            return;
        }

        const position = this.cellData.position;
        const row = this.cellData.row;
        const column = this.cellData.column;

        // NORTH/SOUTH are vertical, so use row
        // EAST/WEST are horizontal, so use column
        // SOUTH indices are reversed to match logical progression (opposite of NORTH)
        // EAST indices are reversed to match logical progression (opposite of WEST)
        if (position === "NORTH" || position === "SOUTH") {
            this.homePathIndex = position === "SOUTH" 
                ? WALKWAY_LENGTH - 1 - row 
                : row;
        } else if (position === "EAST" || position === "WEST") {
            this.homePathIndex = position === "EAST"
                ? WALKWAY_LENGTH - 1 - column
                : column;
        }
    }

    /**
     * Update the visual state of the cell
     */
    public updateVisualState() {
        if (!this.cellData) {
            Logger.warn("CellComponent", "No cell data available");
            return;
        }

        this.updateCellTypeUI();
        this.updateCircleBorder();

        this.updateHomepathIndex();
    }

    /**
     * Update cell type specific UI (normal, home-path, release nodes)
     * This method handles setting colors and enabling/disabling nodes based on cell type
     */
    private updateCellTypeUI() {
        if (!this.cellData) {
            return;
        }

        // Get base color for this cell using service
        const base = gameDataService.getBase(this.cellData.baseID);
        const baseColor = base ? base.color : null;
        const cellColor = baseColor ? getBaseColor(baseColor) : new Color(128, 128, 128, 255);

        // Handle NORMAL cell type
        if (this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_NORMAL) {
            this.updateNodeColor(this.nodeNormal, cellColor);
        } else if (this.nodeNormal) {
            this.nodeNormal.active = false;
        }

        // Handle HOMEPATH cell type
        if (this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_HOMEPATH) {
            this.updateNodeColor(this.nodeHomePath, cellColor);
        } else if (this.nodeHomePath) {
            this.nodeHomePath.active = false;
        }

        // Handle SPAWN cell type
        if (this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_SPAWN) {
            this.updateNodeColor(this.nodeRelease, cellColor);
        } else if (this.nodeRelease) {
            this.nodeRelease.active = false;
        }
    }

    /**
     * Update node color and enable it
     */
    private updateNodeColor(node: Node | null, color: Color): void {
        if (!node) return;

        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = color;
            node.active = true;
        }
    }

    /**
     * Update circle border for SPAWN and NORMAL cells
     */
    private updateCircleBorder() {
        if (!this.nodeCircleBorder || !this.cellData) {
            return;
        }

        const isCircleCell = this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_SPAWN || 
                            this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_NORMAL;
        
        if (!isCircleCell) {
            this.nodeCircleBorder.active = false;
            return;
        }

        const base = gameDataService.getBase(this.cellData.baseID);
        const baseColor = base ? base.color : null;
        const color = baseColor ? getBaseColor(baseColor) : null;

        if (!color) {
            this.nodeCircleBorder.active = false;
            return;
        }

        this.setupCircleGraphics(color);
    }

    /**
     * Setup and draw circle graphics
     */
    private setupCircleGraphics(color: Color): void {
        if (!this.nodeCircleBorder) return;

        this.circleGraphics = this.nodeCircleBorder.getComponent(Graphics);
        if (!this.circleGraphics) {
            try {
                this.circleGraphics = this.nodeCircleBorder.addComponent(Graphics);
            } catch (error) {
                Logger.warn("CellComponent", `Graphics component not available: ${error}`);
                this.nodeCircleBorder.active = false;
                return;
            }
        }

        const transform = this.nodeCircleBorder.getComponent(UITransform);
        if (!transform) {
            const uiTransform = this.nodeCircleBorder.addComponent(UITransform);
            uiTransform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
            uiTransform.setAnchorPoint(0.5, 0.5);
        }

        const radius = CELL_DIMENSION * 0.4;
        this.circleGraphics.clear();
        this.circleGraphics.strokeColor = color;
        this.circleGraphics.lineWidth = 2;
        this.circleGraphics.circle(0, 0, radius);
        this.circleGraphics.stroke();

        this.nodeCircleBorder.active = true;
    }

    /**
     * Update debug information display
     */
    private updateDebugInfo() {
        if (!this.nodeDebugInfo || !this.cellData) {
            return;
        }

        const label = this.nodeDebugInfo.getComponent(Label);
        if (!label) {
            return;
        }

        // Get next link cell IDs using service
        const links = gameDataService.getLinksForCell(this.cellData.cellID);
        const nextLinkCellIDs = links.map(link => link.cellID);

        const debugLines = [
            this.cellData.cellID,
            this.cellData.baseID,
        ];

        if (this.cellData.index !== undefined) {
            debugLines.push(`Index: ${this.cellData.index}`);
        }

        if (nextLinkCellIDs.length > 0) {
            debugLines.push(`→ ${nextLinkCellIDs.join(", ")}`);
        }

        label.string = debugLines.join("\n");
    }

    /**
     * Update homepath index display
     */
    private updateHomepathIndex() {
        if (!this.cellData) {
            return;
        }

        if (!this.nodeHomepathIndex) {
            Logger.warn("CellComponent", `nodeHomepathIndex not found for cell ${this.cellID}`);
            return;
        }

        if (this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_HOMEPATH && this.homePathIndex !== undefined) {
            const label = this.nodeHomepathIndex.getComponent(Label);
            if (!label) {
                Logger.warn("CellComponent", `Label component not found on nodeHomepathIndex for cell ${this.cellID}`);
                return;
            }
            
            label.string = this.homePathIndex.toString();
            this.nodeHomepathIndex.active = true;
            
            Logger.info("CellComponent", `Updated homepath index to ${this.homePathIndex} for cell ${this.cellID}`);
        } else {
            this.nodeHomepathIndex.active = false;
        }
    }





    /**
     * Get cell data
     */
    public getCellData(): Cell | null {
        return this.cellData;
    }

    /**
     * Get cell ID
     */
    public getCellID(): string {
        return this.cellID;
    }

    /**
     * Get homepath index
     */
    public getHomepathIndex(): number | undefined {
        return this.homePathIndex;
    }


    onDestroy() {
        // Clean up event listeners
    }
}

