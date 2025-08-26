import { _decorator, Component, Node, sp } from "cc";
import { AnimationUtils } from "../../../extensions/shared-components/assets/shared/utils";
const { ccclass, property } = _decorator;

@ccclass("TestCard")
export class TestCard extends Component {
    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    @property(sp.Skeleton)
    skeletonHightLight: sp.Skeleton = null;

    @property(Node)
    hightLight: Node = null;

    current = false;

    start() {}

    onClickPause() {
        const newState = !this.current;
        this.skeleton.paused = newState;
        this.current = newState;
    }

    async onClickLucky() {
        await AnimationUtils.playSpine(this.skeleton, "lucky-card", false);
    }

    async onClickStaticLucky() {
        await AnimationUtils.playSpine(this.skeleton, "default-front-gold", false);
    }

    async onClickOpenCard() {
        await AnimationUtils.playSpine(this.skeleton, "open-card", false);
    }

    async onClickOpenStaticCard() {
        await AnimationUtils.playSpine(this.skeleton, "default-front", false);
    }

    async onClickClose() {
        this.hightLight.active = false;
        await AnimationUtils.playSpine(this.skeleton, "close-card", false);
    }
    async onClickCloseGold() {
        await AnimationUtils.playSpine(this.skeleton, "close-card-gold", false);
    }

    async onClickBackCard() {
        await AnimationUtils.playSpine(this.skeleton, "default-back", false);
    }

    async onClickHightLight() {
        this.hightLight.active = true;
    }

    async onClickResetAnim() {
        this.skeleton.clearAnimation();
    }
}
