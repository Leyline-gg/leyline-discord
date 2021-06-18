const { Message } = require("discord.js");
const DiscordEvent = require("../../classes/DiscordEvent");
const EmbedBase = require('../../classes/EmbedBase');
const Firebase	= require('../../classes/FirebaseAPI');
const admin = require('firebase-admin');

const target_channel 	= '810237567168806922';	//channel to watch for events
const cta_role 			= '853414453206188063'; //role to ping when photo is approved

//subclass to monitor each individual message
class GoodActsHandler {
	media_type 		= 'submission'; //should be either photo/video (this is for the UX)
	media_placeholder	//unfortunately, there is no easy way to extract the thumbnail from a video posted in discord
		= 'https://cdn1.iconfinder.com/data/icons/growth-marketing/48/marketing_video_marketing-512.png';

	/**
	 * @param {Message} msg
	 */
	constructor(bot, msg) {
		this.bot = bot;
		this.msg = msg;
		msg._cache = { reacted_users: [] }; 
		this.processAttachment(msg.attachments.first()?.url);

		//begin event logic
		msg.react('✅');
		this.collector = msg	//intentionally decreasing indentation on the following chains for readability
		.createReactionCollector(
			(reaction, user) =>
				reaction.emoji.name === '✅' && bot.checkMod(user.id)
		)
		.on('collect', async (r, u) => {
			this.collector.stop();
			//send msg in channel
			msg./*reply TODO:change w djs v13*/channel.send(
				`<@&${cta_role}> 🚨 **NEW APPROVED ${this.media_type.toUpperCase()}!!** 🚨`,
				{
					embed: new EmbedBase(bot, {
						description: `A new ${this.media_type} was approved! Click [here](${msg.url} 'view message') to view the message.\nBe sure to react within 24 hours to get your LLP!`,
						thumbnail: { url: this.media_type === 'photo' ? msg.attachments.first().url : this.media_placeholder },
					}),
				}
			);

			//log approval in bot log
			bot.logDiscord({
				embed: new EmbedBase(bot, {
					fields: [
						{
							name: `${this.media_type[0].toUpperCase() + this.media_type.slice(1)} Approved`,
							value: `<@!${u.id}> approved the [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> by <@!${msg.author.id}>`
						},
					],
					thumbnail: { url: this.media_type === 'photo' ? msg.attachments.first().url : this.media_placeholder },
				}),
			});

			//ensure user is connected to LL
			if(!(await Firebase.isUserConnectedToLeyline(msg.author.id)))
				this.handleUnconnectedAccount(msg.author, {
					dm: `Your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
						[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
					log: `<@!${msg.author.id}>'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
				});

			// I could add some catch statements here and log them to Discord (for the awarding LLP process)

			//award LLP to msg author
			else await this.awardApprovalLLP(msg, msg.author);

			// --- Give the Mod LLP ---
			//ensure mod that approved is connected to LL
			if(!(await Firebase.isUserConnectedToLeyline(u.id)))
				this.handleUnconnectedAccount(u, {
					dm: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
						[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
					log: `<@!${u.id}> reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
				});

			//give the Mod that approved the msg LLP
			else await this.awardReactionLLP(msg, u);

			this.setupApprovedCollector(msg);
			return;
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
	 * Award LLP to a user for reacting to an approved submission, and log the transaction appropriately.
	 * Assumes all checks have been previously applied. 
	 */
	async awardReactionLLP(msg, user) {
		const bot = this.bot;
		//new user reacted, award LLP
		await Firebase.awardLLP(await Firebase.getLeylineUID(user.id), 1, {
			category: 'Discord Reaction',
			comment: `User reacted to Discord message (${msg.id})`,
		});
		//DM user informing them
		user.send({ embed: new EmbedBase(bot, {
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
						value: `<@!${user.id}> reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, and I gave them **+1 LLP**`,
					},
				],
			}),
		});
		return;
	}

	/**
	 * Award LLP to a user for having a submission approved, and log the transaction appropriately.
	 * Assumes all checks have been previously applied. 
	 */
	async awardApprovalLLP(msg, user) {
		const bot = this.bot;
		await Firebase.awardLLP(await Firebase.getLeylineUID(user.id), 5, {
			category: `Discord ${this.media_type[0].toUpperCase() + this.media_type.slice(1)} Approved`,
			comment: `User's Discord ${this.media_type} (${msg.id}) was approved by ${user.tag}`,
		});

		//send dm to author
		user.send({ embed: new EmbedBase(bot, {
			fields: [
				{
					name: `🎉 You Earned Some LLP!`,
					value: `Your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, and you received **+5 LLP**!`
				},
			],	
		})});

		//log LLP change in bot-log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP Awarded`,
						value: `<@!${user.id}>'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, and I gave them **+5 LLP**`,
					},
				],
			}),
		});
		return;
	}

	/**
	 * Send error messages specific to this event to the user and to the log channel
	 */
	handleUnconnectedAccount(user, {dm, log}) {
		const bot = this.bot;
		user.send({ embed: new EmbedBase(bot, {
			fields: [
				{
					name: `❌ You need to Connect Your Leyline & Discord accounts!`,
					value: dm,
				},
			],	
		})});
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP __NOT__ Awarded`,
						value: log,
					},
				],
			}),
		});
		return;
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
				//check the Discord.js message reaction cache first
				for(const r of [...msg.reactions.cache.values()]) {
					//ignore the reaction that was just added
					if (r.emoji.identifier === reaction.emoji.identifier) continue;
					//check if any of the other reactions have been added by target user
					if ((await r.users.fetch()).has(user.id)) return false;
				}
				console.log(`custom cache: ${msg._cache.reacted_users}`);
				//now check our custom reaction cache
				for(const uid of msg._cache.reacted_users)
					//ignore users that appear in custom cache
					if(uid === user.id) return false;
				//passed all the checks
				return true;
			})();	//this IIFE was inspired by https://stackoverflow.com/a/67527585/8396479
			//IIFE is necessary because we can't map an array and return promises
		})
		.on('collect', async (r, u) => {
			try {
				console.log('Calling storeUserReaction...');
				//cache the reaction right away to prevent reaction spam
				await this.storeUserReaction(u);
				console.log('storeUserReaction promise returned...');
				//ensure user is connected to LL
				if(!(await Firebase.isUserConnectedToLeyline(u.id))) 
					this.handleUnconnectedAccount(u, {
						dm: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
							[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
						log: `<@!${u.id}> reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by <@!${msg.author.id}> in <#${msg.channel.id}>, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
					});

				//this handles the whole awarding process
				else await this.awardReactionLLP(msg, u);
				return;
			} catch(err) { return bot.logger.error(err); }
		});
	}

	async storeUserReaction(user) {
		const msg = this.msg;
		console.log(`received user id: ${user.id}`);
		if(msg._cache.reacted_users.includes(user.id)) return;
		msg._cache.reacted_users.push(user.id);	//store reaction locally
		//update information in cloud
		await admin.firestore()
			.collection(`discord/bot/reaction_collectors/`)
			.doc(msg.id)
			.collection('reacted_users')
			.doc(user.id)
			.set({
				reacted: true,
				timestamp: Date.now(),
			}, { merge: true });
		return;
	}
};

module.exports = class extends DiscordEvent {
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
	 validateAttachment(url) {
		if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp'))
			return true;
		if (url.endsWith('.mp4') || url.endsWith('.mpg') || url.endsWith('.mov'))
			return true;
		return false;
	}

	async run(msg) {
		const bot = this.bot;
		// Ignore messages sent by other bots or sent in DM
		if (msg.author.bot || !msg.guild) return;

		//msg needs to be in specific channel
		if (msg.channel.id !== target_channel) return;

		//msg needs to be an image or video file
		if (msg.attachments.size < 1) return;
		if (!msg.attachments.every((attachment) => this.validateAttachment(attachment.url)))
			return bot.logger.debug(
				`${this.name} event rejected msg ${msg.id} by ${msg.author.tag} because it did not contain valid attachments`
			);
		
		//create a specific instance for each approved message
		new GoodActsHandler(bot, msg);
		return;
	}
};
