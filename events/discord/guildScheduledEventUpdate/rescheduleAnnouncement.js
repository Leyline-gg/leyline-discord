import { DiscordEvent, GuildEventService } from '../../../classes';

export default class rescheduleAnnouncement extends DiscordEvent {
	constructor() {
		super({
			name: 'rescheduleAnnouncement',
			description: 'Reschedule an announcement when guild events are updated',
			event_type: 'guildScheduledEventUpdate',
		});
	}

    async run(old_event, new_event) {
		GuildEventService.cancelAnnouncement(old_event);
        GuildEventService.scheduleAnnouncement(new_event);
    }
}
