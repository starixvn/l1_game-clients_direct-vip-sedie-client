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

import { _decorator, Component, Node, Label, UITransform, Vec3, Sprite, Button } from "cc";
import { BaseColor, Horse, Cell, GAME_CONSTANTS } from "../game-board-data";
import { WalkwayComponent } from "./walkway-component";
import { CELL_DIMENSION } from "../global-constants";
import { gameDataService } from "../services/game-data-service";
import { PathfindingService } from "../services/pathfinding-service";
import { AnimationManager } from "../services/animation-manager";
import { getBaseColor } from "../utils/color-utils";
import { CELL_CONFIG } from "../utils/cell-config";
import { Logger } from "../utils/logger";

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

    /** Whether auto-movement is enabled */
    private isAutoMoving: boolean = false;

    /** Auto-movement interval in seconds */
    private readonly AUTO_MOVE_INTERVAL: number = 1.0;

    /** Unicode character for chess knight (♞) */
    private readonly HORSE_UNICODE = "\u265E";

    /** Pathfinding service instance */
    private pathfindingService: PathfindingService;

    /** Animation manager instance */
    private animationManager: AnimationManager;

    onLoad() {
        this.pathfindingService = new PathfindingService(gameDataService);
        this.animationManager = new AnimationManager();
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
            const color = getBaseColor(this.baseColor);
            if (color) {
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
            const color = getBaseColor(this.baseColor);
            if (color) {
                this.horseIconLabel.color = color;
            }

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
        if (this.isFlyingToBase) {
            this.animationManager.playFlyingToBaseAnimation(this.node);
        } else if (this.isJumping) {
            this.animationManager.playJumpingAnimation(this.node);
        } else if (this.isHovered) {
            this.animationManager.playHoveredAnimation(this.node);
        } else {
            this.animationManager.resetScale(this.node);
        }
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
        Logger.debug("HorseComponent", `Horse clicked: ${this.horseID}, baseColor: ${this.baseColor}`);
        
        const horseData = gameDataService.getHorse(this.horseID);
        if (!horseData) {
            Logger.warn("HorseComponent", `Horse data not found for ${this.horseID}`);
            return;
        }

        const bases = gameDataService.getBases();
        const base = bases.find(b => b.color === this.baseColor);
        const baseID = base ? base.ID : horseData.baseID;
        
        if (!baseID) {
            Logger.warn("HorseComponent", `Base ID not found for horse ${this.horseID}`);
            return;
        }

        // Check if horse is already spawned (in a walkway cell)
        if (horseData.isSpawned && horseData.cellID) {
            this.moveToNextCell(horseData.cellID, baseID);
        } else {
            this.moveToSpawnCell(baseID);
        }
    }

    /**
     * Move horse to next cell
     */
    private moveToNextCell(currentCellID: string, baseID: string) {
        const nextCell = this.pathfindingService.findNextCell(currentCellID, baseID);
        if (!nextCell) {
            Logger.warn("HorseComponent", `No next cell found for ${currentCellID}`);
            return;
        }

        Logger.debug("HorseComponent", `Moving to next cell: ${nextCell.cellID}`);
        this.executeMove(nextCell);
    }

    /**
     * Move horse to spawn cell
     */
    private moveToSpawnCell(baseID: string) {
        const spawnCell = gameDataService.findSpawnCellForBase(baseID);
        if (!spawnCell) {
            Logger.warn("HorseComponent", `SPAWN cell not found for base ${baseID}`);
            return;
        }

        Logger.debug("HorseComponent", `Found SPAWN cell: ${spawnCell.cellID} for base ${baseID}`);
        this.executeMove(spawnCell, () => {
            this.startAutoMovement();
        });
    }

    /**
     * Execute movement to target cell
     */
    private executeMove(targetCell: Cell, onComplete?: () => void) {
        const targetPosition = this.findCellNodePosition(targetCell.cellID);
        if (!targetPosition) {
            Logger.warn("HorseComponent", `Cell node not found in scene for ${targetCell.cellID}`);
            return;
        }

        // Move horse to target position using tween
        this.moveHorseToPosition(targetPosition, () => {
            // Update horse data after movement completes
            this.updateHorseDataAfterMove(targetCell);
            if (onComplete) {
                onComplete();
            }
        });
    }


    /**
     * Update horse data after movement completes
     */
    private updateHorseDataAfterMove(targetCell: Cell) {
        const horseData = gameDataService.getHorse(this.horseID);
        if (!horseData) {
            Logger.warn("HorseComponent", `Horse data not found for ${this.horseID}`);
            return;
        }

        horseData.cellID = targetCell.cellID;
        horseData.position = targetCell.position;
        horseData.isSpawned = true;
        horseData.steps += 1;

        Logger.debug("HorseComponent", `Updated horse ${this.horseID} to cell ${targetCell.cellID}, steps: ${horseData.steps}`);
    }

    /**
     * Start auto-movement - horse will move every 1 second automatically
     */
    private startAutoMovement() {
        if (this.isAutoMoving) {
            return;
        }

        this.isAutoMoving = true;
        Logger.debug("HorseComponent", `Starting auto-movement with interval ${this.AUTO_MOVE_INTERVAL}s`);
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
    }

    /**
     * Auto-move to next cell (called by schedule)
     */
    private autoMoveToNextCell() {
        if (!this.isAutoMoving) {
            return;
        }

        const horseData = gameDataService.getHorse(this.horseID);
        if (!horseData || !horseData.cellID) {
            Logger.warn("HorseComponent", "Horse data not found or not spawned");
            this.stopAutoMovement();
            return;
        }

        const links = gameDataService.getLinksForCell(horseData.cellID);
        if (links.length === 0 || links[0].position === GAME_CONSTANTS.POSITION_HOME) {
            this.stopAutoMovement();
            return;
        }

        const nextCell = this.pathfindingService.findNextCell(horseData.cellID, horseData.baseID);
        if (!nextCell) {
            Logger.warn("HorseComponent", "No next cell found, stopping auto-movement");
            this.stopAutoMovement();
            return;
        }

        Logger.debug("HorseComponent", `Auto-moving to next cell: ${nextCell.cellID}`);
        this.executeMove(nextCell);
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
            Logger.warn("HorseComponent", "No WalkwayComponents found in scene");
            return null;
        }

        for (const walkway of walkwayComponents) {
            const cellNode = walkway.getCellNode(cellID);
            if (cellNode) {
                const worldPos = new Vec3();
                cellNode.getWorldPosition(worldPos);
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
            return;
        }

        this.animationManager.stopAnimation(this.nodeHorseIcon);
        this.reparentToTopLayer();
        this.ensureRenderOnTop();
        
        const startPos = new Vec3();
        this.nodeHorseIcon.getPosition(startPos);
        
        const localTargetPos = this.convertToLocalPosition(targetPosition);
        
        this.animationManager.playMovementAnimation(
            this.nodeHorseIcon,
            startPos,
            localTargetPos,
            onComplete
        );
    }

    /**
     * Reparent HorseIcon to top layer for rendering on top
     */
    private reparentToTopLayer(): void {
        if (!this.nodeHorseIcon) return;
        
        const scene = this.node.scene;
        if (!scene) return;

        const topLayer = scene.getChildByName("Canvas") || scene;
        if (topLayer === this.nodeHorseIcon.parent) return;

        const worldPos = new Vec3();
        this.nodeHorseIcon.getWorldPosition(worldPos);
        
        topLayer.addChild(this.nodeHorseIcon);
        
        const localPos = new Vec3();
        topLayer.inverseTransformPoint(localPos, worldPos);
        localPos.z = CELL_CONFIG.TOP_LAYER_Z_INDEX;
        this.nodeHorseIcon.setPosition(localPos);
    }

    /**
     * Ensure HorseIcon renders on top by moving to end of parent's children
     */
    private ensureRenderOnTop(): void {
        if (!this.nodeHorseIcon?.parent) return;
        
        const parent = this.nodeHorseIcon.parent;
        parent.removeChild(this.nodeHorseIcon);
        parent.addChild(this.nodeHorseIcon);
    }

    /**
     * Convert world position to local position relative to HorseIcon's parent
     */
    private convertToLocalPosition(worldPos: Vec3): Vec3 {
        const localPos = new Vec3();
        this.nodeHorseIcon.parent?.inverseTransformPoint(localPos, worldPos);
        localPos.z = CELL_CONFIG.TOP_LAYER_Z_INDEX;
        return localPos;
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
        if (this.animationManager) {
            this.animationManager.stopAnimation(this.node);
            if (this.nodeHorseIcon) {
                this.animationManager.stopAnimation(this.nodeHorseIcon);
            }
        }
    }
}

