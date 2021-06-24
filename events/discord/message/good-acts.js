const DiscordEvent = require("../../../classes/DiscordEvent");
const GoodActsReactionCollector = require('../../../classes/GoodActsReactionCollector');

const target_channel 	= '840679701118189579';	//channel to watch for events

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
		new GoodActsReactionCollector(bot, msg).init();
		return;
	}
};
