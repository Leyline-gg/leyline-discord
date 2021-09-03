const Command = require('../../classes/Command');
const XPService = require('../../classes/services/XPService');
const EmbedBase = require('../../classes/components/EmbedBase');

class level extends Command {
    constructor(bot) {
        super(bot, {
            name: 'level',
            description: 'View your level or the level of another user',
            options: [
                {
                    type: 'USER',
                    name: 'user',
                    description: "Which user's level you want to view",
                    required: false,
                },
            ],
            category: 'user',
            deferResponse: true,
        });
    }

    //parse progress values to text for embed
    parseProgress({cur, max} = {}) {
        if(!max) return `${'🟩'.repeat(9)}⭐ **(MAX)**`;
        const percent = Math.round((cur / max) * 100);
        let progress = Math.floor(percent/10);
        if(progress > 10) progress = 10;    // user will appear to have the maximum value
        return `${'🟩'.repeat(progress)}${'⬛'.repeat(10 - progress)} **${percent}%**`;
    }

    async run({intr, opts}) {
        const { bot } = this;
        // Command logic
        try {
            //get the target from opts, otherwise user is checking their own profile
            let target_user = opts.getUser('user') || intr.user;

            //easter egg if user tries to check the level of the bot
            if(target_user.id === bot.user.id) return bot.intrReply({intr, content: '👀'});

            const xp = await XPService.getUserXP(target_user.id);
            const level = await XPService.getUserLevel(target_user.id);
            const nextlevel = XPService.getLevel(level.number + 1);
            bot.intrReply({intr, embed: new EmbedBase(bot, {
                author: {
                    name: target_user.tag,
                    icon_url: target_user.avatarURL(),
                },
                title: `**Level ${level.number}**`,
                fields: [{
                    name: `XP: ${xp}${!!nextlevel ? `/${nextlevel.xp}` : ''}`,
                    value: this.parseProgress({cur: xp, max: nextlevel?.xp || null}),
                }],
            })});
        } catch(err) {
            bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **Error while trying to run that command**`,
            }).Error()});
            bot.logger.error(err);
        }
    }
}

module.exports = level;
