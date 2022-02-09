import { Command, EmbedBase, LeylineUser, } from '../../classes';
import * as Firebase from '../../api';

class awardgp extends Command {
    constructor(bot) {
        super(bot, {
            name: 'awardgp',
            description: 'Award good points to Leyline users through Discord',
            options: [
                {
                    type: 'SUB_COMMAND',
                    name: 'user',
                    description: 'Award a single NFT to a single Discord user',
                    options: [
                        {
                            type: 'USER',
                            name: 'user',
                            description: 'The Discord user to receive the NFT',
                            required: true,
                        },
                        {
                            type: 'INTEGER',
                            name: 'attendee-gp',
                            description: 'The amount of GP to be awarded',
                            required: false,
                        },
                    ],
                },
                {
                    type: 'SUB_COMMAND',
                    name: 'channel',
                    description: 'Award an NFT to all users in a specific voice channel',
                    options: [
                        {
                            type: 'CHANNEL',
                            name: 'channel',
                            description: 'The voice channel where all members inside it will receive an NFT',
                            required: true,
                            channelTypes: [
                                'GUILD_VOICE',
                                'GUILD_STAGE_VOICE',
                            ],
                        },
                        {
                            type: 'INTEGER',
                            name: 'attendee-gp',
                            description: 'The amount of GP to be awarded to attendees. 500 if unspecified',
                            required: false,
                        },
                        {
                            type: 'INTEGER',
                            name: 'mentor',
                            description: 'The mentor for the event',
                            required: false,
                        },
                        {
                            type: 'INTEGER',
                            name: 'mentor-gp',
                            description: 'The amount of GP to be awarded to the mentor. 1000 if unspecified',
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
        user: async ({intr, nft, opts}) => {
            const { bot } = this;
            const user = opts.getUser('user');
            if(!(await Firebase.isUserConnectedToLeyline(user.id))) return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **That user has not connected their Leyline & Discord accounts**`,
            }).Error()});

            const lluser = await new LeylineUser(await Firebase.getLeylineUID(user.id));
            //send Confirm prompt
            if(!(await this.sendConfirmPrompt({intr, nft, lluser})))
                return bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `❌ **NFT Award Canceled**`,
                }).Error()});

            //award NFT and send log messages
            await this.awardGP({intr, nft, user, lluser}) &&
                await this.messageUser({user, nft});
            return;
        },
        channel: ({intr, opts}) => {
            const { bot } = this;

            const [attendee_gp, mentor, mentor_gp] = [
                opts.getInteger('attendee-gp') || 500,
                opts.getUser('mentor'),
                opts.getInteger('mentor-gp') || 1000,
            ];
            const ch = opts.getChannel('channel');
            //validate args
            if(attendee_gp <= 0) return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **The attendee GP must be greater than 0!**`,
            }).Error()});
            if(mentor_gp <= 0) return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **The mentor GP must be greater than 0!**`,
            }).Error()});
            if(!ch.isVoice()) return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **That's not a voice channel!**`,
            }).Error()});

