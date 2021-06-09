const Command = require('../../classes/Command');
const { exec } = require('child_process');

class staging extends Command {
    staging_bot_id = '851965583553724427';
    constructor(bot) {
        super(bot, {
            name: 'staging',
            description: 'Start or stop the staging bot',
            usage: 'staging <start/stop>',
            aliases: [],
            category: 'admin'
        });
    }

    async run(msg, args) {
        const bot = this.bot;

        if(args.length !== 1) return msg.channel.send(`Invalid arguments. Proper command usage: \`${this.usage}\``);
        const arg = args[0];
        const staging = await bot.users.fetch(this.staging_bot_id);

        switch(arg) {
            case 'start':
                if(staging.presence.status === 'online') return msg.channel.send('The staging bot is already online');
                msg.channel.send('Starting staging bot...');
                exec('sh ./staging-start.sh', (err, stdout, stderr) => {
                    if(!!err) {
                        console.error(err);
                        return msg.channel.send('Error encountered; check logs');
                    }
                    if(!!stderr) {
                        console.error(stderr);
                        msg.channel.send('Stderr encountered; continuing with startup');
                    }
                });
                break;
            case 'stop':
                if(staging.presence.status === 'offline') return msg.channel.send('The staging bot is already offline');
                msg.channel.send('Shutting down staging bot...');
                exec('sh ./staging-start.sh', (err, stdout, stderr) => {
                    if(!!err) {
                        console.error(err);
                        return msg.channel.send('Error encountered; check logs');
                    }
                    if(!!stderr) {
                        console.error(stderr);
                        msg.channel.send('Stderr encountered; continuing with shutdown');
                    }
                    msg.channel.send('Staging bot now offline');
                });
                break;
            default:
                return msg.channel.send('Invalid argument; expected `start` or `stop`');
        }
    }
}

module.exports = staging;
