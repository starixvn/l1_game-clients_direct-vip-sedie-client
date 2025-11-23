import gc from "@sg/game-client-base";
import { LogStore } from "db://shared-components/game/scripts/stores/log-store";
import { sharedContainer } from "../../scripts/shared-container";
import { settings } from "./game-settings";
import { DiceResultStore } from "./stores/dice-result-store";
import { DiceResultHandler } from "./handlers/dice-result-handler";

export const containerOptions: gc.IContainerOptions = {
    globalContainer: sharedContainer,
    onContainerCreated: (container) => {
        container.bind(gc.GameConfigs.GameSetting).toConstantValue(settings);
        container.bind(LogStore).to(LogStore);

        // Register Dice Result feature
        container.bind(DiceResultStore).to(DiceResultStore);
        container.bind(DiceResultHandler).to(DiceResultHandler);
    },
    features: [...gc.defaultFeatures, gc.BetDetailsNew],
};
