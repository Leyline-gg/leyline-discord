if (process.version.slice(1).split(".")[0] < 14)
  throw new Error("Node 14.0.0 or higher is required.");

const { Client, Collection } = require('discord.js');
const admin = require('firebase-admin');
const klaw = require('klaw');
const path = require('path');
require('dotenv').config({path: process.env.NODE_ENV === 'development' ? './.env' : '../.env'});

class LeylineBot extends Client {
    discord_log_channel = '843892751276048394'; //for logging actions performed

    constructor(options) {
        super(options);

        // Custom properties for our bot
        this.CURRENT_VERSION    = '0.9.0';
        this.logger     = require('./classes/Logger');
        this.config     = require('./config')[process.env.NODE_ENV || 'development'];
        this.commands   = new Collection();
        this.events     = new Collection();
        this.firebase_events = new Collection();
    }

    get leyline_guild() {
        return this.guilds.resolve('751913089271726160');
    }

    /**
     * Sends a discord message on the bot's behalf to a log channel
     * @param {String} text 
     */
    logDiscord(text) {
        bot.channels.cache.find(ch => ch.id === this.discord_log_channel).send(text);
    }
}

const bot = new LeylineBot({ restTimeOffset: 0 /*allegedly this helps with API delays*/ });

const init = async function () {
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
    klaw('./events')
        .on('data', item => {
            const eventFile = path.parse(item.path);
            if (!eventFile.ext || eventFile.ext !== '.js') return;
            const eventName = eventFile.name.split('.')[0];
            try {
                const event = new (require(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`))(bot);
                bot.events.set(eventName, event);
                bot.on(eventName, (...args) => event.run(...args));
                
                delete require.cache[require.resolve(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`)];
            } catch(error) {
                bot.logger.error(`Error loading event ${eventFile.name}: ${error}`);
            }
        })
        .on('end', () => bot.logger.log(`Loaded ${bot.events.size} events`))
        .on('error', bot.logger.error);
    //import firebase events
    klaw('./events_firebase')
        .on('data', item => {
            const eventFile = path.parse(item.path);
            if (!eventFile.ext || eventFile.ext !== '.js') return;
            try {
                const firebase_event = new (require(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`))(bot);
                admin.firestore().collection(firebase_event.collection).onSnapshot((snapshot) => {
                    if(!bot.readyAt) return;    //ensure bot is initialized before event is fired
                    if(snapshot.empty) return;
                    for(const docChange of snapshot.docChanges()) 
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
                        //doc.createTime.toDate() > bot.readyAt && firebase_event.handler(doc);
                }, (err) => bot.logger.error(`FirebaseEvent error with ${firebase_event.name}: ${err}`));
                bot.firebase_events.set(firebase_event.name, firebase_event);

                delete require.cache[require.resolve(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`)];
            } catch(error) {
                bot.logger.error(`Error loading Firebase event ${eventFile.name}: ${error}`);
            }
        })
        .on('end', () => bot.logger.log(`Loaded ${bot.firebase_events.size} Firebase events`))
        .on('error', bot.logger.error);

    bot.logger.log('Connecting...');
    bot.login(process.env.BOT_TOKEN).then(() => {
        bot.logger.debug(`Bot succesfully initialized, running version ${bot.CURRENT_VERSION}`);
        process.env.NODE_ENV !== 'development' &&   //send message in log channel when staging bot is online
            bot.logDiscord(`\`${process.env.NODE_ENV}\` environment online, running version ${bot.CURRENT_VERSION}`);
    });
};

init();

// Setup events to log unexpected errors
bot.on("disconnect", () => bot.logger.warn("Bot is disconnecting..."))
    .on("reconnect", () => bot.logger.log("Bot reconnecting..."))
    .on("error", e => bot.logger.error(e))
    .on("warn", info => bot.logger.warn(info));

// Prevent the bot from crashing on unhandled rejections
process.on("unhandledRejection", function (err, promise) {
    console.error("Unhandled rejection:\n", promise, "\n\nReason:\n", err);
});
