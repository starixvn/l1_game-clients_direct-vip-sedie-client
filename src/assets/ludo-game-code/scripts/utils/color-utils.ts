/**
 * Color Utilities
 * 
 * Shared utility functions for color operations
 */

import { Color } from "cc";
import { BASE_COLORS } from "../global-constants";
import { BaseColor } from "../game-board-data";

/**
 * Convert hex color string to Color object
 * @param hex Hex color string (with or without #)
 * @returns Color object
 */
export function hexToColor(hex: string): Color {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    
    // Parse RGB
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    
    return new Color(r, g, b, 255);
}

/**
 * Get color for a base color
 * @param baseColor Base color enum value
 * @returns Color object or null if not found
 */
export function getBaseColor(baseColor: BaseColor): Color | null {
    const hexColor = BASE_COLORS[baseColor];
    if (!hexColor) {
        return null;
    }
    return hexToColor(hexColor);
}

/**
 * Create a brighter version of a color
 * @param color Original color
 * @param increment Brightness increment (0-255)
 * @returns Brighter color
 */
export function brightenColor(color: Color, increment: number = 50): Color {
    return new Color(
        Math.min(255, color.r + increment),
        Math.min(255, color.g + increment),
        Math.min(255, color.b + increment),
        color.a
    );
}

