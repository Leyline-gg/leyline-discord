const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/components/EmbedBase');

class shutdown extends Command {
    constructor(bot) {
        super(bot, {
            name: 'shutdown',
            description: "Terminates the bot's connection to Discord without killing the process",
            category: 'admin',
        });
    }

    async run({intr}) {
        const { bot } = this;

        // Get user confirmation first
        const confirm = await bot.intrConfirm({intr, embed: new EmbedBase(bot, {
            description: '⚠ **This will immediately disconnect the bot, are you sure you want to proceed?**'
        }).Warn()});

        if(!confirm) return bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `❌ **Shutdown canceled**`,
        }).Error()}); 

        // Proceed with shutdown
        await bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `✅ **Shutdown successful**`,
        }).Success()}); 
        bot.logger.warn(`Shutdown command issued by ${intr.user.tag}`);
        bot.destroy();

        bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `❌ **Shutdown unsuccessful**`,
        }).Error()});
    }
}

export default shutdown;
