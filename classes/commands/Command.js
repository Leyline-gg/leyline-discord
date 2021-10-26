export class Command {
    constructor(bot, {
        name = null,
        description = "No description provided.",
        options = [],
        category,
        deferResponse = false,  //for commands that take longer to run
        ...other
    }) {
        this.bot = bot;
        this.name = name;
        this.description = description;
        this.options = options;
        this.category = category;
        this.defaultPermission = (this.category !== 'admin');   //lock admin cmds
        this.deferResponse = deferResponse;
        Object.assign(this, other);
    }

    async run({intr, opts}) {
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