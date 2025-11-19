/**
 * Horse Placeholder Component
 * 
 * A wrapper component that provides a visual container for horses.
 * Can conditionally show or hide the actual horse inside.
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, UITransform, Sprite } from "cc";
import { BaseColor } from "../game-board-data";
import { 
    CELL_DIMENSION,
    HORSE_PLACEHOLDER_SIZE
} from "../global-constants";
import { HorseComponent } from "./horse-component";
import { getBaseColor } from "../utils/color-utils";

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

    /** Horse node (child containing HorseComponent) - found dynamically */
    private nodeHorse: Node = null;

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
     * Expects to be used with a prefab that has a child node: "Horse"
     */
    private initializePlaceholder() {
        // Use container node or this node
        const container = this.node;

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

        // Find or create horse node
        this.nodeHorse = container.getChildByName("Horse");
        
        if (!this.nodeHorse) {
            // Create horse node if not found
            this.nodeHorse = new Node("Horse");
            const horseComponent = this.nodeHorse.addComponent(HorseComponent);
            horseComponent.baseColor = this.baseColor;
            horseComponent.horseSize = this.horseSize;
            container.addChild(this.nodeHorse);
            this.nodeHorse.setPosition(0, 0, 0);
        }

        // Get horse component
        this.horseComponent = this.nodeHorse.getComponent(HorseComponent);
        if (!this.horseComponent) {
            // Try to get from children (in case prefab has nested structure)
            this.horseComponent = this.nodeHorse.getComponentInChildren(HorseComponent);
        }

        // Set base color to horse node
        this.updateHorseNodeColor();

        // Wait for next frame to ensure HorseComponent's onLoad() has completed
        // before updating visual state to avoid double initialization
        this.scheduleOnce(() => {
            this.updateVisualState();
        }, 0);
    }

    /**
     * Update the visual state of the placeholder
     */
    public updateVisualState() {
        // Update horse node color
        this.updateHorseNodeColor();
        
        // Update horse visibility and state
        this.updateHorse();
    }

    /**
     * Update the color of the horse node based on base color
     */
    private updateHorseNodeColor() {
        if (!this.nodeHorse) {
            return;
        }

        // Get or add Sprite component to horse node
        let horseSprite = this.nodeHorse.getComponent(Sprite);
        if (!horseSprite) {
            horseSprite = this.nodeHorse.addComponent(Sprite);
        }

        // Get color from utility
        const color = getBaseColor(this.baseColor);
        if (color) {
            horseSprite.color = color;
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
            // Update properties
            this.horseComponent.baseColor = this.baseColor;
            this.horseComponent.horseID = this.horseID;
            this.horseComponent.isHovered = this.isHovered;
            // Update visual state - this is safe to call after initialization
            this.horseComponent.updateVisualState();
        } else if (!this.isHorseHidden) {
            // Try to find or create horse component
            this.horseComponent = this.nodeHorse.getComponent(HorseComponent);
            if (!this.horseComponent) {
                this.horseComponent = this.nodeHorse.getComponentInChildren(HorseComponent);
            }
            if (!this.horseComponent) {
                // Create horse component if it doesn't exist
                // Note: onLoad() will be called automatically, which will initialize the component
                this.horseComponent = this.nodeHorse.addComponent(HorseComponent);
                this.horseComponent.baseColor = this.baseColor;
                this.horseComponent.horseSize = this.horseSize;
                this.horseComponent.horseID = this.horseID;
                this.horseComponent.isHovered = this.isHovered;
                // Don't call updateVisualState() here - let onLoad() handle initialization
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

