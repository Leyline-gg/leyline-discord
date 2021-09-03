if (process.version.slice(1).split(".")[0] < 16)
  throw new Error("Node 16.6.0 or higher is required.");

const { Client, Collection, Intents, Message, } = require('discord.js');
const admin = require('firebase-admin');
const klaw = require('klaw');
const path = require('path');
const ConfirmInteraction = require('./classes/components/ConfirmInteraction');
const EmbedBase = require('./classes/components/EmbedBase');
//formally, dotenv shouldn't be used in prod, but because staging and prod share a VM, it's an option I elected to go with for convenience
require('dotenv').config();

// Custom bot class, based off the discord.js Client (bot)
class LeylineBot extends Client {
    connection_tutorial = 'https://www.notion.so/leyline/How-to-Connect-Your-Discord-Leyline-Accounts-917dd19be57c4242878b73108e0cc2d1';
    xp_doc              = 'https://www.notion.so/leyline/d0dc285583b7443cb315851bdbf09fb4';

    constructor(options) {
        super(options);

        // Custom properties for our bot
        this.CURRENT_VERSION    = process.env.npm_package_version || require('./package.json').version;
        this.logger             = require('./classes/Logger');
        this.config             = require('./config')[process.env.NODE_ENV || 'development'];
        this.commands           = new Collection();
        this.events             = new Collection();
        this.firebase_events    = new Collection();
    }

    get leyline_guild() {
        return this.guilds.resolve(this.config.leyline_guild_id);
    }

    // ----- Message Methods -----
    /**
     * Send a single embed in the `channel` of the `msg` argument
     * @param {Object} args
     * @param {Message} args.msg Discord.js `Message` object, target channel is taken from this
     * @param {EmbedBase} args.embed Singular embed object to be sent in channel
     * @returns {Promise<Message>}
     */
    sendEmbed({msg, embed, ...options}) {
        if(!msg.channel) throw new Error(`No channel property found on the msg object: ${msg}`);
        return msg.channel.send({msg, 
            embeds: [embed],
            ...options,
        });
    }

    /**
     * Send an inline reply to the `msg` that mentions the author
     * @param {Object} args
     * @param {Message} args.msg Discord.js `Message` object, target author is taken from this
     * @param {EmbedBase} args.embed Singular embed object to be sent as response
     * @returns {Promise<Message>}
     */
    sendReply({msg, embed, ...options}) {
        return msg.reply({
            embeds: [embed],
            failIfNotExists: false,
            ...options,
        });
    }

    /**
     * Send a direct message to the target user, catches error if user has closed DMs
     * @param {Object} args
     * @param {User} args.user Discord.js `User` object; recipient of msg
     * @param {EmbedBase} args.embed Singular embed object to be sent as response
     * @returns {Promise<Message>}
     */
    sendDM({user, embed, ...options}) {
        return user.send({
            embeds: [embed],
            ...options,
        }).catch(() => this.sendDisabledDmMessage(user));
    }

    /**
     * Sends a discord message on the bot's behalf to a private log channel
     * @param {Object} args
     * @param {EmbedBase} args.embed Singular embed object to be sent in message 
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async logDiscord({embed, ...options}) {
        return (await bot.channels.fetch(this.config.channels.private_log)).send({
            embeds: [embed],
            ...options,
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a public log channel
     * @param {Object} args
     * @param {EmbedBase} args.embed Singular embed object to be sent in message
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async msgBotChannel({embed, ...options}) {
        return (await bot.channels.fetch(this.config.channels.public_log)).send({
            embeds: [embed],
            ...options,
        });
    }

    /**
     * Sends a discord message on the bot's behalf to a public log channel, specific for rewards
     * @param {Object} args
     * @param {EmbedBase} args.embed Singular embed object to be sent in message
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async logReward({embed, ...options}) {
        return (await bot.channels.fetch(this.config.channels.reward_log)).send({
            embeds: [embed],
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
     * Replies to an interaction
     * @param {Object} args Destructured arguments
     * @param {Interaction} args.intr Discord.js `Interaction`
     * @param {EmbedBase} [args.embed] Singular embed object to be included in reply
     * @returns {Promise<Message>} The reply that was sent
     */
    intrReply({intr, embed, ...options}) {
        const payload = {
            ...embed && { embeds: [embed] },
            fetchReply: true,
            ...options,
        };
        return (intr.deferred || intr.replied) ? intr.editReply(payload) : intr.reply(payload);
    }

