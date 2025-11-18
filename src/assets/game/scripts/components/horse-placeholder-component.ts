/**
 * Horse Placeholder Component
 * 
 * A wrapper component that provides a visual container for horses.
 * Shows a colored circle background where horses can be placed.
 * Can conditionally show or hide the actual horse inside.
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Sprite, Color, UITransform, instantiate, Prefab } from "cc";
import { BaseColor } from "../game-board-data";
import { 
    CELL_DIMENSION,
    HORSE_PLACEHOLDER_SIZE,
    BASE_COLORS 
} from "../global-constants";
import { HorseComponent } from "./horse-component";

const { ccclass, property } = _decorator;

/**
 * Public props for the HorsePlaceholder component
 */
export interface IHorsePlaceholderComponentProps {
    /** Color of the placeholder (matches the player's base color) */
    baseColor: BaseColor;
    /** Whether to hide the horse inside the placeholder */
    isHorseHidden: boolean;
    /** Whether the horse is being hovered (for action selection highlighting) */
    isHovered?: boolean;
    /** Optional horse ID to pass to the Horse component */
    horseID?: string;
}

@ccclass("HorsePlaceholderComponent")
export class HorsePlaceholderComponent extends Component {
    /** Color of the placeholder (matches the player's base color) */
    @property({ type: String, tooltip: "Base color (YELLOW, GREEN, BLUE, RED)" })
    baseColor: BaseColor = "YELLOW";

    /** Whether to hide the horse inside the placeholder */
    @property({ type: Boolean, tooltip: "Whether to hide the horse" })
    isHorseHidden: boolean = false;

    /** Whether the horse is being hovered (for action selection highlighting) */
    @property({ type: Boolean, tooltip: "Whether the horse is hovered" })
    isHovered: boolean = false;

    /** Optional horse ID to pass to the Horse component */
    @property({ type: String, tooltip: "Horse ID (e.g., BASE_1_HORSE_1)" })
    horseID: string = "";

    /** Horse prefab (optional, will create programmatically if not provided) */
    @property({ type: Prefab, tooltip: "Horse prefab (optional)" })
    horsePrefab: Prefab = null;

    /** Container node for centering */
    @property({ type: Node, tooltip: "Container node (if null, uses this node)" })
    containerNode: Node = null;

    /** Circle background node */
    @property({ type: Node, tooltip: "Circle background node" })
    nodeCircle: Node = null;

    /** Horse node (child containing HorseComponent) */
    @property({ type: Node, tooltip: "Horse node (child with HorseComponent)" })
    nodeHorse: Node = null;

    /** Circle sprite component */
    private circleSprite: Sprite = null;

    /** Horse component reference */
    private horseComponent: HorseComponent = null;

    /** Placeholder size in pixels */
    private placeholderSize: number = CELL_DIMENSION * HORSE_PLACEHOLDER_SIZE;

    /** Horse size in pixels */
    private horseSize: number = CELL_DIMENSION;

    onLoad() {
        this.initializePlaceholder();
    }

