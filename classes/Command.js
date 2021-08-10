const { ApplicationCommand, } = require('discord.js');
class Command extends ApplicationCommand {
    constructor(bot, {
        name = null,
        description = "No description provided.",
        options = [],
        aliases,
        ...other
    }) {
        super(bot, {
            name,
            description,
            options,
            ...other
        });
        this.bot = bot;
        this.aliases = aliases;
    }

    async run(message, args) {
        throw new Error(`Command ${this.constructor.name} doesn't provide a run method.`);
    }
}
module.exports = Command;
