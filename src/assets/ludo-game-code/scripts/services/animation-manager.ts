/**
 * Animation Manager
 * 
 * Handles all animation logic for game components.
 * Extracted to follow Single Responsibility Principle.
 */

import { tween, Vec3, Node } from "cc";
import { ANIMATION_CONFIG } from "../utils/cell-config";

/**
 * Animation types
 */
export enum AnimationType {
    FLYING_TO_BASE = "flyingToBase",
    JUMPING = "jumping",
    HOVERED = "hovered",
    MOVEMENT = "movement"
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
    duration?: number;
    easing?: string;
    scale?: Vec3;
    position?: Vec3;
}

/**
 * Animation Manager for handling component animations
 */
export class AnimationManager {
    private activeTweens: Map<Node, any> = new Map();

    /**
     * Stop animation for a node
     */
    stopAnimation(node: Node): void {
        const tween = this.activeTweens.get(node);
        if (tween) {
            tween.stop();
            this.activeTweens.delete(node);
        }
    }

    /**
     * Stop all animations
     */
    stopAllAnimations(): void {
        this.activeTweens.forEach((tween, node) => {
            tween.stop();
        });
        this.activeTweens.clear();
    }

    /**
     * Play flying to base animation
     */
    playFlyingToBaseAnimation(node: Node, onComplete?: () => void): void {
        this.stopAnimation(node);
        
        const animationTween = tween(node)
            .to(0.5, { scale: new Vec3(1.5, 1.5, 1) }, { easing: 'sineOut' })
            .to(0.5, { scale: new Vec3(0, 0, 1) }, { easing: 'sineIn' })
            .call(() => {
                this.activeTweens.delete(node);
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
        
        this.activeTweens.set(node, animationTween);
    }

    /**
     * Play jumping animation (bounce loop)
     */
    playJumpingAnimation(node: Node): void {
        this.stopAnimation(node);
        
        // Reset scale first
        node.setScale(1, 1, 1);
        
        const animationTween = tween(node)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'sineOut' })
            .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
            .union()
            .repeatForever()
            .start();
        
        this.activeTweens.set(node, animationTween);
    }

    /**
     * Play hovered animation
     */
    playHoveredAnimation(node: Node): void {
        this.stopAnimation(node);
        
        const animationTween = tween(node)
            .to(0.2, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineOut' })
            .start();
        
        this.activeTweens.set(node, animationTween);
    }

    /**
     * Play movement animation with jumping motion
     */
    playMovementAnimation(
        node: Node,
        startPos: Vec3,
        targetPos: Vec3,
        onComplete?: () => void
    ): void {
        this.stopAnimation(node);
        
        // Calculate jump height (proportional to distance traveled)
        const distance = Vec3.distance(startPos, targetPos);
        const jumpHeight = Math.min(
            distance * ANIMATION_CONFIG.JUMP_HEIGHT_MULTIPLIER,
            ANIMATION_CONFIG.MAX_JUMP_HEIGHT
        );
        
        // Create jumping animation: move horizontally while jumping vertically
        const midPoint = new Vec3();
        Vec3.lerp(midPoint, startPos, targetPos, 0.5);
        midPoint.y += jumpHeight; // Peak of the jump
        
        // Animation duration based on distance
        const duration = Math.max(
            ANIMATION_CONFIG.MIN_DURATION,
            Math.min(ANIMATION_CONFIG.MAX_DURATION, distance / ANIMATION_CONFIG.DURATION_DIVISOR)
        );
        
        // Jump animation: move to midpoint (peak), then to target
        const animationTween = tween(node)
            .to(duration / 2, { 
                position: midPoint 
            }, { 
                easing: 'sineOut' // Accelerate upward
            })
            .to(duration / 2, { 
                position: targetPos 
            }, { 
                easing: 'sineIn' // Decelerate downward
            })
            .call(() => {
                this.activeTweens.delete(node);
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
        
        this.activeTweens.set(node, animationTween);
    }

    /**
     * Reset node scale to default
     */
    resetScale(node: Node): void {
        this.stopAnimation(node);
        node.setScale(1, 1, 1);
    }
}

