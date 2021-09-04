import * as Firebase from '../../api';
const EmbedBase = require('../components/EmbedBase');

export class ReactionCollectorBase {
    APPROVAL_WINDOW     = 24 * 7;	//(hours) how long the mods have to approve a photo
    REACTION_WINDOW   	= 24;   //(hours) how long users have to react after collector approval
    APPROVAL_LLP        = 10; 	//LLP awarded for approved post
    REACTION_LLP        = 1;    //LLP awarded for reacting
	MOD_EMOJIS 			= [
		// Emojis allowed in setupModReactionCollector
		/* Should be of structure {
			unicode: String,
			keyword?: String,
			add_on_msg?: boolean,
		} */
	];
    media_type = 'submission';

    constructor(bot, {
        msg,
		type,	//ReactionCollector.Collectors
		...other
    }) {
        this.bot = bot;
		this.msg = msg;
		this.id = msg.id;
		this.type = type;
		Object.assign(this, other);
	}

	/**
	 * !! MUST BE IMPLEMENTED IN ALL SUBCLASSES !!
	 * Method called after a reaction to an approved submission has been received.
	 * This method should specify actions in addition to reaction storage and reaction user "Moral Support" LLP awardal
	 * @param {Object} args Destructured args
	 * @param {Reaction} args.reaction The received reaction
	 * @param {User} args.user The user associated with the incoming reaction
	 */
	reactionReceived({reaction, user}) {
		throw new Error(`${this.constructor.name} doesn't provide a ${arguments.callee.name} method`);
	}

	/**
	 * !! MUST BE IMPLEMENTED IN ALL SUBCLASSES !!
	 * Method called after a submission has been approved
	 * @param {Object} args Destructured args
	 * @param {Reaction} args.reaction The reaction that approved the submission
	 * @param {User} args.user The user that approved the submission
	 */
	approveSubmission({reaction, user}) {
		throw new Error(`${this.constructor.name} doesn't provide a ${arguments.callee.name} method`);
	}

	setupModReactionCollector({from_firestore = false, duration = this.APPROVAL_WINDOW * 3600 * 1000} = {}) {
		const { bot, msg } = this;

		//create Firestore doc only if it we aren't already loading one from cache
        !from_firestore && /*await*/ Firebase.createCollector(this);

		//add initial reactions
		if(!from_firestore)
			for (const reaction of this.MOD_EMOJIS) 
				reaction?.add_on_msg !== false && 
					msg.react(reaction.unicode);

		//setup collector
		this.collector = msg
			.createReactionCollector({
				filter: (r, u) =>
					bot.checkMod(u.id) && this.MOD_EMOJIS.some(e => e.unicode === r.emoji.name),
				time: duration,
			})
			.once('collect', async (reaction, user) => {
				await msg.fetchReactions();
				//submission was rejected
				if(reaction.emoji.name === '❌') {
					reaction.remove();	//remove all X's (for anti-degregation purposes)
					return this.rejectSubmission({user});
				}

				this.approveSubmission({reaction, user});
			});
		return this;
	}

