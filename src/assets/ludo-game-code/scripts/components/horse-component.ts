/**
 * Horse Component
 * 
 * Represents a single game horse/piece in the Ludo game.
 * Horses are the pieces that players move around the board.
 * Each horse belongs to a specific player (represented by baseColor).
 * 
 * This component renders the horse icon (Unicode chess knight) and horse number.
 * For horses in the base, use HorsePlaceholderComponent which wraps this component.
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Label, UITransform, tween, Vec3, Color, Sprite, Button } from "cc";
import { BaseColor, gameBoardData, Horse, Cell } from "../game-board-data";
import { GAME_CONSTANTS } from "../game-board-data";
import { WalkwayComponent } from "./walkway-component";
import { 
    CELL_DIMENSION,
    BASE_COLORS 
} from "../global-constants";

const { ccclass, property } = _decorator;

/**
 * Public props for the Horse component
 */
export interface IHorseComponentProps {
    /** The color of the horse (matches the player's base color) */
    baseColor: BaseColor;
    /** Optional custom size for the horse (defaults to CELL_DIMENSION) */
    horseSize?: number;
    /** Whether the horse is currently jumping (for animation) */
    isJumping?: boolean;
    /** Whether the horse is currently flying to base (for kick animation) */
    isFlyingToBase?: boolean;
    /** Whether the horse is being hovered (for action selection highlighting) */
    isHovered?: boolean;
    /** Optional horse ID to extract and display the horse number */
    horseID?: string;
}

@ccclass("HorseComponent")
export class HorseComponent extends Component {
    /** The color of the horse (matches the player's base color) */
    @property({ type: String, tooltip: "Base color (YELLOW, GREEN, BLUE, RED)" })
    baseColor: BaseColor = "YELLOW";

    /** Optional custom size for the horse (defaults to CELL_DIMENSION) */
    @property({ type: Number, tooltip: "Horse size in pixels (defaults to CELL_DIMENSION)" })
    horseSize: number = CELL_DIMENSION;

    /** Whether the horse is currently jumping (for animation) */
    @property({ type: Boolean, tooltip: "Whether the horse is jumping" })
    isJumping: boolean = false;

    /** Whether the horse is currently flying to base (for kick animation) */
    @property({ type: Boolean, tooltip: "Whether the horse is flying to base" })
    isFlyingToBase: boolean = false;

    /** Whether the horse is being hovered (for action selection highlighting) */
    @property({ type: Boolean, tooltip: "Whether the horse is hovered" })
    isHovered: boolean = false;

    /** Optional horse ID to extract and display the horse number */
    @property({ type: String, tooltip: "Horse ID (e.g., BASE_1_HORSE_1)" })
    horseID: string = "";


    /** Node for the horse icon (Unicode character) */
    @property({ type: Node, tooltip: "Horse icon label node" })
    nodeHorseIcon: Node = null;

    /** Node for the horse number label */
    @property({ type: Node, tooltip: "Horse number label node" })
    nodeHorseNumber: Node = null;

    /** Horse icon label component */
    private horseIconLabel: Label = null;

    /** Horse number label component */
    private horseNumberLabel: Label = null;

    /** Current animation tween */
    private animationTween: any = null;

    /** Whether auto-movement is enabled */
    private isAutoMoving: boolean = false;

    /** Auto-movement interval in seconds */
    private readonly AUTO_MOVE_INTERVAL: number = 1.0;

    /** Unicode character for chess knight (♞) */
    private readonly HORSE_UNICODE = "\u265E";

    onLoad() {
        this.initializeHorse();
    }

