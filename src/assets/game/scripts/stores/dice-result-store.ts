import inversify from "inversify";
import mobx from "mobx";

const { injectable } = inversify;

export interface DiceResultData {
    dice: number[];
    currentPlayer: number;
    playerName: string;
    hasMove: boolean;
}

@injectable()
export class DiceResultStore {
    constructor() {
        mobx.makeAutoObservable(this);
    }

    private _diceResult: DiceResultData | null = null;

    get diceResult(): DiceResultData | null {
        return this._diceResult;
    }

    get dice(): number[] {
        return this._diceResult?.dice || [];
    }

    get currentPlayer(): number {
        return this._diceResult?.currentPlayer ?? -1;
    }

    get playerName(): string {
        return this._diceResult?.playerName || "";
    }

    get hasMove(): boolean {
        return this._diceResult?.hasMove || false;
    }

    get displayText(): string {
        if (!this._diceResult) {
            return "Dice: -";
        }

        const diceValues = this._diceResult.dice.join(", ");
        let displayText = `Player: ${this._diceResult.playerName} | Dice: [${diceValues}]`;
        
        if (!this._diceResult.hasMove) {
            displayText += " | No Move";
        }

        return displayText;
    }

    setDiceResult(data: DiceResultData | null): void {
        this._diceResult = data;
    }

    clear(): void {
        this._diceResult = null;
    }
}

