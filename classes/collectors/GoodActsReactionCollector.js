import * as Firebase from '../../api';
import { EmbedBase, XPService, ReactionCollectorBase, CloudConfig } from '..';

const CTA_ROLE 			= '853414453206188063'; //role to ping when photo is approved

export class GoodActsReactionCollector extends ReactionCollectorBase {
	//override parent properties
	get REACTION_LLP() { return CloudConfig.get('ReactionCollector').GoodActs.REACTION_LLP; }
	get APPROVAL_LLP() { return CloudConfig.get('ReactionCollector').GoodActs.APPROVAL_LLP; }
	get MOD_EMOJIS() { return CloudConfig.get('ReactionCollector').GoodActs.MOD_EMOJIS; }

	media_placeholder	//unfortunately, there is no easy way to extract the thumbnail from a video posted in discord
		= 'https://cdn1.iconfinder.com/data/icons/growth-marketing/48/marketing_video_marketing-512.png';

	constructor(bot, {
		msg,
	}) {
		super(bot, {
			type: 'GOOD_ACTS',
			msg,
		});
		this.msg._cache = { reacted_users: [] }; 
		this.processAttachment(msg.attachments.first()?.url);   //set media vars
	}

	// Callback specific to this Collector class
	async reactionReceived({reaction, user}) {
		const { bot, msg } = this;

		//check if user who reacted is msg author
		if(user.id === msg.author.id) return;
		//award LLP to msg author
		if(!(await Firebase.isUserConnectedToLeyline(msg.author.id))) 
			this.handleUnconnectedAccount(msg.author, {
				dm: `Your [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> received a reaction, but because you have not connected your Discord & Leyline accounts, I couldn't award you any LLP!
					[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
				log: `${bot.formatUser(msg.author)}'s [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> recevied a reaction, but I did not award them any LLP because they have not connected their Leyline & Discord accounts`,
			});
		else await this.awardAuthorReactionLLP({
			user: user,
			pog: `Discord <a href="${msg.url}">\
				${msg._activityType} ${this.media_type[0].toUpperCase() + this.media_type.slice(1)}</a> Received Reaction`,
		});
		return;
	}

	async approveSubmission({user, reaction}) {
		const { bot, msg } = this;
		try {
			//store the activity type for LLP award text both locally and in the cloud
			msg._activityType = this.MOD_EMOJIS.find(e => e.unicode === reaction.emoji.name)?.keyword || 'Good Act';
			await Firebase.approveCollector({collector: this, user, metadata: {
				activity_type: msg._activityType,
			}});

			//store the post for xp purposes
			await XPService.addGoodAct({
				uid: msg.author.id,
				post_id: msg.id,
			});

			//send msg in channel
			bot.sendReply({
				msg,
				content: `<@&${CTA_ROLE}> 🚨 **NEW APPROVED ${this.media_type.toUpperCase()}!!** 🚨`,
				embed: new EmbedBase(bot, {
					description: `A new ${this.media_type} was approved! Click [here](${msg.url} 'view message') to view the message.\nBe sure to react within 24 hours to get your LLP!`,
					thumbnail: { url: this.media_type === 'photo' ? msg.attachments.first().url : this.media_placeholder },
				}),
			});

			//log approval in bot log
			bot.logDiscord({
				embed: new EmbedBase(bot, {
					fields: [
						{
							name: `${this.media_type[0].toUpperCase() + this.media_type.slice(1)} Approved`,
							value: `${bot.formatUser(user)} approved the [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> by ${bot.formatUser(msg.author)}`
						},
					],
					thumbnail: { url: this.media_type === 'photo' ? msg.attachments.first().url : this.media_placeholder },
				}),
			});

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
			else await this.awardApprovalLLP({
				user: msg.author,
				pog: `Discord <a href="${msg.url}">\
					${msg._activityType} ${this.media_type[0].toUpperCase() + this.media_type.slice(1)}</a> Approved`,
			});

			// ---  Give LLP to the users that have already reacted   ---
			// --- (this includes the mod that just approved the msg) ---
			await msg.fetchReactions();
			for(const old_reaction of [...msg.reactions.cache.values()]) {
				for(const old_user of [...old_reaction.users.cache.values()]) {
					if(!(await this.hasUserPreviouslyReacted({reaction: old_reaction, user: old_user, checkMsgReactions: false}))) {
						//store user's reaction right away, because we do the same in the approved collector
						await this.storeUserReaction(old_user);

						//award LLP to msg author for receiving a reaction (except on his own reaction)
						//(this goes above the continue statement below)
						is_author_connected &&
							old_user.id !== msg.author.id &&
							await this.awardAuthorReactionLLP({
								user: old_user,
								pog: `Discord <a href="${msg.url}">\
									${msg._activityType} ${this.media_type[0].toUpperCase() + this.media_type.slice(1)}</a> Received Reaction`,
							});

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
						await this.awardReactionLLP({user: old_user});
					}
				}
			}

			//remove all reactions added by the bot
			msg.reactions.cache.each(reaction => reaction.users.remove(bot.user));
			return;
		} catch(err) { return bot.logger.error(err); }
	}

	// Overwrite of parent method
    loadMessageCache(doc) {
		// load Custom cache props
		this.msg._activityType = doc.data()?.activity_type || 'Good Act';

		// load Global cache props
		return super.loadMessageCache(doc);
    }
};


