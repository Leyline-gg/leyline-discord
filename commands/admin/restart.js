import bot from '../../bot';
import { Command, EmbedBase } from '../../classes';

class restart extends Command {
    constructor() {
        super({
            name: 'restart',
            description: 'Restarts the bot',
            category: 'admin',
        });
    }

    async run({intr, opts}) {
        if(process.env.NODE_ENV === 'development')
            return bot.intrReply({intr, embed: new EmbedBase({
                description: '❌ **That command does not work in the `dev` environment**',
            }).Error()});

        // Get user confirmation first
        const confirm = await bot.intrConfirm({intr, embed: new EmbedBase({
            description: '⚠ **This will immediately disconnect & attempt to reconnect the bot, are you sure you want to proceed?**'
        }).Warn()});

        if(!confirm) return bot.intrReply({intr, embed: new EmbedBase({
            description: `❌ **Restart canceled**`,
        }).Error()}); 

        // Proceed with restart
        await bot.intrReply({intr, embed: new EmbedBase({
            description: `🔄 **Restarting...**`,
        }).Warn()}); 
        bot.logger.warn(`Restart command issued by ${intr.user.tag}`);

        bot.destroy();
        process.kill(process.pid, 'SIGINT');

        bot.intrReply({intr, embed: new EmbedBase({
            description: `❌ **Restart unsuccessful**`,
        }).Error()}); 
    }
}

export default restart;
