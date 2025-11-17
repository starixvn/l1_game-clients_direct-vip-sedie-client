/**
 * Base Component
 * 
 * Represents a player's starting base where horses begin the game.
 * Shows 4 horse placeholders that can spawn horses when the player rolls a 6.
 * The base becomes "spawnable" when the player rolls a 6 on the die.
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Sprite, Color, Label } from "cc";
import { gameBoardData, Base, Horse, BaseColor } from "../game-board-data";

const { ccclass, property } = _decorator;

/**
 * Public props for the Base component
 */
export interface IBaseComponentProps {
    /** Unique identifier for this base (BASE_1, BASE_2, etc.) */
    baseID: string;
    
    /** Whether this base is enabled/active in the current game */
    enabled?: boolean;
    
    /** Whether the player of this base has won the game */
    hasWon?: boolean;
    
    /** Whether to show debug text (base ID, color, etc.) */
    showDebugText?: boolean;
}

@ccclass("BaseComponent")
export class BaseComponent extends Component {
    /** Unique identifier for this base (BASE_1, BASE_2, etc.) */
    @property({ type: String, tooltip: "Base ID (e.g., BASE_1, BASE_2, BASE_3, BASE_4)" })
    baseID: string = "";

    /** Whether the player of this base has won the game */
    @property({ type: Boolean, tooltip: "Whether the player has won" })
    hasWon: boolean = false;

    /** Whether to show debug text */
    @property({ type: Boolean, tooltip: "Show debug information" })
    showDebugText: boolean = true;

    /** Whether the base is spawnable (player rolled a 6) */
    @property({ type: Boolean, tooltip: "Whether base is spawnable (rolled 6)" })
    spawnable: boolean = false;

    /** Container node for the outer base border */
    @property({ type: Node, tooltip: "Outer container node (colored border)" })
    nodeOuterContainer: Node = null;

    /** Container node for the inner base area */
    @property({ type: Node, tooltip: "Inner container node (horse area)" })
    nodeInnerContainer: Node = null;

    /** Array of horse placeholder nodes (should be 4) */
    @property({ type: [Node], tooltip: "Horse placeholder nodes (4 horses)" })
    horsePlaceholders: Node[] = [];

    /** Debug info label (optional) */
    @property({ type: Node, tooltip: "Debug info label node (optional)" })
    nodeDebugInfo: Node = null;

    /** Sprite component for the outer container (for color) */
    private outerSprite: Sprite = null;

    /** Base data from gameBoardData */
    private baseData: Base | null = null;

    /** Map of horse IDs to their data */
    private horsesMap: Map<string, Horse> = new Map();

    /** Color mapping for bases */
    private readonly colorMap: Record<BaseColor, Color> = {
        "YELLOW": new Color(255, 255, 0, 255),
        "GREEN": new Color(0, 255, 0, 255),
        "BLUE": new Color(0, 0, 255, 255),
        "RED": new Color(255, 0, 0, 255),
    };

    onLoad() {
        this.initializeBase();
    }

    /**
     * Initialize the base with data from gameBoardData
     */
    private initializeBase() {
        if (!this.baseID) {
            console.warn("BaseComponent: baseID is not set");
            return;
        }

        // Find base data
        this.baseData = gameBoardData.bases.find(base => base.ID === this.baseID) || null;
        
        if (!this.baseData) {
            console.warn(`BaseComponent: Base data not found for ${this.baseID}`);
            return;
        }

        // Build horses map
        gameBoardData.horses.forEach(horse => {
            if (horse.baseID === this.baseID) {
                this.horsesMap.set(horse.horseID, horse);
                console.log(`BaseComponent: Added horse ${horse.horseID} to base ${this.baseID}`);
            }
        });

        // Get sprite component for outer container
        if (this.nodeOuterContainer) {
            this.outerSprite = this.nodeOuterContainer.getComponent(Sprite);
        }

        // Update visual state
        this.updateVisualState();
    }

    /**
     * Update the visual state of the base and horses
     */
    public updateVisualState() {
        if (!this.baseData) {
            return;
        }

        // Update outer container color
        this.updateOuterContainerColor();

        // Update inner container spawnable state
        this.updateInnerContainerState();

        // Update horse placeholders
        this.updateHorsePlaceholders();

        // Update debug info
        if (this.showDebugText) {
            this.updateDebugInfo();
        }
    }

    /**
     * Update the color of the outer container based on base color
     */
    private updateOuterContainerColor() {
        if (!this.baseData || !this.outerSprite) {
            return;
        }

        const color = this.colorMap[this.baseData.color];
        if (color) {
            this.outerSprite.color = color;
        }
    }

