/**
 * Dice Result Component
 *
 * Renders dice results with text, reacting to changes in DiceResultStore
 */

import { _decorator, Component, Label, Color } from "cc";
import Observer from "observer";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { DiceResultStore } from "../../../game/scripts/stores/dice-result-store";
import { gameDataService } from "../services/game-data-service";
import { getBaseColor } from "../utils/color-utils";

const { ccclass, property } = _decorator;
const { render } = Observer;

@ccclass("DiceResultComponent")
export class DiceResultComponent extends ObserverComponent {
    @property(Label)
    diceLabel: Label = null;

    private readonly playerToBaseMap: { [key: number]: string } = {
        0: "BASE_1", // YELLOW
        1: "BASE_3", // BLUE
        2: "BASE_4", // RED
        3: "BASE_2", // GREEN
    };

    onLoad() {
        super.onLoad();
        if (!this.diceLabel) {
            console.warn("DiceResultComponent: diceLabel is not assigned");
        }
    }

    @render(DiceResultStore, (store) => store.diceResult)
    onDiceResultChanged(diceResult: any) {
        this.updateDiceDisplay(diceResult);
    }

    @render(DiceResultStore, (store) => store.displayText)
    onDisplayTextChanged(displayText: string) {
        if (this.diceLabel && displayText) {
            this.diceLabel.string = displayText;
        }
    }

    private updateDiceDisplay(diceResult: any): void {
        if (!this.diceLabel) {
            return;
        }

        if (!diceResult || !diceResult.dice || diceResult.dice.length === 0) {
            this.diceLabel.string = "Dice: -";
            this.diceLabel.color = new Color(255, 255, 255, 255);
            return;
        }

        // Update label color based on current player's base color
        const currentPlayer = diceResult.currentPlayer;
        const baseID = this.playerToBaseMap[currentPlayer];
        if (baseID) {
            const base = gameDataService.getBase(baseID);
            if (base && base.color) {
                const color = getBaseColor(base.color);
                if (color) {
                    this.diceLabel.color = color;
                    return;
                }
            }
        }

        // Fallback to white
        this.diceLabel.color = new Color(255, 255, 255, 255);
    }
}
