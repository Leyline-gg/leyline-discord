import { CloudConfig, EmbedBase, ImageService } from '../';
import * as Firebase from '../../api';
import bot from '../../bot';

export class ReactionCollectorBase {
    get APPROVAL_WINDOW() { return CloudConfig.get('ReactionCollector').APPROVAL_WINDOW; }	//(hours) how long the mods have to approve a photo
    get REACTION_WINDOW() { return CloudConfig.get('ReactionCollector').REACTION_WINDOW; }	//(hours) how long users have to react after collector approval
    get APPROVAL_GP() { return CloudConfig.get('ReactionCollector').APPROVAL_GP; }	//GP awarded for approved post
    get REACTION_GP() { return CloudConfig.get('ReactionCollector').REACTION_GP; }	//GP awarded for reacting
	// Emojis allowed in setupModReactionCollector
	/* Should be of structure {
		name: String,
		id?: Snowflake, //for custom emoji
		animated?: Boolean,
		keyword?: String,
		position?: Number,	//lower numbers get added to msg first
		add_on_msg?: boolean,
	} */
	get MOD_EMOJIS() { 
		return CloudConfig.get('ReactionCollector').MOD_EMOJIS
			.map(bot.constructEmoji)
			.sort((a, b) => (
				{position: Number.MAX_VALUE, ...a}.position -
				{position: Number.MAX_VALUE, ...b}.position
			));
	}
	
    media_type = 'submission';

    constructor({
        msg,
		type,	//ReactionCollector.Collectors
		...other
    }) {
		this.msg = msg;
		this.id = msg.id;
		this.type = type;
		Object.assign(this, other);
	}

	/**
	 * !! MUST BE IMPLEMENTED IN ALL SUBCLASSES !!
	 * Method called after a reaction to an approved submission has been received.
	 * This method should specify actions in addition to reaction storage and reaction user "Moral Support" GP awardal
	 * @param {Object} args Destructured args
	 * @param {Reaction} args.reaction The received reaction
	 * @param {User} args.user The user associated with the incoming reaction
	 */
	reactionReceived({reaction, user}) {
		throw new Error(`${this.constructor.name} doesn't provide a ${this.reactionReceived.name} method`);
	}

	/**
	 * !! MUST BE IMPLEMENTED IN ALL SUBCLASSES !!
	 * Method called after a submission has been approved
	 * @param {Object} args Destructured args
	 * @param {Emoji} args.approval_emoji The emoji of the reaction that approved the submission
	 * @param {User} args.user The user that approved the submission
	 */
	approveSubmission({approval_emoji, user}) {
		throw new Error(`${this.constructor.name} doesn't provide a ${this.reactionReceived.name} method`);
	}

	setupModReactionCollector({from_firestore = false, duration = this.APPROVAL_WINDOW * 3600 * 1000} = {}) {
		const { msg } = this;

		//create Firestore doc only if it we aren't already loading one from cache
        !from_firestore && /*await*/ Firebase.createCollector(this);

		//add initial reactions
		if(!from_firestore)
			for (const reaction of this.MOD_EMOJIS)
				reaction?.add_on_msg !== false && 
					msg.react(reaction.toString());

		//setup collector
		this.collector = msg
			.createReactionCollector({
				filter: (r, u) => !u.bot,
				time: duration,
			})
			.on('collect', async (reaction, user) => {
				//remove ❌'s added by non-moderators
				if(reaction.emoji.name === '❌' && !bot.checkMod(user.id))
					return reaction.users.remove(user);
					
				//this takes the place of the reactioncollector filter
				if(!(bot.checkMod(user.id) && this.MOD_EMOJIS.some(e => e.toString() === reaction.emoji.toString())))
					return;
				
				await msg.fetchReactions();
				//submission was rejected
				if(reaction.emoji.name === '❌') 
					return this.rejectSubmission({user});
				//a moderator cannot approve their own submission
				if(user.id === msg.author.id) return;

				//end this modReactionCollector
				this.collector.stop();
				this.approveSubmission({approval_emoji:reaction.emoji, user});
			});
		return this;
	}