    intrUpdate({intr, embed, ...options}) {
        const payload = {
            ...embed && { embeds: [embed] },
            fetchReply: true,
            ...options,
        };
        return intr.replied ? intr.editReply(payload) : intr.update(payload);
    }

    /**
     * Reply to a `CommandInteraction` with a message containing 'Confirm' and 'Cancel' as buttons, among other options passed as parameters
     * Returns a promise which resolves to a boolean indicating the user's selection
     * @param {Object} args Destructured arguments. `options` will be passed to `LeylineBot.intrReply()` as params
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
        return bot.leyline_guild.members.cache.get(uid).roles.cache.some(r => this.config.mod_roles.includes(r.id));
    }

    /**
     * Checks if a user has admin permissions on the Leyline server.
     * Current admin permission: Anyone with the ADMINISTRATOR permission
     * @param {String} uid Discord UID of the user to check
     * @returns {boolean} `true` if user has admin perms, `false` otherwise
     */
    checkAdmin(uid) {
        return bot.leyline_guild.members.cache.get(uid).permissions.has('ADMINISTRATOR');
    }

    /**
     * Formats a `User` for logging purposes
     * @param {User} user Discord.js `User` object 
     */
    formatUser(user) {
        return `<@!${user.id}> (${user.tag})`;
    }

    /**
     * Format a UNIX timestamp to be sent in a Discord message
     * @param {Number} [timestamp] UNIX timestamp in milliseconds, default is `Date.now()`
     * @param {*} [letter] The suffix to append, resulting in a different display
     * @returns {String}
     */
    formatTimestamp(timestamp=Date.now(), letter='D') {
        return `<t:${timestamp /1000 |0}:${letter}>`;
    }

}

// Modify Discord.js classes to include custom methods
/**
 * Await a single component interaction from the target user. All other users are sent an epheremal rejecting their attempt
 * @param {Object} args Destructured arguments
 * @param {User} args.user Specific `User` to await an interaction from
 * @returns {Promise<MessageComponentInteraction>}
 */
Message.prototype.awaitInteractionFromUser = function ({user, ...options}) {
    return this.awaitMessageComponent({
        ...options,
        filter: (i) => {
            const from_user = i.user.id === user.id;
            !from_user && i.reply({
                ephemeral: true,
                content: `This interaction isn't meant for you!`,
            });
            return from_user;
        },
    });
};

/**
 * Fetch the reactions of a Discord message, updating the `ReactionManager`'s cache in-place
 * @returns {Promise<Message>} Resolves to itself once the cache update is complete
 */
Message.prototype.fetchReactions = async function () {
    //deep fetch - fetch the msg, then each reaction, then each reaction's users
    for (const reaction of (await this.fetch()).reactions.cache.values())
        this.reactions.resolve(reaction).users.cache = await reaction.users.fetch();
    return this;
};

/**
 * Disable all the components in a message by editing it
 * @returns {Promise<Message>} Resolves to the edited message with disabled components
 */
Message.prototype.disableComponents = function () {
    for(const row of this.components)
        for(const comp of row.components)
            comp.setDisabled();
    return this.edit({components: this.components});
};

// Instantiate our bot; prepare to login later
const bot = new LeylineBot({ 
    restTimeOffset: 0, /*allegedly this helps with API delays*/
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.DIRECT_MESSAGES,
    ],
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: true,
    },
});

