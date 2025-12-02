import { _decorator, Color, Label } from "cc";
import { ScoreboardItemState } from "db://shared-components//game/scoreboards/scripts/models/scoreboard-item-state";
import { ScoreboardItemRenderer } from "db://shared-components/game/scoreboards/scripts/renderers/scoreboard-item-renderer";
import { IResult } from "../../components/plate";
const { ccclass, property } = _decorator;
@ccclass
export class SeDieResultRenderer extends ScoreboardItemRenderer {
    render(state?: ScoreboardItemState, images?: any[], item?: any) {
        const result = state?.data[0]?.result as IResult;

        if (!result) {
            return;
        }

        const label = this.node.getComponent(Label);
        if (label) {
            const point = this.calculateScore(result);
            label.string = `${point}`;
            label.color = this.renderColorScore(point);
            this.node.active = true;
        }
    }

    reset(): void {
        this.node.active = false;
    }

    calculateScore(result: IResult) {
        let trueCount = 0;

        for (const key in result) {
            if (result[key]) {
                trueCount++;
            }
        }

        return trueCount;
    }

    renderColorScore(point: number) {
        return point % 2 === 0 ? new Color("000000") : new Color("FFFFFF");
    }
}
