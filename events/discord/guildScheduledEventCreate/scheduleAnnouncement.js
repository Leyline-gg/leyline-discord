import { DiscordEvent, GuildEventService } from '../../../classes';

export default class scheduleAnnouncement extends DiscordEvent {
	constructor() {
		super({
			name: 'scheduleAnnouncement',
			description: 'Schedule an announcement when guild events are created',
			event_type: 'guildScheduledEventCreate',
		});
	}

    async run(event) {
        GuildEventService.scheduleAnnouncement(event);
    }
}
