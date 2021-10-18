import admin from 'firebase-admin';
import { scheduleJob } from 'node-schedule';
import { EmbedBase } from '..';

export class SentenceService {
    static COLLECTION_PATH  = 'discord/bot/sentences';
    static SENTENCE_TYPES = {
        WARN: 'WARN',
        MUTE: 'MUTE',
        KICK: 'KICK',
        BAN: 'BAN',
    };

    /**
     * Record a sentence in firestore
     * @param {Object} args Destructured args
     * @param {string} args.uid Target user id
     * @param {User} args.mod `User` object of staff that is issuing sentence
     * @param {string} args.type See `SENTENCE_TYPES`. Type of sentence
     * @param {number} [args.expires] Unix timestamp for when sentence should expire. `null` if no expiration
     * @param {string} [args.reason] Mod-provided reason for why sentence was issued. `null` if no reason
     * @param {number} [args.timestamp] Unix timestamp of when sentence was issued. Defaults to `Date.now()`
     * @param {Object} [args.metadata] Metadata to be included in Firestore doc
     * @returns Resolves to added doc
     */
    static async recordSentence({uid, mod, type, expires=null, reason=null, timestamp=Date.now(), metadata=null} = {}) {
        return await admin.firestore()
            .collection(this.COLLECTION_PATH)
            .add({
                timestamp,
                uid,
                issued_by: mod.id,
                type,       
                expires,   //this can be null
                reason,     //this can be null
                ...metadata && { metadata },    //https://www.reddit.com/r/javascript/comments/mrzrty/the_shortest_way_to_conditionally_insert/
                //if there's performance issues, this can be removed since it's notably slow
            });
    }

    /**
     * Log a sentence in the appropriate Discord channels 
     * AND send a message to the end user
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being sentenced
     * @param {User} args.mod `User` object of staff that is issuing sentence
     * @param {string} args.type See `SENTENCE_TYPES`. Type of sentence
     * @param {number} [args.expires] Unix timestamp for when sentence should expire. `null` if no expiration
     * @param {string} [args.reason] Mod-provided reason for why sentence was issued. `null` if no reason
     * @param {number} [args.timestamp] Unix timestamp of when sentence was issued. Defaults to `Date.now()`
     * @returns Resolves to added doc
     */
    static async logSentence({bot, user, mod, type, expires=null, reason=null, timestamp=Date.now()} = {}) {
        const { SENTENCE_TYPES: SENTENCE_TYPES } = this;
        const embed = new EmbedBase(bot, {
            title: 'Justice Served',
            fields: [
                {
                    name: 'Type',
                    value: type,
                    inline: true,
                },
                {
                    name: 'Issued By',
                    value: bot.formatUser(mod),
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: 'Reason',
                    value: reason ?? 'No reason given',
                    inline: true,
                },
                {
                    name: 'Expires',
                    value: !!expires ? bot.formatTimestamp(expires) : 'No expiration',
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: 'Current Warnings',
                    value: `${(await this.getHistory({
                        user,
                        types: [SENTENCE_TYPES.WARN],
                    })).length} Warnings`,
                    inline: true,
                },
                {
                    name: 'Target',
                    value: bot.formatUser(user),
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true }
            ],
            timestamp,
        }).Sentence();
        
        //Message user
        await bot.sendDM({send_disabled_msg: false, user, embed});

        //log publicly
        if(type === SENTENCE_TYPES.BAN)
            await bot.logSentence({embed});
        //log privately
        await bot.logDiscord({embed});
    }

    /**
     * Schedule removal of a temporary sentence.
     * 
     * Data should be pre-fetched Firestore doc data, 
     * or locally cached data reconstructed to match params
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {string} args.id Sentence ID retrieved from the Firestore `DocumentSnapshot`
     * @param {Object} args.data Pre-fetched sentence data
     * @param {string} args.data.type See `SENTENCE_TYPES`. Type of sentence
     * @param {string} args.data.uid Target Discord user ID
     * @param {string} args.data.issued_by ID of Discord Mod that issued the sentence
     * @param {number} args.data.expires Unix timestamp of sentence expiration
     * @param {string} [args.data.reason] Reason sentence was issued
     * @returns {SentenceService} Resolves to this class
     */
    static scheduleRemoval({bot, id, data}) {
        const { SENTENCE_TYPES: types } = this; 
        // If no expiration, exit
        // Check sentence type
        // Create scheduled job
        if(!data.expires) return;
        const job = scheduleJob(new Date(data.expires), (fire_date) => {
            bot.logger.debug(`un${data.type} for sentence ${id} scheduled for ${fire_date} triggered at ${new Date()}`);
            switch(data.type) {
                case types.BAN: {
                    this.unbanUser({bot, id, ...data});
                    break;
                }
                case types.MUTE: {
                    this.unmuteUser({bot, id, ...data});
                    break;
                }
            }
        });
        bot.logger.log(`un${data.type} for sentence ${id} scheduled for ${job.nextInvocation()}`);

        return this;
    }

