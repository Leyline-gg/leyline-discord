const DiscordEvent = require("../../classes/DiscordEvent");

module.exports = class extends DiscordEvent {
    constructor(bot) {
        super(bot, {
            name: 'command',
            description: 'Filter messages for commands and run the commands',
            event_type: 'message',
        });
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
            return msg.channel.send('You do not have sufficient permission to run that command');

        // Log command
        bot.logger.cmd(`${msg.author.tag} (${msg.author.id}) ran command ${commandName} with args [${args.toString()}]`);

        cmd.run(msg, args);  //TODO: modify this?
    }
};
