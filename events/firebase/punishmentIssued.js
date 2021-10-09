import { FirebaseEvent, PunishmentService } from '../../classes';
import * as schedule from "node-schedule";

class PunishmentIssued extends FirebaseEvent {
    constructor(bot) {
        super(bot, {
            name: 'PunishmentIssued',
            description: 'Setup cron jobs when new punishments are created while the bot is online',
            collection: 'discord/bot/punishments'
        });
    }

    /**
     * 
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     */
    async onAdd(doc) {
        const { bot } = this;
        const data = doc.data();
        // If no expiration, exit
        // Check punishment type
        // Create scheduled job
        if(!data.expires) return;
        switch(data.type) {
            case PunishmentService.PUNISHMENT_TYPES.BAN: {
                //create job
                const job = schedule.scheduleJob(new Date(data.expires), (fire_date) => {
                    bot.logger.debug(`Unban for punishment ${doc.id} scheduled for ${fire_date} is happening at ${new Date()}`);
                    PunishmentService.unbanUser({bot, doc});
                });
                bot.logger.log(`Unban for punishment ${doc.id} scheduled for ${job.nextInvocation()}`);
                break;
            }
            case PunishmentService.PUNISHMENT_TYPES.MUTE: {
                const job = schedule.scheduleJob(new Date(data.expires), (fire_date) => {
                    bot.logger.debug(`Unmute for punishment ${doc.id} scheduled for ${fire_date} is happening at ${new Date()}`);
                    PunishmentService.unmuteUser({bot, doc});
                });
                bot.logger.log(`Unmute for punishment ${doc.id} scheduled for ${job.nextInvocation()}`);
                break;
            }
            default:
                return;
        }
    }
}

export default PunishmentIssued;
