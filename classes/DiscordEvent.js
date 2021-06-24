/**
 * Custom class for implementing Discord events. The `run()` method will be called whenever the event `name` is fired
 */
class DiscordEvent {
    constructor(bot, {
        name        = null,
        description = null,
        event_type  = null,
    }) {
        this.bot            = bot;
        this.name           = name;
        this.description    = description;
        this.event_type     = event_type;
    }

    run(data) {
        throw new Error(`DiscordEvent ${this.constructor.name} doesn't provide a run method.`);
    }
}

module.exports = DiscordEvent;