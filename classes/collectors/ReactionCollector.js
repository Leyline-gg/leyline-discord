import { GoodActsReactionCollector, KindWordsReactionCollector } from "..";

export class ReactionCollector {
    // A knockoff enum
    static Collectors = {
        GOOD_ACTS: GoodActsReactionCollector,
        KIND_WORDS: KindWordsReactionCollector,
    };

    /**
     * 
     * @param {Object} args Destructured arguments 
     * @param {ReactionCollectorBase} args.type The type of collector, see `this.Collectors`
     * @returns {ReactionCollectorBase}
     */
    constructor({
        type,
        ...rest
    }) {
        return new type(rest);
    }
}


