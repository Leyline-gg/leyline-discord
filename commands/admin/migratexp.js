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
            const xpdocs = await admin.firestore()
                .collection('discord/bot/xp').get();
            const batch = admin.firestore().batch();
            for(const doc of xpdocs.docs) {
                batch.set(doc.ref, {xp:5}, {merge: true});
                const data = doc.data();
                if(migrated.has(data.uid)) continue;
                migrated.set(data.uid, (await XPService.getUserLevel(data.uid)).number);
            }

            await batch.commit();

            await admin.firestore().runTransaction(async t => {
                migrated.forEach((val, key) => {
                    t.set(admin.firestore().collection('discord/bot/users').doc(key), { level: val }, { merge: true });
                });
            });

            bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `Succesfully migrated ${migrated.size} user levels`,
                fields: 
                    migrated.map((val, key) => ({
                        name: `Level ${val}`,
                        value: `for ${bot.formatUser(bot.users.resolve(key))}`,
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
