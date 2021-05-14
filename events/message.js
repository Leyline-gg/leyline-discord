/*
    Description: This event is fired whenever the bot detects a new message
*/

module.exports = class {
    constructor(bot) {
        this.bot = bot;
    }

    async run(bot, msg) {
        // Ignore messages sent by other bots or sent in DM
        if (msg.author.bot || !msg.guild) return;

        // User types "@Bot help", display help message
        if (msg.content.match(new RegExp(`^<@!?${bot.user.id}> help`)))
            return // TODO: RUN HELP COMMAND

        // Check for prefix
        if (msg.content.toLowerCase().indexOf(bot.config.prefix) !== 0) return;

        // This is now a command, get command-related infor and call the command
        const args = msg.content.slice(msg.prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();
        const cmd = bot.commands.get(command) || bot.commands.get(bot.aliases.get(command));    //TODO: modify this

        if(!cmd) return;

        // Log command
        bot.logger.cmd(`${msg.author.tag} (${msg.author.id}) ran command ${command} with args ${args.toString()}`);

        cmd.run();  //TODO: modify this
    }
};