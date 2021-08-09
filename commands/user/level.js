const Command = require('../../classes/Command');
const XPService = require('../../classes/XPService');
const EmbedBase = require('../../classes/EmbedBase');

class level extends Command {
    constructor(bot) {
        super(bot, {
            name: 'level',
            description: 'View your level or the level of another user',
            usage: '[@discord-user]',
            aliases: [],
            category: 'user'
        });
    }

    //parse progress values to text for embed
    parseProgress({cur, max} = {}) {
        if(!max) return `${'🟩'.repeat(9)}⭐ **(MAX)**`;
        const percent = Math.round((cur / max) * 100);
        const progress = Math.floor(percent/10);
        return `${'🟩'.repeat(progress)}${'⬛'.repeat(10 - progress)} **${percent}%**`;
    }

    async run(msg, args) {
        const bot = this.bot;

        // Command logic
        try {
            //break down args, look for a single user
            let target_user = msg.author;   //assume user is checking their own level
            if(args.length > 1) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                    description: `❌ **Too many arguments**`,
                }).Error()});
            if(!!args[0]) target_user = await bot.users.fetch(args.shift().match(/\d+/g)?.shift()).catch(() => undefined);
            if(!target_user?.id) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                    description: `❌ **Argument must be a Discord user**`,
                }).Error()});

            //easter egg if user tries to check the level of the bot
            if(target_user.id === bot.user.id) return msg.channel.send('👀');

            const stats = await XPService.getUserStats(target_user.id);
            const level = XPService.getUserLevelSync(stats);
            const nextlevel = XPService.getLevel(level.number + 1);
            bot.sendEmbed({msg, embed: new EmbedBase(bot, {
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
            bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                description: `❌ **Error while trying to run that command**`,
            }).Error()});
                        
            bot.logger.error(err);
        }
    }
}

module.exports = level;
