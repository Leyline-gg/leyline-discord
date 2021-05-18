/*
    Description: This event is fired whenever a user joins the server
*/

module.exports = class {
    constructor(bot) {
        this.bot = bot;
    }

    run(member) {
        const bot = this.bot;
        bot.logger.log(`${member.nickname} joined the server`);
    }

    // Determine which invite the member joined from
    inviteHandler() {

    }

    // Award the member appropriate roles
    roleHandler() {

    }
};
