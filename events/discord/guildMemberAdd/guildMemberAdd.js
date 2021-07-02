const DiscordEvent = require("../../../classes/DiscordEvent");

module.exports = class extends DiscordEvent {
    constructor(bot) {
        super(bot, {
            name: 'guildMemberAdd',
            description: 'User joins Leyline server',
            event_type: 'guildMemberAdd',
        });
        //import event config from bot config
		Object.assign(this, bot.config.events[this.name]);
    }

    run(member) {
        const bot = this.bot;
        bot.logger.log(`${member.nickname} joined the server`);
    }

    // Ideally all this below should be refactored into different files

    // Determine which invite the member joined from
    inviteHandler() {

    }

    // Award the member appropriate roles
    roleHandler() {

    }
};
