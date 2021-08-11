const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

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

    async run({interaction, options}) {
        const bot = this.bot;
        const uid = args.shift()?.match(/\d+/g)?.shift();
        if(!uid) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
            description: `❌ **You didn't mention a valid Discord user**`,
        }).Error()});
        
        const mem = this.bot.leyline_guild.members.cache.get(uid);
        if(!mem) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
            description: `❌ **I couldn't find that user**`,
        }).Error()});

        if(args.length < 1) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
            description: `❌ **Second argument should be a Disord role**`,
        }).Error()});
        
        const role = (await msg.guild.roles.fetch())
            .find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
        if(!role) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
            description: `❌ **I couldn't find a role with the name \`${args.join(' ')}\`**`,
        }).Error()});
        mem.roles.add(role, `Requested by ${msg.author.tag}`)
            .then(() => msg.react('✅'))
            .catch(err => bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                description: `❌ **Error: ${err}**`,
            }).Error()}));
        
        return;
    }
}

module.exports = addrole;