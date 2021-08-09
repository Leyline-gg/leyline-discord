const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class sudosay extends Command {
    constructor(bot) {
        super(bot, {
            name: 'sudosay',
            description: 'Force (sudo) the bot to say something in a specific channel',
            usage: '<#channel> <message>',
            aliases: [],
            category: 'admin',
        })
    }

    async run(msg, args) {
        const bot = this.bot;
        const ch_id = args.shift()?.match(/\d+/g)[0];
        if(!ch_id) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
            description: `❌ **The first argument must be a Discord channel mention, example: <#${msg.channel.id}>**`,
        }).Error()});

        let ch;
        try {
            ch = await this.bot.channels.fetch(ch_id)
        } catch(err) {
            return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                description: `❌ **I couldn't find that channel**`,
            }).Error()});
        }
        ch.send(args.join(' '))
            .then(() => msg.react('✅'))
            .catch(err => bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                description: `❌ **Error:** ${err}`,
            }).Error()}));
    }
}

module.exports = sudosay;