import { JusticeCommand, SentenceService, EmbedBase } from '../../../classes';

class mute extends JusticeCommand {
    constructor(bot) {
        super(bot, {
            name: 'mute',
            sentence_type: SentenceService.SENTENCE_TYPES.MUTE,
            description: 'Issue a server mute to a Discord user',
        });
    }

    //Override parent
    async executeSentence({intr, user, expires, reason}) {
        const { bot, sentence_type } = this;
        //issue sentence
        await SentenceService.muteUser({
            bot,
            user,
            mod: intr.user,
            expires,
            reason,
        });
        //log sentence
        /*await*/ SentenceService.logSentence({
            bot,
            user,
            mod: intr.user,
            sentence_type,
            expires,
            reason,
        });
        return bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `⚖ **Sentence Successfully Issued**`,
        }).Sentence(), ephemeral: true});
    }

    async run({intr, opts}) {
        const { bot, sentence_type } = this;
        const { SENTENCE_TYPES } = SentenceService;

        const { user, reason, expires } = super.parseInput(opts);

        //send confirm prompt if this is a sentence in SENTENCE_TYPES
        if (Object.keys(SENTENCE_TYPES).includes(sentence_type))
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

        this.executeSentence({intr, user, reason, expires})
            .catch(err => {
                bot.logger.error(err);
                bot.intrReply({intr, embed: new EmbedBase(bot).ErrorDesc(err.message), ephemeral: true});
            });
    }
}

export default mute;
