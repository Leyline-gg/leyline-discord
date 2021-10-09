import admin from 'firebase-admin';
import * as Firebase from '../../api';
import { EmbedBase, LeylineUser } from '..';
import xplevels from '../../xplevels.js'

export class PunishmentService {
    static COLLECTION_PATH  = 'discord/bot/punishments';
    static PUNISHMENT_TYPES = {
        WARN: 'WARN',
        MUTE: 'MUTE',
        KICK: 'KICK',
        BAN: 'BAN',
    };

    /**
     * Record a punishment in firestore
     * @param {Object} args Destructured args
     * @param {string} args.uid Target user id
     * @param {User} args.mod `User` object of staff that is issuing punishment
     * @param {string} args.type See `PUNISHMENT_TYPES`. Type of punishment
     * @param {number} [args.expires] Unix timestamp for when punishment should expire. `null` if no expiration
     * @param {string} [args.reason] Mod-provided reason for why punishment was issued. `null` if no reason
     * @param {number} [args.timestamp] Unix timestamp of when punishment was issued. Defaults to `Date.now()`
     * @param {Object} [args.metadata] Metadata to be included in Firestore doc
     * @returns Resolves to added doc
     */
    static async recordPunishment({uid, mod, type, expires=null, reason=null, timestamp=Date.now(), metadata=null} = {}) {
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
     * Log a punishment in the appropriate Discord channels 
     * AND send a message to the end user
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being punished
     * @param {User} args.mod `User` object of staff that is issuing punishment
     * @param {string} args.type See `PUNISHMENT_TYPES`. Type of punishment
     * @param {number} [args.expires] Unix timestamp for when punishment should expire. `null` if no expiration
     * @param {string} [args.reason] Mod-provided reason for why punishment was issued. `null` if no reason
     * @param {number} [args.timestamp] Unix timestamp of when punishment was issued. Defaults to `Date.now()`
     * @returns Resolves to added doc
     */
    static async logPunishment({bot, user, mod, type, expires=null, reason=null, timestamp=Date.now()} = {}) {
        const { PUNISHMENT_TYPES } = this;
        const embed = new EmbedBase(bot, {
            title: 'Punishment Issued',
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
            ],
            timestamp,
        }).Punish();
        
        //Message user
        await bot.sendDM({send_disabled_msg: false, user, embed});

        //log publicly
        if(type === PUNISHMENT_TYPES.BAN || type === PUNISHMENT_TYPES.KICK)
            await bot.logPunishment({embed});
        
        //generate private embed
        embed.fields.push(...[
            {
                name: 'Target',
                value: bot.formatUser(user),
                inline: true,
            },
            {
                name: 'Warnings',
                value: '0',
                inline: true,
            },
            { name: '\u200b', value: '\u200b', inline: true },
        ]);
        //log privately
        await bot.logDiscord({embed});
    }

    /**
     * Issue a WARN punishment to a user. 
     * Discord logging should be handeled separately
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being punished
     * @param {User} args.mod `User` object of staff that is issuing punishment
     * @param {string} [args.reason] Mod-provided reason for why punishment was issued. `null` if no reason
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
     static async warnUser({bot, user, mod, reason=null} = {}) {
        const member = await bot.leyline_guild.members.fetch({
            user,
            force: true,
        });
        if(!member) throw new Error('I could not find that member in the server!');

        //issue punishment (log in cloud)
        //store punishment in cloud
        await this.recordPunishment({
            uid: user.id,
            mod,
            type: this.PUNISHMENT_TYPES.WARN,
            reason,
        });

        return true;
    }

    /**
     * Issue a MUTE punishment to a user. 
     * Discord logging should be handeled separately
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being punished
     * @param {User} args.mod `User` object of staff that is issuing punishment
     * @param {number} [args.expires] Unix timestamp for when punishment should expire. `null` if no expiration
     * @param {string} [args.reason] Mod-provided reason for why punishment was issued. `null` if no reason
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
    static async muteUser({bot, user, mod, expires=null, reason=null} = {}) {
        const MUTED_ROLE = bot.config.muted_role;

        const member = await bot.leyline_guild.members.fetch({
            user,
            force: true,
        });
        if(!member) throw new Error('I could not find that member in the server!');

        //issue punishment
        if(member.roles.cache.has(MUTED_ROLE))
            throw new Error('That member is already muted!');
        await member.roles.add(MUTED_ROLE, `Punishment issued by ${mod.tag}`);

        //store punishment in cloud
        await this.recordPunishment({
            uid: user.id,
            mod,
            type: this.PUNISHMENT_TYPES.MUTE,
            reason,
            expires,
        });

        return true;
    }

    /**
     * Issue a KICK punishment to a user. 
     * Discord logging should be handeled separately
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being punished
     * @param {User} args.mod `User` object of staff that is issuing punishment
     * @param {string} [args.reason] Mod-provided reason for why punishment was issued. `null` if no reason
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
    static async kickUser({bot, user, mod, reason=null} = {}) {
        const member = await bot.leyline_guild.members.fetch({
            user,
            force: true,
        });
        if(!member) throw new Error('I could not find that member in the server!');

        //issue punishment
        await member.kick(`Punishment issued by ${mod.tag}`);

        //store punishment in cloud
        await this.recordPunishment({
            uid: user.id,
            mod,
            type: this.PUNISHMENT_TYPES.KICK,
            reason,
        });

        return true;
    }

    /**
     * Issue a BAN punishment to a user. 
     * Discord logging should be handeled separately
     * @param {Object} args Destructured args
     * @param {LeylineBot} args.bot bot
     * @param {User} args.user `User` object of user that is being punished
     * @param {User} args.mod `User` object of staff that is issuing punishment
     * @param {number} [args.expires] Unix timestamp for when punishment should expire. `null` if no expiration
     * @param {string} [args.reason] Mod-provided reason for why punishment was issued. `null` if no reason
     * @returns {Promise<boolean>} Resolves to true if successfully executed
     */
     static async banUser({bot, user, mod, expires=null, reason=null} = {}) {
        const member = await bot.leyline_guild.members.fetch({
            user,
            force: true,
        });
        if(!member) throw new Error('I could not find that member in the server!');

        //issue punishment
        await member.ban({
            reason: `Punishment issued by ${mod.tag}`,
        });

        //store punishment in cloud
        await this.recordPunishment({
            uid: user.id,
            mod,
            type: this.PUNISHMENT_TYPES.BAN,
            reason,
            expires,
        });

        return true;
    }

    static async getHistory({bot, user}) {
        const docs = (await admin.firestore()
            .collection(this.COLLECTION_PATH)
            .where('uid', '==', user.id)
            .get()).docs.sort((a, b) => b.data().timestamp - a.data().timestamp);
        const embed = new EmbedBase(bot, {
            title: `Punishment History for ${user.tag} (${user.id})`,
            description: `**Total punishments: ${docs.length}**`,
        }).Punish();
        for(const doc of docs) {
            const data = doc.data();
            embed.fields.push({
                name: `${data.type} - ${bot.formatTimestamp(data.timestamp, 'd')}`,
                value: `
                    **Issued by:** ${bot.formatUser(bot.users.resolve(data.issued_by ))}
                    **Reason:** \`${data.reason ?? 'No reason given'}\`
                    `,
                inline: false,
            });
        }

        return embed;
    }
}
