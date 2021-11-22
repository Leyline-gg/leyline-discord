'use strict';

if (process.version.slice(1).split(".")[0] < 16)
    throw new Error("Node 16.6.0 or higher is required.");
  
import { Intents, Message } from 'discord.js';
import admin from 'firebase-admin';
import klaw from 'klaw';
import path from 'path';
import { LeylineBot, EmbedBase, CommunityPoll, ReactionCollector, SentenceService, CloudConfig } from './classes';
//formally, dotenv shouldn't be used in prod, but because staging and prod share a VM, it's an option I elected to go with for convenience
import { config as dotenv_config } from 'dotenv';
dotenv_config();

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
    Object.assign(this, { ...this, ...await this.fetch() });
    //deep fetch - fetch the msg, then each reaction, then each reaction's users
    for (const reaction of (await this.fetch()).reactions.cache.values())
        await this.reactions.resolve(reaction).users.fetch();
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

// Globally instantiate our bot; prepare to login later
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
const init = async function () {
    //initialize firebase
    admin.initializeApp({});
    if(admin.apps.length === 0) bot.logger.error('Error initializing firebase app');
    else bot.logger.log('Firebase succesfully initialized');
    await CloudConfig.init();   //import cloud configuration settings
    bot.logger.log('CloudConfig initialized');

    //import commands
    for await (const item of klaw('./commands')) {
        const cmdFile = path.parse(item.path);
        if (!cmdFile.ext || cmdFile.ext !== '.js') continue;
        const cmdName = cmdFile.name.split('.')[0];
        try {
            const cmd = new (await import('./' + path.relative(process.cwd(), `${cmdFile.dir}${path.sep}${cmdFile.name}${cmdFile.ext}`))).default(bot);
            process.env.NODE_ENV === 'development' 
                ? bot.commands.set(cmdName, cmd) 
                : cmd.category !== 'development' &&
                    bot.commands.set(cmdName, cmd);
            
            //delete require.cache[require.resolve(`${cmdFile.dir}${path.sep}${cmdFile.name}${cmdFile.ext}`)];
        } catch(error) {
            bot.logger.error(`Error loading command file ${cmdFile.name}: ${error}`);
        }
    }
    bot.logger.log(`Loaded ${bot.commands.size} command files`);

    //import discord events
    for await (const item of klaw('./events/discord')) {
        const eventFile = path.parse(item.path);
        if (!eventFile.ext || eventFile.ext !== '.js') continue;
        const eventName = eventFile.name.split('.')[0];
        try {
            const event = new (await import('./' + path.relative(process.cwd(), `${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`))).default(bot);
            bot.events.set(eventName, event);
            bot.on(event.event_type, (...args) => event.run(...args));
            
            //delete require.cache[require.resolve(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`)];
        } catch(error) {
            bot.logger.error(`Error loading Discord event ${eventFile.name}: ${error}`);
        }
    }
    bot.logger.log(`Loaded ${bot.events.size} Discord events`)

    //import firebase events
    for await (const item of klaw('./events/firebase')){
        const eventFile = path.parse(item.path);
        if (!eventFile.ext || eventFile.ext !== '.js') continue;
        try {
            const firebase_event = new (await import('./' + path.relative(process.cwd(), `${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`))).default(bot);
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

            //delete require.cache[require.resolve(`${eventFile.dir}${path.sep}${eventFile.name}${eventFile.ext}`)];
        } catch(error) {
            bot.logger.error(`Error loading Firebase event ${eventFile.name}: ${error}`);
        }
    }
    bot.logger.log(`Loaded ${bot.firebase_events.size} Firebase events`);

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
        cmds.forEach(cmd => bot.commands.get(cmd.name.replaceAll(' ', '')).setApplicationCommand(cmd));
        //Register command permissions
        await bot.leyline_guild.commands.permissions.set({ 
            fullPermissions: bot.commands
                .filter(c => Object.keys(bot.config.command_perms).includes(c.category))
                .map(({id, category}) => ({ 
                    id,
                    permissions: bot.config.command_perms[category],
                })),
        }).catch(err => bot.logger.error(`registerCommands err: ${err}`));
        bot.logger.log(`Registered ${cmds.size} out of ${bot.commands.size} commands to Discord`);
    })();

    //import ReactionCollectors (this can be modified later to take a more generic approach)
    await (async function importReactionCollectors() {
        let succesfully_imported = 0;
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
    await (async function importPolls() {
        let succesfully_imported = 0; 
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

    //import sentences
    await (async function importSentences() {
        let succesfully_imported = 0; 
        const sentences = await admin
            .firestore()
			.collection(SentenceService.COLLECTION_PATH)
			.where('expires', '>', Date.now())
            .get();
        for (const doc of sentences.docs) {
            try {
                SentenceService.scheduleRemoval({
                    bot,
                    id: doc.id,
                    data: { ...doc.data() },
                });
                succesfully_imported++;
            } catch (err) {
                bot.logger.error(`importSentences error with doc id ${doc.id}: ${err}`);
            }   
        }
        bot.logger.log(`Imported ${succesfully_imported} sentences from Firestore`);
        return;
    })();

    bot.logger.debug('Post-initialization complete');
};

init();

// Prevent the bot from crashing on unhandled rejections
process.on("unhandledRejection", function (err, promise) {
    bot.logger.error(`Unhandled rejection: ${err.name}`);
    console.error("Unhandled rejection:\n", promise, "\n\nReason:\n", err);
});
