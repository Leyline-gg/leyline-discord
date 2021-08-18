const EmbedBase = require('./EmbedBase');
const Firebase	= require('./FirebaseAPI');
const XPService = require('./XPService');
const admin = require('firebase-admin');
const ReactionCollectorBase = require('./ReactionCollectorBase');

const REACTION_EMOJIS = [
    {
        unicode: '✅',
    },
    {
        unicode: '❌',
    },
];

class KindWordsReactionCollector extends ReactionCollectorBase {
    constructor(bot, {
		msg,
	}) {
		super(bot, {
            type: 'KIND_WORDS',
			msg,
		});
		this.msg._cache = { reacted_users: [] };
	}

    /**
     * Runs the initial setup process for a new message
	 * @param {Object} args Destructured arguments
     * @param {boolean} [args.from_firestore] whether or not the message is being loaded from Firestore
	 * @param {number} [args.duration] how long the collector should last, in ms
     * @returns {KindWordsReactionCollector} the current class, for chaining 
     */
     init({from_firestore = false, duration = this.APPROVAL_WINDOW * 3600 * 1000} = {}) {
        const bot = this.bot;
        const msg = this.msg;

        //setup first ReactionCollector for catching mod reaction
		this.collector = msg	//intentionally decreasing indentation on the following chains for readability
		.createReactionCollector({
			filter: (r, u) =>
				bot.checkMod(u.id) && REACTION_EMOJIS.some(e => e.unicode === r.emoji.name),
			time: duration,
		})
		.on('collect', async (r, u) => {
			try {
				this.collector.stop();  //stop this collector (we will create a new one later)

				if(r.emoji.name === '❌') {
					r.remove();	//remove all X's (for anti-degregation purposes)
					return this.rejectSubmission({user: u});
				}

				//store the activity type for LLP award text both locally and in the cloud
				admin.firestore().collection(`discord/bot/reaction_collectors/`)
                    .doc(msg.id)
					.set({
						approved_by: u.id,
						approved_on: Date.now(),
					}, {merge: true});

				//store the post for xp purposes
				//await XPService.addPost({
				//	uid: msg.author.id,
				//	post_id: msg.id,
				//});

				//log approval in bot log
				bot.logDiscord({
					embed: new EmbedBase(bot, {
						fields: [
							{
								name: `${this.media_type[0].toUpperCase() + this.media_type.slice(1)} Approved`,
								value: `${bot.formatUser(u)} approved the [${this.media_type}](${msg.url} 'click to view message') posted in <#${msg.channel.id}> by ${bot.formatUser(msg.author)}`
							},
						],
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
				await msg.fetchReactions();
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
				type: 'KIND_WORDS',
                channel: msg.channel.id,
				author: msg.author.id,
                approved: false,    //will be updated once approved
                expires: Date.now() + (this.APPROVAL_WINDOW * 3600 * 1000),  //1 week for mods to approve
            });
        return this;
    }
}

module.exports = KindWordsReactionCollector;
