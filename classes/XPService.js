const admin = require('firebase-admin');
const Firebase = require('./FirebaseAPI');
const EmbedBase = require('./EmbedBase');
const LeylineUser = require('./LeylineUser');

class XPService {
    static LEVELS = require('../xplevels').LEVELS;
    static ROLES = require('../xplevels').ROLES;
    static COLLECTION_PATH = 'discord/bot/xp_transactions';
    /**
     * Add an approved post to a Discord user's profile
     * @param {Object} args
     * @param {string} args.uid Discord UID
     * @param {string} args.post_id ID of the post (discord msg) that was approved
     * @param {Object} [args.metadata] Optional metadata object to include in the firestore document
     */
    static async addGoodAct({uid, post_id, timestamp = Date.now(), metadata} = {}) {
        return await admin.firestore()
            .collection(this.COLLECTION_PATH)
            .add({
                timestamp,
                uid,
                type: 'good_acts',
                xp: 5,
                msg: post_id,
                ...metadata && { metadata },    //https://www.reddit.com/r/javascript/comments/mrzrty/the_shortest_way_to_conditionally_insert/
                //if there's performance issues, this can be removed since it's notably slow
            });
    }

    //if specific requirements are required for certain posts to be accepted
    //depending on the user's level, a handler function can be created for that

    /**
     * Add an approved poll vote to a Discord user's profile
     * @param {Object} args
     * @param {string} args.uid Discord UID
     * @param {string} args.poll_id ID of the poll (discord msg) that was approved
     * @param {Object} [args.metadata] Optional metadata object to include in the firestore document
     */
     static async addPollVote({uid, poll_id, timestamp = Date.now(), metadata} = {}) {
        return await admin.firestore()
            .collection(this.COLLECTION_PATH)
            .add({
                timestamp,
                uid,
                type: 'polls',
                xp: 1,
                msg: poll_id,
                ...metadata && { metadata },    //https://www.reddit.com/r/javascript/comments/mrzrty/the_shortest_way_to_conditionally_insert/
                //if there's performance issues, this can be removed since it's notably slow
            });
    }

    /**
     * Add an approved Kind Words submission to a Discord user's profile
     * @param {Object} args
     * @param {string} args.uid Discord UID
     * @param {string} args.msg ID of the discord msg that was approved
     * @param {Object} [args.metadata] Optional metadata object to include in the firestore document
     */
     static async addKindWord({uid, msg, timestamp = Date.now(), metadata} = {}) {
        return await admin.firestore()
            .collection(this.COLLECTION_PATH)
            .add({
                timestamp,
                uid,
                type: 'kind_words',
                xp: 1,
                msg,
                ...metadata && { metadata },    //https://www.reddit.com/r/javascript/comments/mrzrty/the_shortest_way_to_conditionally_insert/
                //if there's performance issues, this can be removed since it's notably slow
            });
    }

    /**
     * Increase a user's level in Firestore, or set it to 1
     * @param {string} uid Discord UID
     */
    static async userLevelUp(uid) {
        return await admin.firestore().collection('discord/bot/users').doc(uid).update({
            level: admin.firestore.FieldValue.increment(1),
        });
    }

    /**
     * 
     * @param {string} uid Discord UID
     */
    static async getUserPosts(uid) {
        return (await admin
			.firestore()
			.collection(this.COLLECTION_PATH)
			.where('uid', '==', uid)
            .where('type', '==', 'posts')
			//.where('created', '>', snapshotTime)
			.get()).size;
    }

    /**
     * 
     * @param {string} uid Discord UID
     */
     static async getUserXP(uid) {
        return (await admin
			.firestore()
			.collection(this.COLLECTION_PATH)
			.where('uid', '==', uid)
			//.where('created', '>', snapshotTime)
			.get()).docs.reduce((acc, cur) => acc + (cur.data()?.xp || 0), 0);
    }
    
    /**
     * Get a user's XP stats for different metrics, excluding their level
     * @param {string} uid Discord UID 
     */
    static async getUserStats(uid) {
        const posts = await this.getUserPosts(uid);
        return {
            posts,
            xp: await this.getUserXP(uid),
        };
    }

    /**
     * Asynchronously get a user's level by passing in their discord UID
     * @param {string} uid Discord UID
     * @returns user level object (see `this.LEVELS`)
     */
    static async getUserLevel(uid) {
        // I want to implement caching using a Collection<id, level> at some point
        
        //check database to see if user has a level as part of their doc
        const db_lvl = (await admin.firestore().collection('discord/bot/users').doc(uid).get()).data()?.level || 0;
        return this.LEVELS.find(l => l.number === db_lvl);

        //no db lvl? get the user's stats and use that to determine their lvl
        const xp = await this.getUserXP(uid);
        return this.LEVELS.filter(l => xp >= l.xp).pop()
    }

    /**
     * Get the level object with the given number; `undefined` if it doesn't exist
     * @param {Number} number number of the level to get 
     * @returns user level object (see `this.LEVELS`)
     */
    static getLevel(number) {
        return this.LEVELS.find(l => l.number === number);
    }


