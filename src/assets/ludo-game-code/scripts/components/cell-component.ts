/**
 * Cell Component
 * 
 * Represents a single cell/space on the Ludo game board walkway.
 * Cells can contain horses, have different types (normal, spawn, homepath, etc.),
 * and handle user interactions for betting.
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Sprite, Color, Label, UITransform, Button, EventTouch, Graphics, Vec2, Vec3 } from "cc";
import { Cell, CellType, Position, BaseColor, GAME_CONSTANTS } from "../game-board-data";
import { 
    CELL_DIMENSION,
    WALKWAY_LENGTH
} from "../global-constants";
import { gameDataService } from "../services/game-data-service";
import { getBaseColor, brightenColor } from "../utils/color-utils";
import { CELL_CONFIG } from "../utils/cell-config";
import { Logger } from "../utils/logger";

const { ccclass, property } = _decorator;

/**
 * Bet horse data structure
 */
interface IBetHorse {
    id: number;
    x: number; // Position X (0-100%)
    y: number; // Position Y (0-100%)
}

@ccclass("CellComponent")
export class CellComponent extends Component {
    /** Cell ID (e.g., NORTH_0_0, EAST_1_5, etc.) */
    @property({ type: String, tooltip: "Cell ID (e.g., NORTH_0_0, EAST_1_5)" })
    cellID: string = "";

    /** Whether to show debug text */
    @property({ type: Boolean, tooltip: "Show debug information" })
    showDebugText: boolean = true;

    /** Whether this cell is highlighted as reachable */
    @property({ type: Boolean, tooltip: "Whether cell is highlighted" })
    isHighlighted: boolean = false;

    /** Whether to show popover */
    @property({ type: Boolean, tooltip: "Whether to show popover" })
    showPopover: boolean = false;

    /** Popover text */
    @property({ type: String, tooltip: "Popover text" })
    popoverText: string = "";

    /** Betting odds (e.g., "1:5") */
    @property({ type: String, tooltip: "Betting odds" })
    bettingOdds: string = "";

    /** Background sprite node */
    @property({ type: Node, tooltip: "Background sprite node" })
    nodeBackground: Node = null;

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

    /** Odds display label node */
    @property({ type: Node, tooltip: "Odds display label node" })
    nodeOddsDisplay: Node = null;

    /** Popover node */
    @property({ type: Node, tooltip: "Popover node" })
    nodePopover: Node = null;

    /** Bet horses container node */
    @property({ type: Node, tooltip: "Container for bet horse icons" })
    nodeBetHorsesContainer: Node = null;

    /** Button component for click handling */
    private button: Button = null;

    /** Background sprite component */
    private backgroundSprite: Sprite = null;

    /** Circle graphics component */
    private circleGraphics: Graphics = null;

    /** Cell data from gameBoardData */
    private cellData: Cell | null = null;

    /** Bet horses array */
    private betHorses: IBetHorse[] = [];

    /** Next bet horse ID counter */
    private nextBetHorseId: number = 0;

    /** Original cell color (for unhighlighting) */
    private originalColor: Color = new Color(128, 128, 128, 255);

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

        if (!this.nodeBackground) {
            this.nodeBackground = this.node;
        }
        this.backgroundSprite = this.nodeBackground.getComponent(Sprite);

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

        if (!this.nodeBackground || this.nodeBackground === this.node) {
            const backgroundNode = this.node.getChildByName("background");
            if (backgroundNode) {
                this.nodeBackground = backgroundNode;
            }
        }

