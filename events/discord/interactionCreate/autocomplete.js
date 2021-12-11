import { DiscordEvent } from "../../../classes";

export default class extends DiscordEvent {
    constructor(bot) {
        super(bot, {
            name: 'autocomplete',
            description: 'Receive and respond to command autocomplete events',
            event_type: 'interactionCreate',
        });
    }
    
    async run(intr) {
        const { bot } = this;

        if(!intr.isAutocomplete()) return;
        // Ignore commands sent by other bots or sent in DM
        if(intr.user.bot || !intr.inGuild()) return;

        const command = bot.commands.get(intr.commandName.replaceAll(' ', ''));

        //implementations of autocomplete will need to check opts.getFocused(true) for the specific option that is being autocompleted
        try {
            bot.logger.cmd(`Autocompleting command ${intr.commandName} for user ${intr.user.tag} (${intr.user.id})`);
            await command.autocomplete({intr, opts: intr.options});
        } catch (err) {
            bot.logger.error(`Error with autocomplete for cmd ${intr.commandName}: ${err}`);
        }
    }
};
