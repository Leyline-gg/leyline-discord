const EmbedBase = require('./EmbedBase');
const Firebase	= require('./FirebaseAPI');
const admin = require('firebase-admin');

const cta_role 			= '853414453206188063'; //role to ping when photo is approved
const collector_expires = 24;   //how long the collector expires, in hours

class GoodActsReactionCollector {
	media_type 		= 'submission'; //should be either photo/video (this is for the UX)
	media_placeholder	//unfortunately, there is no easy way to extract the thumbnail from a video posted in discord
		= 'https://cdn1.iconfinder.com/data/icons/growth-marketing/48/marketing_video_marketing-512.png';

	constructor(bot, msg) {
		this.bot = bot;
		this.msg = msg;
		msg._cache = { reacted_users: [] }; 
		this.processAttachment(msg.attachments.first()?.url);   //set media vars
	}

    /**
     * Runs the initial setup process for a new message
     * @param {boolean} [from_firestore] whether or not the message is being loaded from Firestore
     * @returns {GoodActsReactionCollector} the current class, for chaining 
     */
    init(from_firestore = false) {
        const bot = this.bot;
        const msg = this.msg;

        //add initial reaction
		!from_firestore && msg.react('✅');  //await? the reaction to prevent the Collector from picking it up
        //setup first ReactionCollector for catching mod reaction
		this.collector = msg	//intentionally decreasing indentation on the following chains for readability
		.createReactionCollector(
			(reaction, user) =>
				reaction.emoji.name === '✅' && bot.checkMod(user.id)
		)
		.on('collect', async (r, u) => {
			this.collector.stop();  //stop this collector (we will create a new one later)
            this.storeUserReaction(u);  //store mod's reaction, no need to wait since there shouldn't be any spam?
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

			this.setupApprovedCollector();
			return;
		});
        
        //create Firestore doc only if it we aren't already loading one from cache
        !from_firestore && admin
            .firestore()
            .collection(`discord/bot/reaction_collectors/`)
            .doc(msg.id)
            .set({
                channel: msg.channel.id,
                approved: false,    //will be updated once approved
                expires: Date.now() + (7 * 24 * 3600 * 1000),  //1 week for mods to approve
            });
        return this;
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
	handleUnconnectedAccount(user, {dm, log} = {}) {
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
	 * @param {{duration: number}} [options] Collector options
	 */
	setupApprovedCollector({duration = collector_expires * 3600000} = {}) {
		const bot = this.bot;
        const msg = this.msg;

        //update Firestore data (no await because this can be synchronous)
        admin.firestore()
            .collection(`discord/bot/reaction_collectors/`)
            .doc(msg.id)
            .set({
                expires: Date.now() + duration,
                approved: true,
            }, { merge: true });

        //create collector to watch for user reactions
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
                bot.logger.debug(`Custom Reaction Cache: ${msg._cache.reacted_users}`);
				//now check our custom reaction cache
				if(msg._cache.reacted_users?.includes(user.id)) return false;
				//passed all the checks
				return true;
			})();	//this IIFE was inspired by https://stackoverflow.com/a/67527585/8396479
			//IIFE is necessary because we can't map an array and return promises
		}, { time: duration })
		.on('collect', async (r, u) => {
			try {
				//cache the reaction right away to prevent reaction spam
				await this.storeUserReaction(u);
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
        return this;
	}

    /**
     * Overrides local message cache with Firestore doc cache
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     * @returns {Promise<GoodActsReactionCollector>} the current class, for chaining
     */
    async loadMessageCache(doc) {
        //I request the entire doc in case I want to add other cache values later on

        //extract the ids of the users that have reacted
        this.msg._cache.reacted_users = (await doc.ref.collection('reacted_users').get()).docs.map(d => d.id);
        return this;
    }

	async storeUserReaction(user) {
		const msg = this.msg;
		if(msg._cache.reacted_users?.includes(user.id)) return;
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

module.exports = GoodActsReactionCollector;