    /**
     * Issue a WARN sentence to a user. 
     * Discord logging should be handeled separately
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being sentenced
     * @param {User} args.mod `User` object of staff that is issuing sentence
     * @param {string} [args.reason] Mod-provided reason for why sentence was issued. `null` if no reason
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
     static async warnUser({bot, user, mod, reason=null} = {}) {
        const type = this.SENTENCE_TYPES.WARN;
        const member = await bot.leyline_guild.members.fetch({
            user,
            force: true,
        });
        if(!member) throw new Error(`I could not find member ${user.id} in the server!`);

        //issue sentence (log in cloud)
        //store sentence in cloud
        await this.recordSentence({
            uid: user.id,
            mod,
            type,
            reason,
        });

        //no need to schedule removal

        return true;
    }

    /**
     * Issue a MUTE sentence to a user. 
     * Discord logging should be handeled separately
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being sentenced
     * @param {User} args.mod `User` object of staff that is issuing sentence
     * @param {number} [args.expires] Unix timestamp for when sentence should expire. `null` if no expiration
     * @param {string} [args.reason] Mod-provided reason for why sentence was issued. `null` if no reason
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
    static async muteUser({bot, user, mod, expires=null, reason=null} = {}) {
        const MUTED_ROLE = bot.config.muted_role;
        const type = this.SENTENCE_TYPES.MUTE;

        const member = await bot.leyline_guild.members.fetch({
            user,
            force: true,
        });
        if(!member) throw new Error(`I could not find member ${user.id} in the server!`);

        //issue sentence
        if(member.roles.cache.has(MUTED_ROLE))
            throw new Error(`Member ${member.id} is already muted!`);
        await member.roles.add(MUTED_ROLE, `Justice Served by ${mod.tag}`);

        //store sentence in cloud
        const doc = await this.recordSentence({
            uid: user.id,
            mod,
            type,
            reason,
            expires,
        });

        //schedule removal
        this.scheduleRemoval({
            bot,
            id: doc.id,
            data: {
                type,
                uid: user.id,
                issued_by: mod.id,
                expires,
                reason,
            }
        });

        return true;
    }

    /**
     * Issue a KICK sentence to a user. 
     * Discord logging should be handeled separately
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being sentenced
     * @param {User} args.mod `User` object of staff that is issuing sentence
     * @param {string} [args.reason] Mod-provided reason for why sentence was issued. `null` if no reason
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
    static async kickUser({bot, user, mod, reason=null} = {}) {
        const type = this.SENTENCE_TYPES.KICK;
        const member = await bot.leyline_guild.members.fetch({
            user,
            force: true,
        });
        if(!member) throw new Error(`I could not find member ${user.id} in the server!`);

        //issue sentence
        await member.kick(`Justice Served by ${mod.tag}`);

        //store sentence in cloud
        await this.recordSentence({
            uid: user.id,
            mod,
            type,
            reason,
        });

        //no need to schedule removal

        return true;
    }

    /**
     * Issue a BAN sentence to a user. 
     * Discord logging should be handeled separately
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being sentenced
     * @param {User} args.mod `User` object of staff that is issuing sentence
     * @param {number} [args.expires] Unix timestamp for when sentence should expire. `null` if no expiration
     * @param {string} [args.reason] Mod-provided reason for why sentence was issued. `null` if no reason
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
     static async banUser({bot, user, mod, expires=null, reason=null} = {}) {
        const type = this.SENTENCE_TYPES.BAN;
        const member = await bot.leyline_guild.members.fetch({
            user,
            force: true,
        });
        if(!member) throw new Error(`I could not find member ${user.id} in the server!`);

        //issue sentence
        await member.ban({
            reason: `Justice Served by ${mod.tag}`,
        });

        //store sentence in cloud
        const doc = await this.recordSentence({
            uid: user.id,
            mod,
            type,
            reason,
            expires,
        });

        //schedule removal
        this.scheduleRemoval({
            bot,
            id: doc.id,
            data: {
                type,
                uid: user.id,
                issued_by: mod.id,
                expires,
                reason,
            }
        });

        return true;
    }

    /**
     * Retrieve all the sentences issued for a given user
     * @param {Object} args Destructured args
     * @param {User} args.user user to query sentence history for
     * @param {Array} [args.types] Array of valid `SENTENCE_TYPE`s to be filtered. Defaults to all types
     * @returns {Promise<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]>} 
     * Array of documents for the user's sentence history, sorted by date issued, descending
     */
    static async getHistory({user, types=Object.values(this.SENTENCE_TYPES)}) {
        return (await admin.firestore()
            .collection(this.COLLECTION_PATH)
            .where('uid', '==', user.id)
            .where('type', 'in', types)
            .get()).docs.sort((a, b) => b.data().timestamp - a.data().timestamp);
    }

