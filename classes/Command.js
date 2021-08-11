class Command {
    constructor(bot, {
        name = null,
        description = "No description provided.",
        options = [],
        aliases,
        ...other
    }) {
        this.bot = bot;
        this.name = name;
        this.description = description;
        this.options = options;
        this.aliases = aliases;
        Object.assign(this, other);
    }

    async run({interaction, options}) {
        throw new Error(`Command ${this.constructor.name} doesn't provide a run method.`);
    }

    /**
     * Adds all the properties of a registered `ApplicationCommand` to this `Command`
     * @param {ApplicationCommand} appcmd A registered `ApplicationCommand`
     * @returns {Command} This command itself
     */
    setApplicationCommand(appcmd) {
        return Object.assign(this, appcmd);
    }
}
module.exports = Command;
