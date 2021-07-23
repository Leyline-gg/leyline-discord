const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class delrole extends Command {
    constructor(bot) {
        super(bot, {
            name: 'delrole',
            description: 'Remove a role from a user by saying the name of the role',
            usage: '<user> <role-name>',
            aliases: ['remrole'],
            category: 'admin',
        })
    }

    async run(msg, args) {
        const bot = this.bot;
        const uid = args.shift()?.match(/\d+/g)?.shift();
        if(!uid) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **You didn't mention a valid Discord user**`,
        }).Error()});
        
        const mem = this.bot.leyline_guild.member(uid);
        if(!mem) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **I couldn't find that user**`,
        }).Error()});

        if(args.length < 1) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **Second argument should be a Disord role**`,
        }).Error()});

        const role = (await msg.guild.roles.fetch()).cache
            .find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
        if(!role) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **I couldn't find a role with the name \`${args.join(' ')}\`**`,
        }).Error()});
        mem.roles.remove(role, `Requested by ${msg.author.tag}`)
            .then(() => msg.react('✅'))
            .catch(err => msg.channel.send({embed: new EmbedBase(bot, {
                description: `❌ **Error: ${err}**`,
            }).Error()}));
        
        return;
    }
}

module.exports = delrole;