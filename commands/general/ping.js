const Command = require('../../classes/Command');

class ping extends Command {
    constructor(bot) {
        super(bot, {
            name: 'ping',
            description: 'Get the latentcy of the bot and its connected APIs',
            aliases: [],
            category: 'general'
        })
    }

    async run(msg, args) {
        //TODO: implement Leyline API/Firebase API latency (choose a user-friendly label)
        const response = await msg.channel.send('Pinging...');	//send response
		const latency = { discord: this.bot.ws.ping, /*leyline: new Date()*/ };	//generate latency variables
		response.edit(`Took ${response.createdTimestamp - msg.createdTimestamp}ms to respond.\nDiscord API latency is ${latency.discord}ms`);
    }
}

module.exports = ping;
