const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class ping extends Command {
    constructor(bot) {
        super(bot, {
            name: 'ping',
            description: 'Get the latentcy of the bot and its connected APIs',
            aliases: [],
            category: 'general'
        });
    }

    async run({intr}) {
        const bot = this.bot;
        //TODO: implement Leyline API/Firebase API latency (choose a user-friendly label)
        const response = await bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: 'Pinging...',
        }), fetchReply: true,});

		const latency = { //store latency variables
            self: response.createdTimestamp - intr.createdTimestamp, 
            discord: bot.ws.ping, 
            /*leyline: new Date()*/
        };

        bot.intrReply({intr, embed: new EmbedBase(bot, {
            fields: [{
                name: `It took ${latency.self}ms to respond`,
                value: `Discord API Latency is ${latency.discord}ms`,
            }],
        })});
    }
}

module.exports = ping;
