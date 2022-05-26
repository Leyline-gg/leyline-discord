import { DiscordEvent, GuildEventService } from '../../../classes';

export default class cancelAnnouncement extends DiscordEvent {
	constructor() {
		super({
			name: 'cancelAnnouncement',
			description: 'Cancel a previously scheduled announcement when guild events are deleted',
			event_type: 'guildScheduledEventDelete',
		});
	}

    async run(event) {
        GuildEventService.cancelAnnouncement(event);
    }
}
