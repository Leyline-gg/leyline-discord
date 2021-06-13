const { Message } = require("discord.js");
const DiscordEvent = require("../../classes/DiscordEvent");
const EmbedBase = require('../../classes/EmbedBase');

module.exports = class extends DiscordEvent {
    target_channel  = '810237567168806922';
    mod_role        = '751919243062411385';
    cta_role        = '853414453206188063';   //role to ping when photo is approved
    constructor(bot) {
        super(bot, {
            name: 'good-acts',
            description: 'Handler for good acts posted by users in a specific channel',
            event_type: 'message',
        });
    }

    /**
     * Ensure an attachment meets the specified criteria
     * @param {String} url 
     * @returns {boolean} 
     */
    validateAttachment(url) {
        return url.endsWith('.png') ||
            url.endsWith('.jpg')    ||
            url.endsWith('.jpeg')   ||
            url.endsWith('.mp4')    ||
            url.endsWith('.mov')    ||
            url.endsWith('.webp');
    }
    
    /**
     * 
     * @param {Message} msg 
     * @returns 
     */
    async run(msg) {
        const bot = this.bot;
        // Ignore messages sent by other bots or sent in DM
        if(msg.author.bot || !msg.guild) return;

        //msg needs to be in specific channel
        if(msg.channel.id !== this.target_channel) return;

        //msg needs to be an image or video file
        if(msg.attachments.size < 1) return;
        if(!msg.attachments.every(attachment => this.validateAttachment(attachment.url))) 
            return bot.logger.debug(`${this.name} event rejected msg ${msg.id} by ${msg.author.tag} because it did not contain valid attachments`);

        msg.react('✅');
        const collector = msg.createReactionCollector((reaction, user) => 
            reaction.emoji.name === '✅' &&
            bot.leyline_guild.member(user).roles.cache.has(this.mod_role)
        ).on('collect', (r, u) => {
            msg./*reply TODO:change w djs v13*/channel.send(`<@&${this.cta_role}> 🚨 **NEW APPROVED SUBMISSION!!** 🚨`, { embed: new EmbedBase(bot, {
                description: `A new submission was approved! Click [here](${msg.url} 'view message') to view the message.\nBe sure to react within 24 hours to get your LLP!`,
                thumbnail: { url: msg.attachments.first().url },
            })});
            msg.author.send(`Your message posted in <#${msg.channel.id}> was approved! You received **+5 LLP**!`);
            bot.logDiscord({ embed: new EmbedBase(bot, {
                fields: [{name:`Photo Approved`, value:`<@!${u.id}> approved the [message](${msg.url} 'click to view message') posted in <#${msg.channel.id}> by <@!${msg.author.id}>`}],
                thumbnail: { url: msg.attachments.first().url }
            })});
            collector.stop();
        });
    }
};
