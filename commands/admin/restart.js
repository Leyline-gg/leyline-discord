const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class restart extends Command {
    constructor(bot) {
        super(bot, {
            name: 'restart',
            description: 'Restarts the bot',
            aliases: ['rs'],
            category: 'admin',
        });
    }

    async run({intr, opts}) {
        const bot = this.bot;
        if(process.env.NODE_ENV === 'development')
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: '❌ **That command does not work in the `dev` environment**',
            }).Error()});

        // Get user confirmation first
        const confirm = await bot.intrConfirm({intr, embed: new EmbedBase(bot, {
            description: '⚠ **This will immediately disconnect & attempt to reconnect the bot, are you sure you want to proceed?**'
        }).Warn()});

        if(!confirm) return bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `❌ **Restart canceled**`,
        }).Error()}); 

        // Proceed with restart
        await bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `🔄 **Restarting...**`,
        }).Warn()}); 
        bot.logger.warn(`Restart command issued by ${intr.user.tag}`);

        bot.destroy();
        process.kill(process.pid, 'SIGINT');

        bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `❌ **Restart unsuccessful**`,
        }).Error()}); 
    }
}

module.exports = restart;