            this.gpDropVC({intr, attendee_gp, mentor, mentor_gp, ch});
            return;
        },
    };

    /**
     * Send a prompt to the user confirming the NFT awardal
     * @param {Object} params Destructured params
     * @param {Interaction} params.intr Discord.js `Interaction` that initiated the cmd
     * @param {Object} params.nft NFT object retrieved from Firestore
     * @param {LeylineUser} params.lluser LeylineUser that will receive the NFT
     * @param {boolean} params.ama Whether or not this prompt is in the context of weekly ama awardal
     * @returns {Promise<boolean>} `true` if the prompt was confirmed by the user, `false` otherwise
     */
    sendConfirmPrompt({intr, gp, lluser, ama=false, ...other} = {}) {
        const { bot } = this;
        return bot.intrConfirm({intr, embed: new EmbedBase(bot, {
            title: 'Confirm GP Award',
            //to whoever happens to read this in the future: sorry for the syntax :(
            ...ama && { description: other.description },
            fields: [
                ...(ama ? [
                    other.connected,
                    other.unconnected,
                    { name:'\u200b', value:'\u200b' },
                ] : []),
                {
                    name: `To User`,
                    value: ama ? 'See above list' : `[${lluser.username}](${lluser.profile_url})`,
                    inline: true,
                },
                {
                    name: `GP Amount`,
                    value: gp || 'N/A',
                    inline: true,
                },
            ],
        })});
    }

    /**
     * perform the whole NFT awardal process, including logs
     * @param {Object} params Destructured params
     * @param {Interaction} params.intr Discord.js `Interaction` that initiated the cmd
     * @param {Object} params.nft NFT object retrieved from Firestore
     * @param {User} params.user Discord.js User object, receipient of NFT
     * @param {LeylineUser} params.lluser User that will receive the NFT
     * @param {boolean} [params.update_intr] Should the original interaction message be updated with the result of the NFT awardal
     * @returns {Promise<boolean>} `true` if NFT was awarded and logs succesfully issued, `false` otherwise
     */
    async awardGP({intr, gp, user, lluser, update_intr=true} = {}) {
        const { bot } = this;
        try {
            //Award good points to the user
            await Firebase.awardPoints(lluser.uid, gp, {
                //TODO: update metadata
            });
            //Log success
            update_intr && bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `✅ **GP succesfully awarded to Leyline user [${lluser.username}](${lluser.profile_url})**`,
            }).Success()});
            const reward_embed = new EmbedBase(bot, {
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
                        name: `Requested By`,
                        value: bot.formatUser(intr.user),
                        inline: true,
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            });
            bot.logDiscord({embed: reward_embed});
            bot.logReward({embed: reward_embed});
            return true;
        } catch(err) {
            bot.logger.error(`Error awarding GP to LL user ${lluser.uid}`);
            bot.logger.error(err);
            bot.logDiscord({embed: new EmbedBase(bot, {
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
                        name: `Requested By`,
                        value: bot.formatUser(intr.user),
                        inline: true,
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            }).Error()}).then(m => //chained so we can include the URL of the private log msg
                update_intr && bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `❌ **I ran into an error, please check the log [message](${m.url}) for more information**`,
                }).Error()}));
            return false;
        }
    }

    /**
     * Message a user with a dynamic NFT awardal message
     * @param {Object} params Desctructured params
     * @param {User} params.user Discord.js user to receive message
     * @param {Object} params.nft NFT object, retrieved from Firestore
     * @returns {Promise<true>} Promise that resolves to true after message has been sent (not delivered) 
     */
    async messageUser({user, gp} = {}) {
        const { bot } = this;
        bot.sendDM({user, embed: new EmbedBase(bot, {
            fields: [
                {
                    name: `🎉 You Earned some GP!`,
                    value: `You have been awarded **${gp}** good points!
                        Check out your balance history on your [Leyline profile](https://leyline.gg/account-preferences/settings)!`,
                },
            ],	
        })});
        return true;
    }
    
    /**
     * Function specifically for awarding ama NFTs to every user in the specified voice channel
     * @param {Object} params Desctructured params
     * @param {CommandInteraction} params.intr The interaction that instantiated this command
     * @param {Object} params.nft NFT object, retrieved from Firestore
     * @param {BaseGuildVoiceChannel} params.ch The voice channel to pull users from
     * @returns {Promise<void>} promise that resolves when function execution is complete
     */
    async gpDropVC({intr, attendee_gp, mentor, mentor_gp, ch} = {}) {
        const { bot } = this;
        const [connected, unconnected] = [[], []];
        //add a custom 'leyline' prop to each GuildMember in the vc
        for(const member of (await bot.channels.fetch(ch.id, {force: true})).members.values())
            await Firebase.isUserConnectedToLeyline(member.id)
                ? connected.push(member)
                : unconnected.push(member);
        if(!connected.length && !unconnected.length) 
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **There are no users in the ${ch.toString()} voice channel!**`,
            }).Error()});

        //send confirm prompt with some custom values
        if(!(await this.sendConfirmPrompt({
            intr,
            gp: attendee_gp,
            ama: true,
            description: `**${connected.length} out of the ${connected.length + unconnected.length} users** in the voice channel have connected their Leyline & Discord accounts`,
            connected: !!connected.length ? [{
                name: '✅ Will Receive GP',
                value: connected.map(m => bot.formatUser(m.user)).join('\n'),
                inline: false,
            }] : [],
            unconnected: !!unconnected.length ? [{
                name: '❌ Will NOT Receive GP',
                value: unconnected.map(m => bot.formatUser(m.user)).join('\n'),
                inline: false,
            }] : [],
        }))) return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **GP Award Canceled**`,
            }).Error()});

        //start typing in channel because award process will take some time
        //this improves user experience
        intr.channel.sendTyping();

        // award each member an NFT, and log in private channels
        // store a prop noting whether the NFT was awarded or not
        for(const member of connected) {
            member.awarded = await this.awardGP({
				intr,
				gp: attendee_gp,
				user: member.user,
				lluser: await new LeylineUser(await Firebase.getLeylineUID(member.id)),
				update_intr: false,
			}) && await this.messageUser({nft, user: member.user});
        }

        //sort award results into arrays for the follow-up response
        const [awarded, unawarded] = [
            connected.filter(m => m.awarded),
            connected.filter(m => !m.awarded),
        ];

        const embed = new EmbedBase(bot, {
            description: `**${awarded.length} out of ${connected.length} users** received their GP`,
            fields: [
                ...(!!awarded.length ? [
                    {
                        name: '✅ Users Awarded',
                        value: awarded.map(m => bot.formatUser(m.user)).join('\n'),
                        inline: false,
                    }
                ] : []),
                ...(!!unawarded.length ? [
                    {
                        name: '❌ Users NOT Awarded',
                        value: unawarded.map(m => bot.formatUser(m.user)).join('\n'),
                        inline: false,
                    }
                ] : []),
            ],
        });
        !unawarded.length ? embed.Success() : embed.Warn();
        bot.intrReply({intr, embed});

        return;
    }

    async run({intr, opts}) {
        //TODO: update method docs
        const { bot } = this;

        //TODO: add common option filtering?

        this.subcommands[opts.getSubcommand()]({intr, opts});
    }
}

export default awardgp;
