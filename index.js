if (process.version.slice(1).split(".")[0] < 14)
  throw new Error("Node 14.0.0 or higher is required.");

const { Client, Collection } = require('discord.js');
const admin = require('firebase-admin');
const klaw = require('klaw');
const path = require('path');
const EmbedBase = require('./classes/EmbedBase');
//formally, dotenv shouldn't be used in prod, but because staging and prod share a VM, it's an option I elected to go with for convenience
require('dotenv').config();

class LeylineBot extends Client {
    connection_tutorial = 'https://www.notion.so/leyline/How-to-Connect-Your-Discord-Leyline-Accounts-917dd19be57c4242878b73108e0cc2d1';

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

    /**
     * Sends a discord message on the bot's behalf to a private log channel
     * @param {String | Object} text String or object to be sent to channel
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async logDiscord(text) {
        return (await bot.channels.fetch(this.config.channels.private_log)).send(text);
    }

    /**
     * Sends a discord message on the bot's behalf to a public log channel
     * @param {String | Object} text String or object to be sent to channel
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
    async msgBotChannel(text) {
        return (await bot.channels.fetch(this.config.channels.public_log)).send(text);
    }

    /**
     * Sends a discord message on the bot's behalf to a public log channel, specific for rewards
     * @param {String | Object} text String or object to be sent to channel
     * @returns {Promise<Message>} Promise which resolves to the sent message
     */
     async logReward(text) {
        return (await bot.channels.fetch(this.config.channels.reward_log)).send(text);
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
                }
        }).Warn()});
    }

    /**
     * Checks if a user has mod permissions on the Leyline server.
     * Current mod roles: `Admin`, `Moderator`
     * @param {String} uid Discord UID of the user to check
     * @returns `true` if user has mod perms, `false` otherwise
     */
    checkMod(uid) {
        const mod_roles = ['784875278593818694'/*Admin*/, '752363863441145866'/*Mod*/, '858144532318519326'/*Dev server Staff*/];
        return bot.leyline_guild.member(uid).roles.cache.some(r => mod_roles.includes(r.id));
    }

    /**
     * Checks if a user has admin permissions on the Leyline server.
     * Current admin permission: Anyone with the ADMINISTRATOR permission
     * @param {String} uid Discord UID of the user to check
     * @returns `true` if user has admin perms, `false` otherwise
     */
    checkAdmin(uid) {
        return bot.leyline_guild.member(uid).hasPermission('ADMINISTRATOR');
    }

    /**
     * Formats a `User` for logging purposes
     * @param {User} user Discord.js `User` object 
     */
    formatUser(user) {
        return `<@!${user.id}> (${user.tag})`;
    }
}

const bot = new LeylineBot({ restTimeOffset: 0 /*allegedly this helps with API delays*/ });

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
                bot.commands.set(cmdName, cmd);
                
                delete require.cache[require.resolve(`${cmdFile.dir}${path.sep}${cmdFile.name}${cmdFile.ext}`)];
            } catch(error) {
                bot.logger.error(`Error loading command ${cmdFile.name}: ${error}`);
            }
        })
        .on('end', () => bot.logger.log(`Loaded ${bot.commands.size} commands.`))
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
            bot.logDiscord(`\`${process.env.NODE_ENV}\` environment online, running version ${bot.CURRENT_VERSION}`);
        bot.logger.log('Beginning post-initializtion sequence...');
        postInit();
    });
};

// post-initialization, when Discord API is accessible
const postInit = async function () {
    //import ReactionCollectors (this can be modified later to take a more generic approach)
    await (async function importReactionCollectors () {
        let succesfully_imported = 0; 
        const GoodActsReactionCollector = require('./classes/GoodActsReactionCollector');
        const collectors = await admin
            .firestore()
			.collection(`discord/bot/reaction_collectors/`)
			.where('expires', '>', Date.now())
            .get();
        for (const doc of collectors.docs) {
            try {
                const ch = await bot.channels.fetch(doc.data().channel, true, true);
                const msg = await ch.messages.fetch(doc.id, true, true);
                const collector = await new GoodActsReactionCollector(bot, msg).loadMessageCache(doc);
                doc.data().approved ? 
                    collector.setupApprovedCollector({duration:doc.data().expires - Date.now()}) :
                    collector.init(true);
                succesfully_imported++;
            } catch (err) {
                bot.logger.error(`importReactionCollectors error with doc id ${doc.id}: ${err}`);
            }   
        }
        bot.logger.log(`Imported ${succesfully_imported} ReactionCollectors from Firestore`);
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
