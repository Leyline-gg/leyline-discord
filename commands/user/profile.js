const Command = require('../../classes/Command');
const Firebase = require('../../classes/FirebaseAPI');
const LeylineUser = require('../../classes/LeylineUser');

class profile extends Command {
    constructor(bot) {
        super(bot, {
            name: 'profile',
            description: 'View your Leyline profile or the profile of another user',
            usage: 'profile [@discord-user]',
            aliases: [],
            category: 'user'
        });
    }

    async run(msg, args) {
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
            if(args.length > 1) return msg.channel.send('❌ Too many arguments');
            if(!!args[0]) target_user = msg.mentions.members.first();
            if(!target_user?.id) return msg.channel.send('❌ Argument must be a Discord user');

            //easter egg if user tries to check the profile of the bot
            if(target_user.id === this.bot.user.id) return msg.channel.send('My Leyline profile is beyond your capacity of comprehension');

            const user = await getLeylineInfo(target_user.id);
            const embed = {
                //title: '\u200b',
                author: {
                    name: user.username,
                    icon_url: user.avatarUrl
                },
                color: 0x2EA2E0,
                fields: [
                    {
                        name: '<:LeylineLogo:846152082226282506>  LLP Balance',
                        value: `**${user.llp}** Leyline Points\n\u200b`, /*newline for spacing*/
                        inline: true
                    },
                    {
                        name: '🎒 Inventory Size',
                        value: `**${user.inventory.length}** items collected\n\u200b`,
                        inline: true,
                    },
                    //{ name: '\u200b', value: '\u200b', inline: false },
                    {
                        name: '🩸 Blood Donated',
                        value: `**${user.stats.bloodDonationScore * 3 || 0} lives saved** - \
                                ${
                                    !!user.stats.bloodDonationRanking ? 
                                    `#${user.stats.bloodDonationRanking}/${user.stats.bloodDonationTotalUsers}` :
                                    'N/A'
                                }\n\u200b`,
                        inline: true,
                    },
                    {
                        name: '🖥️  Computing Donated',
                        value: `**${Math.round(user.stats.donatedHoursScore * 10) / 10 || 0} hours** - \
                                ${
                                    !!user.stats.donatedHoursRanking ? 
                                    `#${user.stats.donatedHoursRanking}/${user.stats.donatedHoursTotalUsers}` :
                                    'N/A'
                                }\n\u200b`,
                        inline: true,
                    },
                    //{ name: '\u200b', value: '\u200b', inline: false },
                    {
                        name: '🏃 Exercise Logged',
                        value: `**${user.stats.dailyExerciseScore || 0} days** - \
                                ${
                                    !!user.stats.dailyExerciseRanking ? 
                                    `#${user.stats.dailyExerciseRanking}/${user.stats.dailyExerciseTotalUsers}` :
                                    'N/A'
                                }\n\u200b`,
                        inline: true,
                    },
                    {
                        name: '🌙  Sleep Logged',
                        value: `**${user.stats.sleepScore || 0} nights** - \
                                ${
                                    !!user.stats.sleepRanking ? 
                                    `#${user.stats.sleepRanking}/${user.stats.sleepTotalUsers}` :
                                    'N/A'
                                }\n\u200b`,
                        inline: true,
                    },
                ],
                timestamp: new Date(),
                footer: {
                    text: 'LeylineBot', //TODO: add bot version
                    icon_url: this.bot.user.avatarURL()
                }
            };
            msg.channel.send({embed: embed});
        } catch(err) {
            if(!!err.code) 
                switch(err.code) {
                    case 2: //user tried to view their own LL profile; it was not found
                        msg.channel.send('You have not connected your Leyline & Discord accounts!\nView the tutorial on how to do so at <https://www.notion.so/leyline/How-to-Connect-Your-Discord-Leyline-Accounts-917dd19be57c4242878b73108e0cc2d1>');
                        break;
                    case 3:
                        msg.channel.send('That user has not connected their Leyline & Discord accounts');
                        break;
                        
                    default:
                        msg.channel.send('Error while trying to run that command');
                        break;
                }
            this.bot.logger.error(JSON.stringify(err));
            //msg.channel.send('Error while trying to run that command');
        }
    }
}

module.exports = profile;
