const admin = require('firebase-admin');
const Firebase = require('./FirebaseAPI');
const EmbedBase = require('./EmbedBase');
const LeylineUser = require('./LeylineUser');

class XPService {
    static LEVELS = require('../xplevels').LEVELS;
    static ROLES = require('../xplevels').ROLES;
    static COLLECTION_PATH = 'discord/bot/xp';
    /**
     * Add an approved post to a Discord user's profile
     * @param {Object} args
     * @param {string} args.uid Discord UID
     * @param {string} args.post_id ID of the post (discord msg) that was approved
     * @param {Object} [args.metadata] Optional metadata object to include in the firestore document
     */
    static async addPost({uid, post_id, added = Date.now(), metadata} = {}) {
        return await admin.firestore()
            .collection(this.COLLECTION_PATH)
            .doc(post_id)
            .set({
                added,
                //added: Date.now(),
                uid,
                type: 'posts',
                ...metadata && { metadata },    //https://www.reddit.com/r/javascript/comments/mrzrty/the_shortest_way_to_conditionally_insert/
                //if there's performance issues, this can be removed since it's notably slow
            });
    }

    //if specific requirements are required for certain posts to be accepted
    //depending on the user's level, a handler function can be created for that

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
     * Get a user's XP stats for different metrics, excluding their level
     * @param {string} uid Discord UID 
     */
    static async getUserStats(uid) {
        return {
            posts: await this.getUserPosts(uid),
        };
        /*
        return {
            ...res,
            level: this.LEVELS.filter(l => {
                //ALL metrics need to be at or above the minimum requirement
                for(const metric of Object.keys(res))
                    if(res[metric] < l.requirements[metric])
                        return false;   //if any metric is less than requirement, all requirements fail
                return true;
            }).pop(),
        }
        */
    }

    /**
     * Asynchronously get a user's level by passing in their discord UID
     * @param {string} uid Discord UID
     */
    static async getUserLevel(uid) {
        const stats = await this.getUserStats(uid);
        return this.LEVELS.filter(l => {
            //ALL metrics need to be at or above the minimum requirement
            for(const metric of Object.keys(l.requirements))
                //if the metric does not exist for the user, return false
                if(!stats.hasOwnProperty(metric)) return false;
                else if(stats[metric] < l.requirements[metric])
                    return false;   //if any metric is less than requirement, all requirements fail
            return true;
        }).pop();
    }

    /**
     * Synchronously get a user's level by passing in their stats object
     * @param {Object} stats User stats obj, retrieved from `getUserStats()`
     */
    static getUserLevelSync(stats) {
        return this.LEVELS.filter(l => {
            //ALL metrics need to be at or above the minimum requirement
            for(const metric of Object.keys(l.requirements))
                //if the metric does not exist for the user, return false
                if(!stats.hasOwnProperty(metric)) return false;
                else if(stats[metric] < l.requirements[metric])
                    return false;   //if any metric is less than requirement, all requirements fail
            return true;
        }).pop();
    }

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
                        value: `I tried to give ${bot.formatUser(member.user)} the <@&${role_id}> role for reaching ${level.number}, but I encountered an error`
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
            member.send({ embed: new EmbedBase(bot, {
                fields: [
                    {
                        name: `❌ You need to Connect Your Leyline & Discord accounts!`,
                        value: `I tried to give you a ${rarity.toLowerCase()} NFT for reaching level ${level.number}, but because you have not connected your Discord & Leyline accounts, I couldn't award you the NFT!
                        [Click here](${bot.connection_tutorial} 'How to connect your accounts') to view the account connection tutorial`,
                    },
                ],	
            }).Error()})
                .catch(() => bot.sendDisabledDmMessage(member));
        }
        const lluser = await new LeylineUser(await Firebase.getLeylineUID(member.id));

        //get random NFT of rarity
        const nft = await Firebase.getRandomNFT({rarity: rarity});
        if(!nft?.id) return bot.logger.error(`I tried to generate a NFT for ${member.toString()} reaching level ${level.number}, but the api returned null`);

        try {
            //Award NFT to LL user
            await Firebase.rewardNFT(lluser.uid, nft.id);
            //Message user
            member.send({embed: new EmbedBase(bot, {
                thumbnail: { url: nft.thumbnailUrl },
                fields: [
                    {
                        name: `🎉 You Earned A NFT!`,
                        value: `Congratulations on reaching level ${level.number}! To celebrate, you have been awarded a(n) ${rarity.toLowerCase()} **${nft.name}**!`
                    },
                ],	
            })}).catch(() => bot.sendDisabledDmMessage(member));
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
