/**
 * Horse Component
 *
 * Represents a single game horse/piece in the Ludo game.
 * Horses are the pieces that players move around the board.
 * Each horse belongs to a specific player (represented by baseColor).
 *
 * This component renders the horse icon (Unicode chess knight).
 * For horses in the base, use HorsePlaceholderComponent which wraps this component.
 *
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Label, UITransform, Vec3, Sprite, Button, SpriteFrame } from "cc";
import { BaseColor, Horse, Cell, GAME_CONSTANTS, gameBoardData } from "../game-board-data";
import { WalkwayComponent } from "./walkway-component";
import { CellComponent } from "./cell-component";
import { CELL_DIMENSION } from "../global-constants";
import { gameDataService } from "../services/game-data-service";
import { PathfindingService } from "../services/pathfinding-service";
import { AnimationManager } from "../services/animation-manager";
import { CELL_CONFIG } from "../utils/cell-config";
import { Logger } from "../utils/logger";
import { BaseComponent } from "./base-component";

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
    /** Optional horse ID */
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

    /** Optional horse ID */
    @property({ type: String, tooltip: "Horse ID (e.g., BASE_1_HORSE_1)" })
    horseID: string = "";

    /** Array of sprite frames for horses, indexed by base color: [YELLOW, GREEN, BLUE, RED] */
    @property({ type: [SpriteFrame], tooltip: "Horse sprite frames array: [YELLOW, GREEN, BLUE, RED]" })
    HorseSpriteFrames: SpriteFrame[] = [];

    /** Node for the horse icon (Unicode character) */
    @property({ type: Node, tooltip: "Horse icon label node" })
    nodeHorseIcon: Node = null;

    /** Horse icon label component */
    private horseIconLabel: Label = null;

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

        // Update animations
        this.updateAnimations();
    }

    /**
     * Get index for base color in sprite frames array
     * Mapping: YELLOW -> 0, GREEN -> 1, BLUE -> 2, RED -> 3
     */
    private getBaseColorIndex(baseColor: BaseColor): number {
        const colorIndexMap: { [key in BaseColor]: number } = {
            YELLOW: 0,
            GREEN: 1,
            BLUE: 2,
            RED: 3,
        };
        return colorIndexMap[baseColor] ?? 0;
    }

    /**
     * Update the sprite frame of the HorseIcon node based on base color
     */
    private updateHorseIconSpriteFrame() {
        if (!this.nodeHorseIcon) {
            return;
        }

        // Get or add Sprite component to HorseIcon node
        let iconSprite = this.nodeHorseIcon.getComponent(Sprite);
        if (!iconSprite) {
            iconSprite = this.nodeHorseIcon.addComponent(Sprite);
        }

        // Use HorseSpriteFrames array if available
        if (this.HorseSpriteFrames && this.HorseSpriteFrames.length > 0) {
            const colorIndex = this.getBaseColorIndex(this.baseColor);
            if (colorIndex >= 0 && colorIndex < this.HorseSpriteFrames.length && this.HorseSpriteFrames[colorIndex]) {
                iconSprite.spriteFrame = this.HorseSpriteFrames[colorIndex];
                return;
            }
        }
    }

    /**
     * Update the horse icon (Unicode character)
     */
    private updateHorseIcon() {
        if (!this.nodeHorseIcon) {
            return;
        }

        // Update sprite frame first
        this.updateHorseIconSpriteFrame();

        // Note: Sprite color is not set here as sprites are used for rendering
        // The sprite frame should already contain the correct visual representation

        // Update label if it exists
        if (!this.horseIconLabel) {
            this.horseIconLabel = this.nodeHorseIcon.getComponent(Label);
        }

        if (this.horseIconLabel) {
            // Set Unicode character
            this.horseIconLabel.string = this.HORSE_UNICODE;

            // Note: Label color is not set here as sprites are used for rendering
            // The sprite frame should already contain the correct visual representation

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
     * Update animations based on state
     */
    private updateAnimations() {
        // Ensure animationManager is initialized (onLoad might not have completed yet)
        if (!this.animationManager) {
            this.animationManager = new AnimationManager();
        }

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

    /** Movement delay between cells in seconds */
    private readonly CELL_MOVE_DELAY: number = 0.1;

    /**
     * Move horse to a specific position index (from game state)
     * Moves cell by cell through the path
     * @param positionIndex Position index from game state (0 = base, >0 = cell index)
     * @param onComplete Optional callback when movement completes
     */
    public moveToPositionIndex(positionIndex: number, onComplete?: () => void) {
        if (!this.horseID) {
            Logger.warn("HorseComponent", `Cannot move: horseID is not set`);
            if (onComplete) {
                onComplete();
            }
            return;
        }

        const horseData = gameDataService.getHorse(this.horseID);
        if (!horseData) {
            Logger.warn("HorseComponent", `Horse data not found for ${this.horseID}`);
            if (onComplete) {
                onComplete();
            }
            return;
        }

        Logger.debug("HorseComponent", `Moving ${this.horseID} to position index ${positionIndex}`);

        if (positionIndex === 0) {
            // Horse should be in base (not spawned)
            horseData.isSpawned = false;
            horseData.cellID = null;
            horseData.position = null;
            horseData.steps = 0;
            horseData.isRetired = false;

            // Keep horse visible - BaseComponent will handle displaying it in the base via placeholders
            // Don't hide the node, let the placeholder system manage visibility
            this.node.active = true;
            this.stopAutoMovement();

            // Update visual state to reflect base state
            this.updateVisualState();

            // Trigger base component to update placeholders if this horse is in a placeholder
            this.updateBasePlaceholder();

            Logger.debug("HorseComponent", `Horse ${this.horseID} moved to base (keeping visible)`);
            if (onComplete) {
                onComplete();
            }
            return;
        }

        // Find target cell by index
        const targetCell = this.findCellByIndex(positionIndex);
        if (!targetCell) {
            Logger.warn("HorseComponent", `Cell not found for index ${positionIndex} (horse: ${this.horseID})`);
            if (onComplete) {
                onComplete();
            }
            return;
        }

        Logger.debug("HorseComponent", `Found cell ${targetCell.cellID} at ${targetCell.position} for index ${positionIndex}`);

        // Check if horse is already at this position
        if (horseData.cellID === targetCell.cellID && horseData.position === targetCell.position) {
            Logger.debug("HorseComponent", `Horse ${this.horseID} already at position ${positionIndex} (${targetCell.cellID})`);
            if (onComplete) {
                onComplete();
            }
            return;
        }

        this.node.active = true;
        this.stopAutoMovement();

        // Store the target steps value
        const targetSteps = positionIndex;

        // Determine source cell and build path
        let path: Cell[] = [];

        if (!horseData.cellID || !horseData.isSpawned) {
            // Horse is in base, need to spawn first
            const spawnCell = gameDataService.findSpawnCellForBase(horseData.baseID);
            if (!spawnCell) {
                Logger.warn("HorseComponent", `Spawn cell not found for base ${horseData.baseID}`);
                if (onComplete) {
                    onComplete();
                }
                return;
            }

            // If target is spawn cell, just move there
            if (spawnCell.cellID === targetCell.cellID) {
                path = [spawnCell];
            } else {
                // Find path from spawn to target
                const pathFromSpawn = this.pathfindingService.findPath(spawnCell.cellID, targetCell.cellID, horseData.baseID);
                if (pathFromSpawn.length > 0) {
                    // Pathfinding includes source (spawnCell), so use it directly
                    path = pathFromSpawn;
                } else {
                    // Fallback: just move to spawn, then try direct
                    path = [spawnCell, targetCell];
                }
            }
        } else {
            // Horse is already on board, find path from current position
            const pathFromCurrent = this.pathfindingService.findPath(horseData.cellID, targetCell.cellID, horseData.baseID);

            if (pathFromCurrent.length > 0) {
                // Pathfinding includes source cell, remove it if it matches current position
                if (pathFromCurrent[0].cellID === horseData.cellID) {
                    // Remove source cell, keep the rest
                    path = pathFromCurrent.slice(1);
                } else {
                    // Path doesn't start with current cell, use as is
                    path = pathFromCurrent;
                }
            } else {
                // Fallback: try to build path step by step using findNextCell
                path = this.buildPathStepByStep(horseData.cellID, targetCell.cellID, horseData.baseID);
            }
        }

        if (path.length === 0) {
            Logger.warn("HorseComponent", `No path found to ${targetCell.cellID}, moving directly`);
            // Fallback: move directly
            this.executeMove(targetCell, () => {
                horseData.steps = targetSteps;
                if (onComplete) {
                    onComplete();
                }
            });
            return;
        }

        Logger.debug(
            "HorseComponent",
            `Found path with ${path.length} cells for ${this.horseID}: ${path.map((c) => c.cellID).join(" -> ")}`
        );

        // Move through path cell by cell
        this.moveThroughPath(path, 0, targetSteps, onComplete);
    }

    /**
     * Build path step by step using findNextCell (fallback method)
     */
    private buildPathStepByStep(sourceCellID: string, targetCellID: string, baseID: string): Cell[] {
        const path: Cell[] = [];
        const visited = new Set<string>();
        let currentCellID = sourceCellID;
        const maxSteps = 200; // Prevent infinite loops
        let steps = 0;

        while (currentCellID !== targetCellID && steps < maxSteps) {
            if (visited.has(currentCellID)) {
                // Circular path detected
                break;
            }
            visited.add(currentCellID);

            const currentCell = gameDataService.getCell(currentCellID);
            if (!currentCell) {
                break;
            }

            // Don't add source cell to path
            if (currentCellID !== sourceCellID) {
                path.push(currentCell);
            }

            // Find next cell
            const nextCell = this.pathfindingService.findNextCell(currentCellID, baseID);
            if (!nextCell) {
                break;
            }

            currentCellID = nextCell.cellID;
            steps++;
        }

        // Add target cell if we reached it
        if (currentCellID === targetCellID) {
            const targetCell = gameDataService.getCell(targetCellID);
            if (targetCell) {
                path.push(targetCell);
            }
        }

        return path;
    }

    /**
     * Move horse through a path cell by cell
     * @param path Array of cells to move through
     * @param currentIndex Current index in the path
     * @param targetSteps Target steps value to set after movement
     * @param onComplete Callback when all movement completes
     */
    private moveThroughPath(path: Cell[], currentIndex: number, targetSteps: number, onComplete?: () => void) {
        if (currentIndex >= path.length) {
            // Path complete
            const horseData = gameDataService.getHorse(this.horseID);
            if (horseData) {
                horseData.steps = targetSteps;
            }
            Logger.debug("HorseComponent", `Path movement completed for ${this.horseID}, steps: ${targetSteps}`);
            if (onComplete) {
                onComplete();
            }
            return;
        }

        const currentCell = path[currentIndex];
        const isLastCell = currentIndex === path.length - 1;

        // Execute move to current cell
        this.executeMove(currentCell, () => {
            if (isLastCell) {
                // Last cell reached
                const horseData = gameDataService.getHorse(this.horseID);
                if (horseData) {
                    horseData.steps = targetSteps;
                }
                Logger.debug("HorseComponent", `Path movement completed for ${this.horseID} at ${currentCell.cellID}`);
                if (onComplete) {
                    onComplete();
                }
            } else {
                // Move to next cell after delay
                this.scheduleOnce(() => {
                    this.moveThroughPath(path, currentIndex + 1, targetSteps, onComplete);
                }, this.CELL_MOVE_DELAY);
            }
        });
    }

    /**
     * Find cell by index number
     */
    private findCellByIndex(index: number): Cell | null {
        for (const position in gameBoardData.cells) {
            const positionCells = gameBoardData.cells[position];
            for (const cellID in positionCells) {
                const cell = positionCells[cellID];
                if (cell.index === index) {
                    Logger.debug("HorseComponent", `Found cell ${cellID} (index ${index}) at ${position}`);
                    return cell;
                }
            }
        }
        Logger.warn("HorseComponent", `Cell with index ${index} not found in gameBoardData`);
        return null;
    }

    /**
     * Update base placeholder to reflect horse state
     * Finds the base component and triggers placeholder update
     */
    private updateBasePlaceholder(): void {
        if (!this.horseID) {
            return;
        }

        const horseData = gameDataService.getHorse(this.horseID);
        if (!horseData || !horseData.baseID) {
            return;
        }

        // Find base component in the scene
        const scene = this.node.scene;
        if (!scene) {
            return;
        }

        const findBaseComponent = (node: Node): BaseComponent | null => {
            const baseComponent = node.getComponent(BaseComponent);
            if (baseComponent && baseComponent.baseID === horseData.baseID) {
                return baseComponent;
            }
            for (let i = 0; i < node.children.length; i++) {
                const found = findBaseComponent(node.children[i]);
                if (found) {
                    return found;
                }
            }
            return null;
        };

        const baseComponent = findBaseComponent(scene);
        if (baseComponent) {
            // Trigger base component to refresh placeholders
            // updateVisualState() will call updateHorsePlaceholders() which checks horse.isSpawned
            baseComponent.updateVisualState();
            Logger.debug("HorseComponent", `Triggered base component update for ${horseData.baseID}`);
        }
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
        const base = bases.find((b) => b.color === this.baseColor);
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

            // Trigger blink animation on the target cell
            this.triggerCellBlinkAnimation(targetCell.cellID);

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
                // Get the CellComponent to access the target node based on cell type
                const cellComponent = cellNode.getComponent(CellComponent);
                const worldPos = new Vec3();
                if (cellComponent) {
                    // Get the appropriate target node based on cell type
                    const targetNode = cellComponent.getTargetNode();

                    targetNode.getWorldPosition(worldPos);
                } else {
                    // Fallback to cell node if CellComponent not found
                    cellNode.getWorldPosition(worldPos);
                }
                // Add +5 to Y position for horse positioning

                // Add +5 to Y position for horse positioning
                worldPos.y += 12;
                return worldPos;
            }
        }

        return null;
    }

    /**
     * Trigger blink animation on the target cell
     * @param cellID Cell ID to trigger blink animation on
     */
    private triggerCellBlinkAnimation(cellID: string): void {
        // Get the scene root
        const scene = this.node.scene;
        if (!scene) {
            return;
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

        // Find the cell component and trigger blink animation
        for (const walkway of walkwayComponents) {
            const cellNode = walkway.getCellNode(cellID);
            if (cellNode) {
                const cellComponent = cellNode.getComponent(CellComponent);
                if (cellComponent) {
                    cellComponent.playBlinkAnimation();
                    return;
                }
            }
        }
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

        // Ensure animationManager is initialized
        if (!this.animationManager) {
            this.animationManager = new AnimationManager();
        }

        this.animationManager.stopAnimation(this.nodeHorseIcon);
        this.reparentToTopLayer();
        this.ensureRenderOnTop();

        const startPos = new Vec3();
        this.nodeHorseIcon.getPosition(startPos);

        const localTargetPos = this.convertToLocalPosition(targetPosition);

        this.animationManager.playMovementAnimation(this.nodeHorseIcon, startPos, localTargetPos, onComplete);
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
