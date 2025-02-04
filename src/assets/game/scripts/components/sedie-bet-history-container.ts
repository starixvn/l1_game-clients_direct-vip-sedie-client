import gc from "@sg/game-client-base";
import { _decorator } from "cc";
import BetHistoryContainer from "db://shared-components/game/bet-history/scripts/components/bet-history-container";
import { SeDieBetHistoryTable } from "./sedie-bet-history-table";

const { ccclass, property } = _decorator;

@ccclass
export default class SeDieBetHistoryContainer extends BetHistoryContainer {
    table: SeDieBetHistoryTable = null;
    protected isFirstLoad = true;
    protected DURATION_DELAY_RENDER_DATA = 0.1;
    protected currentBetHistoryModel: gc.BetHistory.BetHistoryModel = null;

    showBetHistory(betHistoryModel: gc.BetHistory.BetHistoryModel) {
        this.currentBetHistoryModel = betHistoryModel;

        if (!this.wrapperNode?.active) {
            this.initializeWrapperNode();
        }

        if (this.isFirstLoad) {
            const seDieTable = this.table;
            if (seDieTable?.dialog) {
                seDieTable.dialog.callBackFn = this.createCallBackFn(seDieTable, betHistoryModel);
            }
            return;
        }

        this.renderBetHistory();
    }

    protected initializeWrapperNode() {
        this.wrapperNode = this.createNode();
        this.table = this.wrapperNode.getComponent(SeDieBetHistoryTable);
        this.isFirstLoad = true;
    }

    protected createCallBackFn(seDieTable: SeDieBetHistoryTable, betHistoryModel: gc.BetHistory.BetHistoryModel) {
        return () => {
            if (!betHistoryModel) {
                this.scheduleOnce(seDieTable.dialog.callBackFn, this.DURATION_DELAY_RENDER_DATA);
                return;
            }
            this.renderBetHistory();
            this.isFirstLoad = false;
        };
    }

    protected renderBetHistory() {
        this.table.showBetHistory({
            data: this.currentBetHistoryModel,
            headerPrefab: this.headerPrefab,
            bodyItemPrefab: this.bodyItemPrefab,
            resultPrefab: this.resultPrefab,
        });
    }
}