    /**
     * Initialize the placeholder component
     */
    private initializePlaceholder() {
        // Use container node or this node
        const container = this.containerNode || this.node;

        // Set up container size
        const containerTransform = container.getComponent(UITransform);
        if (!containerTransform) {
            const newTransform = container.addComponent(UITransform);
            newTransform.setContentSize(this.placeholderSize, this.placeholderSize);
            newTransform.setAnchorPoint(0.5, 0.5);
        } else {
            containerTransform.setContentSize(this.placeholderSize, this.placeholderSize);
            containerTransform.setAnchorPoint(0.5, 0.5);
        }

        // Create or get circle background
        if (!this.nodeCircle) {
            this.nodeCircle = new Node("Circle");
            container.addChild(this.nodeCircle);
            
            const circleTransform = this.nodeCircle.addComponent(UITransform);
            circleTransform.setContentSize(this.horseSize, this.horseSize);
            circleTransform.setAnchorPoint(0.5, 0.5);
            this.nodeCircle.setPosition(0, 0, 0);
        }

        this.circleSprite = this.nodeCircle.getComponent(Sprite);
        if (!this.circleSprite) {
            this.circleSprite = this.nodeCircle.addComponent(Sprite);
        }

        // Create or get horse node
        if (!this.nodeHorse) {
            if (this.horsePrefab) {
                this.nodeHorse = instantiate(this.horsePrefab);
            } else {
                this.nodeHorse = new Node("Horse");
                const horseComponent = this.nodeHorse.addComponent(HorseComponent);
                horseComponent.baseColor = this.baseColor;
                horseComponent.horseSize = this.horseSize;
            }
            
            container.addChild(this.nodeHorse);
            this.nodeHorse.setPosition(0, 0, 0);
        }

        // Get horse component
        this.horseComponent = this.nodeHorse.getComponent(HorseComponent);
        if (!this.horseComponent && !this.horsePrefab) {
            // If using prefab, try to get component from child
            this.horseComponent = this.nodeHorse.getComponentInChildren(HorseComponent);
        }

        // Update visual state
        this.updateVisualState();
    }

    /**
     * Update the visual state of the placeholder
     */
    public updateVisualState() {
        // Update circle background
        this.updateCircle();

        // Update horse visibility and state
        this.updateHorse();
    }

    /**
     * Update the circle background
     */
    private updateCircle() {
        if (!this.circleSprite) {
            return;
        }

        // Set circle color to default (light gray/white)
        // In the React version, it uses BaseColors.DEFAULT which is likely a light color
        this.circleSprite.color = new Color(240, 240, 240, 255); // Light gray background

        // Ensure circle has proper size
        const circleTransform = this.nodeCircle.getComponent(UITransform);
        if (circleTransform) {
            circleTransform.setContentSize(this.horseSize, this.horseSize);
            circleTransform.setAnchorPoint(0.5, 0.5);
        }
    }

    /**
     * Update the horse visibility and state
     */
    private updateHorse() {
        if (!this.nodeHorse) {
            return;
        }

        // Hide/show horse based on isHorseHidden
        this.nodeHorse.active = !this.isHorseHidden;

        // Update horse component if it exists
        if (this.horseComponent) {
            this.horseComponent.baseColor = this.baseColor;
            this.horseComponent.horseID = this.horseID;
            this.horseComponent.isHovered = this.isHovered;
            this.horseComponent.updateVisualState();
        } else if (!this.isHorseHidden) {
            // Try to find or create horse component
            this.horseComponent = this.nodeHorse.getComponent(HorseComponent);
            if (!this.horseComponent) {
                this.horseComponent = this.nodeHorse.getComponentInChildren(HorseComponent);
            }
            if (!this.horseComponent) {
                // Create horse component if it doesn't exist
                this.horseComponent = this.nodeHorse.addComponent(HorseComponent);
                this.horseComponent.baseColor = this.baseColor;
                this.horseComponent.horseSize = this.horseSize;
                this.horseComponent.horseID = this.horseID;
                this.horseComponent.isHovered = this.isHovered;
            }
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
     * Set whether the horse is hidden
     */
    public setHorseHidden(hidden: boolean) {
        this.isHorseHidden = hidden;
        this.updateVisualState();
    }

    /**
     * Set hovered state
     */
    public setHovered(hovered: boolean) {
        this.isHovered = hovered;
        if (this.horseComponent) {
            this.horseComponent.setHovered(hovered);
        }
    }

    /**
     * Set horse ID
     */
    public setHorseID(horseID: string) {
        this.horseID = horseID;
        if (this.horseComponent) {
            this.horseComponent.setHorseID(horseID);
        }
        this.updateVisualState();
    }

    /**
     * Get the horse component
     */
    public getHorseComponent(): HorseComponent | null {
        return this.horseComponent;
    }
}

