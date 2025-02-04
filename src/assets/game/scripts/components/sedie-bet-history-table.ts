import { _decorator, Node } from "cc";
import { BetHistoryTable } from "db://shared-components/game/bet-history/scripts/components/bet-history-table";
import { Dialog } from "db://shared-components/shared/common-components/dialogs/dialog";
import { SeDieBetHistoryBodyItem } from "./sedie-bet-history-body-item";

const { ccclass, property } = _decorator;

@ccclass()
export class SeDieBetHistoryTable extends BetHistoryTable {
    @property(Dialog)
    dialog: Dialog = null;

    override getHistoryItemComponent(node: Node) {
        return node.getComponent(SeDieBetHistoryBodyItem);
    }
}
