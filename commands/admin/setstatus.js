import { Constants } from 'discord.js';
const { ActivityTypes } = Constants;
import { Command, EmbedBase } from '../../classes';

class setstatus extends Command {
    constructor() {
        super({
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
            category: 'admin',
        });
    }

    run({intr, opts}) {
        const status_name = opts.getString('text');

        bot.user.setPresence({activities:[
            ...(status_name !== 'clear' ? [{
                name: status_name,
                type: ActivityTypes[opts.getString('activity-type')],
            }] : []), 
        ]});

        bot.intrReply({intr, embed: new EmbedBase({
            description: `✅ **Status updated**`,
        }).Success()});
    }
}

export default setstatus;