    /**
     * Initialize the horse component
     */
    private initializeHorse() {
        // Set up node size - horse size equals CELL_DIMENSION
        const transform = this.node.getComponent(UITransform);
        if (!transform) {
            const newTransform = this.node.addComponent(UITransform);
            newTransform.setContentSize(this.horseSize, this.horseSize);
            newTransform.setAnchorPoint(0.5, 0.5);
        } else {
            transform.setContentSize(this.horseSize, this.horseSize);
            transform.setAnchorPoint(0.5, 0.5);
        }

        // Create or get horse icon label
        if (!this.nodeHorseIcon) {
            // First try to find existing node by name (from prefab or previous initialization)
            this.nodeHorseIcon = this.node.getChildByName("HorseIcon");
            if (!this.nodeHorseIcon) {
                // Only create if it doesn't exist to avoid duplicates
                this.nodeHorseIcon = new Node("HorseIcon");
                this.node.addChild(this.nodeHorseIcon);
                
                const iconTransform = this.nodeHorseIcon.addComponent(UITransform);
                iconTransform.setContentSize(this.horseSize * 0.8, this.horseSize * 0.8);
                iconTransform.setAnchorPoint(0.5, 0.5);
                this.nodeHorseIcon.setPosition(0, 0, 0);
            }
        } else {
            // If nodeHorseIcon is already assigned, verify it's still a child
            // This prevents issues if node was removed or replaced
            if (this.nodeHorseIcon.parent !== this.node) {
                // Re-find or recreate if parent changed
                const existingNode = this.node.getChildByName("HorseIcon");
                if (existingNode) {
                    this.nodeHorseIcon = existingNode;
                } else {
                    // Node was lost, need to recreate
                    this.nodeHorseIcon = new Node("HorseIcon");
                    this.node.addChild(this.nodeHorseIcon);
                    const iconTransform = this.nodeHorseIcon.addComponent(UITransform);
                    iconTransform.setContentSize(this.horseSize * 0.8, this.horseSize * 0.8);
                    iconTransform.setAnchorPoint(0.5, 0.5);
                    this.nodeHorseIcon.setPosition(0, 0, 0);
                }
            }
        }

        this.horseIconLabel = this.nodeHorseIcon.getComponent(Label);
        if (!this.horseIconLabel) {
            this.horseIconLabel = this.nodeHorseIcon.addComponent(Label);
        }

        // Ensure HorseIcon node has a Sprite component for background color
        let iconSprite = this.nodeHorseIcon.getComponent(Sprite);
        if (!iconSprite) {
            iconSprite = this.nodeHorseIcon.addComponent(Sprite);
        }

        // Add Button component to HorseIcon for click events
        let iconButton = this.nodeHorseIcon.getComponent(Button);
        if (!iconButton) {
            iconButton = this.nodeHorseIcon.addComponent(Button);
        }
        
        // Set up click event handler
        iconButton.node.on(Button.EventType.CLICK, this.onHorseIconClick, this);

        // Create or get horse number label
        const horseNumber = this.extractHorseNumber(this.horseID);
        if (horseNumber) {
            if (!this.nodeHorseNumber) {
                // First try to find existing node by name (from prefab or previous initialization)
                this.nodeHorseNumber = this.node.getChildByName("HorseNumber");
                if (!this.nodeHorseNumber) {
                    // Only create if it doesn't exist to avoid duplicates
                    this.nodeHorseNumber = new Node("HorseNumber");
                    this.node.addChild(this.nodeHorseNumber);
                    
                    const numberTransform = this.nodeHorseNumber.addComponent(UITransform);
                    numberTransform.setContentSize(this.horseSize * 0.3, this.horseSize * 0.3);
                    numberTransform.setAnchorPoint(0.5, 0.5);
                    // Position at bottom-right of horse icon
                    this.nodeHorseNumber.setPosition(
                        this.horseSize * 0.25, 
                        -this.horseSize * 0.25, 
                        0
                    );
                }
            } else {
                // If nodeHorseNumber is already assigned, verify it's still a child
                if (this.nodeHorseNumber.parent !== this.node) {
                    // Re-find or recreate if parent changed
                    const existingNode = this.node.getChildByName("HorseNumber");
                    if (existingNode) {
                        this.nodeHorseNumber = existingNode;
                    } else {
                        // Node was lost, need to recreate
                        this.nodeHorseNumber = new Node("HorseNumber");
                        this.node.addChild(this.nodeHorseNumber);
                        const numberTransform = this.nodeHorseNumber.addComponent(UITransform);
                        numberTransform.setContentSize(this.horseSize * 0.3, this.horseSize * 0.3);
                        numberTransform.setAnchorPoint(0.5, 0.5);
                        this.nodeHorseNumber.setPosition(
                            this.horseSize * 0.25, 
                            -this.horseSize * 0.25, 
                            0
                        );
                    }
                }
            }

            this.horseNumberLabel = this.nodeHorseNumber.getComponent(Label);
            if (!this.horseNumberLabel) {
                this.horseNumberLabel = this.nodeHorseNumber.addComponent(Label);
            }
        }

        // Update visual state
        this.updateVisualState();
    }

