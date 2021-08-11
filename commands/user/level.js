const Command = require('../../classes/Command');
const XPService = require('../../classes/XPService');
const EmbedBase = require('../../classes/EmbedBase');

class level extends Command {
    constructor(bot) {
        super(bot, {
            name: 'level',
            description: 'View your level or the level of another user',
            usage: '[@discord-user]',
            options: [
                {
                    type: 6,
                    name: 'user',
                    description: "Which user's level you want to view",
                    required: false,
                },
            ],
            category: 'user',
        });
    }

    //parse progress values to text for embed
    parseProgress({cur, max} = {}) {
        if(!max) return `${'🟩'.repeat(9)}⭐ **(MAX)**`;
        const percent = Math.round((cur / max) * 100);
        const progress = Math.floor(percent/10);
        return `${'🟩'.repeat(progress)}${'⬛'.repeat(10 - progress)} **${percent}%**`;
    }

    async run({intr, opts}) {
        const bot = this.bot;
        // Command logic
        try {
            //get the target from opts, otherwise user is checking their own profile
            let target_user = opts.getUser('user') || intr.user;

            //easter egg if user tries to check the level of the bot
            if(target_user.id === bot.user.id) return bot.intrReply({intr, content: '👀'});

            const stats = await XPService.getUserStats(target_user.id);
            const level = XPService.getUserLevelSync(stats);
            const nextlevel = XPService.getLevel(level.number + 1);
            bot.intrReply({intr, embed: new EmbedBase(bot, {
                author: {
                    name: target_user.tag,
                    icon_url: target_user.avatarURL(),
                },
                title: `**Level ${level.number}**`,
                fields: Object.entries(nextlevel?.requirements || level.requirements).map(([name, req]) => {
                    return {
                        name: `${name[0].toUpperCase() + name.slice(1)}: ${stats[name] || 0}${!!nextlevel ? `/${req}` : ''}`,
                        value: this.parseProgress({cur: stats[name] || 0, max: !!nextlevel ? req : null}),
                        inline: false
                    };
                }),
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
