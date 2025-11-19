/**
 * Cell Configuration Constants
 * 
 * Centralized configuration for cell-related constants
 */

import { Color } from "cc";
import { CELL_DIMENSION } from "../global-constants";

/**
 * Cell rendering configuration
 */
export const CELL_CONFIG = {
    /** Z-index for rendering on top */
    TOP_LAYER_Z_INDEX: -1000,
    
    /** Bet horse icon size as percentage of cell dimension */
    BET_HORSE_ICON_SIZE_RATIO: 0.3,
    
    /** Bet horse label font size as percentage of icon size */
    BET_HORSE_LABEL_SIZE_RATIO: 0.6,
    
    /** Bet horse position clamp range (percentage) */
    BET_HORSE_MIN_POSITION: 10,
    BET_HORSE_MAX_POSITION: 90,
    
    /** Gold color for bet horse icons */
    BET_HORSE_COLOR: new Color(255, 215, 0, 255),
    
    /** Bet horse icon size in pixels */
    getBetHorseIconSize: () => CELL_DIMENSION * 0.3,
} as const;

/**
 * Animation configuration
 */
export const ANIMATION_CONFIG = {
    /** Jump height multiplier for movement animation */
    JUMP_HEIGHT_MULTIPLIER: 0.3,
    
    /** Maximum jump height in pixels */
    MAX_JUMP_HEIGHT: 50,
    
    /** Minimum animation duration in seconds */
    MIN_DURATION: 0.3,
    
    /** Maximum animation duration in seconds */
    MAX_DURATION: 0.6,
    
    /** Distance divisor for calculating duration */
    DURATION_DIVISOR: 200,
} as const;

