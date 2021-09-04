const GoodActsReactionCollector = require('./GoodActsReactionCollector');
const KindWordsReactionCollector = require('./KindWordsReactionCollector');

export class ReactionCollector {
    static Collectors = {
        GOOD_ACTS: GoodActsReactionCollector,
        KIND_WORDS: KindWordsReactionCollector,
    };

    /**
     * 
     * @param {LeylineBot} bot 
     * @param {Object} args Destructured arguments 
     * @param {ReactionCollectorBase} args.type The type of collector, see `this.Collectors`
     * @returns {ReactionCollectorBase}
     */
    constructor(bot, {
        type,
        ...rest
    }) {
        return new type(bot, rest);
    }
}


