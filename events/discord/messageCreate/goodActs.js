const DiscordEvent = require("../../../classes/events/DiscordEvent");
const EmbedBase = require("../../../classes/components/EmbedBase");
const ReactionCollector = require('../../../classes/collectors/ReactionCollector');
const Firebase = require('../../../classes/FirebaseAPI');

module.exports = class extends DiscordEvent {
	constructor(bot) {
		super(bot, {
			name: 'goodActs',
			description: 'Handler for good acts posted by users in a specific channel',
			event_type: 'messageCreate',
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
		const { bot } = this;
		// Ignore messages sent by other bots or sent in DM
		if (msg.author.bot || !msg.guild) return;

		//msg needs to be in specific channel
		if (msg.channel.id !== this.target_channel) return;

		//msg needs to be an image or video file
		if (msg.attachments.size < 1) return;
		if (!msg.attachments.every((attachment) => this.validateAttachment(attachment.url)))
			return bot.logger.debug(
				`${this.name} event rejected msg ${msg.id} by ${msg.author.tag} because it did not contain valid attachments`
			);

		//If user has not connected Discord & Leyline accts, send DM before proceeding
		if(!(await Firebase.isUserConnectedToLeyline(msg.author.id)))
			bot.sendDM({
				user: msg.author,
				embed: new EmbedBase(bot, {
					fields:[{
						name: `Thank you for your submission!`,
						value: `Please remember to connect your Leyline & Discord accounts so you can receive LLP if your [submission](${msg.url}) is approved!
							[Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial.`,
					}],
				}),
			});
		
		//create a specific instance for each approved message
		new ReactionCollector(bot, {type:ReactionCollector.Collectors.GOOD_ACTS, msg}).setupModReactionCollector().createThread();
		return;
	}
};
