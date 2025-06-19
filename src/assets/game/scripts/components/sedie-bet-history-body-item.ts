import gc from "@sg/game-client-base";
import { _decorator, Button, instantiate, Label, Node, Prefab } from "cc";
import { BetHistoryNewBodyItem } from "db://shared-components/game/bet-history-new/scripts/bet-history-new-body-item";
import { BetHistoryBodyItemType } from "db://shared-components/game/bet-history/scripts/components/bet-history-body-item";
import SeDieBetHistoryBetOption from "./sedie-bet-history-bet-option";
import { formatValueBaseOnSystemType } from "db://shared-components/utils/system-type-behavior/format-value";
const { ccclass, property } = _decorator;

const { DateTimeUtils, FormatUtils } = gc;

@ccclass
export class SeDieBetHistoryBodyItem extends BetHistoryNewBodyItem {
    @property({ type: Label, override: true, visible: false })
    lblTime: Label = null;

    @property({ type: Label, override: true, visible: false })
    lblTotalStake: Label = null;

    @property({ type: Button, override: true, visible: false })
    btnRound: Button = null;

    @property(Node)
    betOption: Node = null;

    @property(Prefab)
    betPrefab: Prefab = null;

    setData(data: BetHistoryBodyItemType) {
        super.setData(data);
        const { time, settlementResult, freeBet, odds } = data.betHistoryLog;
        if (time) {
            const date = DateTimeUtils.getStringDate(time);
            const hour = DateTimeUtils.getStringHourByTime(time);
            this.lblDate && (this.lblDate.string = date);
            this.lblHour && (this.lblHour.string = hour);
        }

        if (settlementResult) {
            Object.keys(settlementResult).forEach((choice) => {
                const node = instantiate(this.betPrefab);
                const option = node.getComponent(SeDieBetHistoryBetOption);
                let stake = data.betHistoryLog[choice];
                if (+stake > 0) {
                    stake = freeBet ? 0 : stake;
                    const odd = this.getFormatOdd(odds[choice]?.toString(), data?.fractionalOddsFormat);
                    option.handleBetOptionItem(choice, odd, formatValueBaseOnSystemType(stake));
                    option.highlightForWinning(settlementResult[choice]);
                    this.betOption.addChild(node);
                }
            });
        }
    }
}
