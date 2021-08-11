const { Message } = require('discord.js');
const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

//roles available to be self-roled
const roles = [
    '853414453206188063',   //do good alerts
];

class selfrole extends Command {
    constructor(bot) {
        super(bot, {
            name: 'selfrole',
            description: 'Give/take roles to/from yourself',
            aliases: [],
            category: 'general'
        });
    }

    /**
     * 
     * @param {Message} msg 
     */
    async run({intr, opts}) {
        try {
            const bot = this.bot;
            
            //obtain and filter Role objects
            const avail_roles = (await bot.leyline_guild.roles.fetch()).filter(r => roles.includes(r.id));

            //display list of available roles
            if(args.length < 1) {
                return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                    fields: [
                        {
                            name: 'Available Roles',
                            value: avail_roles.map(r => r.name).join('\n'),
                        },
                    ],
                })});
            }

            const role = avail_roles.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
            if(!role) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                    fields: [
                        {
                            name: '❌ Role not found',
                            value: `That role isn't on the list of available roles. To view the list, type \`${bot.config.prefix}${this.name}\``
                        },
                    ],
                }).Error()});


            msg.member.roles.add(role, `Self-assigned with the ${this.name} command`)
                .then(() => msg.react('✅'))
                .catch(err => {
                    msg.reply('I ran into an error');
                    bot.logger.error(err);
                });
        } catch (err) {
            this.bot.logger.error(`${this.name} Error: ${err}`);
        }
    }
}

module.exports = selfrole;
