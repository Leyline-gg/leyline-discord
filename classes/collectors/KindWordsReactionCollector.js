import * as Firebase from '../../api';
import { EmbedBase, XPService, ReactionCollectorBase, CloudConfig } from '..';

export class KindWordsReactionCollector extends ReactionCollectorBase {
	//override parent properties
	get REACTION_LLP() { return CloudConfig.get('ReactionCollector').KindWords.REACTION_LLP; }
	get APPROVAL_LLP() { return CloudConfig.get('ReactionCollector').KindWords.APPROVAL_LLP; }
	get MOD_EMOJIS() { return CloudConfig.get('ReactionCollector').KindWords.MOD_EMOJIS; }
	constructor(bot, {
		msg,
	}) {
		super(bot, {
			type: 'KIND_WORDS',
			msg,
		});
		this.msg._cache = { reacted_users: [] }; 
	}

	// Callback specific to this Collector class
	async reactionReceived({reaction, user}) {
        //No specific implementation
		return;
	}

    // Callback specific to this Collector class
	async approveSubmission({user, reaction}) {
		const { bot, msg } = this;
		try {
			await Firebase.approveCollector({collector: this, user});

			//store the post for xp purposes
			await XPService.addKindWord({
				uid: msg.author.id,
				msg: msg.id,
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
				pog: `Discord <a href="${msg.url}">Kind Words</a> Shared`,
			});

			// ---  Give LLP to the users that have already reacted   ---
			// --- (this includes the mod that just approved the msg) ---
			await msg.fetchReactions();
			for (const old_reaction of [...msg.reactions.cache.values()]) {
				for(const old_user of [...(await old_reaction.users.fetch()).values()]) {
					if(!(await this.hasUserPreviouslyReacted({reaction: old_reaction, user: old_user, checkMsgReactions: false}))) {
						//store user's reaction right away, because we do the same in the approved collector
						await this.storeUserReaction(old_user);

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
}


