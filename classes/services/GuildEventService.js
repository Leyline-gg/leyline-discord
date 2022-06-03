import { scheduleJob } from "node-schedule";
import bot from "../../bot";
import { CloudConfig } from "../CloudConfig";

export class GuildEventService {
    static get SCHEDULED_ANNOUNCEMENT_INTERVAL() { return CloudConfig.get('GuildEvent').scheduled_announcement_interval; }
    static scheduled_announcements = new Map();

    static scheduleAnnouncement(event) {
        this.scheduled_announcements.set(
            event.id,
            scheduleJob(
                event.scheduledStartAt - this.SCHEDULED_ANNOUNCEMENT_INTERVAL,
                () => this.announceEvent(event)
            )
        );
    }

    static cancelAnnouncement(event) {
        const job = this.scheduled_announcements.get(event.id);
        !!job && job.cancel();
        this.scheduled_announcements.delete(event.id);
    }

    static announceEvent(event) {
        const msg = `<@&${bot.config.roles.event_announcements}> **Upcoming Event Reminder:**\n${event.url}`;

        bot.sendAnnouncement({content: msg});

        this.scheduled_announcements.delete(event.id);
    }
}