// Initialization process
const init = function () {
    //initialize firebase
    admin.initializeApp({});
    if(admin.apps.length == 0) bot.logger.error('Error initializing firebase app');
    else bot.logger.log('Firebase succesfully initialized'); 

    //import commands - general import syntax adapted from github user @mcao
    klaw('./commands')
        .on('data', item => {
            const cmdFile = path.parse(item.path);
            if (!cmdFile.ext || cmdFile.ext !== '.js') return;
            const cmdName = cmdFile.name.split('.')[0];
            try {
                const cmd = new (require(`${cmdFile.dir}${path.sep}${cmdFile.name}${cmdFile.ext}`))(bot);
                process.env.NODE_ENV === 'development' ?
                     bot.commands.set(cmdName, cmd) :
                     cmd.category !== 'development' &&
                        bot.commands.set(cmdName, cmd);
                
                delete require.cache[require.resolve(`${cmdFile.dir}${path.sep}${cmdFile.name}${cmdFile.ext}`)];
            } catch(error) {
                bot.logger.error(`Error loading command file ${cmdFile.name}: ${error}`);
            }
        })
        .on('end', () => bot.logger.log(`Loaded ${bot.commands.size} command files`))
        .on('error', error => bot.logger.error(error));
    //import discord events
    klaw('./events/discord')
        .on('data', item => {
            const eventFile = path.parse(item.path);
            if (!eventFile.ext || eventFile.ext !== '.js') return;
            const eventName = eventFile.name.split('.')[0];
            try {
                const event = new (require(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`))(bot);
                bot.events.set(eventName, event);
                bot.on(event.event_type, (...args) => event.run(...args));
                
                delete require.cache[require.resolve(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`)];
            } catch(error) {
                bot.logger.error(`Error loading Discord event ${eventFile.name}: ${error}`);
            }
        })
        .on('end', () => bot.logger.log(`Loaded ${bot.events.size} Discord events`))
        .on('error', bot.logger.error);
    //import firebase events
    klaw('./events/firebase')
        .on('data', item => {
            const eventFile = path.parse(item.path);
            if (!eventFile.ext || eventFile.ext !== '.js') return;
            try {
                const firebase_event = new (require(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`))(bot);
                admin.firestore().collection(firebase_event.collection).onSnapshot((snapshot) => {
                    if(!bot.readyAt) return;    //ensure bot is initialized before event is fired
                    if(snapshot.empty) return;
                    for(const docChange of snapshot.docChanges()) {
                        //if doc was created before bot came online, ignore it
                        if(docChange.doc.createTime.toDate() < bot.readyAt) continue;
                        switch(docChange.type) {
                            case 'added':
                                firebase_event.onAdd(docChange.doc);
                                break;
                            case 'modified':
                                firebase_event.onModify(docChange.doc);
                                break;
                            case 'removed':
                                firebase_event.onRemove(docChange.doc);
                                break;
                        }
                    }
                }, (err) => bot.logger.error(`FirebaseEvent error with ${firebase_event.name}: ${err}`));
                bot.firebase_events.set(firebase_event.name, firebase_event);

                delete require.cache[require.resolve(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`)];
            } catch(error) {
                bot.logger.error(`Error loading Firebase event ${eventFile.name}: ${error}`);
            }
        })
        .on('end', () => bot.logger.log(`Loaded ${bot.firebase_events.size} Firebase events`))
        .on('error', bot.logger.error);

    bot.logger.log('Connecting to Discord...');
    bot.login(process.env.BOT_TOKEN).then(() => {
        bot.logger.debug(`Bot succesfully initialized. Environment: ${process.env.NODE_ENV}. Version: ${bot.CURRENT_VERSION}`);
        process.env.NODE_ENV !== 'development' &&   //send message in log channel when staging/prod bot is online
            bot.logDiscord({embed: new EmbedBase(bot, {
                description: `\`${process.env.NODE_ENV}\` environment online, running version ${bot.CURRENT_VERSION}`,
            }).Success()});
        bot.logger.log('Beginning post-initializtion sequence...');
        postInit();
    });
};

