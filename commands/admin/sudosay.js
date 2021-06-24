const Command = require('../../classes/Command');

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
        const ch_id = args.shift().match(/\d+/g)[0];
        if(!ch_id) return msg.channel.send(`The first argument must be a Discord channel mention, example: <#${msg.channel.id}>`);

        let ch;
        try {
            ch = await this.bot.channels.fetch(ch_id)
        } catch(err) {
            return msg.channel.send(`Hmm... I couldn't find that channel`);
        }
        ch.send(args.join(' '))
            .then(() => msg.react('✅'))
            .catch(err => msg.channel.send(`Error: \`${err}\``));
    }
}

module.exports = sudosay;