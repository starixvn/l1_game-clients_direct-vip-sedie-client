import "./../../../resources/i18n";

import gc from "@sg/game-client-base";
import { _decorator, Node } from "cc";
import { AudioContainer } from "db://shared-components/game/audios/scripts/component/audio-container";
import { ChipFlying } from "db://shared-components/game/chip-flying/scripts/components/chip-flying";
import GameComponent from "db://shared-components/game/scripts/components/game-component";
import { WinningResult } from "db://shared-components/shared/common-components/winning-result/scripts/winning-result";
import { startGame } from "db://shared-components/shared/scripts/startup";
import { AnimationUtils, isIOS } from "db://shared-components/shared/utils";
import Observer from "observer";

import { siteConfigs } from "../../../scripts/site-configs";
import { containerOptions, settings } from "../game-settings";
import { IResult, Plate } from "./plate";

startGame(settings.name, containerOptions, siteConfigs, settings.namespaces);
const { Rounds, RoundHistories } = gc;

const { ccclass, property } = _decorator;
const { observer, render } = Observer;

@ccclass
@observer(settings.name)
export default class Game extends GameComponent {
    @property(ChipFlying)
    chipFlying: ChipFlying = null;
    override namespace = settings.name;
    override containerOptions = containerOptions;

    @property(Node)
    nodeAudioContainer: Node = null;

    @property(Node)
    nodePlate: Node = null;

    @property(Node)
    nodeWinning: Node = null;

    compPlate: Plate = null;
    protected enableFixHandleFinish = true;
    private audioContainer: AudioContainer = null;
    private winningResult: WinningResult = null;
    private readonly soundWinChoice = ["odd", "even"];
    private currentFinish: gc.GameServiceMessage.Finish = null;

    onLoad() {
        this.audioContainer = this.nodeAudioContainer.getComponent(AudioContainer);
        this.compPlate = this.nodePlate.getComponent(Plate);
        this.winningResult = this.nodeWinning.getComponent(WinningResult);
        super.onLoad();
    }

    async showResult(
        result: gc.GameServiceMessage.TResult,
        hasAnimation: boolean,
        settlementResult: gc.GameServiceMessage.TSettlementResult
    ) {
        if (result) {
            this.compPlate.setDots(result as IResult);
            await this.compPlate.openPlate(hasAnimation);
            this.winningResult.setSettlementResult(settlementResult);
            this.winningResult.show();

            const winChoice = this.soundWinChoice.find((choice) => settlementResult[choice]);
            this.playSound(`${winChoice}_wins_${gc.Translator.getLanguageId()}`);
        }
    }

    async renderCurrentFinish(currentFinish: gc.GameServiceMessage.Finish) {
        this.currentFinish = currentFinish;
        if (!currentFinish || !this.enableFixHandleFinish) {
            return;
        }
        const { result, settlementResult } = currentFinish as any;

        if (!this.isValidResult(result, settlementResult)) {
            return;
        }
        if (isIOS()) {
            await AnimationUtils.delayTime(0.8);
        }

        this.showResult(result, true, settlementResult).then(() => {
            this.finishShowResult(result, settlementResult);
            this.chipFlying.callActionPayChips();
        });
        this.playSound(gc.Audios.AudioIds.RECEIVE_FINISH);
    }

    @render(RoundHistories.RoundHistoryStore, (store) => store.firstJoinGameHistory)
    async renderStaticResult(firstJoinGameHistory: gc.RoundHistories.IFirstJoinGameHistory) {
        if (!firstJoinGameHistory) {
            return;
        }
        const roundTime = firstJoinGameHistory.roundTime;

        const lastRound = firstJoinGameHistory.roundHistory as any;
        if (lastRound) {
            const { result, settlementResult } = lastRound;
            if (firstJoinGameHistory.animationHighlight) {
                if (roundTime === 0) {
                    await AnimationUtils.delayTime(1);
                    if (this.currentFinish) {
                        return;
                    }
                    this.showResult(result, false, settlementResult);
                } else {
                    this.showResult(result, false, settlementResult);
                }
            }
        }
    }

    @render(Rounds.RoundTimeStore, (store) => store.isStartingRound)
    disableWinNotice(isStartingRound: boolean) {
        isStartingRound && this.winningResult.hideQuickly();
    }
}
