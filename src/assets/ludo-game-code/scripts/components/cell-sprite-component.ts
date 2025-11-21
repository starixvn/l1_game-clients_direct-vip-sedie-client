/**
 * Cell Sprite Component
 *
 * Updates the sprite frame of the node based on the cell's baseID.
 * The sprite frame is selected from the cellSprites array using the baseID as an index.
 */

import { _decorator, Component, Node, Sprite, SpriteFrame } from "cc";
import { gameDataService } from "../services/game-data-service";
import { CellComponent } from "./cell-component";
import { Logger } from "../utils/logger";

const { ccclass, property } = _decorator;

@ccclass("CellSpriteComponent")
export class CellSpriteComponent extends Component {
    /** Array of sprite frames for cells, indexed by base ID: [BASE_1, BASE_2, BASE_3, BASE_4] */
    @property({ type: [SpriteFrame], tooltip: "Cell sprite frames array: [BASE_1, BASE_2, BASE_3, BASE_4]" })
    cellSprites: SpriteFrame[] = [];

    /** Optional cell ID to look up baseID from game data (if not provided, will try to get from CellComponent) */
    @property({ type: String, tooltip: "Cell ID (optional, will try to get from CellComponent if not set)" })
    cellID: string = "";

    /** Sprite component reference */
    private sprite: Sprite = null;

    onLoad() {
        this.initializeSprite();
        this.updateSpriteFrame();
    }

    /**
     * Initialize the sprite component
     */
    private initializeSprite() {
        this.sprite = this.node.getComponent(Sprite);
        if (!this.sprite) {
            this.sprite = this.node.addComponent(Sprite);
        }
    }

    /**
     * Get baseID from cell data
     */
    private getBaseID(): string | null {
        // First, try to get from CellComponent if available
        const cellComponent = this.node.getComponent(CellComponent);
        if (cellComponent) {
            const cellData = cellComponent.getCellData();
            if (cellData && cellData.baseID) {
                return cellData.baseID;
            }
        }

        // Try to get from parent node's CellComponent
        if (this.node.parent) {
            const parentCellComponent = this.node.parent.getComponent(CellComponent);
            if (parentCellComponent) {
                const cellData = parentCellComponent.getCellData();
                if (cellData && cellData.baseID) {
                    return cellData.baseID;
                }
            }
        }

        // If cellID is set, try to look up from game data service
        if (this.cellID) {
            const cellData = gameDataService.getCell(this.cellID);
            if (cellData && cellData.baseID) {
                return cellData.baseID;
            }
        }

        Logger.warn("CellSpriteComponent", `Could not determine baseID for node ${this.node.name}`);
        return null;
    }

    /**
     * Get index for base ID in sprite frames array
     * Mapping: BASE_1 -> 0, BASE_2 -> 1, BASE_3 -> 2, BASE_4 -> 3
     */
    private getBaseIDIndex(baseID: string): number {
        const baseIDIndexMap: { [key: string]: number } = {
            BASE_1: 0,
            BASE_2: 1,
            BASE_3: 2,
            BASE_4: 3,
        };
        return baseIDIndexMap[baseID] ?? -1;
    }

    /**
     * Update the sprite frame based on the cell's baseID
     */
    public updateSpriteFrame() {
        if (!this.sprite) {
            this.initializeSprite();
        }

        if (!this.sprite) {
            Logger.warn("CellSpriteComponent", "Sprite component not available");
            return;
        }

        // Check if cellSprites array has data
        if (!this.cellSprites || this.cellSprites.length === 0) {
            Logger.debug("CellSpriteComponent", "cellSprites array is empty, skipping sprite frame update");
            return;
        }

        // Get baseID from cell
        const baseID = this.getBaseID();
        if (!baseID) {
            Logger.warn("CellSpriteComponent", `Could not determine baseID for node ${this.node.name}`);
            return;
        }

        // Get index for baseID
        const index = this.getBaseIDIndex(baseID);
        if (index < 0 || index >= this.cellSprites.length) {
            Logger.warn("CellSpriteComponent", `Invalid index ${index} for baseID ${baseID} (array length: ${this.cellSprites.length})`);
            return;
        }

        // Set sprite frame
        const spriteFrame = this.cellSprites[index];
        if (spriteFrame) {
            this.sprite.spriteFrame = spriteFrame;
            Logger.debug("CellSpriteComponent", `Updated sprite frame for baseID ${baseID} at index ${index}`);
        } else {
            Logger.warn("CellSpriteComponent", `Sprite frame at index ${index} is null or undefined`);
        }
    }

    /**
     * Public method to refresh the sprite frame (useful when cell data changes)
     */
    public refresh() {
        this.updateSpriteFrame();
    }
}
