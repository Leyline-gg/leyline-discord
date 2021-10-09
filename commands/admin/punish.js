import { Command, EmbedBase, PunishmentService } from '../../classes';
import parse from 'parse-duration';

class PunishmentSubCommand {
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
                    description: 'The target user to punish',
                    required: true,
                }] : []),
                ...(duration ? [{
                    type: 'STRING',
                    name: 'duration',
                    description: 'The duration of the punishment, eg: 7d. No duration means indefinite',
                    required: false,
                }] : []),
                ...(reason ? [{
                    type: 'STRING',
                    name: 'reason',
                    description: 'The reason the punishment was issued',
                    required: false,
                }] : []),
            ],
        }
    }
}

class punish extends Command {
    constructor(bot) {
        super(bot, {
            name: 'punish',
            description: "Punishment utilities",
            options: [
                new PunishmentSubCommand({
                    name: 'warn',
                    description: 'Issue a written warning to a Discord user',
                    options: {
                        duration: false,
                    },
                }),
                new PunishmentSubCommand({
                    name: 'mute',
                    description: 'Issue a server mute to a Discord user',
                }),
                new PunishmentSubCommand({
                    name: 'kick',
                    description: 'Remove a Discord user from the server',
                    options: {
                        duration: false,
                    },
                }),
                new PunishmentSubCommand({
                    name: 'ban',
                    description: 'Issue a temporary or permanent ban to a Discord user',
                }),
                new PunishmentSubCommand({
                    name: 'history',
                    description: 'View the entire recorded punishment history for a Discord user',
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
            //confirm prompt from admin
            //issue punishment
            await PunishmentService.warnUser({
                bot,
                mod: intr.user,
                user,
                reason,
            });
            //log punishment
            /*await*/ PunishmentService.logPunishment({
                bot,
                user,
                mod: intr.user,
                type,
                reason,
            });
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `⚖ **Punishment Successfully Issued**`,
            }).Punish(), ephemeral: true});
        },
        mute: async ({intr, type, user, expires, reason}) => {
            const { bot } = this;
            //confirm prompt from admin
            //issue punishment
            await PunishmentService.muteUser({
                bot,
                user,
                mod: intr.user,
                expires,
                reason,
            });
            //log punishment
            /*await*/ PunishmentService.logPunishment({
                bot,
                user,
                mod: intr.user,
                type,
                expires,
                reason,
            });
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `⚖ **Punishment Successfully Issued**`,
            }).Punish(), ephemeral: true});
        },
        history: async ({intr, user}) => {
            const { bot } = this;
            const embed = await PunishmentService.getHistory({bot, user});
            return bot.intrReply({intr, embed, ephemeral: true});
        },
    };

    async run({intr, opts}) {
        const { bot } = this;
        
        //gotta store `type` separately to pass into subcmd, thanks 'use strict' :/
        const [type, user, duration, reason] = [
            opts.getSubcommand(),
            opts.getUser('target'),
            opts.getString('duration'),
            opts.getString('reason'),
        ];
        const parsed_dur = parse(duration); //ms

        if(!!duration && !parsed_dur)
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **That's not a valid duration**`,
            }).Error()});

        //parse duration to epoch timestamp
        const expires = !!duration ?
             Date.now() + parsed_dur :
             null;

        //easter egg
        //if(user.id === '139120967208271872')
        //    return bot.intrReply({intr, embed: new EmbedBase(bot, {
        //        title: 'Nice try!',
        //        image: {
        //            url: '',
        //        },
        //    }).Warn()});

        this.subcommands[type]({
            intr, 
            user, 
            expires, 
            reason,
            type: PunishmentService.PUNISHMENT_TYPES[type.toUpperCase()], 
        }).catch(err => {
            bot.logger.error(err);
            bot.intrReply({intr, embed: new EmbedBase(bot).ErrorMsg(err.message), ephemeral: true});
        });
    }
}

export default punish;
