const { Message } = require("discord.js");
const DiscordEvent = require("../../classes/DiscordEvent");
const EmbedBase = require('../../classes/EmbedBase');
const Firebase	= require('../../classes/FirebaseAPI');

module.exports = class extends DiscordEvent {
	target_channel 	= '810237567168806922';
	cta_role 		= '853414453206188063'; //role to ping when photo is approved
	media_type 		= 'submission'; //should be either photo/video (this is for the UX)
	media_placeholder	//unfortunately, there is no easy way to extract the thumbnail from a video posted in discord
		= 'https://cdn1.iconfinder.com/data/icons/growth-marketing/48/marketing_video_marketing-512.png';
	constructor(bot) {
		super(bot, {
			name: 'good-acts',
			description: 'Handler for good acts posted by users in a specific channel',
			event_type: 'message',
		});
	}

	/**
	 * Ensure an attachment meets the specified criteria, also updates the `media_type` property
	 * @param {String} url
	 * @returns {boolean}
	 */
	processAttachment(url) {
		if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp')) {
			this.media_type = 'photo';
			return true;
		}
		if (url.endsWith('.mp4') || url.endsWith('.mpg') || url.endsWith('.mov')) {
			this.media_type = 'video';
			return true;
		}
        return false;
	}

	/**
	 * Sets up a specific ReactionCollector on an approved message that is designed to last for 24hrs and award LLP to users that react
	 * @param {Message} msg Discord `Message` object
	 */
	setupApprovedCollector(msg) {
		const bot = this.bot;
		msg.createReactionCollector(async (reaction, user) => {
			//allow any reactions, but only allow users who have not previously reacted
			return await (async () => {
				for (const r of [...msg.reactions.cache.values()]) {
					//ignore the reaction that was just added
					if (r.emoji.identifier === reaction.emoji.identifier) continue;
					if ((await r.users.fetch()).has(user.id)) return false;
				}
				return true;
			})();	//this IIFE was inspired by https://stackoverflow.com/a/67527585/8396479
		}
		).on('collect', async (r, u) => {
			try {
				//ensure user is connected to LL
				if(!(await Firebase.isUserConnectedToLeyline(u.id))) {
					u.send({ embed: new EmbedBase(bot, {
						fields: [
							{
								name: `❌ You need to Connect Your Leyline & Discord accounts!`,
								value: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
										[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`
							},
						],	
					})});
					//Log in bot log
					bot.logDiscord({
						embed: new EmbedBase(bot, {
							fields: [
								{
									name: `LLP *NOT* Awarded`,
									value: `<@!${u.id}> reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
								},
							],
						}),
					});
					return;
				}
				//new user reacted, award LLP
				await Firebase.awardLLP(await Firebase.getLeylineUID(u.id), 1, {
					category: 'Discord Reaction',
					comment: `User reacted to Discord message (id: ${msg.id})`,
				});
				//DM user informing them
				u.send({ embed: new EmbedBase(bot, {
					fields: [
						{
							name: `🎉 You Earned Some LLP!`,
							value: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, and received **+1 LLP**!`
						},
					],	
				})});
				//Log in bot log
				bot.logDiscord({
					embed: new EmbedBase(bot, {
						fields: [
							{
								name: `LLP Awarded`,
								value: `<@!${u.id}> reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, and I gave them **+1 LLP**`,
							},
						],
					}),
				});
			} catch(err) { bot.logger.error(JSON.stringify(err)); }
		});
	}

	/**
	 *
	 * @param {Message} msg
	 */
	async run(msg) {
		const bot = this.bot;
		// Ignore messages sent by other bots or sent in DM
		if (msg.author.bot || !msg.guild) return;

		//msg needs to be in specific channel
		if (msg.channel.id !== this.target_channel) return;

		//msg needs to be an image or video file
		if (msg.attachments.size < 1) return;
		if (!msg.attachments.every((attachment) => this.processAttachment(attachment.url)))
			return bot.logger.debug(
				`${this.name} event rejected msg ${msg.id} by ${msg.author.tag} because it did not contain valid attachments`
			);

		msg.react('✅');
		const collector = msg
			.createReactionCollector(
				(reaction, user) =>
					reaction.emoji.name === '✅' && bot.checkMod(user.id)
			)
			.on('collect', (r, u) => {
				collector.stop();
				this.setupApprovedCollector(msg);
				return;
				msg./*reply TODO:change w djs v13*/channel.send(
					`<@&${this.cta_role}> 🚨 **NEW APPROVED ${this.media_type.toUpperCase()}!!** 🚨`,
					{
						embed: new EmbedBase(bot, {
							description: `A new ${this.media_type} was approved! Click [here](${msg.url} 'view message') to view the message.\nBe sure to react within 24 hours to get your LLP!`,
							thumbnail: { url: this.media_type === 'photo' ? msg.attachments.first().url : this.media_placeholder },
						}),
					}
				);
				msg.author.send(`Your ${this.media_type} posted in <#${msg.channel.id}> was approved! You received **+5 LLP**!`);
				bot.logDiscord({
					embed: new EmbedBase(bot, {
						fields: [
							{
								name: `${this.media_type[0].toUpperCase() + this.media_type.slice(1)} Approved`,
								value: `<@!${u.id}> approved the [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> by <@!${msg.author.id}>`,
							},
						],
						thumbnail: { url: this.media_type === 'photo' ? msg.attachments.first().url : this.media_placeholder },
					}),
				});
				
			});
	}
};