    // -------- Award Methods --------
    // Methods called for distributing rewards
    // Referenced in xplevels.js
    // * All parameters need to be destructured *
    static awardRole({member, bot, level, role_id} = {}) {
        //remove old roles
        for(const id of this.ROLES)
            id != role_id && member.roles.cache.has(id) && member.roles.remove(id, `User Reached Level ${level.number}`);
        
        if(member.roles.cache.has(role_id)) 
            return bot.logDiscord({embed: new EmbedBase(bot, {
                fields: [{
                    name: '❌ Reward Not Distributed',
                    value: `I tried to give ${bot.formatUser(member.user)} the <@&${role_id}> role for reaching level ${level.number}, but they already had it`
                }]
            }).Error()});
        return member.roles.add(role_id, `User Reached Level ${level.number}`)
            .then(m => bot.logDiscord({embed: new EmbedBase(bot, {
                fields: [{
                    name: 'Reward Distributed',
                    value: `I gave ${bot.formatUser(m.user)} the <@&${role_id}> role for reaching level ${level.number}`
                }]
            })}))
            .catch(e => {
                bot.logger.error(e);
                bot.logDiscord({embed: new EmbedBase(bot, {
                    fields: [{
                        name: '❌ Reward Not Distributed',
                        value: `I tried to give ${bot.formatUser(member.user)} the <@&${role_id}> role for reaching level ${level.number}, but I encountered an error`
                    }],
                }).Error()
            })});
    }

    static async awardNFT({member, bot, level, rarity}) {
        //ensure account is connected
        if(!(await Firebase.isUserConnectedToLeyline(member.id))) {
            bot.logDiscord({embed: new EmbedBase(bot, {
                fields: [{
                    name: '❌ Reward Not Distributed',
                    value: `I tried to give ${bot.formatUser(member.user)} a ${rarity.toLowerCase()} NFT for reaching level ${level.number}, but they have not connected their Leyline & Discord accounts`
                }]
            }).Error()});
            bot.sendDM({user: member.user, embed: new EmbedBase(bot, {
                fields: [
                    {
                        name: `❌ You need to Connect Your Leyline & Discord accounts!`,
                        value: `I tried to give you a ${rarity.toLowerCase()} NFT for reaching level ${level.number}, but because you have not connected your Discord & Leyline accounts, I couldn't award you the NFT!
                        [Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
                    },
                ],	
            }).Error()});
            return;
        }
        const lluser = await new LeylineUser(await Firebase.getLeylineUID(member.id));

        //get random NFT of rarity
        const nft = await Firebase.getRandomNFT({rarity: rarity});
        if(!nft?.id) return bot.logger.error(`I tried to generate a NFT for ${member.toString()} reaching level ${level.number}, but the api returned null`);

        try {
            //Award NFT to LL user
            await Firebase.rewardNFT(lluser.uid, nft.id);
            //Message user
            bot.sendDM({user: member.user, embed: new EmbedBase(bot, {
                thumbnail: { url: nft.thumbnailUrl },
                fields: [
                    {
                        name: `🎉 You Earned A NFT!`,
                        value: `Congratulations on reaching level ${level.number}! To celebrate, you have been awarded a(n) ${rarity.toLowerCase()} **${nft.name}**!`
                    },
                ],	
            })});
            //Generate embed, Log success
            const reward_embed = new EmbedBase(bot, {
                thumbnail: { url: nft.thumbnailUrl },
                title: 'NFT Awarded',
                fields: [
                    {
                        name: `Leyline User`,
                        value: `[${lluser.username}](${lluser.profile_url})`,
                        inline: true
                    },
                    {
                        name: `Discord User`,
                        value: bot.formatUser(member.user),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                    {
                        name: `NFT Info`,
                        value: `${nft.name} (\`${nft.id}\`)`,
                        inline: true
                    },
                    {
                        name: `Reason`,
                        value: `User reached level ${level.number}`,
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            });
            bot.logDiscord({embed: reward_embed});
            bot.logReward({embed: reward_embed});
        } catch(err) {
            bot.logger.error(`Error awarding NFT with id ${nft.id} to LL user ${lluser.uid} for leveling up`);
            bot.logger.error(err);
            bot.logDiscord({embed: new EmbedBase(bot, {
                thumbnail: { url: nft.thumbnailUrl },
                title: 'NFT __NOT__ Awarded',
                description: `**Error**: ${err}`,
                fields: [
                    {
                        name: `Leyline User`,
                        value: `[${lluser.username}](${lluser.profile_url})`,
                        inline: true
                    },
                    {
                        name: `Discord User`,
                        value: bot.formatUser(member.user),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                    {
                        name: `NFT Info`,
                        value: `${nft.name} (\`${nft.id}\`)`,
                        inline: true
                    },
                    {
                        name: `Reason`,
                        value: `User reached level ${level.number}`,
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            }).Error()});
        }
    }
}

module.exports = XPService;
