import gc from "@sg/game-client-base";
import { _decorator, Node, sp, Sprite, SpriteFrame } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { AnimationUtils } from "db://shared-components/shared/utils";
import Observer from "observer";

const { render, handle } = Observer;
const { ccclass, property } = _decorator;

const PlateAnimation = {
    IDLE: "idle",
    SHAKE: "shake",
    OPEN: "open",
    CLOSE: "close",
};

export interface IResult {
    red1: boolean;
    red2: boolean;
    red3: boolean;
    red4: boolean;
}

@ccclass()
export class Plate extends ObserverComponent {
    @property(sp.Skeleton)
    spinePlate: sp.Skeleton = null;

    @property({ type: Sprite })
    spriteDots: Sprite[] = [];

    @property(Node)
    nodeRandomPos: Node = null;

    @property(SpriteFrame)
    frameDotOdd: SpriteFrame = null;

    @property(SpriteFrame)
    frameDotEven: SpriteFrame = null;

    private readonly audioShakeKey = "shake";
    private roundId = 0;

    async openPlate(animated: boolean) {
        if (animated) {
            await AnimationUtils.playSpine(this.spinePlate, PlateAnimation.OPEN);
        } else {
            this.spinePlate.node.active = false;
        }
    }

    async closePlate() {
        await AnimationUtils.playSpine(this.spinePlate, PlateAnimation.CLOSE);
    }

    @render(gc.Rounds.RoundStore, (store) => store.clientRoundId)
    renderRoundId(roundId: number) {
        roundId > 0 && (this.roundId = roundId);
    }

    setDots(result: IResult) {
        const randomOption = this.nodeRandomPos.children[this.roundId % 5];

        Object.keys(result).forEach((key, index) => {
            this.spriteDots[index].node.position = randomOption.children[index].position;
            this.spriteDots[index].spriteFrame = result[key] ? this.frameDotOdd : this.frameDotEven;
        });
    }

    @render(gc.Rounds.RoundTimeStore, (store) => store.isStartRound)
    async shakePlate(isStartRound: boolean) {
        if (isStartRound) {
            this.spinePlate.node.active = true;
            await this.closePlate();
            this.playSoundShake();
            AnimationUtils.playSpine(this.spinePlate, PlateAnimation.SHAKE);
        }
    }

    @handle(gc.Audios.AudioHandler, (handle, id: string) => handle.playSFX(id))
    playSoundShake() {
        return this.audioShakeKey;
    }
}
