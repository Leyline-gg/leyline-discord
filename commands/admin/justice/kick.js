import { JusticeCommand, SentenceService, EmbedBase } from '../../../classes';

class kick extends JusticeCommand {
    constructor(bot) {
        super(bot, {
            name: 'kick',
            type: SentenceService.SENTENCE_TYPES.KICK,
            description: 'Remove a Discord user from the server',
            options: {
                duration: false,
            },
        });
    }

    //Override parent
    async executeSentence({intr, user, reason}) {
        const { bot, type } = this;
        //issue sentence
        await SentenceService.kickUser({
            bot,
            user,
            mod: intr.user,
            reason,
        });
        //log sentence
        /*await*/ SentenceService.logSentence({
            bot,
            user,
            mod: intr.user,
            type,
            reason,
        });
        return bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `⚖ **Sentence Successfully Issued**`,
        }).Sentence(), ephemeral: true});
    }

    async run({intr, opts}) {
        const { bot, type } = this;
        const { SENTENCE_TYPES } = SentenceService;

        const { user, reason } = super.parseInput(opts);

        //send confirm prompt if this is a sentence in SENTENCE_TYPES
        if (Object.keys(SENTENCE_TYPES).includes(type))
            if (!(await super.getModConfirmation({intr, user, reason})))
                return bot.intrReply({
                    intr,
                    ephemeral: true,
                    embed: new EmbedBase(bot, {
                        description: `❌ **Sentence canceled**`,
                    }).Error(),
                });


        //easter egg
        if(!!super.checkEasterEgg({intr, user})) return;

        this.executeSentence({intr, user, reason})
            .catch(err => {
                bot.logger.error(err);
                bot.intrReply({intr, embed: new EmbedBase(bot).ErrorDesc(err.message), ephemeral: true});
            });
    }
}

export default kick;
