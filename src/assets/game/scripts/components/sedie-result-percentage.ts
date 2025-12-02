import gc from "@sg/game-client-base";
import { _decorator } from "cc";
import { ResultPercentage } from "db://shared-components/game/result-percentage/scripts/result-percentage";
const { ccclass } = _decorator;
@ccclass
export class SeDieResultPercentage extends ResultPercentage {
    calculateWinPercentage(originalChoices: string[], roundHistory: gc.RoundHistories.RoundHistory[]): Record<string, number> {
        const count = super.calculateWin(originalChoices, roundHistory);
        const total = roundHistory.length;

        const calculatePercentage = (value: number) => Math.round((value * 100) / total);

        // Initialize the percentage object
        const percentage: Record<string, number> = {};

        // Calculate odd and even percentages
        const oddValue = calculatePercentage(count["odd"]);
        const evenValue = 100 - oddValue;

        // Calculate red2, white4, and red4 percentages for odd
        const red2Value = Math.min(calculatePercentage(count["red2"]), evenValue);
        const white4Value = Math.min(calculatePercentage(count["white4"]), evenValue - red2Value);
        const red4Value = evenValue - (red2Value + white4Value);

        // Calculate white3 and red3 percentages for even
        const white3Value = Math.min(calculatePercentage(count["white3"]), oddValue);
        const red3Value = oddValue - white3Value;

        // Assign calculated values to percentage object
        percentage["odd"] = oddValue;
        percentage["even"] = evenValue;
        percentage["red2"] = red2Value;
        percentage["red3"] = red3Value;
        percentage["red4"] = red4Value;
        percentage["white3"] = white3Value;
        percentage["white4"] = white4Value;

        return percentage;
    }
}
