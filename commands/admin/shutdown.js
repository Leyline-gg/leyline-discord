const Command = require('../../classes/Command');

class shutdown extends Command {
    constructor(bot) {
        super(bot, {
            name: 'shutdown',
            description: "Terminates the bot's connection to Discord, without killing the process",
            usage: '',
            aliases: [],
            category: 'admin'
        })
    }

    run(msg, args) {
        const bot = this.bot;
        bot.logger.warn(`Shutdown command issued by ${msg.author.tag}`);
        //msg.channel.send('Shutting down...');

        bot.destroy();

        return msg.channel.send('Shutdown unsuccessful');
    }
}

module.exports = shutdown;
