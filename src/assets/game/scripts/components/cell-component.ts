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
import { gameBoardData, Cell, CellType, Position, BaseColor } from "../game-board-data";
import { 
    CELL_DIMENSION,
    WALKWAY_LENGTH,
    BASE_COLORS 
} from "../global-constants";

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
        console.log(`[CellComponent] onLoad - cellID: ${this.cellID}, node: ${this.node.name}`);
        this.initializeCell();
    }

    /**
     * Initialize the cell with data from gameBoardData
     */
    private initializeCell() {
        console.log(`[CellComponent] initializeCell - Starting initialization for cellID: ${this.cellID}`);
        
        if (!this.cellID) {
            console.warn("[CellComponent] initializeCell - cellID is not set");
            return;
        }

        // Find cell data from all positions
        let found = false;
        for (const position in gameBoardData.cells) {
            const positionCells = gameBoardData.cells[position];
            if (positionCells[this.cellID]) {
                this.cellData = positionCells[this.cellID];
                found = true;
                console.log(`[CellComponent] initializeCell - Found cell in position: ${position}`);
                break;
            }
        }

        if (!this.cellData) {
            console.warn(`[CellComponent] initializeCell - Cell data not found for ${this.cellID}`);
            return;
        }

        console.log(`[CellComponent] initializeCell - Found cell data:`, {
            cellID: this.cellData.cellID,
            cellType: this.cellData.cellType,
            baseID: this.cellData.baseID,
            row: this.cellData.row,
            column: this.cellData.column,
            position: this.cellData.position
        });

        // Get background sprite
        if (!this.nodeBackground) {
            this.nodeBackground = this.node;
            console.log(`[CellComponent] initializeCell - Using this node as background: ${this.nodeBackground.name}`);
        } else {
            console.log(`[CellComponent] initializeCell - Using specified background node: ${this.nodeBackground.name}`);
        }
        this.backgroundSprite = this.nodeBackground.getComponent(Sprite);
        console.log(`[CellComponent] initializeCell - Background sprite: ${this.backgroundSprite ? "found" : "not found"}`);

        // Set up button for click handling
        this.setupButton();

        // Calculate homepath index if needed
        this.calculateHomepathIndex();
        if (this.homePathIndex !== undefined) {
            console.log(`[CellComponent] initializeCell - Homepath index calculated: ${this.homePathIndex}`);
        }

        // Update visual state
        console.log(`[CellComponent] initializeCell - Updating visual state...`);
        this.updateVisualState();
        
        console.log(`[CellComponent] initializeCell - Initialization complete for ${this.cellID}`);
    }

    /**
     * Set up button component for click handling
     */
    private setupButton() {
        console.log(`[CellComponent] setupButton - Setting up button for ${this.cellID}`);
        
        // Add Button component if not present
        this.button = this.node.getComponent(Button);
        if (!this.button) {
            console.log(`[CellComponent] setupButton - Adding Button component`);
            this.button = this.node.addComponent(Button);
        } else {
            console.log(`[CellComponent] setupButton - Button component already exists`);
        }

        // Set up click event
        this.node.on(Button.EventType.CLICK, this.onCellClick, this);
        console.log(`[CellComponent] setupButton - Button click event registered`);
    }

    /**
     * Calculate homepath index based on walkway position
     */
    private calculateHomepathIndex() {
        if (!this.cellData || this.cellData.cellType !== "HOMEPATH") {
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
        console.log(`[CellComponent] updateVisualState - Updating visual state for ${this.cellID}`);
        
        if (!this.cellData) {
            console.warn(`[CellComponent] updateVisualState - No cell data available`);
            return;
        }

        // Update background color
        console.log(`[CellComponent] updateVisualState - Updating background color`);
        this.updateBackgroundColor();

        // Update circle border
        console.log(`[CellComponent] updateVisualState - Updating circle border`);
        this.updateCircleBorder();

        // Update debug info
        if (this.showDebugText) {
            console.log(`[CellComponent] updateVisualState - Updating debug info`);
            this.updateDebugInfo();
        }

        // Update homepath index
        console.log(`[CellComponent] updateVisualState - Updating homepath index`);
        this.updateHomepathIndex();

        // Update odds display
        console.log(`[CellComponent] updateVisualState - Updating odds display`);
        this.updateOddsDisplay();

        // Update popover
        console.log(`[CellComponent] updateVisualState - Updating popover`);
        this.updatePopover();

        // Update highlighting
        console.log(`[CellComponent] updateVisualState - Updating highlighting (isHighlighted: ${this.isHighlighted})`);
        this.updateHighlighting();
        
        console.log(`[CellComponent] updateVisualState - Visual state update complete`);
    }

    /**
     * Update background color based on cell type
     */
    private updateBackgroundColor() {
        if (!this.backgroundSprite || !this.cellData) {
            return;
        }

        // Find base for this cell
        const base = gameBoardData.bases.find(b => b.ID === this.cellData.baseID);
        const baseColor = base ? base.color : null;

        // For SPAWN and NORMAL cells, don't apply background color (we'll show a circle instead)
        // For HOMEPATH cells, apply background color with 0.25 opacity
        if (this.cellData.cellType === "SPAWN" || this.cellData.cellType === "NORMAL") {
            // Transparent background, circle will be shown
            this.backgroundSprite.color = new Color(255, 255, 255, 0);
            this.originalColor = new Color(255, 255, 255, 0);
        } else if (this.cellData.cellType === "HOMEPATH" && baseColor && BASE_COLORS[baseColor]) {
            // Apply color with 0.25 opacity
            const hexColor = BASE_COLORS[baseColor];
            const color = this.hexToColor(hexColor);
            color.a = Math.floor(255 * 0.25);
            this.backgroundSprite.color = color;
            this.originalColor = color.clone();
        } else if (baseColor && BASE_COLORS[baseColor]) {
            // Normal background color
            const hexColor = BASE_COLORS[baseColor];
            const color = this.hexToColor(hexColor);
            this.backgroundSprite.color = color;
            this.originalColor = color.clone();
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
        console.log(`[CellComponent] updateCircleBorder - Updating circle border for ${this.cellID}`);
        
        if (!this.nodeCircleBorder || !this.cellData) {
            console.log(`[CellComponent] updateCircleBorder - Skipping (nodeCircleBorder: ${!!this.nodeCircleBorder}, cellData: ${!!this.cellData})`);
            return;
        }

        // Only show circle for SPAWN and NORMAL cells
        if (this.cellData.cellType !== "SPAWN" && this.cellData.cellType !== "NORMAL") {
            console.log(`[CellComponent] updateCircleBorder - Cell type is ${this.cellData.cellType}, hiding circle`);
            this.nodeCircleBorder.active = false;
            return;
        }

        // Find base for color
        const base = gameBoardData.bases.find(b => b.ID === this.cellData.baseID);
        const baseColor = base ? base.color : null;

        if (!baseColor || !BASE_COLORS[baseColor]) {
            console.log(`[CellComponent] updateCircleBorder - No base color found, hiding circle`);
            this.nodeCircleBorder.active = false;
            return;
        }

        console.log(`[CellComponent] updateCircleBorder - Drawing circle for ${this.cellData.cellType} cell with color ${baseColor}`);

        // Get or create Graphics component
        this.circleGraphics = this.nodeCircleBorder.getComponent(Graphics);
        if (!this.circleGraphics) {
            console.log(`[CellComponent] updateCircleBorder - Adding Graphics component`);
            try {
                this.circleGraphics = this.nodeCircleBorder.addComponent(Graphics);
            } catch (error) {
                console.warn(`[CellComponent] updateCircleBorder - Graphics component not available: ${error}`);
                this.nodeCircleBorder.active = false;
                return;
            }
        }

        // Set up transform
        const transform = this.nodeCircleBorder.getComponent(UITransform);
        if (!transform) {
            const uiTransform = this.nodeCircleBorder.addComponent(UITransform);
            uiTransform.setContentSize(CELL_DIMENSION, CELL_DIMENSION);
            uiTransform.setAnchorPoint(0.5, 0.5);
            console.log(`[CellComponent] updateCircleBorder - Added UITransform: ${CELL_DIMENSION}x${CELL_DIMENSION}`);
        }

        // Draw circle border
        const hexColor = BASE_COLORS[baseColor];
        const color = this.hexToColor(hexColor);
        const radius = CELL_DIMENSION * 0.4; // 40% of cell size

        console.log(`[CellComponent] updateCircleBorder - Drawing circle with radius ${radius}, color: ${hexColor}`);

        this.circleGraphics.clear();
        this.circleGraphics.strokeColor = color;
        this.circleGraphics.lineWidth = 2;
        this.circleGraphics.circle(0, 0, radius);
        this.circleGraphics.stroke();

        this.nodeCircleBorder.active = true;
        console.log(`[CellComponent] updateCircleBorder - Circle border updated`);
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

        // Get next link cell IDs
        const links = gameBoardData.links[this.cellData.cellID] || [];
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

        if (this.cellData.cellType === "HOMEPATH" && this.homePathIndex !== undefined) {
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
            const highlightColor = this.originalColor.clone();
            highlightColor.r = Math.min(255, highlightColor.r + 50);
            highlightColor.g = Math.min(255, highlightColor.g + 50);
            highlightColor.b = Math.min(255, highlightColor.b + 50);
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
        console.log(`[CellComponent] onCellClick - Cell ${this.cellID} clicked`);

        // Only allow clicks on highlighted cells
        if (!this.isHighlighted) {
            console.log(`[CellComponent] onCellClick - Cell not highlighted, ignoring click`);
            return;
        }

        // Get click position relative to cell
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) {
            return;
        }

        // Get UI location (screen coordinates)
        const uiLocation = event.getUILocation();
        const worldPos = new Vec3(uiLocation.x, uiLocation.y, 0);
        
        // Convert to local node space
        const localPos = new Vec3();
        this.node.getComponent(UITransform).convertToNodeSpaceAR(worldPos, localPos);
        
        const cellSize = uiTransform.contentSize;
        
        // Convert to percentage (10% to 90% to avoid edges)
        // Local position is relative to anchor point (0.5, 0.5), so add 0.5 to get 0-1 range
        const x = ((localPos.x / cellSize.width) + 0.5) * 100;
        const y = ((localPos.y / cellSize.height) + 0.5) * 100;
        
        // Clamp to 10-90% range
        const clampedX = Math.max(10, Math.min(90, x));
        const clampedY = Math.max(10, Math.min(90, y));

        // Create a new bet horse
        const horseId = this.nextBetHorseId++;
        const newHorse: IBetHorse = {
            id: horseId,
            x: clampedX,
            y: clampedY,
        };

        this.betHorses.push(newHorse);
        console.log(`[CellComponent] onCellClick - Added bet horse ${horseId} at (${clampedX}%, ${clampedY}%)`);

        // Update bet horses display
        this.updateBetHorses();
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
            const horseNode = new Node(`BetHorse_${horse.id}`);
            const transform = horseNode.addComponent(UITransform);
            const iconSize = CELL_DIMENSION * 0.3; // 30% of cell size
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
            label.fontSize = iconSize * 0.6;
            label.color = new Color(255, 215, 0, 255); // Gold color

            this.nodeBetHorsesContainer.addChild(horseNode);
        });

        console.log(`[CellComponent] updateBetHorses - Displaying ${this.betHorses.length} bet horses`);
    }

    /**
     * Clear all bet horses
     */
    private clearBetHorses() {
        console.log(`[CellComponent] clearBetHorses - Clearing ${this.betHorses.length} bet horses`);
        this.betHorses = [];
        if (this.nodeBetHorsesContainer) {
            this.nodeBetHorsesContainer.removeAllChildren();
        }
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

