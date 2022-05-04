import bot from '../../bot';
import { Command, EmbedBase } from '../../classes';

class embedtest extends Command {
    constructor() {
        super({
            name: 'embedtest',
            description: 'Used for development embed testing',
            category: 'development',
        });
    }

    async run({intr, opts}) {
        let expires = false;
        bot.intrReply({intr, embed: new EmbedBase({
            title: 'Justice Served',
            fields: [
                {
                    name: 'Issued By',
                    value: bot.formatUser(intr.user),
                    inline: true,
                },
                {
                    name: 'Reason',
                    value: null ?? 'No reason given',
                    inline: true,
                },
                {
                    name: 'Expires',
                    value: !!expires ? bot.formatTimestamp(expires) : 'No expiration',
                    inline: true,
                },
            ],
            color: 0x31d64d,
        })});
    }
}

export default embedtest;