    /**
     * Update the inner container state (spawnable styling)
     */
    private updateInnerContainerState() {
        if (!this.nodeInnerContainer) {
            return;
        }

        // Add spawnable class or visual indicator
        // In Cocos Creator, you might use a different approach like:
        // - Changing opacity
        // - Adding a glow effect
        // - Changing scale
        if (this.spawnable && this.enabled) {
            // Make it more visible when spawnable
            this.nodeInnerContainer.setScale(1.1, 1.1, 1);
        } else {
            this.nodeInnerContainer.setScale(1, 1, 1);
        }
    }

    /**
     * Update horse placeholders visibility and state
     */
    private updateHorsePlaceholders() {
        if (!this.baseData) {
            return;
        }

        this.baseData.horseIDs.forEach((horseID, index) => {
            if (index >= this.horsePlaceholders.length) {
                return;
            }

            const placeholder = this.horsePlaceholders[index];
            const horse = this.horsesMap.get(horseID);

            if (!placeholder || !horse) {
                return;
            }

            // Hide horse if base is disabled OR horse is already spawned/retired
            const isHorseHidden = !this.enabled || horse.isSpawned || horse.isRetired;
            placeholder.active = !isHorseHidden;

            // You can add additional visual updates here:
            // - Change horse color based on base color
            // - Add hover effects
            // - Show horse number
        });
    }

    /**
     * Update debug information display
     */
    private updateDebugInfo() {
        if (!this.nodeDebugInfo || !this.baseData) {
            return;
        }

        const label = this.nodeDebugInfo.getComponent(Label);
        if (!label) {
            return;
        }

        const horsesInBase = this.baseData.horseIDs.filter(
            horseID => {
                const horse = this.horsesMap.get(horseID);
                return horse && !horse.isSpawned && !horse.isRetired;
            }
        ).length;

        const horsesSpawned = this.baseData.horseIDs.filter(
            horseID => {
                const horse = this.horsesMap.get(horseID);
                return horse && horse.isSpawned && !horse.isRetired;
            }
        ).length;

        const horsesHome = this.baseData.horseIDs.filter(
            horseID => {
                const horse = this.horsesMap.get(horseID);
                return horse && horse.isRetired;
            }
        ).length;

        let status = "";
        if (!this.enabled) {
            status = "DISABLED";
        } else if (this.hasWon) {
            status = "WINNER!";
        } else if (this.spawnable) {
            status = "SPAWN READY";
        }

        const debugText = [
            this.baseID.replace("_", " "),
            this.baseData.color,
            status,
            `In Base: ${horsesInBase}`,
            `On Board: ${horsesSpawned}`,
            `Home: ${horsesHome}`
        ].filter(Boolean).join("\n");

        label.string = debugText;
    }

    /**
     * Set the enabled state of the base
     */
    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.updateVisualState();
    }

    /**
     * Set the hasWon state of the base
     */
    public setHasWon(hasWon: boolean) {
        this.hasWon = hasWon;
        this.updateVisualState();
    }

    /**
     * Set the spawnable state of the base
     */
    public setSpawnable(spawnable: boolean) {
        this.spawnable = spawnable;
        this.updateVisualState();
    }

    /**
     * Get the base data
     */
    public getBaseData(): Base | null {
        return this.baseData;
    }

    /**
     * Get a horse by ID
     */
    public getHorse(horseID: string): Horse | undefined {
        return this.horsesMap.get(horseID);
    }

    /**
     * Get all horses for this base
     */
    public getHorses(): Horse[] {
        if (!this.baseData) {
            return [];
        }
        return this.baseData.horseIDs
            .map(horseID => this.horsesMap.get(horseID))
            .filter((horse): horse is Horse => horse !== undefined);
    }

    /**
     * Get count of horses in base (not spawned, not retired)
     */
    public getHorsesInBaseCount(): number {
        if (!this.baseData) {
            return 0;
        }
        return this.baseData.horseIDs.filter(horseID => {
            const horse = this.horsesMap.get(horseID);
            return horse && !horse.isSpawned && !horse.isRetired;
        }).length;
    }

    /**
     * Get count of spawned horses
     */
    public getSpawnedHorsesCount(): number {
        if (!this.baseData) {
            return 0;
        }
        return this.baseData.horseIDs.filter(horseID => {
            const horse = this.horsesMap.get(horseID);
            return horse && horse.isSpawned && !horse.isRetired;
        }).length;
    }

    /**
     * Get count of horses that reached home
     */
    public getHorsesHomeCount(): number {
        if (!this.baseData) {
            return 0;
        }
        return this.baseData.horseIDs.filter(horseID => {
            const horse = this.horsesMap.get(horseID);
            return horse && horse.isRetired;
        }).length;
    }

    /**
     * Refresh horse data from gameBoardData
     * Call this when horse states change
     */
    public refreshHorseData() {
        // Rebuild horses map
        this.horsesMap.clear();
        gameBoardData.horses.forEach(horse => {
            if (horse.baseID === this.baseID) {
                this.horsesMap.set(horse.horseID, horse);
            }
        });

        // Update visual state
        this.updateVisualState();
    }
}

