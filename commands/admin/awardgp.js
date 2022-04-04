import { Command, EmbedBase, LeylineUser, } from '../../classes';
import * as Firebase from '../../api';
import { partition } from 'lodash-es';

class awardgp extends Command {
    constructor() {
        super({
            name: 'awardgp',
            description: 'Award good points to Leyline users through Discord',
            options: [
                {
                    type: 'SUB_COMMAND',
                    name: 'user',
                    description: 'Award a good points to a single Discord user',
                    options: [
                        {
                            type: 'USER',
                            name: 'user',
                            description: 'The Discord user to receive the GP',
                            required: true,
                        },
                        {
                            type: 'INTEGER',
                            name: 'gp',
                            description: 'The amount of GP to be awarded to the user',
                            required: true,
                        },
                        {
                            type: 'STRING',
                            name: 'ledger-message',
                            description: 'The reason for awarding GP - this will appear in the user\'s permanent GP ledger',
                            required: true,
                        },
                    ],
                },
                {
                    type: 'SUB_COMMAND',
                    name: 'channel',
                    description: 'Award Good Points to all users in a specific voice channel',
                    options: [
                        {
                            type: 'CHANNEL',
                            name: 'channel',
                            description: 'The voice channel where all members inside it will receive GP',
                            required: true,
                            channelTypes: [
                                'GUILD_VOICE',
                                'GUILD_STAGE_VOICE',
                            ],
                        },
                        {
                            type: 'STRING',
                            name: 'event-name',
                            description: 'The name of the event - this will appear in the user\'s permanent GP ledger', 
                            required: true,
                        },
                        {
                            type: 'INTEGER',
                            name: 'attendee-gp',
                            description: 'The amount of GP to be awarded to attendees. 500 if unspecified',
                            required: false,
                        },
                        {
                            type: 'INTEGER',
                            name: 'mentor-gp',
                            description: 'The amount of GP to be awarded to the mentor. 1000 if unspecified',
                            required: false,
                        },
                        {
                            type: 'USER',
                            name: 'mentor1',
                            description: 'One of the mentors for the event',
                            required: false,
                        },
                        {
                            type: 'USER',
                            name: 'mentor2',
                            description: 'One of the mentors for the event',
                            required: false,
                        },
                        {
                            type: 'USER',
                            name: 'mentor3',
                            description: 'One of the mentors for the event',
                            required: false,
                        },
                        {
                            type: 'USER',
                            name: 'mentor4',
                            description: 'One of the mentors for the event',
                            required: false,
                        },
                        {
                            type: 'USER',
                            name: 'mentor5',
                            description: 'One of the mentors for the event',
                            required: false,
                        },
                    ],
                },
            ],
            category: 'admin',
            deferResponse: true,
        });
    }

