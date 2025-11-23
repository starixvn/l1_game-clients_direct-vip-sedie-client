import inversify from "inversify";
import { DiceResultStore, DiceResultData } from "../stores/dice-result-store";

const { injectable, inject } = inversify;

@injectable()
export class DiceResultHandler {
    @inject(DiceResultStore)
    private readonly diceResultStore: DiceResultStore;

    handle(diceResult: DiceResultData | null): void {
        this.diceResultStore.setDiceResult(diceResult);
    }
}

