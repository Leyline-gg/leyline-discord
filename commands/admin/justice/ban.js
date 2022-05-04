import bot from '../../../bot';
import { JusticeCommand, SentenceService, EmbedBase } from '../../../classes';

class ban extends JusticeCommand {
    constructor() {
        super({
            name: 'ban',
            sentence_type: SentenceService.SENTENCE_TYPES.BAN,
            description: 'Issue a temporary or permanent ban to a Discord user',
        });
    }

    //Override parent
    async executeSentence({intr, user, expires, reason}) {
        const { sentence_type } = this;
        //log sentence BEFORE banning user, to prevent DM error
        await SentenceService.logSentence({
            bot,
            user,
            mod: intr.user,
            sentence_type,
            expires,
            reason,
        });
        //issue sentence
        await SentenceService.banUser({
            bot,
            user,
            mod: intr.user,
            expires,
            reason,
        });
        
        return bot.intrReply({intr, embed: new EmbedBase({
            description: `⚖ **Sentence Successfully Issued**`,
        }).Sentence(), ephemeral: true});
    }

    async run({intr, opts}) {
        const { sentence_type } = this;
        const { SENTENCE_TYPES } = SentenceService;

        const { user, reason, expires } = super.parseInput(opts);

        //send confirm prompt if this is a sentence in SENTENCE_TYPES
        if (Object.keys(SENTENCE_TYPES).includes(sentence_type))
            if (!(await super.getModConfirmation({intr, user, reason})))
                return bot.intrReply({
                    intr,
                    ephemeral: true,
                    embed: new EmbedBase({
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

export default ban;
