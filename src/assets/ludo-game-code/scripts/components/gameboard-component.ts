/**
 * Gameboard Component
 *
 * Manages the game board size based on global constants.
 * Sets the board dimensions to CELL_DIMENSION * BOARD_SIZE.
 */

import { _decorator, Component, UITransform } from "cc";
import { CELL_DIMENSION, BOARD_SIZE, BOARD_DIMENSION } from "../global-constants";
import { Logger } from "../utils/logger";

const { ccclass } = _decorator;

@ccclass("GameboardComponent")
export class GameboardComponent extends Component {
    onLoad() {
        this.initializeGameboard();
    }

    /**
     * Initialize the gameboard size based on global constants
     */
    private initializeGameboard(): void {
        // Get or add UITransform component
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }

        // Calculate size: width = height = CELL_DIMENSION * BOARD_SIZE
        const size = BOARD_DIMENSION; // Already calculated in global-constants.ts

        // Set the size
        transform.setContentSize(size, size);

        Logger.debug(
            "GameboardComponent",
            `Initialized gameboard size: ${size}x${size} (CELL_DIMENSION: ${CELL_DIMENSION} * BOARD_SIZE: ${BOARD_SIZE})`
        );
    }

    /**
     * Get the current board size
     */
    public getBoardSize(): number {
        return BOARD_DIMENSION;
    }
}
