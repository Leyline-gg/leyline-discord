const EmbedBase = require('./EmbedBase');
const Firebase	= require('./FirebaseAPI');
const XPService = require('./XPService');
const admin = require('firebase-admin');

const CTA_ROLE 			= '853414453206188063'; //role to ping when photo is approved
const COLLECTOR_EXPIRES = 24;   //how long the collector expires, in hours
const APPROVAL_LLP = 100 	//LLP awarded for approved post
const REACTION_LLP = 5;		//LLP awarded for reacting
const REACTION_EMOJIS = [
	{
		unicode: '💪',
		keyword: 'Exercise',
	},
	{
		unicode: '🧘‍♀️',
		keyword: 'Mindfulness',
	},
	{
		unicode: '🩸',
		keyword: 'Blood Donation',
	},
	{
		unicode: '🧹',
		keyword: 'Local Cleanup',
	},
	{
		unicode: '👖',
		keyword: 'Charity Donation',
	},
	{
		unicode: '⛑',
		keyword: 'Community Service',
	},
	{
		unicode: '👨‍🏫',
		keyword: 'Education',
	},
	{
		unicode: '🌳',
		keyword: 'Tree Planting',
	},
	{
		unicode: '🇴',
		keyword: 'Good Act',
	},
];

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

        //add initial reactions
		if(!from_firestore) 
			for (const reaction of REACTION_EMOJIS) 
				msg.react(reaction.unicode);
        //setup first ReactionCollector for catching mod reaction
		this.collector = msg	//intentionally decreasing indentation on the following chains for readability
		.createReactionCollector(
			(r, u) =>
				bot.checkMod(u.id) && REACTION_EMOJIS.some(e => e.unicode === r.emoji.name)
		)
		.on('collect', async (r, u) => {
			try {
				this.collector.stop();  //stop this collector (we will create a new one later)

				//store the activity type for LLP award text both locally and in the cloud
				msg._activityType = REACTION_EMOJIS.find(e => e.unicode === r.emoji.name)?.keyword || 'Good Act';
				admin.firestore().collection(`discord/bot/reaction_collectors/`).doc(msg.id)
					.set({
						activity_type: msg._activityType,
						approved_by: u.id,
						approved_on: Date.now(),
					}, {merge: true});

				//store the post for xp purposes
				await XPService.addPost({
					uid: msg.author.id,
					post_id: msg.id,
				});

				//send msg in channel
				msg./*reply TODO:change w djs v13*/channel.send(
					`<@&${CTA_ROLE}> 🚨 **NEW APPROVED ${this.media_type.toUpperCase()}!!** 🚨`,
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
								value: `${bot.formatUser(u)} approved the [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> by ${bot.formatUser(msg.author)}`
							},
						],
						thumbnail: { url: this.media_type === 'photo' ? msg.attachments.first().url : this.media_placeholder },
					}),
				});

				//setup approved collector now that users have been notified
				this.setupApprovedCollector();

				//ensure user is connected to LL
				const is_author_connected = await Firebase.isUserConnectedToLeyline(msg.author.id);
				if(!is_author_connected)
					this.handleUnconnectedAccount(msg.author, {
						dm: `Your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
							[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
						log: `${bot.formatUser(msg.author)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
					});

				// I could add some catch statements here and log them to Discord (for the awarding LLP process)

				//award LLP to msg author
				else await this.awardApprovalLLP(msg, msg.author);

				// ---  Give LLP to the users that have already reacted   ---
				// --- (this includes the mod that just approved the msg) ---
				for (const old_reaction of [...msg.reactions.cache.values()]) {
					for(const old_user of [...(await old_reaction.users.fetch()).values()]) {
						if(!(await this.hasUserPreviouslyReacted({reaction: old_reaction, user: old_user, checkMsgReactions: false}))) {
							//store user's reaction right away, because we do the same in the approved collector
							await this.storeUserReaction(old_user);

							//award LLP to msg author for receiving a reaction (except on his own reaction)
							//(this goes above the continue statement below)
							is_author_connected &&
								old_user.id !== msg.author.id &&
								await this.awardAuthorReactionLLP(msg, old_user);

							//exit if user is not connected to Leyline
							if(!(await Firebase.isUserConnectedToLeyline(old_user.id))) {
								this.handleUnconnectedAccount(old_user, {
									dm: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
										[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
									log: `${bot.formatUser(old_user)} reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
								});
								continue;
							}

							//award LLP!
							await this.awardReactionLLP(msg, old_user);
						}
					}
				}

				//remove all reactions added by the bot
				msg.reactions.cache.each(reaction => reaction.users.remove(bot.user));
				return;
			} catch(err) { return bot.logger.error(err); }
		});
        
        //create Firestore doc only if it we aren't already loading one from cache
        !from_firestore && admin
            .firestore()
            .collection(`discord/bot/reaction_collectors/`)
            .doc(msg.id)
            .set({
                channel: msg.channel.id,
				author: msg.author.id,
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
		await Firebase.awardLLP(await Firebase.getLeylineUID(user.id), REACTION_LLP, {
			category: 'Discord Moral Support',
			comment: `User reacted to Discord message (${msg.id})`,
		});
		//DM user informing them
		user.send({ embed: new EmbedBase(bot, {
			fields: [
				{
					name: `🎉 You Earned Some LLP!`,
					value: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, and received **+${REACTION_LLP} LLP**!`
				},
			],	
		})})
			.catch(() => bot.sendDisabledDmMessage(user));
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP Awarded`,
						value: `${bot.formatUser(user)} reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, and I gave them **+${REACTION_LLP} LLP**`,
					},
				],
			}),
		});
		return;
	}

	/**
	 * Award LLP to the author of an approved submission when someone else reacts, and log the transaction appropriately.
	 * Assumes all checks have been previously applied. 
	 */
	async awardAuthorReactionLLP(msg, user) {
		const bot = this.bot;
		//new user reacted, award LLP
		await Firebase.awardLLP(await Firebase.getLeylineUID(msg.author.id), REACTION_LLP, {
			category: `Discord ${msg._activityType} ${this.media_type[0].toUpperCase() + this.media_type.slice(1)} Received Reaction`,
			comment: `User's Discord ${this.media_type} (${msg.id}) received a reaction from ${user.tag}`,
		});
		//DM user informing them
		msg.author.send({ embed: new EmbedBase(bot, {
			fields: [
				{
					name: `🎉 You Earned Some LLP!`,
					value: `Someone reacted reacted to your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}>, and you received **+${REACTION_LLP} LLP**!`
				},
			],	
		})})
			.catch(() => bot.sendDisabledDmMessage(msg.author));
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP Awarded`,
						value: `${bot.formatUser(msg.author)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> received a reaction, and I gave them **+${REACTION_LLP} LLP**`,
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
		await Firebase.awardLLP(await Firebase.getLeylineUID(user.id), APPROVAL_LLP, {
			category: `Discord ${msg._activityType} ${this.media_type[0].toUpperCase() + this.media_type.slice(1)} Approved`,
			comment: `User's Discord ${this.media_type} (${msg.id}) was approved by ${user.tag}`,
		});

		//send dm to author
		user.send({ embed: new EmbedBase(bot, {
			fields: [
				{
					name: `🎉 You Earned Some LLP!`,
					value: `Your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, and you received **+${APPROVAL_LLP} LLP**!`
				},
			],	
		})})
			.catch(() => bot.sendDisabledDmMessage(user));

		//log LLP change in bot-log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP Awarded`,
						value: `${bot.formatUser(user)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, and I gave them **+${APPROVAL_LLP} LLP**`,
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
		}).Error()})
			.catch(() => bot.sendDisabledDmMessage(user));
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP __NOT__ Awarded`,
						value: log,
					},
				],
			}).Error(),
		});
		return;
	}

    /**
     * Check if a user has previously reacted to the class's `msg`; designed to be used as a filter for a ReactionCollector
     * @param {Object} args
	 * @param {MessageReaction} args.reaction Discord.js MessageReaction
     * @param {User} args.user Discord.js User
	 * @param {boolean} [args.checkMsgReactions] whether or not to check the msg reactions provided by Discord API
     * @returns {Promise<boolean>} Promise that resolves to boolean
     */
    async hasUserPreviouslyReacted({reaction, user, checkMsgReactions = true} = {}) {
        const bot = this.bot;
        const msg = this.msg;

        //allow any reactions, but only allow users who have not previously reacted
        return await (async () => {
            //ignore bots
            if(user.bot) return true;
        
            //check the local custom cache first, because it's quicker than calling the API
            bot.logger.debug(`Custom Reaction Cache (${msg.id}): ${msg._cache.reacted_users}`);	//debug added 1.1.0
            if(msg._cache.reacted_users?.includes(user.id)) return true;
            
            //now check the Discord.js message reaction cache
            if(checkMsgReactions) for(const r of [...msg.reactions.cache.values()]) {
                //ignore the reaction that was just added
                if (r.emoji.identifier === reaction.emoji.identifier) continue;
                //check if any of the other reactions have been added by target user
                if ((await r.users.fetch()).has(user.id)) return true;
            }
            //passed all the checks
            return false;
        })();	//this IIFE was inspired by https://stackoverflow.com/a/67527585/8396479
        //IIFE is necessary because we can't map an array and return promises
    }

	/**
	 * Sets up a specific ReactionCollector on an approved message that is designed to last for 24hrs and award LLP to users that react
	 * @param {Object} [options] Collector options
	 * @param {Number} [options.duration] How long until the collector expires, in `ms` 
	 */
	setupApprovedCollector({duration = COLLECTOR_EXPIRES * 3600000} = {}) {
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
		msg.createReactionCollector(async (reaction, user) => !(await this.hasUserPreviouslyReacted({reaction, user})), { time: duration })
		.on('collect', async (r, u) => {
			try {
				//cache the reaction right away to prevent reaction spam
				await this.storeUserReaction(u);
				//ensure user is connected to LL
				if(!(await Firebase.isUserConnectedToLeyline(u.id))) 
					this.handleUnconnectedAccount(u, {
						dm: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
							[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
						log: `${bot.formatUser(u)} reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
					});

				//this handles the whole awarding process
				else await this.awardReactionLLP(msg, u);

				//check if user who reacted is msg author
				if(u.id === msg.author.id) return;
				//award LLP to msg author
				if(!(await Firebase.isUserConnectedToLeyline(msg.author.id))) 
					this.handleUnconnectedAccount(msg.author, {
						dm: `Your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> received a reaction, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
							[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
						log: `${bot.formatUser(msg.author)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> recevied a reaction, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
					});
				else await this.awardAuthorReactionLLP(msg, u);
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
		//load the activity type
		this.msg._activityType = doc.data()?.activity_type || 'Good Act';
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