// post-initialization, when bot is logged in and Discord API is accessible
const postInit = async function () {
    //register commands with Discord
    await (async function registerCommands() {
        const cmds = await bot.leyline_guild.commands.set(bot.commands.map(({ run, ...data }) => data))
            .catch(err => bot.logger.error(`registerCommands err: ${err}`));
        //turn each Command into an ApplicationCommand
        cmds.forEach(cmd => bot.commands.get(cmd.name).setApplicationCommand(cmd));
        //Register command permissions
        await bot.leyline_guild.commands.permissions.set({ 
            fullPermissions: bot.commands.filter(c => c.category === 'admin')
                .map(cmd => ({ 
                    id: cmd.id,
                    permissions: bot.config.command_perms,
                })),
        }).catch(err => bot.logger.error(`registerCommands err: ${err}`));
        bot.logger.log(`Registered ${cmds.size} out of ${bot.commands.size} commands to Discord`);
    })();

    //import ReactionCollectors (this can be modified later to take a more generic approach)
    await (async function importReactionCollectors () {
        let succesfully_imported = 0; 
        const ReactionCollector = require('./classes/collectors/ReactionCollector');
        const collectors = await admin
            .firestore()
			.collection(`discord/bot/reaction_collectors/`)
			.where('expires', '>', Date.now())
            .get();
        for (const doc of collectors.docs) {
            try {
                const ch = await bot.channels.fetch(doc.data().channel, true, true);
                const msg = await ch.messages.fetch(doc.id, true, true);
                const collector = await new ReactionCollector(bot, {
                    type: ReactionCollector.Collectors[doc.data().type],
                    msg,
                }).loadMessageCache(doc);
                doc.data().approved ? 
                    collector.setupApprovedCollector({duration:doc.data().expires - Date.now()}) :
                    collector.setupModReactionCollector({from_firestore: true, duration:doc.data().expires - Date.now()});
                succesfully_imported++;
            } catch (err) {
                bot.logger.error(`importReactionCollectors error with doc id ${doc.id}: ${err}`);
            }   
        }
        bot.logger.log(`Imported ${succesfully_imported} ReactionCollectors from Firestore`);
		return;
    })();

    //import active polls
    await (async function importPolls () {
        let succesfully_imported = 0; 
        const CommunityPoll = require('./classes/CommunityPoll');
        const polls = await admin
            .firestore()
			.collection(`discord/bot/polls/`)
			.where('expires', '>', Date.now())
            .get();
        for (const doc of polls.docs) {
            try {
                const ch = await bot.channels.fetch(bot.config.channels.polls, true, true);
                const msg = await ch.messages.fetch(doc.id, true, true);
                const embed = msg.embeds[0];
                if(!embed) throw new Error('No embeds found on the fetched message');
                await new CommunityPoll(bot, {
                    embed,
                    author: await bot.users.fetch(doc.data().created_by),
                    question: embed.title, 
                    duration: doc.data().expires - Date.now(),
                    choices: doc.data().choices,
                }).createCollector(msg).importFirestoreData(doc);
                succesfully_imported++;
            } catch (err) {
                bot.logger.error(`importPolls error with doc id ${doc.id}: ${err}`);
            }   
        }
        bot.logger.log(`Imported ${succesfully_imported} polls from Firestore`);
        return;
    })();

    bot.logger.debug('Post-initialization complete');
};

init();

// Setup events to log unexpected errors
bot.on("disconnect", () => bot.logger.warn("Bot is disconnecting..."))
    .on("reconnect", () => bot.logger.log("Bot reconnecting..."))
    .on("error", e => bot.logger.error(e))
    .on("warn", info => bot.logger.warn(info));

// Prevent the bot from crashing on unhandled rejections
process.on("unhandledRejection", function (err, promise) {
    bot.logger.error(`Unhandled rejection: ${err.name}`);
    console.error("Unhandled rejection:\n", promise, "\n\nReason:\n", err);
});
