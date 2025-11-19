/**
 * Logger Utility
 * 
 * Centralized logging utility for better control and consistency
 */

const DEBUG_MODE = false; // Set to true for debug logging

/**
 * Logger class for controlled logging
 */
export class Logger {
    private static isDebugEnabled(): boolean {
        return DEBUG_MODE;
    }

    static debug(component: string, message: string, ...args: any[]): void {
        if (this.isDebugEnabled()) {
            console.log(`[${component}] ${message}`, ...args);
        }
    }

    static warn(component: string, message: string, ...args: any[]): void {
        console.warn(`[${component}] ${message}`, ...args);
    }

    static error(component: string, message: string, ...args: any[]): void {
        console.error(`[${component}] ${message}`, ...args);
    }

    static info(component: string, message: string, ...args: any[]): void {
        if (this.isDebugEnabled()) {
            console.log(`[${component}] ${message}`, ...args);
        }
    }
}

