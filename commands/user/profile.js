import { Command, EmbedBase, LeylineUser, XPService } from '../../classes';
import * as Firebase from '../../api';

class profile extends Command {
    constructor() {
        super({
            name: 'profile',
            description: 'View your Leyline profile or the profile of another user',
            options: [
                {
                    type: 'USER',
                    name: 'user',
                    description: "Which user's profile you want to view",
                    required: false,
                },
            ],
            category: 'user',
            deferResponse: true,
        });
    }

    async run({intr, opts}) {
        const { bot } = this;
        // Functions
        /**
         * @returns {Promise<LeylineUser>}
         */
        const getLeylineInfo = function (discord_uid) {
            return new Promise(async (resolve, reject) => {
                if(!(await Firebase.isUserConnectedToLeyline(discord_uid)))
                    return reject({code:intr.user.id === discord_uid ? 2 : 3});

                const user = await new LeylineUser(await Firebase.getLeylineUID(discord_uid));
                resolve(user);
            });
        };

        // Command logic
        try {
            //get the target from opts, otherwise user is checking their own profile
            const target_user = opts.getUser('user') || intr.user;

            //easter egg if user tries to check the profile of the bot
            if(target_user.id === bot.user.id) return bot.intrReply({intr, content: 'My Leyline profile is beyond your capacity of comprehension'});

            const user = await getLeylineInfo(target_user.id);
            bot.intrReply({intr, embed: new EmbedBase(bot, {
                //title: 'Leyline Profile',
                url: user.profile_url,
                author: {
                    name: `${user.username} - Level ${(await XPService.getUserLevel(target_user.id)).number}`,
                    icon_url: user.avatar_url,
                    url: user.profile_url
                },
                fields: [
                    {
                        name: `${bot.config.emoji.leyline_logo}  Lifetime GP`,
                        value: `**${user.total_gp}** Good Points\n\u200b`, /*newline for spacing*/
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
                        value: `**${user.volunteer_gp || 0}** Good Points\n\u200b`,
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
                        bot.intrReply({intr, embed: new EmbedBase(bot, {
                            fields: [
                                {
                                    name: `❌ You need to Connect Your Leyline & Discord accounts!`,
                                    value: `[Click here](${bot.connection_tutorial} 'Tutorial') to the view the tutorial page`,
                                },
                            ],
                        }).Error()});
                        break;
                    case 3:
                        bot.intrReply({intr, embed: new EmbedBase(bot, {
                            description: `❌ **That user has not connected their Leyline & Discord accounts**`,
                        }).Error()});
                        break;
                        
                    default:
                        bot.intrReply({intr, embed: new EmbedBase(bot, {
                            description: `❌ **Error trying to run that command**`,
                        }).Error()});
                        break;
                }
            bot.logger.error(JSON.stringify(err));
        }
    }
}

export default profile;
