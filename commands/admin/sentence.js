import { Command, EmbedBase, SentenceService } from '../../classes';
import parse from 'parse-duration';

class SentenceSubCommand {
    constructor({
        name,
        description,
        options: {
            target=true,
            duration=true,
            reason=true,
        } = {},
    } = {}) {
        return {
            type: 'SUB_COMMAND',
            name,
            description,
            options: [
                ...(target ? [{
                    type: 'USER',
                    name: 'target',
                    description: 'The target user to sentence',
                    required: true,
                }] : []),
                ...(duration ? [{
                    type: 'STRING',
                    name: 'duration',
                    description: 'The duration of the sentence, eg: 7d. No duration means indefinite',
                    required: false,
                }] : []),
                ...(reason ? [{
                    type: 'STRING',
                    name: 'reason',
                    description: 'The reason the sentence was issued',
                    required: false,
                }] : []),
            ],
        }
    }
}

class sentence extends Command {
    constructor(bot) {
        super(bot, {
            name: 'sentence',
            description: "Sentence utilities",
            options: [
                new SentenceSubCommand({
                    name: 'warn',
                    description: 'Issue a written warning to a Discord user',
                    options: {
                        duration: false,
                    },
                }),
                new SentenceSubCommand({
                    name: 'mute',
                    description: 'Issue a server mute to a Discord user',
                }),
                new SentenceSubCommand({
                    name: 'kick',
                    description: 'Remove a Discord user from the server',
                    options: {
                        duration: false,
                    },
                }),
                new SentenceSubCommand({
                    name: 'ban',
                    description: 'Issue a temporary or permanent ban to a Discord user',
                }),
                new SentenceSubCommand({
                    name: 'history',
                    description: 'View the entire recorded sentence history for a Discord user',
                    options: {
                        duration: false,
                        reason: false,
                    }
                }),
            ],
            category: 'admin',
            //deferResponse: true,
        });
    }

    subcommands = {
        warn: async ({intr, type, user, reason}) => {
            const { bot } = this;
            //issue sentence
            await SentenceService.warnUser({
                bot,
                mod: intr.user,
                user,
                reason,
            });
            //log sentence
            /*await*/ SentenceService.logSentence({
                bot,
                user,
                mod: intr.user,
                type,
                reason,
            });
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `⚖ **Sentence Successfully Issued**`,
            }).Sentence(), ephemeral: true});
        },
        mute: async ({intr, type, user, expires, reason}) => {
            const { bot } = this;
            //issue sentence
            await SentenceService.muteUser({
                bot,
                user,
                mod: intr.user,
                expires,
                reason,
            });
            //log sentence
            /*await*/ SentenceService.logSentence({
                bot,
                user,
                mod: intr.user,
                type,
                expires,
                reason,
            });
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `⚖ **Sentence Successfully Issued**`,
            }).Sentence(), ephemeral: true});
        },
        kick: async ({intr, type, user, reason}) => {
            const { bot } = this;
            //issue sentence
            await SentenceService.kickUser({
                bot,
                mod: intr.user,
                user,
                reason,
            });
            //log sentence
            /*await*/ SentenceService.logSentence({
                bot,
                user,
                mod: intr.user,
                type,
                reason,
            });
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `⚖ **Sentence Successfully Issued**`,
            }).Sentence(), ephemeral: true});
        },
        ban: async ({intr, type, user, expires, reason}) => {
            const { bot } = this;
            //issue sentence
            await SentenceService.banUser({
                bot,
                user,
                mod: intr.user,
                expires,
                reason,
            });
            //log sentence
            /*await*/ SentenceService.logSentence({
                bot,
                user,
                mod: intr.user,
                type,
                expires,
                reason,
            });
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `⚖ **Sentence Successfully Issued**`,
            }).Sentence(), ephemeral: true});
        },
        history: async ({intr, user}) => {
            const { bot } = this;
            const mod = bot.checkMod(user.id);
            return bot.intrReply({
                intr, 
                embed: SentenceService.generateHistoryEmbed({
                    bot,
                    user,
                    mod,
                    history_docs: await (mod 
                        ? SentenceService.getModHistory({user})
                        : SentenceService.getHistory({user})),
                }), 
                ephemeral: true
            });
        },
    };

    async run({intr, opts}) {
        const { bot } = this;
        const { SENTENCE_TYPES: SENTENCE_TYPES } = SentenceService;
        
        //gotta store `type` separately to pass into subcmd, thanks 'use strict' :/
        const [type, user, duration, reason] = [
            opts.getSubcommand().toUpperCase(),
            opts.getUser('target'),
            opts.getString('duration'),
            opts.getString('reason'),
        ];
        const parsed_dur = parse(duration); //ms

        if(!!duration && !parsed_dur)
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **That's not a valid duration**`,
            }).Error()});

        //send confirm prompt
        if (Object.keys(SENTENCE_TYPES).includes(type))
            if (!(await bot.intrConfirm({
                intr,
                ephemeral: true,
                embed: new EmbedBase(bot, {
                    description: `
                        ⚠ **Are you sure you want to ${type} ${bot.formatUser(user)} for \`${reason ?? 'No reason given'}\`?**

                        Is this sentence consistent with the official rules & moderation protocol?
                        Is this sentence consistent with the other sentences you've issued this past month?
                    `,
                }).Warn(),
            })))
                return bot.intrReply({
                    intr,
                    ephemeral: true,
                    embed: new EmbedBase(bot, {
                        description: `❌ **Sentence canceled**`,
                    }).Error(),
                });

        //convert duration to epoch timestamp
        const expires = !!duration 
            ? Date.now() + parsed_dur 
            : null;

        //easter egg
        if(type !== 'HISTORY' && user.id === '139120967208271872')
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                title: 'Nice try!',
                image: {
                    url: '',    //to be updated later
                },
            }).Warn()});

        this.subcommands[type.toLowerCase()]({
            intr, 
            user, 
            expires, 
            reason,
            type: SENTENCE_TYPES[type], 
        }).catch(err => {
            bot.logger.error(err);
            bot.intrReply({intr, embed: new EmbedBase(bot).ErrorDesc(err.message), ephemeral: true});
        });
    }
}

export default sentence;
