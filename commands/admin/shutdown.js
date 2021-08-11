const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class shutdown extends Command {
    constructor(bot) {
        super(bot, {
            name: 'shutdown',
            description: "Terminates the bot's connection to Discord without killing the process",
            aliases: [],
            category: 'admin',
        });
    }

    run({intr}) {
        const bot = this.bot;

        // Get user confirmation first
        await bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: '⚠ **This will immediately disconnect the bot, are you sure you want to proceed?**'
        }).Warn(), components: []})

        bot.logger.warn(`Shutdown command issued by ${intr.user.tag}`);
        await bot.intrReply({intr, embed: new Embed})
        bot.destroy();

        return msg.channel.send('Shutdown unsuccessful');
    }
}

module.exports = shutdown;
