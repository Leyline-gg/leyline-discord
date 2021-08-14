const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class sudosay extends Command {
    constructor(bot) {
        super(bot, {
            name: 'sudosay',
            description: 'Force (sudo) the bot to say something in a specific channel',
            options: [
                {
                    type: 'CHANNEL',
                    name: 'channel',
                    description: 'The text channel where the bot will send the message',
                    required: true,
                },
                {
                    type: 'STRING',
                    name: 'text',
                    description: 'The text for the bot to say (markdown is supported)',
                    required: true,
                },
            ],
            category: 'admin',
        });
    }

    async run({intr, opts}) {
        const bot = this.bot;
        const ch = opts.getChannel('channel');

        //validate args
        if(!ch.isText()) return bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `❌ **That's not a text channel!**`,
        }).Error()});
        
        //send msg
        ch.send(opts.getString('text'))
            .then(m => bot.intrReply({intr, content: `[Done](${m.url})`}))
            .catch(err => bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **Error:** ${err}`,
            }).Error()}));
    }
}

module.exports = sudosay;
