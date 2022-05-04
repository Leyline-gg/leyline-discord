import bot from '../../bot';
import { Command, EmbedBase } from '../../classes';

class shutdown extends Command {
    constructor() {
        super({
            name: 'shutdown',
            description: "Terminates the bot's connection to Discord without killing the process",
            category: 'admin',
        });
    }

    async run({intr}) {

        // Get user confirmation first
        const confirm = await bot.intrConfirm({intr, embed: new EmbedBase({
            description: '⚠ **This will immediately disconnect the bot, are you sure you want to proceed?**'
        }).Warn()});

        if(!confirm) return bot.intrReply({intr, embed: new EmbedBase({
            description: `❌ **Shutdown canceled**`,
        }).Error()}); 

        // Proceed with shutdown
        await bot.intrReply({intr, embed: new EmbedBase({
            description: `✅ **Shutdown successful**`,
        }).Success()}); 
        bot.logger.warn(`Shutdown command issued by ${intr.user.tag}`);
        bot.destroy();

        bot.intrReply({intr, embed: new EmbedBase({
            description: `❌ **Shutdown unsuccessful**`,
        }).Error()});
    }
}

export default shutdown;
