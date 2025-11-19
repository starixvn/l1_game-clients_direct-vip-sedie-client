/**
 * Base Component
 * 
 * Represents a player's starting base where horses begin the game.
 * Shows 4 horse placeholders that can spawn horses when the player rolls a 6.
 * The base becomes "spawnable" when the player rolls a 6 on the die.
 * 
 * Data is read from game-board-data.ts
 */

import { _decorator, Component, Node, Sprite, Color, Label, UITransform, instantiate, Prefab, resources } from "cc";
import { gameBoardData, Base, Horse, BaseColor } from "../game-board-data";
import { WALKWAY_ROW_COUNT, CELL_DIMENSION } from "../global-constants";
import { HorsePlaceholderComponent } from "./horse-placeholder-component";

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

    /** Whether this base is enabled/active in the current game */
    @property({ type: Boolean, tooltip: "Whether this base is enabled/active" })
    isBaseEnabled: boolean = true;

    /** Container node for the outer base border */
    @property({ type: Node, tooltip: "Outer container node (colored border)" })
    nodeOuterContainer: Node = null;

    /** Container node for the inner base area */
    @property({ type: Node, tooltip: "Inner container node (horse area)" })
    nodeInnerContainer: Node = null;

    /** Horse placeholder prefab (will be instantiated dynamically) */
    @property({ type: Prefab, tooltip: "Horse placeholder prefab (will be instantiated for each horse)" })
    horsePlaceholderPrefab: Prefab = null;

    /** Container node for horse placeholders (if null, uses nodeInnerContainer or this.node) */
    @property({ type: Node, tooltip: "Container node for horse placeholders (if null, uses nodeInnerContainer)" })
    horsePlaceholdersContainer: Node = null;

    /** Debug info label (optional) */
    @property({ type: Node, tooltip: "Debug info label node (optional)" })
    nodeDebugInfo: Node = null;

    /** Sprite component for the outer container (for color) */
    private outerSprite: Sprite = null;

    /** Base data from gameBoardData */
    private baseData: Base | null = null;

    /** Map of horse IDs to their data */
    private horsesMap: Map<string, Horse> = new Map();

    /** Map of horse IDs to their placeholder component instances */
    private horsePlaceholdersMap: Map<string, HorsePlaceholderComponent> = new Map();

    /** Path to horse placeholder prefab resource */
    private readonly HORSE_PLACEHOLDER_PREFAB_PATH = "ludo-game-code/prefabs/horse-placeholder-prefab";

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

        // Update base node size
        this.updateBaseNodeSize();

        // Load and create horse placeholders
        this.loadAndCreateHorsePlaceholders();
    }

    /**
     * Update the base node size based on walkway dimensions
     */
    private updateBaseNodeSize() {
        const transform = this.node.getComponent(UITransform);
        if (!transform) {
            console.warn(`BaseComponent: No UITransform found on base node ${this.baseID}`);
            return;
        }

        // Calculate base size: (WALKWAY_ROW_COUNT - 1) * CELL_DIMENSION
        const baseSize = (WALKWAY_ROW_COUNT - 1) * CELL_DIMENSION;
        transform.setContentSize(baseSize, baseSize);
        console.log(`BaseComponent: Updated base node size to ${baseSize}x${baseSize} for ${this.baseID}`);
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
        if (this.spawnable && this.isBaseEnabled) {
            // Make it more visible when spawnable
            this.nodeInnerContainer.setScale(1.1, 1.1, 1);
        } else {
            this.nodeInnerContainer.setScale(1, 1, 1);
        }
    }

    /**
     * Load horse placeholder prefab and create instances dynamically
     */
    private loadAndCreateHorsePlaceholders() {
        // Get container for horse placeholders
        const container = this.horsePlaceholdersContainer || this.nodeInnerContainer || this.node;
        
        if (!container) {
            console.warn(`BaseComponent: No container available for horse placeholders`);
            return;
        }

        // Try to load prefab if not assigned
        if (!this.horsePlaceholderPrefab) {
            console.log(`BaseComponent: Horse placeholder prefab not assigned, attempting to load from resources`);
            resources.load(this.HORSE_PLACEHOLDER_PREFAB_PATH, Prefab, (err, prefab) => {
                if (err) {
                    console.warn(`BaseComponent: Failed to load horse placeholder prefab from ${this.HORSE_PLACEHOLDER_PREFAB_PATH}: ${err.message}`);
                    console.log(`BaseComponent: Will create placeholders programmatically instead`);
                    this.createHorsePlaceholders(container);
                    return;
                }
                
                if (prefab) {
                    this.horsePlaceholderPrefab = prefab;
                    console.log(`BaseComponent: Successfully loaded horse placeholder prefab`);
                }
                
                this.createHorsePlaceholders(container);
            });
        } else {
            this.createHorsePlaceholders(container);
        }
    }

    /**
     * Create horse placeholder instances from prefab
     */
    private createHorsePlaceholders(container: Node) {
        if (!this.baseData) {
            console.warn(`BaseComponent: Cannot create placeholders, base data not available`);
            return;
        }

        console.log(`BaseComponent: Creating ${this.baseData.horseIDs.length} horse placeholders for base ${this.baseID}`);

        // Clear existing placeholders
        this.horsePlaceholdersMap.clear();
        container.removeAllChildren();

        // Create a placeholder for each horse
        this.baseData.horseIDs.forEach((horseID, index) => {
            const horse = this.horsesMap.get(horseID);
            if (!horse) {
                console.warn(`BaseComponent: Horse data not found for ${horseID}`);
                return;
            }

            let placeholderNode: Node;

            // Instantiate from prefab if available
            if (this.horsePlaceholderPrefab) {
                placeholderNode = instantiate(this.horsePlaceholderPrefab);
                console.log(`BaseComponent: Instantiated placeholder prefab for ${horseID}`);
            } else {
                // Create programmatically as fallback
                console.log(`BaseComponent: Creating placeholder programmatically for ${horseID} (no prefab available)`);
                placeholderNode = new Node(`HorsePlaceholder_${horseID}`);
                const placeholderComponent = placeholderNode.addComponent(HorsePlaceholderComponent);
                placeholderComponent.baseColor = this.baseData.color;
                placeholderComponent.horseID = horseID;
            }

            // Get or add HorsePlaceholderComponent
            let placeholderComponent = placeholderNode.getComponent(HorsePlaceholderComponent);
            if (!placeholderComponent) {
                placeholderComponent = placeholderNode.addComponent(HorsePlaceholderComponent);
            }

            // Configure the placeholder component
            if (placeholderComponent) {
                // Set base color from base data
                placeholderComponent.setBaseColor(this.baseData.color);
                
                // Set horse ID
                placeholderComponent.setHorseID(horseID);
                
                // Store reference
                this.horsePlaceholdersMap.set(horseID, placeholderComponent);
            }

            // Add to container
            container.addChild(placeholderNode);
        });

        // Update visual state after creating all placeholders
        this.updateVisualState();
    }

    /**
     * Update horse placeholders visibility and state
     * Uses HorsePlaceholderComponent to render horses with HorseComponent
     */
    private updateHorsePlaceholders() {
        if (!this.baseData) {
            return;
        }

        this.baseData.horseIDs.forEach((horseID) => {
            const placeholderComponent = this.horsePlaceholdersMap.get(horseID);
            const horse = this.horsesMap.get(horseID);

            if (!placeholderComponent) {
                console.warn(`BaseComponent: Placeholder component not found for ${horseID}`);
                return;
            }

            if (!horse) {
                console.warn(`BaseComponent: Horse data not found for ${horseID}`);
                return;
            }

            // Configure the placeholder component with horse data
            // Set base color from base data (in case it changed)
            placeholderComponent.setBaseColor(this.baseData.color);
            
            // Set horse ID (in case it changed)
            placeholderComponent.setHorseID(horseID);
            
            // Determine if horse should be hidden:
            // Hide if base is disabled OR horse is already spawned/retired
            const isHorseHidden = !this.isBaseEnabled || horse.isSpawned || horse.isRetired;
            placeholderComponent.setHorseHidden(isHorseHidden);
            
            // Update visual state to apply changes
            placeholderComponent.updateVisualState();
            
            console.log(`BaseComponent: Updated placeholder for ${horseID}: hidden=${isHorseHidden}, baseColor=${this.baseData.color}`);
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
        if (!this.isBaseEnabled) {
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
        this.isBaseEnabled = enabled;
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

