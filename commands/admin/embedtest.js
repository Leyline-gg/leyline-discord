const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class ping extends Command {
    constructor(bot) {
        super(bot, {
            name: 'embedtest',
            description: 'Used for development embed testing',
            aliases: ['et'],
            category: 'admin',
        });
    }

    async run({intr, opts}) {
        //bot.sendEmbed({msg, embed: new EmbedBase(this.bot, {
        //    fields: [{
        //        name: '⬆  User Leveled Up',
        //        value: `<@${intr.user.id}> reached level **4**!`
        //    }],
        //})});
        bot.sendEmbed({msg, embed: new EmbedBase(this.bot, {
            title: '⬆  User Leveled Up',
            description: `<@${intr.user.id}> reached level **4**!\nWay to change the game & Leylight the way!`,
            color: 0x35de2f
        })});
    }
}

module.exports = ping;