    /**
     * Retrieve all the sentences issued by a moderator
     * @param {Object} args Destructured args
     * @param {User} args.user moderator to query sentence history for
     * @param {Array} [args.types] Array of valid `SENTENCE_TYPE`s to be filtered. Defaults to all types
     * @returns {Promise<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]>} 
     * Array of documents for the moderator's sentence history, sorted by date issued, descending
     */
    static async getModHistory({user, types=Object.values(this.SENTENCE_TYPES)}) {
        return (await admin.firestore()
            .collection(this.COLLECTION_PATH)
            .where('issued_by', '==', user.id)
            .where('type', 'in', types)
            .get()).docs.sort((a, b) => b.data().timestamp - a.data().timestamp);
    }

    /**
     * Generate a sentence history embed for a given user
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot Leyline Bot class
     * @param {User} args.user user to query sentence history for
     * @param {Array} args.history_docs Documents retrieved from `getHistory()`
     * @param {boolean} [args.mod] Whether the embed is for a mod issued history
     * @returns {EmbedBase} embed with sentence history
     */
    static generateHistoryEmbed({bot, user, history_docs, mod=false}) {
        const embed = new EmbedBase(bot, {
			title: mod
				? `Sentences Issued by ${user.tag} (${user.id})`
				: `Sentence History for ${user.tag} (${user.id})`,
			description: `**Total sentences: ${history_docs.length}**`,
		}).Sentence();

        //add each individual sentence to embed (25 fields max)
        for(const doc of history_docs.slice(0, 25)) {
            const data = doc.data();
            embed.fields.push({
				name: `${data.type} - ${bot.formatTimestamp(data.timestamp, 'd')}`,
				value: `
                    ${
						mod
							? `**Target:** ${bot.formatUser(bot.users.resolve(data.uid))}`
							: `**Issued by:** ${bot.formatUser(bot.users.resolve(data.issued_by))}`
					}
                    **Reason:** \`${data.reason ?? 'No reason given'}\`
                    `,
				inline: false,
			});
        }

        return embed;
    }

    /**
     * Reverse a MUTE sentence to a user. 
     * Discord logging is handeled in this function
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {string} args.id Sentence ID (Firestore doc id)
     * @param {string} args.uid Target Discord user ID
     * @param {string} args.issued_by ID of Discord Mod that issued the sentence
     * @param {string} [args.reason] Reason sentence was issued
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
     static async unmuteUser({bot, id, uid, issued_by, reason=null}= {}) {
        const MUTED_ROLE = bot.config.muted_role;
        const issuer = await bot.users.fetch(issued_by);

        //resolve target
        const member = await bot.leyline_guild.members.fetch({
            user: uid,
            force: true,
        });

        //generate embed to modify it later
        const embed = new EmbedBase(bot, {
            title: 'Sentence Expired',
            fields: [
                {
                    name: 'Type',
                    value: this.SENTENCE_TYPES.MUTE,
                    inline: true,
                },
                {
                    name: 'Issued By',
                    value: bot.formatUser(issuer),
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: 'Reason',
                    value: reason ?? 'No reason given',
                    inline: true,
                },
                {
                    name: 'Target',
                    value: bot.formatUser(member?.user),
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true },
            ],
        }).Sentence();

        if(!member) {
            embed.description = `⚠ I was unable to find the user in the server`;
            await bot.logDiscord({embed});
            return false;
        };

        //ensure user has role
        if(!member.roles.cache.has(MUTED_ROLE)) {
            embed.description = `⚠ The member did not have the <@&${MUTED_ROLE}> role`;
            await bot.logDiscord({embed});
            return false;
        }
        //remove sentence
        await member.roles.remove(
            MUTED_ROLE, 
            `Scheduled unmute for sentence ${id} issued by ${issuer?.tag || 'Unknown User'}`
        );

        //log removal
        await bot.logDiscord({embed});

        return true;
    }

    /**
     * Reverse a BAN sentence to a user. 
     * Discord logging is handeled in this function
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {string} args.id Sentence ID (Firestore doc id)
     * @param {string} args.uid Target Discord user ID
     * @param {string} args.issued_by ID of Discord Mod that issued the sentence
     * @param {string} [args.reason] Reason sentence was issued
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
     static async unbanUser({bot, id, uid, issued_by, reason=null} = {}) {
        const issuer = await bot.users.fetch(issued_by);

        //remove sentence, store resolved user
        const user = await bot.leyline_guild.bans.remove(
            uid, 
            `Scheduled unban for sentence ${id} issued by ${issuer?.tag || 'Unknown User'}`
        ) || await bot.users.fetch(uid);

        //log removal
        await bot.logDiscord({embed: new EmbedBase(bot, {
            title: 'Sentence Expired',
            fields: [
                {
                    name: 'Type',
                    value: this.SENTENCE_TYPES.BAN,
                    inline: true,
                },
                {
                    name: 'Issued By',
                    value: bot.formatUser(issuer),
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: 'Reason',
                    value: reason ?? 'No reason given',
                    inline: true,
                },
                {
                    name: 'Target',
                    value: bot.formatUser(user),
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true },
            ],
        }).Sentence()});

        return true;
    }
}
