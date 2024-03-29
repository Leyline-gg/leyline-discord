import { Client, Collection, Emoji, Intents } from 'discord.js';
import { CloudConfig, ConfirmInteraction, EmbedBase, Logger } from './classes';
import config from './config.js';

// Custom bot class, based off the discord.js Client (bot)
// Designed as a singleton
class LeylineBot extends Client {
    //getter for all Config methods that call Config.get()
    get connection_tutorial() { return CloudConfig.get('connection_tutorial'); }
    get xp_doc() { return CloudConfig.get('xp_doc'); }

    constructor(options) {
        super(options);

        this.CURRENT_VERSION    = process.env.npm_package_version || '0.0.0-unknown';
        this.logger             = Logger;
        this.config             = config[process.env.NODE_ENV || 'development'];
        this.commands           = new Collection();
        this.events             = new Collection();
        this.firebase_events    = new Collection();

        // Setup events to log unexpected errors
        this.on("disconnect", () => this.logger.warn("Bot is disconnecting..."))
            .on("reconnect", () => this.logger.log("Bot reconnecting..."))
            .on("error", e => this.logger.error(e))
            .on("warn", info => this.logger.warn(info));
    }

    get leyline_guild() {
        return this.guilds.resolve(this.config.leyline_guild_id);
    }

    // ----- Message Methods -----
    /**
     * Send a single embed in the `channel` of the `msg` argument
     * @param {Object} args
     * @param {Message} args.msg Discord.js `Message` object, target channel is taken from this
     * @param {EmbedBase} [args.embed] Singular embed object to be sent in channel
     * @returns {Promise<Message>}
     */
    sendEmbed({msg, embed=null, ...options}) {
        if(!msg.channel) throw new Error(`No channel property found on the msg object: ${msg}`);
        return msg.channel.send({msg, 
            embeds: !!embed ? [embed] : [],
            ...options,
        });
    }

    /**
     * Send an inline reply to the `msg` that mentions the author
     * @param {Object} args
     * @param {Message} args.msg Discord.js `Message` object, target author is taken from this
     * @param {EmbedBase} [args.embed] Singular embed object to be sent as response
     * @returns {Promise<Message>}
     */
    sendReply({msg, embed=null, ...options}) {
        return msg.reply({
            embeds: !!embed ? [embed] : [],
            failIfNotExists: false,
            ...options,
        });
    }

