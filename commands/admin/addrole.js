const Command = require('../../classes/Command');

class addrole extends Command {
    constructor(bot) {
        super(bot, {
            name: 'addrole',
            description: 'Add a role to a user by saying the name of the role',
            usage: '<user> <role-name>',
            aliases: [],
            category: 'admin',
        })
    }

    async run(msg, args) {
        const uid = args.shift().match(/\d+/g)?.shift();
        if(!uid) return msg.channel.send(`You didn't mention a valid user`);
        
        const mem = this.bot.leyline_guild.member(uid);
        if(!mem) return msg.channel.send(`I couldn't find that user`);

        if(args.length < 1) return msg.channel.send(`Second argument should be a Discord role`);

        const role = (await msg.guild.roles.fetch()).cache
            .find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
        if(!role) return msg.channel.send(`I couldn't find a role with the name \`${args.join(' ')}\``);
        mem.roles.add(role, `Requested by ${msg.author.tag}`)
            .then(() => msg.react('✅'))
            .catch(err => msg.channel.send(`Error: ${err}`));
        
        return;
    }
}

module.exports = addrole;