const Command = require('../../classes/Command');

class shutdown extends Command {
    constructor(bot) {
        super(bot, {
            name: 'shutdown',
            description: "Terminates the bot's connection to Discord, without killing the process",
            aliases: [],
            category: 'admin',
        });
    }

    run({intr, opts}) {
        const bot = this.bot;
        bot.logger.warn(`Shutdown command issued by ${intr.user.tag}`);
        //msg.channel.send('Shutting down...');

        bot.destroy();

        return msg.channel.send('Shutdown unsuccessful');
    }
}

module.exports = shutdown;