	/**
	 * Sets up a specific ReactionCollector on an approved message that is designed to last for 24hrs and award GP to users that react
	 * @param {Object} [options] Collector options
	 * @param {Number} [options.duration] How long until the collector expires, in `ms` 
	 * @returns {ReactionCollectorBase} This class itself
	 */
	setupApprovedCollector({duration = this.REACTION_WINDOW * 3600 * 1000} = {}) {
		const { msg } = this;
        //create collector to watch for user reactions
		this.collector = msg.createReactionCollector({ 
			filter: async (reaction, user) => !(await this.hasUserPreviouslyReacted({reaction, user})),
			time: duration,
		}).on('collect', async (reaction, user) => {
			try {
				//cache the reaction right away to prevent reaction spam
				await this.storeUserReaction(user);
				//ensure user is connected to LL
				if(!(await Firebase.isUserConnectedToLeyline(user.id))) 
					this.handleUnconnectedAccount(user, {
						dm: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, but because you have not connected your Discord & Leyline accounts, I couldn't award you any GP!
							[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
						log: `${bot.formatUser(user)} reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, but I did not award them any GP because they have not connected their Leyline & Discord accounts`,
					});

				//this handles the whole awarding process
				else await this.awardReactionGP({user});

				//await in case child method is async
				await this.reactionReceived({reaction, user});
				return;
			} catch(err) { return bot.logger.error(err); }
		});
        return this;
	}

	/**
	 * Log an approval in a private log channel
	 * @param {Object} args Destructured arguments
	 * @param {User} args.user Discord.js `User` that approved the submission
	 * @param {Object} [args.embed_data] Embed data to be sent in the approval message
	 */
	logApproval({user, embed_data} = {}) {
		const { msg } = this;

		//log rejection using bot method
		bot.logSubmission({
			embed: new EmbedBase({
				title: 'Submission Approved',
				url: msg.url,
				fields: [
					{
						name: 'Channel',
						value: `<#${msg.channel.id}>`,
						inline: true,
					},
					{
						name: 'Approved By',
						value: bot.formatUser(user),
						inline: true,
					},
					{
						name: 'Author',
						value: bot.formatUser(msg.author),
						inline: true,
					},
				],
				thumbnail: { url: this.media_type === 'photo' ? this.attachment.url : this.media_placeholder },
				...embed_data,
			}).Success(),
		});

		return this;
	}

	/**
	 * Log a rejection in a private log channel
	 * @param {Object} args Destructured arguments
	 * @param {User} args.user Discord.js `User` that rejected the submission
	 * @param {Object} [args.embed_data] Embed data to be sent in the rejection message
	 */
	logRejection({user, embed_data} = {}) {
		const { msg } = this;

		//log rejection using bot method
		bot.logSubmission({
			embed: new EmbedBase({
				title: 'Submission Rejected',
				url: msg.url,
				fields: [
					{
						name: 'Channel',
						value: `<#${msg.channel.id}>`,
						inline: true,
					},
					{
						name: 'Rejected By',
						value: bot.formatUser(user),
						inline: true,
					},
					{
						name: 'Author',
						value: bot.formatUser(msg.author),
						inline: true,
					},
				],
				thumbnail: { url: this.media_type === 'photo' ? this.attachment.url : this.media_placeholder },
				...embed_data,
			}).Error(),
		});

		return this;
	}

	/**
	 * Soft-rejects a submission and logs actions appropriately
	 * @param {Object} args Destructured arguments
	 * @param {User} args.user Discord.js `User` that rejected the submission
	 */
	rejectSubmission({user}) {
		const { msg } = this;

		//end the modReactionCollector
		this.collector.stop();

		//update cloud
		/*await*/ Firebase.rejectCollector({user, collector: this});

		//remove all reactions added by the bot
		msg.reactions.cache.each(reaction => reaction.users.remove(bot.user));

		//log rejection
		this.logRejection({user});

		return this;
	}

	/**
	 * Ensure an attachment meets the specified criteria, also updates the `media_type` property
	 * @param {MessageAttachment} attachment
	 * @returns {boolean} `true` if an attachment was detected & stored, `false` otherwise
	 */
	processAttachment(attachment) {
		this.attachment = attachment;
		if(!attachment) return false;
		const url = attachment.url.toLowerCase();
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
	 * @param {string} args.log Discord log content to send under the embed title `GP NOT Awarded`
	 * @returns 
	 */
	 handleUnconnectedAccount(user, {dm, log} = {}) {
		bot.sendDM({user, embed: new EmbedBase({
			fields: [
				{
					name: `❌ You need to Connect Your Leyline & Discord accounts!`,
					value: dm,
				},
			],	
		}).Error()});
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase({
				fields: [
					{
						name: `GP __NOT__ Awarded`,
						value: log,
					},
				],
			}).Error(),
		});
		return;
	}

    /**
	 * Award GP to a user for having a submission approved, and log the transaction appropriately.
	 * Assumes all checks have been previously applied. 
	 * @param {Object} args Destructured arguments
     * @param {User} args.user Discord user
     * @param {User} args.approver Discord mod that approved the photo
     * @param {string} args.pog "Proof of good" - message to display in GP history
	 */
	async awardApprovalGP({user, approver, pog}) {
		const { msg } = this;

		await Firebase.awardPoints(await Firebase.getLeylineUID(user.id), this.APPROVAL_GP, {
			category: pog,
			comment: `User's Discord ${this.media_type} (${msg.id}) was approved by ${approver.tag}`,
		});

		//send dm to author
		bot.sendDM({user, embed: new EmbedBase({
			fields: [
				{
					name: `🎉 You Earned Some GP!`,
					value: `Your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, and you received **+${this.APPROVAL_GP} GP**!`
				},
			],	
		})});

		//log GP change in bot-log
		bot.logDiscord({
			embed: new EmbedBase({
				fields: [
					{
						name: `GP Awarded`,
						value: `${bot.formatUser(user)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> was approved, and I gave them **+${this.APPROVAL_GP} GP**`,
					},
				],
			}),
		});
		return;
	}

