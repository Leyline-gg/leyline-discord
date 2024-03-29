import bot from '../../bot';
import { Command, EmbedBase, LeylineUser, } from '../../classes';
import * as Firebase from '../../api';
import { partition } from 'lodash-es';

class awardnft extends Command {
    constructor() {
        super({
            name: 'awardnft',
            description: "Mint & award NFTs to Leyline users through Discord",
            options: [
                {
                    type: 'SUB_COMMAND',
                    name: 'user',
                    description: 'Award a single NFT to a single Discord user',
                    options: [
                        {
                            type: 'INTEGER',
                            name: 'nft-id',
                            description: 'The ID of the NFT to be awarded',
                            required: true,
                        },
                        {
                            type: 'USER',
                            name: 'user',
                            description: 'The Discord user to receive the NFT',
                            required: true,
                        },
                    ],
                },
                {
                    type: 'SUB_COMMAND',
                    name: 'channel',
                    description: 'Award an NFT to all users in a specific voice channel',
                    options: [
                        {
                            type: 'INTEGER',
                            name: 'nft-id',
                            description: 'The ID of the NFT to be awarded',
                            required: true,
                        },
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
                    ],
                },
            ],
            category: 'admin',
            deferResponse: true,
        });
    }

    subcommands = {
        user: async ({intr, nft, opts}) => {
            const user = opts.getUser('user');
            if(!(await Firebase.isUserConnectedToLeyline(user.id))) return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **That user has not connected their Leyline & Discord accounts**`,
            }).Error()});

            const lluser = await new LeylineUser(await Firebase.getLeylineUID(user.id));
            //send Confirm prompt
            if(!(await this.sendConfirmPrompt({intr, nft, lluser})))
                return bot.intrReply({intr, embed: new EmbedBase({
                    description: `❌ **NFT Award Canceled**`,
                }).Error()});

            //award NFT and send log messages
            await this.awardNFT({intr, nft, user, lluser}) &&
                await this.messageUser({user, nft});
            return;
        },
        channel: ({intr, nft, opts}) => {
            const ch = opts.getChannel('channel');
            //validate args
            if(!ch.isVoice()) return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **That's not a voice channel!**`,
            }).Error()});

            this.nftDropVC({intr, nft, ch});
            return;
        },
    };

    /**
     * Send a prompt to the user confirming the NFT awardal
     * @param {Object} params Destructured params
     * @param {Interaction} params.intr Discord.js `Interaction` that initiated the cmd
     * @param {Object} params.nft NFT object retrieved from Firestore
     * @param {LeylineUser} params.lluser LeylineUser that will receive the NFT
     * @param {boolean} params.event Whether or not this prompt is in the context of a live event awardal
     * @returns {Promise<boolean>} `true` if the prompt was confirmed by the user, `false` otherwise
     */
    sendConfirmPrompt({intr, nft, lluser, event=false, ...other} = {}) {
        return bot.intrConfirm({intr, embed: new EmbedBase({
            title: 'Confirm NFT Award',
            thumbnail: {
                url: nft.thumbnailUrl,
            },
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
                    inline: true
                },
                {
                    name: `NFT Name`,
                    value: nft?.name || 'N/A',
                    inline: true
                },
                {
                    name: `Equip Slot`,
                    value: nft?.equipSlot || 'N/A',
                    inline: true
                },
                {
                    name: `Rarity`,
                    value: nft?.rarity || 'N/A',
                    inline: true
                },
                {
                    name: `Reward Type`,
                    value: nft?.rewardType || 'N/A',
                    inline: true
                },
                {
                    name: `Artist Credit`,
                    value: nft?.artistCredit || 'N/A',
                    inline: true
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
    async awardNFT({intr, nft, user, lluser, update_intr: update_intr=true} = {}) {
        try {
            //Award NFT to LL user
            await Firebase.rewardNFT(lluser.uid, nft.id);
            //Log success
            update_intr && bot.intrReply({intr, embed: new EmbedBase({
                thumbnail: { url: nft.thumbnailUrl },
                description: `✅ **NFT succesfully minted for Leyline user [${lluser.username}](${lluser.profile_url})**`,
            }).Success()});
            const reward_embed = new EmbedBase({
                thumbnail: { url: nft.thumbnailUrl },
                title: 'NFT Awarded',
                fields: [
                    {
                        name: `Leyline User`,
                        value: `[${lluser.username}](${lluser.profile_url})`,
                        inline: true
                    },
                    {
                        name: `Discord User`,
                        value: bot.formatUser(user),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                    {
                        name: `NFT Info`,
                        value: `${nft.name} (\`${nft.id}\`)`,
                        inline: true
                    },
                    {
                        name: `Requested By`,
                        value: bot.formatUser(intr.user),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            });
            bot.logDiscord({embed: reward_embed});
            bot.logReward({embed: reward_embed});
            return true;
        } catch(err) {
            bot.logger.error(`Error awarding NFT with id ${nft.id} to LL user ${lluser.uid}`);
            bot.logger.error(err);
            bot.logDiscord({embed: new EmbedBase({
                thumbnail: { url: nft.thumbnailUrl },
                title: 'NFT __NOT__ Awarded',
                description: `**Error**: ${err}`,
                fields: [
                    {
                        name: `Leyline User`,
                        value: `[${lluser.username}](${lluser.profile_url})`,
                        inline: true
                    },
                    {
                        name: `Discord User`,
                        value: bot.formatUser(user),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                    {
                        name: `NFT Info`,
                        value: `${nft.name} (\`${nft.id}\`)`,
                        inline: true
                    },
                    {
                        name: `Requested By`,
                        value: bot.formatUser(intr.user),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            }).Error()}).then(m => //chained so we can include the URL of the private log msg
                update_intr && bot.intrReply({intr, embed: new EmbedBase({
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
    async messageUser({user, nft} = {}) {
        bot.sendDM({user, embed: new EmbedBase({
            thumbnail: { url: nft.thumbnailUrl },
            fields: [
                {
                    name: `🎉 You Earned an NFT!`,
                    value: `You have been awarded a(n) ${nft.rarity.toLowerCase()} **${nft.name}**!
                        Check it out on your [Leyline profile](https://leyline.gg/profile)!`,
                },
            ],	
        })});
        return true;
    }
    
    /**
     * Function specifically for awarding event NFTs to every user in the specified voice channel
     * @param {Object} params Desctructured params
     * @param {CommandInteraction} params.intr The interaction that instantiated this command
     * @param {Object} params.nft NFT object, retrieved from Firestore
     * @param {BaseGuildVoiceChannel} params.ch The voice channel to pull users from
     * @returns {Promise<void>} promise that resolves when function execution is complete
     */
    async nftDropVC({intr, nft, ch} = {}) {
        const voice_members = [];
        for(const member of (await bot.channels.fetch(ch.id, {force: true})).members.values()) {
            voice_members.push(Object.assign(member, {
                connected: await Firebase.isUserConnectedToLeyline(member.id),
            }));
        }
        
        if(!voice_members.length) 
            return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **There are no users in the ${ch.toString()} voice channel!**`,
            }).Error()});

        const [eligible, ineligible] = partition(voice_members, m => m.connected && !m.voice.deaf);

        // this whole embed awardal thing needs to be refactored into its own class
        const determineIneligibleEmoji = function (member) {
            if(member?.voice?.selfDeaf) return bot.config.emoji.deafened;
            if(member?.connected === false) return bot.config.emoji.unconnected;
            return '❓';
        };

        //send confirm prompt with some custom values
        if(!(await this.sendConfirmPrompt({
            intr,
            nft,
            event: true,
            description: `**Pre-Drop Summary**`,
            eligible: !!eligible.length ? EmbedBase.splitField({
                name: '✅ ELIGIBLE to Receive NFT',
                value: eligible.map(m => bot.formatUser(m.user)).join('\n'),
                inline: false
            }) : [],
            ineligible: !!ineligible.length ? EmbedBase.splitField({
                name: '❌ INELIGIBLE to Receive NFT',
                value: ineligible.map(m => `${determineIneligibleEmoji(m)} ${bot.formatUser(m.user)}`).join('\n'),
                inline: false
            }) : [],
        }))) return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **NFT Award Canceled**`,
            }).Error()});

        //start typing in channel because award process will take some time
        //this improves user experience
        intr.channel.sendTyping();

        // award each member an NFT, and log in private channels
        // store a prop noting whether the NFT was awarded or not
        for(const member of eligible) {
            member.awarded = await this.awardNFT({
				intr,
				nft,
				user: member.user,
				lluser: await new LeylineUser(await Firebase.getLeylineUID(member.id)),
				update_intr: false,
			}) && await this.messageUser({nft, user: member.user});
        }

        //sort award results into arrays for the follow-up response
        const [awarded, unawarded] = partition(eligible, m => m.awarded);

        const embed = new EmbedBase({
            description: `**${awarded.length} out of ${eligible.length} NFTs** were awarded`,
            thumbnail: { url: nft.thumbnailUrl },
            fields: [
                ...(!!awarded.length ? EmbedBase.splitField({
                    name: '✅ Users Awarded',
                    value: awarded.map(m => bot.formatUser(m.user)).join('\n'),
                }) : []),
                ...(!!unawarded.length ? EmbedBase.splitField({
                    name: '⚠ Users Award FAILED',
                    value: unawarded.map(m => bot.formatUser(m.user)).join('\n'),
                 }) : []),
                ...(!!ineligible.length ? EmbedBase.splitField({
                    name: '❌ Users Award INELIGIBLE',
                    value: ineligible.map(m => `${determineIneligibleEmoji(m)} ${bot.formatUser(m.user)}`).join('\n'),
                    inline: false
                }) : []),
            ],
        });
        !unawarded.length ? embed.Success() : embed.Warn();
        bot.intrReply({intr, embed});

        return;
    }

    async run({intr, opts}) {

        //Filter out args
        const nft = await Firebase.getNFT(opts.getInteger('nft-id').toString());
        if(!nft?.id) return bot.intrReply({intr, embed: new EmbedBase({
            description: `❌ **I couldn't locate that NFT in Leyline's database**`,
        }).Error()});

        this.subcommands[opts.getSubcommand()]({intr, nft, opts});
    }
}

export default awardnft;