    subcommands = {
        user: async ({intr, opts}) => {
            const [user, gp, ledger_message] = [
                opts.getUser('user'),
                opts.getInteger('gp'),
                opts.getString('ledger-message'),
            ];
            if(!(await Firebase.isUserConnectedToLeyline(user.id))) return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **That user has not connected their Leyline & Discord accounts**`,
            }).Error()});

            const lluser = await new LeylineUser(await Firebase.getLeylineUID(user.id));
            //send Confirm prompt
            if(!(await this.sendConfirmPrompt({intr, ledger_message, gp, lluser})))
                return bot.intrReply({intr, embed: new EmbedBase({
                    description: `❌ **GP Award Canceled**`,
                }).Error()});

            //award GP and send log messages
            await this.awardGP({intr, gp, ledger_message, user, lluser}) &&
                await this.messageUser({user, gp});
            return;
        },
        channel: ({intr, opts}) => {

            const [event_name, attendee_gp, mentors, mentor_gp] = [
                opts.getString('event-name'),
                opts.getInteger('attendee-gp') || 500,
                [opts.getUser('mentor1'), opts.getUser('mentor2'), opts.getUser('mentor3'), opts.getUser('mentor4'), opts.getUser('mentor5')],
                opts.getInteger('mentor-gp') || 1000,
            ];
            const ch = opts.getChannel('channel');
            //validate args
            if(attendee_gp <= 0) return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **The attendee GP must be greater than 0!**`,
            }).Error()});
            if(mentor_gp <= 0) return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **The mentor GP must be greater than 0!**`,
            }).Error()});
            if(!ch.isVoice()) return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **That's not a voice channel!**`,
            }).Error()});

            this.gpDropVC({intr, event_name, attendee_gp, ch, mentors, mentor_gp});
            return;
        },
    };

    /**
     * Send a prompt to the user confirming the GP awardal
     * @param {Object} params Destructured params
     * @param {Interaction} params.intr Discord.js `Interaction` that initiated the cmd
     * @param {string} params.ledger_message Message to be displayed in the GP ledger
     * @param {number} params.gp amount of GP to be displayed in the prompt
     * @param {LeylineUser} params.lluser LeylineUser that will receive the GP
     * @param {boolean} params.event Whether or not this prompt is in the context of a live event awardal
     * @returns {Promise<boolean>} `true` if the prompt was confirmed by the user, `false` otherwise
     */
    sendConfirmPrompt({intr, ledger_message, gp, lluser, event=false, ...other} = {}) {
        return bot.intrConfirm({intr, embed: new EmbedBase({
            title: 'Confirm GP Award',
            //to whoever happens to read this in the future: sorry for the syntax :(
            ...event && { description: other.description },
            fields: [
                ...(event ? [
                    other.eligible,
                    other.ineligible,
                    { name:'\u200b', value:'\u200b' },
                ] : []),
                {
                    name: `To User${event ? 's' : ''}`,
                    value: event ? 'See above list' : `[${lluser.username}](${lluser.profile_url})`,
                    inline: true,
                },
                {
                    name: `GP Amount`,
                    value: gp.toString() || 'N/A',
                    inline: true,
                },
                {
                    name: `Ledger Message`,
                    value: ledger_message,
                    inline: true,
                },
            ],
        })});
    }

    /**
     * perform the whole GP awardal process, including logs
     * @param {Object} params Destructured params
     * @param {Interaction} params.intr Discord.js `Interaction` that initiated the cmd
     * @param {number} params.gp amount of GP to be awarded to the user
     * @param {string} params.ledger_message Message to be displayed in the GP ledger
     * @param {User} params.user Discord.js User object, receipient of GP
     * @param {LeylineUser} params.lluser User that will receive the GP
     * @param {boolean} [params.update_intr] Should the original interaction message be updated with the result of the GP awardal
     * @returns {Promise<boolean>} `true` if GP was awarded and logs succesfully issued, `false` otherwise
     */
    async awardGP({intr, gp, ledger_message, user, lluser, update_intr=true} = {}) {
        try {
            //Award good points to the user
            await Firebase.awardPoints(lluser.uid, gp, {
                category: ledger_message,
                comment: `Requested by ${bot.formatUser(intr.user)} via Discord`,
            });
            //Log success
            update_intr && bot.intrReply({intr, embed: new EmbedBase({
                description: `✅ **GP succesfully awarded to Leyline user [${lluser.username}](${lluser.profile_url})**`,
            }).Success()});
            const reward_embed = new EmbedBase({
                title: 'GP Awarded',
                fields: [
                    {
                        name: `Leyline User`,
                        value: `[${lluser.username}](${lluser.profile_url})`,
                        inline: true,
                    },
                    {
                        name: `Discord User`,
                        value: bot.formatUser(user),
                        inline: true,
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                    {
                        name: `GP Count`,
                        value: `${gp}`,
                        inline: true,
                    },
                    {
                        name: `Ledger Message`,
                        value: ledger_message,
                        inline: true,
                    },
                    {
                        name: `Requested By`,
                        value: bot.formatUser(intr.user),
                        inline: true,
                    },
                    //{ name: '\u200b', value: '\u200b', inline: true },
                ],
            });
            bot.logDiscord({embed: reward_embed});
            bot.logReward({embed: reward_embed});
            return true;
        } catch(err) {
            bot.logger.error(`Error awarding GP to LL user ${lluser.uid}`);
            bot.logger.error(err);
            bot.logDiscord({embed: new EmbedBase({
                title: 'NFT __NOT__ Awarded',
                description: `**Error**: ${err}`,
                fields: [
                    {
                        name: `Leyline User`,
                        value: `[${lluser.username}](${lluser.profile_url})`,
                        inline: true,
                    },
                    {
                        name: `Discord User`,
                        value: bot.formatUser(user),
                        inline: true,
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                    {
                        name: `GP Count`,
                        value: `${gp}`,
                        inline: true,
                    },
                    {
                        name: `Ledger Message`,
                        value: ledger_message,
                        inline: true,
                    },
                    {
                        name: `Requested By`,
                        value: bot.formatUser(intr.user),
                        inline: true,
                    },
                    //{ name: '\u200b', value: '\u200b', inline: true },
                ],
            }).Error()}).then(m => //chained so we can include the URL of the private log msg
                update_intr && bot.intrReply({intr, embed: new EmbedBase({
                    description: `❌ **I ran into an error, please check the log [message](${m.url}) for more information**`,
                }).Error()}));
            return false;
        }
    }

    /**
     * Message a user with a dynamic GP awardal message
     * @param {Object} params Desctructured params
     * @param {User} params.user Discord.js user to receive message
     * @param {number} params.gp amount of GP to be awarded to the user
     * @returns {Promise<true>} Promise that resolves to true after message has been sent (not delivered) 
     */
    async messageUser({user, gp} = {}) {
        bot.sendDM({user, embed: new EmbedBase({
            fields: [
                {
                    name: `🎉 You Earned Some GP!`,
                    value: `You have been awarded **${gp}** good points!
                        Check out your balance history on your [Leyline profile](https://leyline.gg/account-preferences/settings)!`,
                },
            ],	
        })});
        return true;
    }
    
    /**
     * Function specifically for awarding Good Points to every user in the specified voice channel
     * @param {Object} params Desctructured params
     * @param {CommandInteraction} params.intr The interaction that instantiated this command
     * @param {string} params.event_name Name of the to be included in the ledger history
     * @param {number} params.attendee_gp amount of GP to be awarded to the attendees
     * @param {BaseGuildVoiceChannel} params.ch The voice channel to pull users from
     * @param {Array<User>} [params.mentors] Array of Discord.js Users - mentors for the event (to receive mentor_gp)
     * @param {number} [params.mentor_gp] amount of GP to be awarded to the mentor
     * @returns {Promise<void>} promise that resolves when function execution is complete
     */
    async gpDropVC({intr, event_name, attendee_gp, ch, mentors=[], mentor_gp=null} = {}) {
        const voice_members = [];
        const ledger_message = `Attended ${event_name} Discord Event`;
        for(const member of (await bot.channels.fetch(ch.id, {force: true})).members.values()) {
            voice_members.push(Object.assign(member, {
                connected: await Firebase.isUserConnectedToLeyline(member.id),
            }));
        }
        
        if(!voice_members.length) 
            return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **There are no users in the ${ch.toString()} voice channel!**`,
            }).Error()});

        const [eligible, ineligible] = partition(voice_members, m => m.connected && !m.voice.selfDeaf);

        // this whole embed awardal thing needs to be refactored into its own class
        const determineIneligibleEmoji = function (member) {
            if(member?.voice?.selfDeaf) return bot.config.emoji.deafened;
            if(member?.connected === false) return bot.config.emoji.unconnected;
            return '❓';
        };
        
        //send confirm prompt with some custom values
        if(!(await this.sendConfirmPrompt({
            intr,
            ledger_message,
            gp: attendee_gp,
            event: true,
            description: `**Pre-Drop Summary**`,
            eligible: !!eligible.length ? EmbedBase.splitField({
                name: '✅ ELIGIBLE to Receive GP',
                value: eligible.map(m => 
                    `${mentors.some(mentor => mentor?.id == m.id) ? '**[M]**' : ''} \
                     ${bot.formatUser(m.user)}`
                ).join('\n'),
                inline: false,
            }) : [],
            ineligible: !!ineligible.length ? EmbedBase.splitField({
                name: '❌ INELIGIBLE to Receive GP',
                value: ineligible.map(m => 
                    `${determineIneligibleEmoji(m)} \
                     ${mentors.some(mentor => mentor?.id == m.id) ? '**[M]**' : ''} \
                     ${bot.formatUser(m.user)}`
                ).join('\n'),
                inline: false,
            }) : [],
        }))) return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **GP Award Canceled**`,
            }).Error()});

        //start typing in channel because award process will take some time
        //this improves user experience
        intr.channel.sendTyping();

        // award each member GP and log in private channels
        // store a prop noting whether the GP was awarded or not
        for(const member of eligible) {
            let award_gp_obj = {
				intr,
				gp: attendee_gp,
                ledger_message,
				user: member.user,
				lluser: await new LeylineUser(await Firebase.getLeylineUID(member.id)),
				update_intr: false,
			};
            //explicitly award mentor GP
            if(mentors.some(mentor => mentor?.id == member.id)) award_gp_obj = {
                ...award_gp_obj,
                gp: mentor_gp,
                ledger_message: `Mentored ${event_name} Discord Event`,
            };
            member.awarded = await this.awardGP(award_gp_obj) 
                && await this.messageUser(award_gp_obj);
        }

        //sort award results into arrays for the follow-up response
        const [awarded, unawarded] = partition(eligible, m => m.awarded);

        const embed = new EmbedBase({
            description: `**${awarded.length} out of ${eligible.length} users** received their GP`,
            fields: [
                ...(!!awarded.length ? EmbedBase.splitField({
                    name: '✅ Users Awarded',
                    value: awarded.map(m => 
                        `${mentors.some(mentor => mentor?.id == m.id) ? '**[M]**' : ''} \
                         ${bot.formatUser(m.user)}`
                    ).join('\n'),
                }) : []),
                ...(!!unawarded.length ? EmbedBase.splitField({
                    name: '⚠ Users Award FAILED',
                    value: unawarded.map(m => 
                        `${mentors.some(mentor => mentor?.id == m.id) ? '**[M]**' : ''} \
                         ${bot.formatUser(m.user)}`
                    ).join('\n'),
                 }) : []),
                ...(!!ineligible.length ? EmbedBase.splitField({
                    name: '❌ Users Award INELIGIBLE',
                    value: ineligible.map(m => 
                        `${determineIneligibleEmoji(m)} \
                         ${mentors.some(mentor => mentor?.id == m.id) ? '**[M]**' : ''} \
                         ${bot.formatUser(m.user)}`
                    ).join('\n'),
                    inline: false
                }) : []),
            ],
        });
        !unawarded.length ? embed.Success() : embed.Warn();
        bot.intrReply({intr, embed});

        return;
    }

    async run({intr, opts}) {
        //TODO: add common option filtering?

        this.subcommands[opts.getSubcommand()]({intr, opts});
    }
}

export default awardgp;
