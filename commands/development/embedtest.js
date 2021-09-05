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
        //bot.intrReply({intr, embed: new EmbedBase(this.bot, {
        //    fields: [{
        //        name: '⬆  User Leveled Up',
        //        value: `<@${intr.user.id}> reached level **4**!`
        //    }],
        //})});
        bot.intrReply({intr, embed: new EmbedBase(this.bot, {
            title: '⬆  User Leveled Up',
            description: `<@${intr.user.id}> reached level **4**!\nWay to change the game & Leylight the way!`,
            color: 0x35de2f
        })});
    }
}

export default embedtest;
