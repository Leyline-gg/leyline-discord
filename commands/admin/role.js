const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class role extends Command {
    constructor(bot) {
        super(bot, {
            name: 'role',
            description: 'Add or remove roles from a Discord user',
            options: [
                {
                    type: 'SUB_COMMAND',
                    name: 'add',
                    description: 'Add a role to a user',
                    options: [
                        {
                            type: 'USER',
                            name: 'user',
                            description: 'The Discord user to receive the role',
                            required: true,
                        },
                        {
                            type: 'ROLE',
                            name: 'role',
                            description: 'The role to be awarded',
                            required: true,
                        },
                    ],
                },
                {
                    type: 'SUB_COMMAND',
                    name: 'remove',
                    description: 'Remove a role from a user',
                    options: [
                        {
                            type: 'USER',
                            name: 'user',
                            description: 'The Discord user to lose the role',
                            required: true,
                        },
                        {
                            type: 'ROLE',
                            name: 'role',
                            description: 'The role to be removed',
                            required: true,
                        },
                    ],
                },
            ],
            category: 'admin',
        });
    }

    subcommands = {
        add: ({intr, mem, role}) => {
            const bot = this.bot;
            mem.roles.add(role, `Requested by ${intr.user.tag}`)
                .then(() => bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `✅ **The ${role.toString()} role has been added to ${mem.toString()}**`,
                }).Success()}))
                .catch(err => bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `❌ **Error: ${err}**`,
                }).Error()}));
        },
        remove: ({intr, mem, role}) => {
            const bot = this.bot;
            mem.roles.remove(role, `Requested by ${intr.user.tag}`)
                .then(() => bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `✅ **The ${role.toString()} role has been removed from ${mem.toString()}**`,
                }).Success()}))
                .catch(err => bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `❌ **Error: ${err}**`,
                }).Error()}));
        },
    };

    async run({intr, opts}) {
        const bot = this.bot;
        const mem = (await bot.leyline_guild.members.fetch()).get(opts.getUser('user').id);
        if(!mem) return bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `❌ **I couldn't find that user**`,
        }).Error()});
        
        const role = opts.getRole('role');

        this.subcommands[opts.getSubcommand()]({intr, mem, role});
    }
}

module.exports = role;
