const DiscordEvent = require('../../../classes/DiscordEvent');
const EmbedBase = require('../../../classes/EmbedBase');

module.exports = class extends DiscordEvent {
    constructor(bot) {
        super(bot, {
            name: 'slashCommand',
            description: 'Receive and execute slash commands',
            event_type: 'interactionCreate',
        });
    }
    
    async run(interaction) {
        const bot = this.bot;

        if(!interaction.isCommand()) return;
        // Ignore commands sent by other bots or sent in DM
        if(interaction.user.bot || !interaction.inGuild()) return;

        //defer reply because some commands take > 3 secs to run
        await interaction.deferReply(); 

        try {
            bot.logger.cmd(`${interaction.user.tag} (${interaction.user.id}) ran command ${interaction.commandName} with args [${interaction.options.data.toString()}]`);
            bot.commands.get(interaction.commandName).run({interaction, options: interaction.options});
        } catch (err) {
            bot.logger.error(error);
            interaction.reply({ embeds: [new EmbedBase(bot, {
                description: `❌ **I ran into an error while trying to run that command**`,
            }).Error()], ephemeral: true });
        }
    }
};
