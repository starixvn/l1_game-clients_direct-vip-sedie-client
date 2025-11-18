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

import { _decorator, Component, Node, Label, UITransform, tween, Vec3, Color, Sprite } from "cc";
import { BaseColor } from "../game-board-data";
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

    onDestroy() {
        // Stop any running animations
        if (this.animationTween) {
            this.animationTween.stop();
            this.animationTween = null;
        }
    }
}