        if (!this.nodeCircleBorder) {
            this.nodeCircleBorder = this.node.getChildByName("circle");
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

        this.node.on(Button.EventType.CLICK, this.onCellClick, this);
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
        this.updateBackgroundColor();
        this.updateCircleBorder();

        if (this.showDebugText) {
            this.updateDebugInfo();
        }

        this.updateHomepathIndex();
        this.updateOddsDisplay();
        this.updatePopover();
        this.updateHighlighting();
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
     * Update background color based on cell type
     */
    private updateBackgroundColor() {
        if (!this.backgroundSprite || !this.cellData) {
            return;
        }

        // Find base for this cell using service
        const base = gameDataService.getBase(this.cellData.baseID);
        const baseColor = base ? base.color : null;

        // For SPAWN and NORMAL cells, don't apply background color (we'll show a circle instead)
        // For HOMEPATH cells, apply background color with 0.25 opacity
        if (this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_SPAWN || this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_NORMAL) {
            // Transparent background, circle will be shown
            this.backgroundSprite.color = new Color(255, 255, 255, 0);
            this.originalColor = new Color(255, 255, 255, 0);
        } else if (this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_HOMEPATH && baseColor) {
            // Apply color with 0.25 opacity
            const color = getBaseColor(baseColor);
            if (color) {
                color.a = Math.floor(255 * 0.25);
                this.backgroundSprite.color = color;
                this.originalColor = color.clone();
            }
        } else if (baseColor) {
            // Normal background color
            const color = getBaseColor(baseColor);
            if (color) {
                this.backgroundSprite.color = color;
                this.originalColor = color.clone();
            }
        } else {
            // Default gray
            this.backgroundSprite.color = new Color(128, 128, 128, 255);
            this.originalColor = new Color(128, 128, 128, 255);
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
        if (!this.nodeHomepathIndex || !this.cellData) {
            return;
        }

        if (this.cellData.cellType === GAME_CONSTANTS.CELL_TYPE_HOMEPATH && this.homePathIndex !== undefined) {
            const label = this.nodeHomepathIndex.getComponent(Label);
            if (label) {
                label.string = this.homePathIndex.toString();
            }
            this.nodeHomepathIndex.active = true;
        } else {
            this.nodeHomepathIndex.active = false;
        }
    }

    /**
     * Update odds display
     */
    private updateOddsDisplay() {
        if (!this.nodeOddsDisplay) {
            return;
        }

        if (this.isHighlighted && this.bettingOdds) {
            const label = this.nodeOddsDisplay.getComponent(Label);
            if (label) {
                label.string = this.bettingOdds;
            }
            this.nodeOddsDisplay.active = true;
        } else {
            this.nodeOddsDisplay.active = false;
        }
    }

    /**
     * Update popover display
     */
    private updatePopover() {
        if (!this.nodePopover) {
            return;
        }

        if (this.isHighlighted && this.showPopover && this.popoverText) {
            const label = this.nodePopover.getComponent(Label);
            if (label) {
                label.string = this.popoverText;
            }
            this.nodePopover.active = true;
        } else {
            this.nodePopover.active = false;
        }
    }

    /**
     * Update highlighting visual state
     */
    private updateHighlighting() {
        if (!this.backgroundSprite || !this.cellData) {
            return;
        }

        if (this.isHighlighted) {
            // Apply highlight effect (brighter color with glow)
            const highlightColor = brightenColor(this.originalColor, 50);
            this.backgroundSprite.color = highlightColor;

            // Enable button interaction
            if (this.button) {
                this.button.interactable = true;
            }
        } else {
            // Restore original color
            this.backgroundSprite.color = this.originalColor;

            // Disable button interaction
            if (this.button) {
                this.button.interactable = false;
            }

            // Clear bet horses when highlighting is removed
            this.clearBetHorses();
        }
    }

    /**
     * Handle cell click event (for placing bets)
     */
    private onCellClick(event: EventTouch) {
        if (!this.isHighlighted) {
            return;
        }

        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) {
            return;
        }

        const position = this.calculateClickPosition(event, uiTransform);
        if (!position) {
            return;
        }

        this.addBetHorse(position.x, position.y);
        this.updateBetHorses();
    }

    /**
     * Calculate click position relative to cell
     */
    private calculateClickPosition(event: EventTouch, uiTransform: UITransform): { x: number; y: number } | null {
        const uiLocation = event.getUILocation();
        const worldPos = new Vec3(uiLocation.x, uiLocation.y, 0);
        
        const localPos = new Vec3();
        uiTransform.convertToNodeSpaceAR(worldPos, localPos);
        
        const cellSize = uiTransform.contentSize;
        
        // Convert to percentage (clamped to avoid edges)
        const x = ((localPos.x / cellSize.width) + 0.5) * 100;
        const y = ((localPos.y / cellSize.height) + 0.5) * 100;
        
        return {
            x: Math.max(CELL_CONFIG.BET_HORSE_MIN_POSITION, Math.min(CELL_CONFIG.BET_HORSE_MAX_POSITION, x)),
            y: Math.max(CELL_CONFIG.BET_HORSE_MIN_POSITION, Math.min(CELL_CONFIG.BET_HORSE_MAX_POSITION, y))
        };
    }

    /**
     * Add a bet horse at the specified position
     */
    private addBetHorse(x: number, y: number): void {
        const horseId = this.nextBetHorseId++;
        this.betHorses.push({
            id: horseId,
            x: x,
            y: y,
        });
    }

    /**
     * Update bet horses display
     */
    private updateBetHorses() {
        if (!this.nodeBetHorsesContainer) {
            return;
        }

        // Clear existing bet horse nodes
        this.nodeBetHorsesContainer.removeAllChildren();

        // Create nodes for each bet horse
        this.betHorses.forEach(horse => {
            const horseNode = this.createBetHorseNode(horse);
            this.nodeBetHorsesContainer.addChild(horseNode);
        });
    }

    /**
     * Create a bet horse node
     */
    private createBetHorseNode(horse: IBetHorse): Node {
        const horseNode = new Node(`BetHorse_${horse.id}`);
        const transform = horseNode.addComponent(UITransform);
        const iconSize = CELL_CONFIG.getBetHorseIconSize();
        
        transform.setContentSize(iconSize, iconSize);
        transform.setAnchorPoint(0.5, 0.5);

        // Position based on percentage
        const cellTransform = this.node.getComponent(UITransform);
        if (cellTransform) {
            const cellSize = cellTransform.contentSize;
            const x = (horse.x / 100 - 0.5) * cellSize.width;
            const y = (horse.y / 100 - 0.5) * cellSize.height;
            horseNode.setPosition(x, y, 0);
        }

        // Add label for dollar sign
        const label = horseNode.addComponent(Label);
        label.string = "$";
        label.fontSize = iconSize * CELL_CONFIG.BET_HORSE_LABEL_SIZE_RATIO;
        label.color = CELL_CONFIG.BET_HORSE_COLOR;

        return horseNode;
    }

    /**
     * Clear all bet horses
     */
    private clearBetHorses() {
        this.betHorses = [];
        if (this.nodeBetHorsesContainer) {
            this.nodeBetHorsesContainer.removeAllChildren();
        }
    }


    /**
     * Set highlighted state
     */
    public setHighlighted(highlighted: boolean) {
        this.isHighlighted = highlighted;
        this.updateHighlighting();
    }

    /**
     * Set popover state
     */
    public setPopover(show: boolean, text?: string) {
        this.showPopover = show;
        if (text !== undefined) {
            this.popoverText = text;
        }
        this.updatePopover();
    }

    /**
     * Set betting odds
     */
    public setBettingOdds(odds: string) {
        this.bettingOdds = odds;
        this.updateOddsDisplay();
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

    /**
     * Get bet horses count
     */
    public getBetHorsesCount(): number {
        return this.betHorses.length;
    }

    onDestroy() {
        // Clean up event listeners
        if (this.button) {
            this.node.off(Button.EventType.CLICK, this.onCellClick, this);
        }
    }
}

