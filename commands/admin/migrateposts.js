const admin = require('firebase-admin');
const Command = require('../../classes/Command');
const XPService = require('../../classes/XPService');
const EmbedBase = require('../../classes/EmbedBase');

class migrateposts extends Command {
    constructor(bot) {
        super(bot, {
            name: 'migrateposts',
            description: 'Migrate posts',
            usage: '',
            aliases: [],
            category: 'admin',
        })
    }

    async run(msg, args) {
        const bot = this.bot;
        const res = {};
        const posts = await admin
            .firestore()
            .collection('discord/bot/reaction_collectors')
            .get();
        for(const post of posts.docs) {
            try {
                const p = post.data();
                if(!p.approved) continue;
                //post was approved, fetch the msg
                const ch = await bot.channels.fetch(p.channel, true, true);
                const msg = await ch.messages.fetch(post.id, true, true);
                //cap the number of posts migrated per user
                if(await XPService.getUserPosts(msg.author.id) >= 15) {
                    bot.logger.log(`Not migrating post ${post.id} because ${msg.author.tag} already has 15 posts migrated`);
                    continue;
                }
                await XPService.addPost({
                    uid: msg.author.id,
                    post_id: post.id,
                    added: post.createTime.toMillis(),
                    metadata: { 
                        migrated_on: Date.now(),
                    }
                });
                res[msg.author.id] = ++res[msg.author.id] || 1;
            } catch (err) {
                bot.logger.error(`${this.name} ERR: ${err}`);
            }
        }
        bot.sendEmbed({msg, embed: new EmbedBase(bot, {
            description: `Succesfully migrated ${Object.values(res).reduce((acc, cur) => acc + cur)} posts`,
            fields: 
                Object.entries(res).map(el => {
                    return {
                        name: `${el[1]} posts migrated`,
                        value: `for user <@!${el[0]}>`,
                        inline: false
                    };
                }),
        })});
    }
}

module.exports = migrateposts;
