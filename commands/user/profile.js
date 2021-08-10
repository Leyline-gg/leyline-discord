const Command = require('../../classes/Command');
const Firebase = require('../../classes/FirebaseAPI');
const XPService = require('../../classes/XPService');
const LeylineUser = require('../../classes/LeylineUser');
const EmbedBase = require('../../classes/EmbedBase');

class profile extends Command {
    constructor(bot) {
        super(bot, {
            name: 'profile',
            description: 'View your Leyline profile or the profile of another user',
            options: [
                {
                    type: 6,
                    name: 'user',
                    description: "Which user's profile you want to view",
                    required: false,
                },
            ],
            aliases: [],
            category: 'user',
        });
    }

    async run(msg, args) {
        const bot = this.bot;
        // Functions
        /**
         * @returns {Promise<LeylineUser>}
         */
        const getLeylineInfo = function (discord_uid) {
            return new Promise(async (resolve, reject) => {
                if(!(await Firebase.isUserConnectedToLeyline(discord_uid)))
                    return reject({code:msg.author.id === discord_uid ? 2 : 3});

                const user = await new LeylineUser(await Firebase.getLeylineUID(discord_uid));
                resolve(user);
            });
        };

        // Command logic
        try {
            //break down args, look for a single user
            let target_user = msg.author;   //assume user is checking their own profile
            if(args.length > 1) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                    description: `❌ **Too many arguments**`,
                }).Error()});
            if(!!args[0]) target_user = await bot.users.fetch(args.shift().match(/\d+/g)?.shift()).catch(() => undefined);
            if(!target_user?.id) return bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                    description: `❌ **Argument must be a Discord user**`,
                }).Error()});

            //easter egg if user tries to check the profile of the bot
            if(target_user.id === bot.user.id) return msg.channel.send('My Leyline profile is beyond your capacity of comprehension');

            msg.channel.sendTyping();

            const user = await getLeylineInfo(target_user.id);
            bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                //title: 'Leyline Profile',
                url: user.profile_url,
                author: {
                    name: `${user.username} - Level ${(await XPService.getUserLevel(target_user.id)).number}`,
                    icon_url: user.avatar_url,
                    url: user.profile_url
                },
                fields: [
                    {
                        name: `${bot.config.emoji.leyline_logo}  Lifetime LLP`,
                        value: `**${user.total_llp}** Leyline Points\n\u200b`, /*newline for spacing*/
                        inline: true,
                    },
                    {
                        name: '🎒 Inventory Size',
                        value: `**${user.inventory.length}** items collected\n\u200b`,
                        inline: true,
                    },
                    //{ name: '\u200b', value: '\u200b', inline: false },
                    {
                        name: '🩸 Blood Donated',
                        value: `**${user.rankings.bloodDonationScore * 3 || 0} lives saved** - \
                                ${
                                    !!user.rankings.bloodDonationRanking ? 
                                    `#${user.rankings.bloodDonationRanking}/${user.rankings.bloodDonationTotalUsers}` :
                                    'N/A'
                                }\n\u200b`,
                        inline: true,
                    },
                    {
                        name: '🖥️  Computing Donated',
                        value: `**${Math.round(user.rankings.donatedHoursScore * 10) / 10 || 0} hours** - \
                                ${
                                    !!user.rankings.donatedHoursRanking ? 
                                    `#${user.rankings.donatedHoursRanking}/${user.rankings.donatedHoursTotalUsers}` :
                                    'N/A'
                                }\n\u200b`,
                        inline: true,
                    },
                    //{ name: '\u200b', value: '\u200b', inline: false },
                    {
                        name: '🏃 Exercise Logged',
                        value: `**${user.rankings.dailyExerciseScore || 0} days** - \
                                ${
                                    !!user.rankings.dailyExerciseRanking ? 
                                    `#${user.rankings.dailyExerciseRanking}/${user.rankings.dailyExerciseTotalUsers}` :
                                    'N/A'
                                }\n\u200b`,
                        inline: true,
                    },
                    {
                        name: '🌙  Sleep Logged',
                        value: `**${user.rankings.sleepScore || 0} nights** - \
                                ${
                                    !!user.rankings.sleepRanking ? 
                                    `#${user.rankings.sleepRanking}/${user.rankings.sleepTotalUsers}` :
                                    'N/A'
                                }\n\u200b`,
                        inline: true,
                    },
                    {
                        name: '👍  Discord Good Acts',
                        value: `**${await XPService.getUserPosts(target_user.id) || 0}** Posts Approved\n\u200b`,
                        inline: true,
                    },
                    //{ name: '\u200b', value: '\u200b', inline: false },
                    {
                        name: '🙏  Discord Moral Support',
                        value: `**${await Firebase.getDiscordReactions(target_user.id) || 0}** Reactions Given\n\u200b`,
                        inline: true,
                    },
                    {
                        name: '👤  Leyline Volunteering',
                        value: `**${user.volunteer_llp || 0}** Leyline Points\n\u200b`,
                        inline: true,
                    },
                    {
                        name: `Want to see more?`,
                        value: `Check out my good deeds and NFTs on my [Leyline Profile](${user.profile_url})`,
                        inline: false,
                    },
                ],
            })});
        } catch(err) {
            if(!!err.code) 
                switch(err.code) {
                    case 2: //user tried to view their own LL profile; it was not found
                        bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                            fields: [
                                {
                                    name: `❌ You need to Connect Your Leyline & Discord accounts!`,
                                    value: `[Click here](${bot.connection_tutorial} 'Tutorial') to the view the tutorial page`,
                                },
                            ],
                        }).Error()});
                        break;
                    case 3:
                        bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                            description: `❌ **That user has not connected their Leyline & Discord accounts**`,
                        }).Error()});
                        break;
                        
                    default:
                        bot.sendEmbed({msg, embed: new EmbedBase(bot, {
                            description: `❌ **Error trying to run that command**`,
                        }).Error()});
                        break;
                }
            bot.logger.error(err);
        }
    }
}

module.exports = profile;