	/**
	 * Sets up a specific ReactionCollector on an approved message that is designed to last for 24hrs and award LLP to users that react
	 * @param {Object} [options] Collector options
	 * @param {Number} [options.duration] How long until the collector expires, in `ms` 
	 * @returns {ReactionCollectorBase} This class itself
	 */
	setupApprovedCollector({duration = this.REACTION_WINDOW * 3600 * 1000} = {}) {
		const { bot, msg } = this;
        //create collector to watch for user reactions
		msg.createReactionCollector({ 
			filter: async (reaction, user) => !(await this.hasUserPreviouslyReacted({reaction, user})),
			time: duration,
		}).on('collect', async (reaction, user) => {
			try {
				//cache the reaction right away to prevent reaction spam
				await this.storeUserReaction(user);
				//ensure user is connected to LL
				if(!(await Firebase.isUserConnectedToLeyline(user.id))) 
					this.handleUnconnectedAccount(user, {
						dm: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
							[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
						log: `${bot.formatUser(user)} reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
					});

				//this handles the whole awarding process
				else await this.awardReactionLLP({user});

				//await in case callback is async
				await this.reactionReceived({reaction, user});
				return;
			} catch(err) { return bot.logger.error(err); }
		});
        return this;
	}

	/**
	 * Soft-rejects a submission and logs actions appropriately
	 * @param {Object} [args] Destructured arguments
	 * @param {User} [args.user] Discord.js `User` that rejected the submission
	 */
	rejectSubmission({user}) {
		const { bot, msg } = this;

		//update cloud
		/*await*/ Firebase.rejectCollector({user, collector: this});

		//remove all reactions added by the bot
		msg.reactions.cache.each(reaction => reaction.users.remove(bot.user));

		//log rejection
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `Submission Rejected`,
						value: `${bot.formatUser(user)} rejected the [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> by ${bot.formatUser(msg.author)}`
					},
				],
				thumbnail: { url: this.media_type === 'photo' ? msg.attachments.first().url : this.media_placeholder },
			}).Error(),
		});

		return this;
	}

	/**
	 * Ensure an attachment meets the specified criteria, also updates the `media_type` property
	 * @param {String} url
	 * @returns {boolean} `true` if an attachment was detected & stored, `false` otherwise
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
	 * Process for dealing with a Discord user that lacks a connected Leyline account
	 * @param {User} user user that has not connected their accounts
	 * @param {Object} args Destructured args
	 * @param {string} args.dm Specific reason why user should connect their accounts
	 * @param {string} args.log Discord log content to send under the embed title `LLP NOT Awarded`
	 * @returns 
	 */
	 handleUnconnectedAccount(user, {dm, log} = {}) {
		const { bot } = this;
		bot.sendDM({user, embed: new EmbedBase(bot, {
			fields: [
				{
					name: `❌ You need to Connect Your Leyline & Discord accounts!`,
					value: dm,
				},
			],	
		}).Error()});
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
	 * Award LLP to a user for having a submission approved, and log the transaction appropriately.
	 * Assumes all checks have been previously applied. 
	 * @param {Object} args Destructured arguments
     * @param {User} args.user Discord user
     * @param {string} args.pog "Proof of good" - message to display in LLP history
	 */
	async awardApprovalLLP({user, pog}) {
		const { bot, msg } = this;

		await Firebase.awardLLP(await Firebase.getLeylineUID(user.id), this.APPROVAL_LLP, {
			category: pog,
			comment: `User's Discord ${this.media_type} (${msg.id}) was approved by ${user.tag}`,
		});

		//send dm to author
		bot.sendDM({user, embed: new EmbedBase(bot, {
			fields: [
				{
					name: `🎉 You Earned Some LLP!`,
					value: `Your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, and you received **+${this.APPROVAL_LLP} LLP**!`
				},
			],	
		})});

		//log LLP change in bot-log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP Awarded`,
						value: `${bot.formatUser(user)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, and I gave them **+${this.APPROVAL_LLP} LLP**`,
					},
				],
			}),
		});
		return;
	}

	/**
	 * Award LLP to a user for reacting to an approved submission, and log the transaction appropriately.
	 * Assumes all checks have been previously applied. 
	 * @param {Object} args Destructured arguments
     * @param {User} args.user Discord user
     * @param {string} [args.pog] "Proof of good" - message to display in LLP history
	 */
	async awardReactionLLP({user, pog='Discord Moral Support'}) {
		const { bot, msg } = this;

		//new user reacted, award LLP
		await Firebase.awardLLP(await Firebase.getLeylineUID(user.id), this.REACTION_LLP, {
			category: pog,
			comment: `User reacted to Discord message (${msg.id})`,
		});
		//DM user informing them
		bot.sendDM({user, embed: new EmbedBase(bot, {
			fields: [
				{
					name: `🎉 You Earned Some LLP!`,
					value: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, and received **+${this.REACTION_LLP} LLP**!`
				},
			],	
		})});
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP Awarded`,
						value: `${bot.formatUser(user)} reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, and I gave them **+${this.REACTION_LLP} LLP**`,
					},
				],
			}),
		});
		return;
	}

    /**
	 * Award LLP to the author of an approved submission when someone else reacts, and log the transaction appropriately.
	 * Assumes all checks have been previously applied.
     * @param {Object} args Destructured arguments
     * @param {User} args.user Discord user
     * @param {string} args.pog "Proof of good" - message to display in LLP history
	 */
	async awardAuthorReactionLLP({user, pog}) {
		const { bot, msg } = this;
		//new user reacted, award LLP
		await Firebase.awardLLP(await Firebase.getLeylineUID(msg.author.id), this.REACTION_LLP, {
			category: pog,
			comment: `User's Discord ${this.media_type} (${msg.id}) received a reaction from ${user.tag}`,
		});
		//DM user informing them
		bot.sendDM({ 
			user: msg.author,
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `🎉 You Earned Some LLP!`,
						value: `Someone reacted reacted to your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}>, and you received **+${this.REACTION_LLP} LLP**!`
					},
				],
		})});
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase(bot, {
				fields: [
					{
						name: `LLP Awarded`,
						value: `${bot.formatUser(msg.author)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> received a reaction, and I gave them **+${this.REACTION_LLP} LLP**`,
					},
				],
			}),
		});
		return;
	}

	/**
	 * Synchronously create a thread for this submission from a template format
	 * @param {Object} args Destructured args
	 * @param {number} [args.duration] Duration of the thread, in days
	 * @returns {Promise<ThreadChannel>} The thread that was created
	 */
	createThread({duration = 1} = {}) {
		duration *= 24 * 60;	//convert days to minutes
		const { bot, msg, media_type } = this;
		return msg.startThread({
			name: `${media_type[0].toUpperCase() + media_type.slice(1)} from ${msg.member.displayName}`,
			autoArchiveDuration: duration,
		}).then(thread => {
			bot.sendEmbed({msg:thread.lastMessage, embed: new EmbedBase(bot, {
				description: `⚠ **Please keep all discussion about ${msg.member.toString()}'s ${media_type} inside this thread to avoid cluttering the main channel.** Thank you!`
			}).Warn()});
			return thread;
		});
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
        const msg = this.msg;

        //allow any reactions, but only allow users who have not previously reacted
        return await (async () => {
            //ignore bots
            if(user.bot) return true;
        
            //check the local custom cache first, because it's quicker than calling the API
            //bot.logger.debug(`Custom Reaction Cache (${msg.id}): ${msg._cache.reacted_users}`);	//debug added 1.1.0
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
     * Stores a reacted user in the cloud & the local cache
	 * No regard to what their reaction actually was, due to custom emoji issues
     * @param {User} user the user that reacted
     * @returns {Promise<void>} Resolves when user has been stored in cloud
     */
	async storeUserReaction(user) {
		const msg = this.msg;
		if(msg._cache.reacted_users?.includes(user.id)) return;
		msg._cache.reacted_users.push(user.id);	//store reaction locally

		//update information in cloud
		await Firebase.storeUserReaction({user, collector: this});
		return;
	}

	/**
     * Overrides local message cache with Firestore doc cache (only updates global cache properties)
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     * @returns {Promise<ReactionCollectorBase>} the current class, for chaining
     */
	async loadMessageCache(doc) {
        //extract the ids of the users that have reacted
        this.msg._cache.reacted_users = (await doc.ref.collection('reacted_users').get()).docs.map(d => d.id);
        return this;
    }
}


