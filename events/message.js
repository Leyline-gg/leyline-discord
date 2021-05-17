/*
    Description: This event is fired whenever the bot detects a new message
*/

module.exports = class {
    constructor(bot) {
        this.bot = bot;
    }

    async run(msg) {
        const bot = this.bot;
        // Ignore messages sent by other bots or sent in DM
        if (msg.author.bot || !msg.guild) return;

        // User types "@Bot help", display help message
        if (msg.content.match(new RegExp(`^<@!?${bot.user.id}> help`)))
            return; // TODO: RUN HELP COMMAND

        // Check for prefix
        if (msg.content.toLowerCase().indexOf(bot.config.prefix) !== 0) return;
        
        // This is now a command, get command-related info and call the command
        const args = msg.content.slice(bot.config.prefix.length).trim().split(/ +/g);
        const commandName = args.shift().toLowerCase();
        const cmd = bot.commands.get(commandName) || bot.commands.find((command) => command.aliases?.includes(commandName));  //search the aliases of each cmd

        if(!cmd) return;

        // Log command
        bot.logger.cmd(`${msg.author.tag} (${msg.author.id}) ran command ${commandName} with args [${args.toString()}]`);

        cmd.run(msg, args);  //TODO: modify this
    }
};
