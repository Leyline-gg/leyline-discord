const Command = require('../../classes/Command');

class restart extends Command {
    constructor(bot) {
        super(bot, {
            name: 'restart',
            description: 'Restarts the bot',
            aliases: ['rs'],
            category: 'admin',
        });
    }

    run({intr, opts}) {
        const bot = this.bot;
        if(process.env.NODE_ENV === 'development')
            return msg.channel.send('That command does not work in the dev env');
        bot.logger.warn(`Restart command issued by ${intr.user.tag}`);
        msg.channel.send('Restarting...');

        bot.destroy();
        process.kill(process.pid, 'SIGINT');

        return msg.channel.send('Restart unsuccessful');
    }
}

module.exports = restart;
