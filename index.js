if (process.version.slice(1).split(".")[0] < 14)
  throw new Error("Node 14.0.0 or higher is required.");

const { Client, Collection } = require('discord.js');
const admin = require('firebase-admin');
const klaw = require('klaw');
const path = require('path');
if (process.env.NODE_ENV !== 'production')
    require('dotenv').config();

class LeylineBot extends Client {
    constructor(options) {
        super(options);

        // Custom properties for our bot
        this.logger     = require('./classes/Logger');
        this.config     = require('./config')[process.env.NODE_ENV || 'development'];
        this.commands   = new Collection();
        this.events     = new Collection();
    }
}

const bot = new LeylineBot({ restTimeOffset: 0 /*allegedly this helps with API delays*/ });

const init = async function () {
    //initialize firebase
    admin.initializeApp({
        credential: admin.credential.cert(require('./leyline-web-app-dev-firebase-adminsdk-beh3s-8c4a396733.json')),
        databaseURL: "https://leyline-web-app-dev.firebaseio.com"
    });
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
    //import events
    klaw('./events')
        .on('data', item => {
            const eventFile = path.parse(item.path);
            if (!eventFile.ext || eventFile.ext !== '.js') return;
            const eventName = eventFile.name.split('s.')[0];
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

    //console.log(await (new (require('./commands/user/profile'))(bot)).run({author:{id:'110697012205715456'}}, []));
    bot.logger.log('Connecting...');
    bot.login(process.env.BOT_TOKEN).then(() => bot.logger.debug('Bot succesfully initialized'));
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
