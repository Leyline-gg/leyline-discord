const { ActivityTypes } = require('discord.js').Constants;
const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class setstatus extends Command {
    constructor(bot) {
        super(bot, {
            name: 'setstatus',
            description: 'Set the Discord status of the bot',
            options: [
                {
                    type: 'STRING',
                    name: 'activity-type',
                    description: 'The type of activity to display',
                    required: true,
                    choices: Object.keys(ActivityTypes)
                        //we don't want the numbers for the UI & bots can't set CUSTOM activities
                        .filter(a => !isNaN(Number(ActivityTypes[a])) && a !== 'CUSTOM')
                        .map(a => ({
                            name: a.charAt(0) + a.substring(1).toLowerCase(),
                            value: a,
                    })),
                },
                {
                    type: 'STRING',
                    name: 'text',
                    description: 'The status text to display. Enter "clear" to remove the current status',
                    required: true,
                },
                
            ],
            aliases: ['setactivity', 'sa'],
            category: 'admin',
        });
    }

    run({intr, opts}) {
        const bot = this.bot;
        const status_name = opts.getString('text');

        bot.user.setPresence({activities:[
            ...(status_name !== 'clear' ? [{
                name: status_name,
                type: ActivityTypes[opts.getString('activity-type')],
            }] : []), 
        ]});

        bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `✅ **Status updated**`,
        }).Success()});
    }
}

module.exports = setstatus;