    /**
     * Extract the last number from a horse ID
     * Example: "BASE_1_HORSE_1" -> "1"
     */
    private extractHorseNumber(horseID?: string): string | null {
        if (!horseID) return null;
        // Match the last number in the horse ID (e.g., "1" from "BASE_1_HORSE_1")
        const match = horseID.match(/_(\d+)$/);
        return match ? match[1] : null;
    }

    /**
     * Update the visual state of the horse
     */
    public updateVisualState() {
        // Update horse icon
        this.updateHorseIcon();

        // Update horse number
        this.updateHorseNumber();

        // Update animations
        this.updateAnimations();
    }

    /**
     * Update the horse icon (Unicode character)
     */
    private updateHorseIcon() {
        if (!this.nodeHorseIcon) {
            return;
        }

        // Update HorseIcon node background color based on base color
        const iconSprite = this.nodeHorseIcon.getComponent(Sprite);
        if (iconSprite) {
            const colorHex = BASE_COLORS[this.baseColor];
            if (colorHex) {
                const color = this.hexToColor(colorHex);
                iconSprite.color = color;
            }
        }

        // Update label if it exists
        if (!this.horseIconLabel) {
            this.horseIconLabel = this.nodeHorseIcon.getComponent(Label);
        }

        if (this.horseIconLabel) {
            // Set Unicode character
            this.horseIconLabel.string = this.HORSE_UNICODE;
            
            // Set label color based on base color (for the icon character itself)
            const colorHex = BASE_COLORS[this.baseColor];
            const color = this.hexToColor(colorHex);
            this.horseIconLabel.color = color;

            // Configure label
            this.horseIconLabel.fontSize = Math.floor(this.horseSize * 0.6);
            this.horseIconLabel.fontFamily = "Arial";
            this.horseIconLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            this.horseIconLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.horseIconLabel.overflow = Label.Overflow.SHRINK;
            (this.horseIconLabel as any)._isSystemFontUsed = true;
            (this.horseIconLabel as any)._font = null;
        }
    }

    /**
     * Update the horse number display
     */
    private updateHorseNumber() {
        if (!this.horseNumberLabel) {
            return;
        }

        const horseNumber = this.extractHorseNumber(this.horseID);
        if (horseNumber) {
            this.horseNumberLabel.string = horseNumber;
            this.horseNumberLabel.fontSize = Math.floor(this.horseSize * 0.2);
            this.horseNumberLabel.fontFamily = "Arial";
            this.horseNumberLabel.color = new Color(255, 255, 255, 255);
            this.horseNumberLabel.enableOutline = true;
            this.horseNumberLabel.outlineColor = new Color(0, 0, 0, 255);
            this.horseNumberLabel.outlineWidth = 1;
            this.horseNumberLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            this.horseNumberLabel.verticalAlign = Label.VerticalAlign.CENTER;
            (this.horseNumberLabel as any)._isSystemFontUsed = true;
            (this.horseNumberLabel as any)._font = null;
        } else {
            this.horseNumberLabel.string = "";
        }
    }

