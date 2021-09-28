import { Command, EmbedBase } from '../../classes';

class embedtest extends Command {
    constructor(bot) {
        super(bot, {
            name: 'embedtest',
            description: 'Used for development embed testing',
            category: 'development',
        });
    }

    async run({intr, opts}) {
        const { bot } = this;
        let expires = false;
        //bot.intrReply({intr, embed: new EmbedBase(this.bot, {
        //    fields: [{
        //        name: '⬆  User Leveled Up',
        //        value: `<@${intr.user.id}> reached level **4**!`
        //    }],
        //})});
        bot.intrReply({intr, embed: new EmbedBase(bot, {
            title: 'Punishment Issued',
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
        }).Punish()});
    }
}

export default embedtest;
