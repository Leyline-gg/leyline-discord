const DiscordEvent = require('../../../classes/DiscordEvent');
const EmbedBase = require('../../../classes/EmbedBase');

module.exports = class extends DiscordEvent {
    constructor(bot) {
        super(bot, {
            name: 'command',
            description: 'Filter messages for commands and run the commands',
            event_type: 'messageCreate',
        });
        //import event config from bot config
		Object.assign(this, bot.config.events[this.name]);
    }
    
    async run(msg) {
        const bot = this.bot;
        // Ignore messages sent by other bots or sent in DM
        if (msg.author.bot || !msg.guild) return;

        // User types "@Bot help", display help message
        if (msg.content.match(new RegExp(`^<@!?${bot.user.id}> help`)))
            return bot.commands.get('help').run(msg, []);

        // Check for prefix
        if (msg.content.toLowerCase().indexOf(bot.config.prefix) !== 0) return;
        
        // This is now a command, get command-related info and call the command
        const args = msg.content.slice(bot.config.prefix.length).trim().split(/ +/g);
        const commandName = args.shift().toLowerCase();
        const cmd = bot.commands.get(commandName) || bot.commands.find((command) => command.aliases?.includes(commandName));  //search the aliases of each cmd

        if(!cmd) return;
        // Filter admin commands
        if(cmd?.category === 'admin' && !bot.checkAdmin(msg.author.id))
            return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                description: `❌ **You do not have sufficient permission to run that command**`,
            }).Error()});

        // Log command
        bot.logger.cmd(`${msg.author.tag} (${msg.author.id}) ran command ${commandName} with args [${args.toString()}]`);

        cmd.run(msg, args);  //TODO: modify this?
    }
};
