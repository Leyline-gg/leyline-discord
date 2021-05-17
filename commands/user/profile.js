const Command = require('../../classes/Command');
const admin = require('firebase-admin');

class profile extends Command {
    constructor(bot) {
        super(bot, {
            name: 'profile',
            description: 'View your Leyline profile or the profile of another user',
            usage: 'profile [@discord-user]',
            aliases: [],
            category: 'user'
        })
    }

    async run(msg, args) {
        // Functions
        const getLeylineInfo = function (discord_uid) {
            const getLeylineAvatarUrl = async function (uid) {
                let url = 'https://i.ibb.co/qBBpDdh/avatar-default.png';  //default avatar
                const inv = await admin.firestore().collection(`users/${uid}/inventory`).get();
                if(inv.empty) return url;
                
                for(const item of inv.docs) 
                    //is item an avatar and is it equipped?
                    if(item.data()?.isEquipped && item.data()?.equipSlot === 'SKIN') {
                        //get the item's avatar url
                        const item_doc = await admin.firestore().doc(`items/${item.data()?.id}`).get();

                        url = item_doc.data()?.avatarUrl || url;
                        break;
                    }
                return url;
            };

            return new Promise(async (resolve, reject) => {
                const discord_doc = await admin.firestore().doc(`discord/bot/users/${discord_uid}`).get();
                if(!discord_doc.exists) return reject({code:2});
                if(!discord_doc.data()?.leylineUID) return reject({code:2});
                //this rejects are not stopping the code from continuing to run
                
                const leyline_doc = await admin.firestore().doc(`users/${discord_doc.data().leylineUID}`).get();
                resolve({
                    leylineUID: discord_doc.data().leylineUID,
                    llp: leyline_doc.data().balance_snapshot.snapshot_value,
                    username: leyline_doc.data().username || 'No username set',
                    avatarUrl: await getLeylineAvatarUrl(discord_doc.data().leylineUID)
                });
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

            const ll_info = await getLeylineInfo(target_user.id);
            const embed = {
                title: ll_info.username,
                thumbnail: {
                    url: ll_info.avatarUrl
                },
                fields: [
                    {
                        name: 'LLP Balance',
                        value: ll_info.llp
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: 'LeylineBot'  //TODO: add bot version
                }
            };
            msg.channel.send({embed: embed});
        } catch(err) {
            if(err.code === 2) msg.channel.send(`❌ ${!!args[0] ? 'That user has' : 'You have'} not connected ${!!args[0] ? 'their' : 'your'} Leyline and Discord accounts`);
            this.bot.logger.error(JSON.stringify(err));
            //msg.channel.send('Error while trying to run that command');
        }
    }
}

module.exports = profile;