    /**
     * Update animations based on state
     */
    private updateAnimations() {
        // Stop any existing animation
        if (this.animationTween) {
            this.animationTween.stop();
            this.animationTween = null;
        }

        // Reset scale
        this.node.setScale(1, 1, 1);

        if (this.isFlyingToBase) {
            // Flying animation: scale up and fade
            this.animationTween = tween(this.node)
                .to(0.5, { scale: new Vec3(1.5, 1.5, 1) }, { easing: 'sineOut' })
                .to(0.5, { scale: new Vec3(0, 0, 1) }, { easing: 'sineIn' })
                .start();
        } else if (this.isJumping) {
            // Jumping animation: bounce
            this.animationTween = tween(this.node)
                .to(0.1, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'sineOut' })
                .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
                .union()
                .repeatForever()
                .start();
        } else if (this.isHovered) {
            // Hover animation: slight scale up
            this.animationTween = tween(this.node)
                .to(0.2, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineOut' })
                .start();
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
     * Set the base color
     */
    public setBaseColor(baseColor: BaseColor) {
        this.baseColor = baseColor;
        this.updateVisualState();
    }

    /**
     * Set the horse size
     */
    public setHorseSize(size: number) {
        this.horseSize = size;
        this.initializeHorse();
    }

    /**
     * Set jumping state
     */
    public setJumping(jumping: boolean) {
        this.isJumping = jumping;
        this.updateAnimations();
    }

    /**
     * Set flying to base state
     */
    public setFlyingToBase(flying: boolean) {
        this.isFlyingToBase = flying;
        this.updateAnimations();
    }

    /**
     * Set hovered state
     */
    public setHovered(hovered: boolean) {
        this.isHovered = hovered;
        this.updateAnimations();
    }

    /**
     * Set horse ID
     */
    public setHorseID(horseID: string) {
        this.horseID = horseID;
        this.updateVisualState();
    }


    /**
     * Get the horse number from the horse ID
     */
    public getHorseNumber(): string | null {
        return this.extractHorseNumber(this.horseID);
    }

    /**
     * Handle click on HorseIcon - move horse to SPAWN cell or next cell in walkway
     */
    private onHorseIconClick() {
        console.log(`[HorseComponent] onHorseIconClick - Horse clicked: ${this.horseID}, baseColor: ${this.baseColor}`);
        
        // Find the horse data to get baseID and current position
        const horseData = gameBoardData.horses.find(h => h.horseID === this.horseID);
        if (!horseData) {
            console.warn(`[HorseComponent] onHorseIconClick - Horse data not found for ${this.horseID}`);
            return;
        }

        // Find the base to get baseID
        const base = gameBoardData.bases.find(b => b.color === this.baseColor);
        const baseID = base ? base.ID : horseData.baseID;
        
        if (!baseID) {
            console.warn(`[HorseComponent] onHorseIconClick - Base ID not found for horse ${this.horseID}`);
            return;
        }

        // Check if horse is already spawned (in a walkway cell)
        if (horseData.isSpawned && horseData.cellID) {
            console.log(`[HorseComponent] onHorseIconClick - Horse is already spawned at cell ${horseData.cellID}, moving to next cell`);
            
            // Find the next cell based on links
            const nextCell = this.findNextCell(horseData.cellID);
            if (!nextCell) {
                console.warn(`[HorseComponent] onHorseIconClick - No next cell found for ${horseData.cellID}`);
                return;
            }

            console.log(`[HorseComponent] onHorseIconClick - Moving to next cell: ${nextCell.cellID}`);

            // Find the cell node in the scene
            const targetPosition = this.findCellNodePosition(nextCell.cellID);
            if (!targetPosition) {
                console.warn(`[HorseComponent] onHorseIconClick - Cell node not found in scene for ${nextCell.cellID}`);
                return;
            }

            // Move horse to next cell using tween
            this.moveHorseToPosition(targetPosition, () => {
                // Update horse data after movement completes
                this.updateHorseDataAfterMove(nextCell);
            });
        } else {
            // Horse is not spawned, move to SPAWN cell
            console.log(`[HorseComponent] onHorseIconClick - Horse is not spawned, moving to SPAWN cell`);

            // Find SPAWN cell for this base
            const spawnCell = this.findSpawnCellForBase(baseID);
            if (!spawnCell) {
                console.warn(`[HorseComponent] onHorseIconClick - SPAWN cell not found for base ${baseID}`);
                return;
            }

            console.log(`[HorseComponent] onHorseIconClick - Found SPAWN cell: ${spawnCell.cellID} for base ${baseID}`);

            // Find the cell node in the scene
            const targetPosition = this.findCellNodePosition(spawnCell.cellID);
            if (!targetPosition) {
                console.warn(`[HorseComponent] onHorseIconClick - Cell node not found in scene for ${spawnCell.cellID}`);
                return;
            }

            // Move horse to SPAWN cell using tween
            this.moveHorseToPosition(targetPosition, () => {
                // Update horse data after movement completes
                this.updateHorseDataAfterMove(spawnCell);
                // Start auto-movement after reaching SPAWN cell
                this.startAutoMovement();
            });
        }
    }

    /**
     * Find the next cell based on links from the current cell
     * Chooses the correct path based on the horse's base when multiple links exist
     */
    private findNextCell(currentCellID: string): Cell | null {
        // Get links for the current cell
        const links = gameBoardData.links[currentCellID];
        if (!links || links.length === 0) {
            console.warn(`[HorseComponent] findNextCell - No links found for cell ${currentCellID}`);
            return null;
        }

        // Get horse's baseID to determine which path to take
        const horseData = gameBoardData.horses.find(h => h.horseID === this.horseID);
        const baseID = horseData ? horseData.baseID : null;

        // If only one link, use it
        if (links.length === 1) {
            const nextLink = links[0];
            return this.getCellFromLink(nextLink);
        }

        // Multiple links - need to choose the correct one based on base
        console.log(`[HorseComponent] findNextCell - Multiple links found for ${currentCellID}, choosing based on base ${baseID}`);

        // Get current cell to understand context
        const currentCell = this.getCurrentCell(currentCellID);
        if (!currentCell) {
            console.warn(`[HorseComponent] findNextCell - Current cell not found: ${currentCellID}`);
            // Fallback to first link
            return this.getCellFromLink(links[0]);
        }

        // Strategy for choosing the correct path:
        // 1. If current cell is SPAWN, prefer the main walkway link (not home path)
        // 2. If current cell belongs to this horse's base AND is at a junction:
        //    - Prefer the home path link if it belongs to this horse's base
        //    - Otherwise, continue on main walkway
        // 3. If current cell doesn't belong to this horse's base, continue on main walkway
        // 4. Otherwise, prefer links that belong to the horse's base

        if (currentCell.cellType === GAME_CONSTANTS.CELL_TYPE_SPAWN) {
            // At SPAWN cell - prefer main walkway (not home path)
            for (const link of links) {
                const nextCell = this.getCellFromLink(link);
                if (nextCell && nextCell.cellType !== GAME_CONSTANTS.CELL_TYPE_HOMEPATH) {
                    console.log(`[HorseComponent] findNextCell - At SPAWN, choosing main walkway: ${nextCell.cellID}`);
                    return nextCell;
                }
            }
        }

        // Check if current cell belongs to this horse's base (junction cell)
        if (baseID && currentCell.baseID === baseID) {
            // At a junction cell that belongs to this horse's base
            // Prefer the home path link if it belongs to this horse's base
            for (const link of links) {
                const nextCell = this.getCellFromLink(link);
                if (nextCell && nextCell.cellType === GAME_CONSTANTS.CELL_TYPE_HOMEPATH && nextCell.baseID === baseID) {
                    console.log(`[HorseComponent] findNextCell - At junction for base ${baseID}, choosing home path: ${nextCell.cellID}`);
                    return nextCell;
                }
            }
            // If no home path found, continue on main walkway (prefer non-homepath cells)
            for (const link of links) {
                const nextCell = this.getCellFromLink(link);
                if (nextCell && nextCell.cellType !== GAME_CONSTANTS.CELL_TYPE_HOMEPATH) {
                    console.log(`[HorseComponent] findNextCell - At junction for base ${baseID}, continuing on main walkway: ${nextCell.cellID}`);
                    return nextCell;
                }
            }
        }

        // If current cell doesn't belong to this horse's base, prefer main walkway (not home path)
        if (baseID && currentCell.baseID !== baseID) {
            for (const link of links) {
                const nextCell = this.getCellFromLink(link);
                if (nextCell && nextCell.cellType !== GAME_CONSTANTS.CELL_TYPE_HOMEPATH) {
                    console.log(`[HorseComponent] findNextCell - Not at own base, choosing main walkway: ${nextCell.cellID}`);
                    return nextCell;
                }
            }
        }

        // Check if any link leads to a home path cell that belongs to this horse's base
        if (baseID) {
            for (const link of links) {
                const nextCell = this.getCellFromLink(link);
                if (nextCell && nextCell.cellType === GAME_CONSTANTS.CELL_TYPE_HOMEPATH && nextCell.baseID === baseID) {
                    console.log(`[HorseComponent] findNextCell - Found home path for base ${baseID}: ${nextCell.cellID}`);
                    return nextCell;
                }
            }
        }

        // If no home path found for this base, prefer links that belong to this horse's base
        if (baseID) {
            for (const link of links) {
                const nextCell = this.getCellFromLink(link);
                if (nextCell && nextCell.baseID === baseID) {
                    console.log(`[HorseComponent] findNextCell - Found cell for base ${baseID}: ${nextCell.cellID}`);
                    return nextCell;
                }
            }
        }

        // Fallback: use first link
        console.log(`[HorseComponent] findNextCell - No base-specific link found, using first link`);
        return this.getCellFromLink(links[0]);
    }

    /**
     * Get cell from a link
     */
    private getCellFromLink(link: { cellID: string; position: string }): Cell | null {
        const positionCells = gameBoardData.cells[link.position];
        if (!positionCells) {
            console.warn(`[HorseComponent] getCellFromLink - Position ${link.position} not found in cells`);
            return null;
        }

        const cell = positionCells[link.cellID];
        if (!cell) {
            console.warn(`[HorseComponent] getCellFromLink - Cell ${link.cellID} not found in position ${link.position}`);
            return null;
        }

        return cell;
    }

    /**
     * Get current cell data
     */
    private getCurrentCell(cellID: string): Cell | null {
        // Search through all positions for the cell
        for (const position in gameBoardData.cells) {
            const positionCells = gameBoardData.cells[position];
            if (positionCells[cellID]) {
                return positionCells[cellID];
            }
        }
        return null;
    }

    /**
     * Update horse data after movement completes
     */
    private updateHorseDataAfterMove(targetCell: Cell) {
        const horseData = gameBoardData.horses.find(h => h.horseID === this.horseID);
        if (!horseData) {
            console.warn(`[HorseComponent] updateHorseDataAfterMove - Horse data not found for ${this.horseID}`);
            return;
        }

        // Update horse data
        horseData.cellID = targetCell.cellID;
        horseData.position = targetCell.position;
        horseData.isSpawned = true;
        horseData.steps += 1;

        console.log(`[HorseComponent] updateHorseDataAfterMove - Updated horse ${this.horseID} to cell ${targetCell.cellID}, position ${targetCell.position}, steps: ${horseData.steps}`);
    }

    /**
     * Start auto-movement - horse will move every 1 second automatically
     */
    private startAutoMovement() {
        if (this.isAutoMoving) {
            console.log(`[HorseComponent] startAutoMovement - Auto-movement already started`);
            return;
        }

        this.isAutoMoving = true;
        console.log(`[HorseComponent] startAutoMovement - Starting auto-movement with interval ${this.AUTO_MOVE_INTERVAL}s`);

        // Schedule auto-movement
        this.schedule(this.autoMoveToNextCell, this.AUTO_MOVE_INTERVAL);
    }

    /**
     * Stop auto-movement
     */
    private stopAutoMovement() {
        if (!this.isAutoMoving) {
            return;
        }

        this.isAutoMoving = false;
        this.unschedule(this.autoMoveToNextCell);
        console.log(`[HorseComponent] stopAutoMovement - Stopped auto-movement`);
    }

    /**
     * Auto-move to next cell (called by schedule)
     */
    private autoMoveToNextCell() {
        if (!this.isAutoMoving) {
            return;
        }

        const horseData = gameBoardData.horses.find(h => h.horseID === this.horseID);
        if (!horseData || !horseData.cellID) {
            console.warn(`[HorseComponent] autoMoveToNextCell - Horse data not found or not spawned`);
            this.stopAutoMovement();
            return;
        }

        // Check if current cell links to HOME
        const links = gameBoardData.links[horseData.cellID];
        if (!links || links.length === 0) {
            console.log(`[HorseComponent] autoMoveToNextCell - No more links, stopping auto-movement`);
            this.stopAutoMovement();
            return;
        }

        // Check if next link is HOME
        const nextLink = links[0];
        if (nextLink.position === GAME_CONSTANTS.POSITION_HOME) {
            console.log(`[HorseComponent] autoMoveToNextCell - Reached HOME, stopping auto-movement`);
            this.stopAutoMovement();
            return;
        }

        // Find the next cell
        const nextCell = this.findNextCell(horseData.cellID);
        if (!nextCell) {
            console.warn(`[HorseComponent] autoMoveToNextCell - No next cell found, stopping auto-movement`);
            this.stopAutoMovement();
            return;
        }

        console.log(`[HorseComponent] autoMoveToNextCell - Auto-moving to next cell: ${nextCell.cellID}`);

        // Find the cell node in the scene
        const targetPosition = this.findCellNodePosition(nextCell.cellID);
        if (!targetPosition) {
            console.warn(`[HorseComponent] autoMoveToNextCell - Cell node not found in scene for ${nextCell.cellID}`);
            this.stopAutoMovement();
            return;
        }

        // Move horse to next cell using tween
        this.moveHorseToPosition(targetPosition, () => {
            // Update horse data after movement completes
            this.updateHorseDataAfterMove(nextCell);
            // Continue auto-movement (schedule will call this again after interval)
        });
    }

    /**
     * Find SPAWN cell for a given base ID
     */
    private findSpawnCellForBase(baseID: string): Cell | null {
        // Search through all positions for SPAWN cells
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

    /**
     * Find cell node position in the scene by searching WalkwayComponents
     */
    private findCellNodePosition(cellID: string): Vec3 | null {
        // Get the scene root
        const scene = this.node.scene;
        if (!scene) {
            return null;
        }

        // Search for WalkwayComponent in the scene
        const walkwayComponents: WalkwayComponent[] = [];
        const findWalkways = (node: Node) => {
            const walkway = node.getComponent(WalkwayComponent);
            if (walkway) {
                walkwayComponents.push(walkway);
            }
            for (let i = 0; i < node.children.length; i++) {
                findWalkways(node.children[i]);
            }
        };
        
        findWalkways(scene);

        if (walkwayComponents.length === 0) {
            console.warn(`[HorseComponent] findCellNodePosition - No WalkwayComponents found in scene`);
            return null;
        }

        // Search each walkway for the cell
        for (const walkway of walkwayComponents) {
            // Use the getCellNode method
            const cellNode = walkway.getCellNode(cellID);
            if (cellNode) {
                // Convert to world position
                const worldPos = new Vec3();
                cellNode.getWorldPosition(worldPos);
                console.log(`[HorseComponent] findCellNodePosition - Found cell node at world position:`, worldPos);
                return worldPos;
            }
        }

        return null;
    }

    /**
     * Move horse icon to target position using tween animation
     * @param targetPosition Target world position to move to
     * @param onComplete Optional callback when movement completes
     */
    private moveHorseToPosition(targetPosition: Vec3, onComplete?: () => void) {
        if (!this.nodeHorseIcon) {
            console.warn(`[HorseComponent] moveHorseToPosition - HorseIcon node not found`);
            return;
        }

        // Stop any existing animation
        if (this.animationTween) {
            this.animationTween.stop();
            this.animationTween = null;
        }

        // Store original parent and sibling index for potential restoration
        const originalParent = this.nodeHorseIcon.parent;
        const originalSiblingIndex = originalParent ? originalParent.children.indexOf(this.nodeHorseIcon) : -1;

        // Find Canvas or root node to reparent HorseIcon to (for rendering on top)
        const scene = this.node.scene;
        let topLayer: Node | null = null;
        
        if (scene) {
            // Try to find Canvas node (usually the root UI container)
            const canvas = scene.getChildByName("Canvas");
            if (canvas) {
                topLayer = canvas;
            } else {
                // Fallback to scene root
                topLayer = scene;
            }
        }

        // If we found a top layer, reparent the HorseIcon to it
        if (topLayer && topLayer !== originalParent) {
            const worldPos = new Vec3();
            this.nodeHorseIcon.getWorldPosition(worldPos);
            
            // Reparent to top layer
            topLayer.addChild(this.nodeHorseIcon);
            
            // Convert world position to local position relative to new parent
            const localPos = new Vec3();
            topLayer.inverseTransformPoint(localPos, worldPos);
            // Set z-index to very negative value to ensure it renders above cell labels
            localPos.z = -1000;
            this.nodeHorseIcon.setPosition(localPos);
            
            console.log(`[HorseComponent] moveHorseToPosition - Reparented HorseIcon to top layer with z-index ${localPos.z} for rendering on top`);
        }

        // Get current world position of HorseIcon
        const currentPos = new Vec3();
        this.nodeHorseIcon.getWorldPosition(currentPos);

        console.log(`[HorseComponent] moveHorseToPosition - Moving HorseIcon from ${currentPos} to ${targetPosition}`);

        // Convert target world position to local position relative to HorseIcon's current parent
        const localTargetPos = new Vec3();
        this.nodeHorseIcon.parent?.inverseTransformPoint(localTargetPos, targetPosition);

        // Set a very negative z-index to ensure it renders on top of everything
        // Negative z means closer to camera (renders on top in 2D)
        // Use a very negative value to ensure it's above cell labels
        localTargetPos.z = -1000;

        // Move to end of parent's children list (renders last = on top)
        // This ensures the HorseIcon renders above other nodes including cell labels
        if (this.nodeHorseIcon.parent) {
            const parent = this.nodeHorseIcon.parent;
            const currentIndex = parent.children.indexOf(this.nodeHorseIcon);
            // Always move to the end to ensure it renders on top
            parent.removeChild(this.nodeHorseIcon);
            parent.addChild(this.nodeHorseIcon);
            console.log(`[HorseComponent] moveHorseToPosition - Moved HorseIcon to end of parent's children (index: ${parent.children.length - 1})`);
        }

        // Animate movement with tween - move only the HorseIcon node with jumping motion
        const startPos = new Vec3();
        this.nodeHorseIcon.getPosition(startPos);
        
        // Calculate jump height (proportional to distance traveled)
        const distance = Vec3.distance(startPos, localTargetPos);
        const jumpHeight = Math.min(distance * 0.3, 50); // Jump height, capped at 50 pixels
        
        // Create jumping animation: move horizontally while jumping vertically
        const midPoint = new Vec3();
        Vec3.lerp(midPoint, startPos, localTargetPos, 0.5);
        midPoint.y += jumpHeight; // Peak of the jump
        
        // Animation duration based on distance
        const duration = Math.max(0.3, Math.min(0.6, distance / 200));
        
        // Jump animation: move to midpoint (peak), then to target
        this.animationTween = tween(this.nodeHorseIcon)
            .to(duration / 2, { 
                position: midPoint 
            }, { 
                easing: 'sineOut' // Accelerate upward
            })
            .to(duration / 2, { 
                position: localTargetPos 
            }, { 
                easing: 'sineIn' // Decelerate downward
            })
            .call(() => {
                console.log(`[HorseComponent] moveHorseToPosition - HorseIcon movement completed`);
                this.animationTween = null;
                // Call onComplete callback if provided
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
    }

    onDestroy() {
        // Stop auto-movement
        this.stopAutoMovement();

        // Remove click event listener
        if (this.nodeHorseIcon) {
            const iconButton = this.nodeHorseIcon.getComponent(Button);
            if (iconButton) {
                iconButton.node.off(Button.EventType.CLICK, this.onHorseIconClick, this);
            }
        }

        // Stop any running animations
        if (this.animationTween) {
            this.animationTween.stop();
            this.animationTween = null;
        }
    }
}

