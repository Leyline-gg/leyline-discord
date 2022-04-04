import { JusticeCommand, SentenceService, EmbedBase } from '../../../classes';

class history extends JusticeCommand {
    constructor() {
        super({
            name: 'history',
            sentence_type: 'HISTORY',
            description: 'View the entire recorded sentence history for a Discord user',
            options: {
                duration: false,
                reason: false,
            },
        });
    }

    //Override parent
    async executeSentence({intr, user}) {
        const { bot } = this;
        const mod = bot.checkMod(user.id);  //we use this twice below
        return bot.intrReply({
            intr, 
            embed: SentenceService.generateHistoryEmbed({
                bot,
                user,
                mod,
                history_docs: await (mod 
                    ? SentenceService.getModHistory({user})
                    : SentenceService.getHistory({user})),
            }), 
            ephemeral: true
        });
    }

    async run({intr, opts}) {
        const { bot, sentence_type } = this;
        const { SENTENCE_TYPES } = SentenceService;

        const { user } = super.parseInput(opts);

        //send confirm prompt if this is a sentence in SENTENCE_TYPES
        if (Object.keys(SENTENCE_TYPES).includes(sentence_type))
            if (!(await super.getModConfirmation({intr, user})))
                return bot.intrReply({
                    intr,
                    ephemeral: true,
                    embed: new EmbedBase(bot, {
                        description: `❌ **Sentence canceled**`,
                    }).Error(),
                });


        //easter egg
        if(!!super.checkEasterEgg({intr, user})) return;

        this.executeSentence({intr, user})
            .catch(err => {
                bot.logger.error(err);
                bot.intrReply({intr, embed: new EmbedBase(bot).ErrorDesc(err.message), ephemeral: true});
            });
    }
}

export default history;
