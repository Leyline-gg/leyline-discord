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

        try {
            const ll_info = await getLeylineInfo(msg.author.id);
        } catch(err) {
            if(err.code === 2) console.log(`${args.length > 0 ? 'That user has' : 'You have'} not connected ${args.length > 0 ? 'their' : 'your'} Leyline and Discord accounts`);
            this.bot.logger.error(JSON.stringify(err));
            //msg.channel.send('Error while trying to run that command');
        }
    }
}

module.exports = profile;