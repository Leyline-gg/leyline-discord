const Command = require('../../classes/Command');
const XPService = require('../../classes/XPService');
const EmbedBase = require('../../classes/EmbedBase');
const { Collection } = require('discord.js');
const admin = require('firebase-admin');

class migratexp extends Command {
    constructor(bot) {
        super(bot, {
            name: 'migratexp',
            description: 'Migrates all current posts into XP. To be used once with the release of v2.0.0',
            category: 'admin',
        });
    }

    async run({intr, opts}) {
        const bot = this.bot;
        const migrated = new Collection();
        // Command logic
        try {
            const xpdocs = await admin.firestore().collection('discord/bot/xp').get();

            //convert current xp to current user level
            for(const doc of xpdocs.docs) {
                const data = doc.data();
                if(migrated.has(data.uid)) continue;
                migrated.set(data.uid, (await XPService.getUserLevelOld(data.uid)).number);
            }

            //update the level in the database for each user
            await admin.firestore().runTransaction(async t => {
                migrated.forEach((val, key) => {
                    t.set(admin.firestore().collection('discord/bot/users').doc(key), { level: val }, { merge: true });
                });
                return;
            });

            //update all the posts stored under the xp collection
            await admin.firestore().runTransaction(async t => {
                for(const doc of xpdocs.docs) {
                    const {added: timestamp, ...data} = doc.data();
                    t.set(admin.firestore().collection(XPService.COLLECTION_PATH).doc(), {
                        timestamp,
                        ...data,
                        xp: 5,
                        msg: doc.id,
                        metadata: {
                            migrated_on: Date.now(),
                        },
                    });
                }
                return;
            });

            bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `Succesfully migrated ${migrated.size} user levels`,
                fields: 
                    migrated.map((val, key) => ({
                        name: `Level ${val}`,
                        value: `for <@!${key}>`,
                        inline: false
                    })),
            })});
        } catch(err) {
            bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **Error while trying to run that command**`,
            }).Error()});
            bot.logger.error(err);
        }
    }
}

module.exports = migratexp;
