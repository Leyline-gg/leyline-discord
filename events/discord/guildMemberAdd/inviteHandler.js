const fs = require('fs').promises;
const { Collection } = require('discord.js');
const DiscordEvent = require('../../../classes/DiscordEvent');

module.exports = class extends DiscordEvent {
    constructor(bot) {
        super(bot, {
            name: 'inviteHandler',
            description: 'Handle invite-related things when a user joins the guild',
            event_type: 'guildMemberAdd',
        });
    }

    async run(member) {
        const bot = this.bot;
        bot.logger.log(`${member.displayName} joined the server`);
        const cached_invites = await this.readCache();
        const invites = await member.guild.fetchInvites();
        if(!!cached_invites) {
            bot.logger.error('No invites found in local cache');
            this.writeCache(invites);
            return false;
        }

        const inv = invites.find(i => {
            console.log(i.uses);
            console.log(cached_invites.get(i.code));
            return cached_invites.has(i.code) && cached_invites.get(i.code).uses < i.uses
        });
        bot.logger.log(`${member.displayName} joined from invite ${inv.code} created by ${inv.inviter.tag}`);
    }

    async readCache() {
        let res;
        try {
            res = JSON.parse(await fs.readFile('./cache/invites.json', 'utf8'));
            return new Collection(Object.entries(res));
        } catch (err) {
            console.log(err);
            res = null;
            return res;
        }
    }

    /**
     * @param {Map} map 
     */
    async writeCache(map) {
        await fs.writeFile('./cache/invites.json', JSON.stringify(Object.fromEntries(map)))
            .catch((err) => this.bot.logger.error(err));
        return true;
    }
};
