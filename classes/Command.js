class Command {
    constructor(bot, {
        name = null,
        description = "No description provided.",
        category = "General",
        usage = "No usage provided.",
        cooldown = 0,
        hidden = false,
        aliases = [],
        //perm level?
    }) {
        this.bot        = bot;
        this.name       = name;
        this.description = description;
        this.category   = category;
        this.usage      = usage;
        this.cooldown   = cooldown;
        this.hidden     = hidden;
        this.aliases    = aliases;
    }

    async run(message, args) {
        throw new Error(`Command ${this.constructor.name} doesn't provide a run method.`);
    }
}
module.exports = Command;