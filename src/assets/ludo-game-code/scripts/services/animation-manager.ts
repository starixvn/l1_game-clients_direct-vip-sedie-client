/**
 * Animation Manager
 * 
 * Handles all animation logic for game components.
 * Extracted to follow Single Responsibility Principle.
 */

import { tween, Vec3, Node, Sprite, Color, ParticleSystem2D } from "cc";
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

    /**
     * Play cell highlight animation with particle effects
     * @param node Cell node to animate
     * @param sprite Sprite component to highlight (optional, will be found if not provided)
     * @param duration Duration of each highlight cycle in seconds (default: 0.2)
     * @param repeatCount Number of times to highlight (default: 3)
     * @param onComplete Optional callback when animation completes
     */
    playCellHighlightAnimation(
        node: Node,
        sprite?: Sprite,
        duration: number = 0.2,
        repeatCount: number = 3,
        onComplete?: () => void
    ): void {
        this.stopAnimation(node);

        // Find sprite if not provided
        if (!sprite) {
            sprite = node.getComponent(Sprite);
            if (!sprite) {
                // Try to find sprite in child nodes
                const children = node.children;
                for (let i = 0; i < children.length; i++) {
                    sprite = children[i].getComponent(Sprite);
                    if (sprite) {
                        break;
                    }
                }
            }
        }

        // Store original color if sprite exists
        let originalColor: Color | null = null;
        if (sprite) {
            originalColor = new Color(sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a);
        }

        // Create particle effect node
        const particleNode = this.createParticleEffect(node);

        // Create highlight color (brighter)
        const highlightColor = originalColor ? new Color(
            Math.min(255, originalColor.r + 100),
            Math.min(255, originalColor.g + 100),
            Math.min(255, originalColor.b + 100),
            originalColor.a
        ) : null;

        // Create animation object that tracks both scale and color
        const animObj = { 
            scale: 1.0,
            r: originalColor ? originalColor.r : 0,
            g: originalColor ? originalColor.g : 0,
            b: originalColor ? originalColor.b : 0
        };

        // Create highlight sequence that updates both scale and color
        const highlightSequence = tween(animObj)
            .to(duration, { 
                scale: 1.025,
                r: highlightColor ? highlightColor.r : animObj.r,
                g: highlightColor ? highlightColor.g : animObj.g,
                b: highlightColor ? highlightColor.b : animObj.b
            }, {
                onUpdate: () => {
                    node.setScale(animObj.scale, animObj.scale, 1);
                    if (sprite && originalColor) {
                        sprite.color = new Color(animObj.r, animObj.g, animObj.b, originalColor.a);
                    }
                },
                easing: 'sineOut'
            })
            .to(duration, { 
                scale: 1.0,
                r: originalColor ? originalColor.r : animObj.r,
                g: originalColor ? originalColor.g : animObj.g,
                b: originalColor ? originalColor.b : animObj.b
            }, {
                onUpdate: () => {
                    node.setScale(animObj.scale, animObj.scale, 1);
                    if (sprite && originalColor) {
                        sprite.color = new Color(animObj.r, animObj.g, animObj.b, originalColor.a);
                    }
                },
                easing: 'sineIn'
            });

        // Repeat the sequence
        const animationTween = tween(animObj)
            .repeat(repeatCount, highlightSequence)
            .call(() => {
                // Reset to original state
                node.setScale(1, 1, 1);
                if (sprite && originalColor) {
                    sprite.color = originalColor;
                }
                
                // Stop and remove particle effect
                if (particleNode) {
                    const particle = particleNode.getComponent(ParticleSystem2D);
                    if (particle) {
                        particle.stopSystem();
                    }
                    particleNode.destroy();
                }
                
                this.activeTweens.delete(node);
                if (onComplete) {
                    onComplete();
                }
            })
            .start();

        this.activeTweens.set(node, animationTween);

        this.activeTweens.set(node, animationTween);
    }

    /**
     * Create particle effect for cell highlight
     * @param parentNode Parent node to attach particle to
     * @returns Particle node
     */
    private createParticleEffect(parentNode: Node): Node | null {
        try {
            const particleNode = new Node("HighlightParticle");
            parentNode.addChild(particleNode);
            
            // Set position to center
            particleNode.setPosition(0, 0, 0);

            // Add ParticleSystem2D component
            const particle = particleNode.addComponent(ParticleSystem2D);
            
            // Configure particle system for highlight effect
            particle.file = null; // Will use default particle texture
            particle.totalParticles = 30;
            particle.duration = 0.6;
            particle.life = 0.5;
            particle.lifeVar = 0.2;
            particle.startSize = 10;
            particle.startSizeVar = 5;
            particle.endSize = 5;
            particle.endSizeVar = 3;
            
            // Set colors (bright yellow/white for highlight)
            particle.startColor = new Color(255, 255, 200, 255);
            particle.startColorVar = new Color(50, 50, 50, 50);
            particle.endColor = new Color(255, 255, 255, 0);
            particle.endColorVar = new Color(0, 0, 0, 0);
            
            // Emission properties
            particle.emissionRate = 50;
            particle.speed = 50;
            particle.speedVar = 20;
            
            // Gravity and movement
            particle.gravity = new Vec3(0, -50, 0);
            particle.angle = 0;
            particle.angleVar = 360; // Emit in all directions
            
            // Start the particle system
            particle.resetSystem();
            
            return particleNode;
        } catch (error) {
            // If ParticleSystem2D is not available, return null
            return null;
        }
    }
}

