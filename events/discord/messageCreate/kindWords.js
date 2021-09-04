const DiscordEvent = require("../../../classes/events/DiscordEvent");
const ReactionCollector = require('../../../classes/collectors/ReactionCollector');

export default class extends DiscordEvent {
	constructor(bot) {
		super(bot, {
			name: 'kindWords',
			description: 'Handler for kind words posted by users in a specific channel',
			event_type: 'messageCreate',
		});
	}

	async run(msg) {
		const { bot } = this;
		// Ignore messages sent by other bots or sent in DM
		if (msg.author.bot || !msg.guild) return;

		//msg needs to be in specific channel
		if (msg.channel.id !== this.target_channel) return;
		
		//create a specific instance for each approved message
		new ReactionCollector(bot, {type:ReactionCollector.Collectors.KIND_WORDS, msg}).setupModReactionCollector();
		return;
	}
};