    /**
     * Send a direct message to the target user, catches error if user has closed DMs
     * @param {Object} args
     * @param {User} args.user Discord.js `User` object; recipient of msg
     * @param {EmbedBase} [args.embed] Singular embed object to be sent as response
     * @param {boolean} [args.send_disabled_msg] Whether or not to send a public message prompting the user to enable messages from server members
     * @returns {Promise<Message>}
     */
    sendDM({user, embed=null, send_disabled_msg=true, ...options} = {}) {
        return user.send({
            embeds: !!embed ? [embed] : [],
            ...options,
        }).catch((e) => {
            send_disabled_msg && this.sendDisabledDmMessage(user);
            throw e;
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a private log channel
     * @param {Object} args
     * @param {EmbedBase} [args.embed] Singular embed object to be sent in message 
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async logDiscord({embed=null, ...options}) {
        return (await this.channels.fetch(this.config.channels.private_log)).send({
            embeds: !!embed ? [embed] : [],
            ...options,
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a public log channel
     * @param {Object} args
     * @param {EmbedBase} [args.embed] Singular embed object to be sent in message
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async msgBotChannel({embed=null, ...options}) {
        return (await this.channels.fetch(this.config.channels.public_log)).send({
            embeds: !!embed ? [embed] : [],
            ...options,
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a public log channel, specific for rewards
     * @param {Object} args
     * @param {EmbedBase} [args.embed] Singular embed object to be sent in message
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async logReward({embed=null, ...options}) {
        return (await this.channels.fetch(this.config.channels.reward_log)).send({
            embeds: !!embed ? [embed] : [],
            ...options,
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a public log channel, specific for sentences
     * @param {Object} args
     * @param {EmbedBase} [args.embed] Singular embed object to be sent in message
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async logSentence({embed=null, ...options}) {
        return (await this.channels.fetch(this.config.channels.mod_log)).send({
            embeds: !!embed ? [embed] : [],
            ...options,
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a private log channel, specific for submissions
     * @param {Object} args
     * @param {EmbedBase} [args.embed] Singular embed object to be sent in message
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async logSubmission({embed=null, ...options}) {
        return (await this.channels.fetch(this.config.channels.submission_log)).send({
            embeds: !!embed ? [embed] : [],
            ...options,
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a private staff channel
     * @param {Object} args
     * @param {EmbedBase} [args.embed] Singular embed object to be sent in message
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async logStaff({embed=null, ...options}) {
        return (await this.channels.fetch(this.config.channels.staff)).send({
            embeds: !!embed ? [embed] : [],
            ...options,
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a public announcement channel
     * @param {Object} args
     * @param {EmbedBase} [args.embed] Singular embed object to be sent in message
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async sendAnnouncement({embed=null, ...options}) {
        return (await this.channels.fetch(this.config.channels.announcements)).send({
            embeds: !!embed ? [embed] : [],
            ...options,
        });
    }

    sendDisabledDmMessage(user) {
        this.msgBotChannel({
            content: user.toString(),
            embed: new EmbedBase(this, {
                fields: [
                    {
                        name: '❌ You need to enable DMs from server members!',
                        value: "I tried to send you a direct message, but you currently have them disabled! Navigate to the server's Privacy Settings, then toggle **Allow Direct Messages From Server Members** to the right."
                    }
                ],
                image: {
                    url: 'https://i.ibb.co/L8j9dCD/discord-dm-tutorial.png'
                },
        }).Warn()});
    }

    // ----- Interaction Methods -----
    /**
     * Replies to an interaction, replacing the previous reply if one currently exists
     * @param {Object} args Destructured arguments
     * @param {Interaction} args.intr Discord.js `Interaction`
     * @param {EmbedBase | EmbedBase[]} [args.embed] Singular embed object to be included in reply. If unspecified, existing embeds are removed
     * @returns {Promise<Message>} The reply that was sent (or the last one, if multiple were sent)
     */
    async intrReply({intr, embed=null, ...options}) {
        const payload = {
            embeds: !!embed ? [embed] : [],
            fetchReply: true,
            ...options,
        };
        if(!Array.isArray(embed)) 
            return (intr.deferred || intr.replied) ? await intr.editReply(payload) : await intr.reply(payload);
        let msg;
        for(const e of embed) {
            payload.embeds = [e];
            msg = (intr.deferred || intr.replied) ? await intr.followUp(payload) : await intr.reply(payload);
        }
        return msg;
    }

    intrUpdate({intr, embed=null, ...options}) {
        const payload = {
            embeds: !!embed ? [embed] : [],
            fetchReply: true,
            ...options,
        };
        return intr.replied ? intr.editReply(payload) : intr.update(payload);
    }

    /**
     * Reply to a `CommandInteraction` with a message containing 'Confirm' and 'Cancel' as buttons, among other options passed as parameters
     * Returns a promise which resolves to a boolean indicating the user's selection
     * @param {Object} args Destructured arguments. `options` will be passed to `Leylinethis.intrReply()` as params
     * @param {CommandInteraction} args.intr Discord.js `CommandInteraction` to reply w/ confirmation prompt 
     * @returns {Promise<boolean>} `true` if user selected 'Confirm', `false` if user selected `Cancel`
     */
    async intrConfirm({intr, ...options}) {
        try {
            const msg = await this[`${intr.isButton() ? 'intrUpdate' : 'intrReply'}`]({intr, ...options, components:[new ConfirmInteraction()]});
            const res = await msg.awaitInteractionFromUser({user: intr.user});
            //remove components
            await res.update({components:[]});
            return res.customId === 'confirm';
        } catch (err) {
            this.logger.error(`intrConfirm err: ${err}`);
            return false;
        }
    }


    // ----- Other Methods -----
    /**
     * Checks if a user has mod permissions on the Leyline server.
     * Current mod roles: `Admin`, `Moderator`
     * @param {String} uid Discord UID of the user to check
     * @returns {boolean} `true` if user has mod perms, `false` otherwise
     */
    checkMod(uid) {
        return this.leyline_guild.members.cache.get(uid).roles.cache.some(r => this.config.mod_roles.includes(r.id));
    }

    /**
     * Checks if a user has admin permissions on the Leyline server.
     * Current admin permission: Anyone with the ADMINISTRATOR permission
     * @param {String} uid Discord UID of the user to check
     * @returns {boolean} `true` if user has admin perms, `false` otherwise
     */
    checkAdmin(uid) {
        return this.leyline_guild.members.cache.get(uid).permissions.has('ADMINISTRATOR');
    }

    /**
     * Formats a `User` for logging purposes
     * @param {User} user Discord.js `User` object 
     */
    formatUser(user) {
        return !!user?.id ? 
            `<@!${user.id}> (${user.tag})` :
            'Unknown User';
    }

    /**
     * Format a UNIX timestamp to be sent in a Discord message
     * @param {Number} [timestamp] UNIX timestamp in milliseconds, default is `Date.now()`
     * @param {string} [letter] The suffix to append, resulting in a different display
     * @returns {String}
     */
    formatTimestamp(timestamp=Date.now(), letter='D') {
        return `<t:${timestamp /1000 |0}:${letter}>`;
    }

    /**
     * Construct an Discord.js emoji from destructured parameters (such as Firestore data)
     * @param {Object} args Destructured arguments, see `Emoji` constructor
     * @returns {Emoji} 
     */
    constructEmoji({name, id, animated=false, ...other} = {}) {
        return Object.assign(new Emoji(this, {
            name,
            id,
            animated,
        }), other);
    }
}

export default new LeylineBot({ 
    restTimeOffset: 0, /*allegedly this helps with API delays*/
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
    ],
    allowedMentions: {
        parse: ['users', 'roles', 'everyone'],
        repliedUser: true,
    },
});