	/**
	 * Award GP to a user for reacting to an approved submission, and log the transaction appropriately.
	 * Assumes all checks have been previously applied. 
	 * @param {Object} args Destructured arguments
     * @param {User} args.user Discord user
     * @param {string} [args.pog] "Proof of good" - message to display in GP history
	 */
	async awardReactionGP({user, pog=`Discord <a href="${this.msg.url}">Moral Support</a>`}) {
		const { msg } = this;

		//new user reacted, award GP
		await Firebase.awardPoints(await Firebase.getLeylineUID(user.id), this.REACTION_GP, {
			category: pog,
			comment: `User reacted to Discord message (${msg.id})`,
		});
		//DM user informing them
		bot.sendDM({user, embed: new EmbedBase({
			fields: [
				{
					name: `🎉 You Earned Some GP!`,
					value: `You reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, and received **+${this.REACTION_GP} GP**!`
				},
			],	
		})});
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase({
				fields: [
					{
						name: `GP Awarded`,
						value: `${bot.formatUser(user)} reacted to the [${this.media_type}](${msg.url} 'click to view message') posted by ${bot.formatUser(msg.author)} in <#${msg.channel.id}>, and I gave them **+${this.REACTION_GP} GP**`,
					},
				],
			}),
		});
		return;
	}

    /**
	 * Award GP to the author of an approved submission when someone else reacts, and log the transaction appropriately.
	 * Assumes all checks have been previously applied.
     * @param {Object} args Destructured arguments
     * @param {User} args.user Discord user
     * @param {string} args.pog "Proof of good" - message to display in GP history
	 */
	async awardAuthorReactionGP({user, pog}) {
		const { msg } = this;
		//new user reacted, award GP
		await Firebase.awardPoints(await Firebase.getLeylineUID(msg.author.id), this.REACTION_GP, {
			category: pog,
			comment: `User's Discord ${this.media_type} (${msg.id}) received a reaction from ${user.tag}`,
		});
		//DM user informing them
		bot.sendDM({ 
			user: msg.author,
			embed: new EmbedBase({
				fields: [
					{
						name: `🎉 You Earned Some GP!`,
						value: `Someone reacted reacted to your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}>, and you received **+${this.REACTION_GP} GP**!`
					},
				],
		})});
		//Log in bot log
		bot.logDiscord({
			embed: new EmbedBase({
				fields: [
					{
						name: `GP Awarded`,
						value: `${bot.formatUser(msg.author)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> received a reaction, and I gave them **+${this.REACTION_GP} GP**`,
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
	 * @param {boolean} [args.return_thread] Whether or not to return the thread that was created
 	 * @returns {Promise<ReactionCollectorBase | ThreadChannel>} If `return_thread`, the thread that was created, otherwise the reaction collector that was created class this was called upon
	 */
	async createThread({duration = 1, return_thread=false} = {}) {
		duration *= 24 * 60;	//convert days to minutes
		const { msg, media_type } = this;
		return await msg.startThread({
			name: `${media_type[0].toUpperCase() + media_type.slice(1)} from ${msg.member.displayName}`.substr(0, 100),
			autoArchiveDuration: duration,
		}).then(thread => {
			this.thread = thread;
			bot.sendEmbed({msg:thread.lastMessage, embed: new EmbedBase({
				description: `⚠ **Please keep all discussion about ${msg.member.toString()}'s ${media_type} inside this thread to avoid cluttering the main channel.** Thank you!`
			}).Warn()});
			return return_thread ? thread : this;
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
        const { msg } = this;

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
		const { msg } = this;
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

	/**
	 * Perform a reverse image search on the first message attachment.
	 * Includes both web detection and local detection.
	 * @returns {Promise<ReactionCollectorBase>} the current class, for chaining
	 */
	async imageSearch() {
		//can be expaned to multiple images by iterating through msg.attachments
		const { thread, attachment } = this;
		try {
			if(!attachment) throw new Error('No attachments found on msg');
			const res = await ImageService.searchWeb(
				attachment.size > 10485760
					? `${attachment.proxyURL}?width=${Math.round(attachment.width / 2)}&height=${Math.round(
							attachment.height / 2
					  )}`
					: attachment.url
			);
			const embed = new EmbedBase({
				...ImageService.analyzeWebResult(res),
				thumbnail: { url: attachment.url },
			});
			bot.sendEmbed({msg:thread.lastMessage, embed});
		} catch(err) {
			throw new Error(`imageSearch error: ${err}`);
		}

		return this;
	}
}
