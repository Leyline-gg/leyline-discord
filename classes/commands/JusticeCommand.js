import { Command, EmbedBase } from "..";
import parse from 'parse-duration';

export class JusticeCommand extends Command {
    constructor(bot, {
        name,
        description,
        sentence_type,   //uppercase string, see SENTENCE_TYPES
        options: {
            target=true,
            duration=true,
            reason=true,
        } = {},
    } = {}) {
        super(bot, {
            name,
            description,
            options: [
                ...(target ? [{
                    type: 'USER',
                    name: 'target',
                    description: 'The target user to sentence',
                    required: true,
                }] : []),
                ...(duration ? [{
                    type: 'STRING',
                    name: 'duration',
                    description: 'The duration of the sentence, eg: 7d. No duration means indefinite',
                    required: false,
                }] : []),
                ...(reason ? [{
                    type: 'STRING',
                    name: 'reason',
                    description: 'The reason the sentence was issued',
                    required: false,
                }] : []),
            ],
            category: 'admin',
        });
        this.sentence_type = sentence_type;
    }

    parseInput(opts) {
        const [user, duration, reason] = [
            opts.getUser('target'),
            opts.getString('duration'),
            opts.getString('reason'),
        ];

        const parsed_dur = parse(duration); //ms
        if(!!duration && !parsed_dur)
            throw new Error(`That's not a valid duration`);

        //convert duration to epoch timestamp
        const expires = !!duration 
            ? Date.now() + parsed_dur 
            : null;

        return {user, duration, reason, expires};
    }

    getModConfirmation({intr, user, reason}) {
        const { bot, sentence_type } = this;
        return bot.intrConfirm({
            intr,
            ephemeral: true,
            embed: new EmbedBase(bot, {
                description: `
                    ⚠ **Are you sure you want to ${sentence_type} ${bot.formatUser(user)} for \`${reason ?? 'No reason given'}\`?**

                    Is this sentence consistent with the official rules & moderation protocol?
                    Is this sentence consistent with the other sentences you've issued this past month?
                `,
            }).Warn(),
        })
    }

    checkEasterEgg({user, intr}) {
        const { bot, sentence_type } = this;
        return (sentence_type !== 'HISTORY' && user.id === '139120967208271872')
            ? bot.intrReply({intr, embed: new EmbedBase(bot, {
                title: 'Nice try!',
                image: {
                    url: 'https://i.imgur.com/kAVql0f.jpg',
                },
            }).Warn()})
            : false;
    }

    executeSentence() {
        throw new Error(`command ${this.constructor.name} does not have an execution implemented`);
    }
}
