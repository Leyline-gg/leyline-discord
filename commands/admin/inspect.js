const Command = require('../../classes/Command');

class inspect extends Command {
    constructor(bot) {
        super(bot, {
            name: 'inspect',
            description: 'Conveniently view information about a Discord user that would otherwise be hard to find',
            usage: '<@discord-user>',
            aliases: [],
            category: 'admin'
        })
    }

    async run(msg, args) {
        const uid = args.shift().match(/\d+/g)?.shift();
        if(!uid) return msg.channel.send(`You didn't mention a valid user`);
        
        const mem = this.bot.leyline_guild.member(uid);
        if(!mem) return msg.channel.send(`I couldn't find that user`);
    }
}

module.exports = inspect;
