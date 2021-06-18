const { ActivityTypes } = require('discord.js').Constants;
const Command = require('../../classes/Command');

class setstatus extends Command {
    constructor(bot) {
        super(bot, {
            name: 'setstatus',
            description: 'Set the Discord status of the bot',
            usage: '[type] <text>',
            aliases: ['setactivity', 'sa'],
            category: 'admin',
        })
    }

    run(msg, args) {
        if(args.length < 1) return this.bot.user.setPresence({activty: null}).then(() => msg.reply('Status cleared'));
        const type = ActivityTypes.includes(args[0].toUpperCase()) ? args.shift().toUpperCase() : 'PLAYING';
        this.bot.user.setActivity(args.join(' '), { type: type })
            .then(() => msg.reply('Bot status succesfully updated'))
            .catch(err => msg.reply(`Could not update status, error: \`${err}\``));
    }
}

module.exports = setstatus;