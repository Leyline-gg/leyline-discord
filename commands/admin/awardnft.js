const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');
const Firebase = require('../../classes/FirebaseAPI');
const LeylineUser = require('../../classes/LeylineUser');

class awardnft extends Command {
    constructor(bot) {
        super(bot, {
            name: 'awardnft',
            description: "Mint & award an NFT to a discord user's Leyline profile",
            usage: '<nft-id> <@discord-user>',
            aliases: [],
            category: 'admin'
        })
    }

    /**
     * Send a prompt to the user confirming the NFT awardal
     * @param {Object} params Destructured params
     * @param {Message} params.msg Discord.js Message that initiated the cmd
     * @param {Object} params.nft NFT object retrieved from Firestore
     * @param {LeylineUser} params.lluser LeylineUser that will receive the NFT
     * @param {boolean} params.qna Whether or not this prompt is in the context of weekly qna awardal
     * @returns {Promise<boolean>} `true` if the prompt was confirmed by the user, `false` otherwise
     */
    async sendConfirmPrompt({msg, nft, lluser, qna=false, ...other} = {}) {
        const bot = this.bot;
        let confirm = false;
        await msg.channel.send({embed: new EmbedBase(bot, {
            title: 'Confirm NFT Award',
            thumbnail: {
                url: nft.thumbnailUrl,
            },
            //to whoever happens to read this in the future: sorry for the syntax :(
            ...qna && { description: other.description },
            fields: [
                ...(qna ? [
                    other.connected,
                    other.unconnected,
                    { name:'\u200b', value:'\u200b' },
                ] : []),
                {
                    name: `To User`,
                    value: qna ? 'See above list' : `[${lluser.username}](${lluser.profile_url})`,
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
        })}).then(async (m) => {
            //add reactions for confirmation
			await m.react('✅');
			await m.react('❌');
			await m.awaitReactions((r, u) => (r.emoji.name === '✅' || r.emoji.name === '❌') && u.id === msg.author.id, 
				{ time: qna ? 15000 : 10000, max: 1, errors: ['time'] })
				.then((collected) => confirm = collected.first().emoji.name === '✅')	//update confirm boolean to match the emoji collected
				.catch((collected) => collected);	//do nothing
		});
        return confirm;
    }

    /**
     * perform the whole NFT awardal process, including logs
     * @param {Object} params Destructured params
     * @param {Message} params.msg Discord.js Message that initiated the cmd
     * @param {Object} params.nft NFT object retrieved from Firestore
     * @param {User} params.user Discord.js User object, receipient of NFT
     * @param {LeylineUser} params.lluser User that will receive the NFT
     * @param {boolean} params.log_same_chat Whether or not to log messages inside the chat that the command was originally sent in
     * @returns {Promise<boolean>} `true` if NFT was awarded and logs succesfully issued, `false` otherwise
     */
    async awardNFT({msg, nft, user, lluser, log_same_chat: log_same_chat=true} = {}) {
        const bot = this.bot;
        try {
            //Award NFT to LL user
            await Firebase.rewardNFT(lluser.uid, nft.id);
            //Log success
            log_same_chat && msg.channel.send({embed: new EmbedBase(bot, {
                description: `✅ **NFT succesfully minted for Leyline user [${lluser.username}](${lluser.profile_url})**`,
            }).Success()});
            const reward_embed = new EmbedBase(bot, {
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
                        value: bot.formatUser(msg.author),
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
            bot.logDiscord({embed: new EmbedBase(bot, {
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
                        value: bot.formatUser(msg.author),
                        inline: true
                    },
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            }).Error()}).then(m => //chained so we can include the URL of the private log msg
                log_same_chat && msg.channel.send({embed: new EmbedBase(bot, {
                    description: `❌ **I ran into an error, please check the log [message](${m.url}) for more information**`,
                }).Error()}));
            return false;
        }
    }

    /**
     * Message a user with a dynamic NFT awardal message
     * @param {Object} params Desctructured params
     * @param {User} user Discord.js user to receive message
     * @param {Object} nft NFT object, retrieved from Firestore
     * @returns {Promise<true>} Promise that resolves to true after message has been sent (not delivered) 
     */
    async messageUser({user, nft} = {}) {
        const bot = this.bot;
        user.send({embed: new EmbedBase(bot, {
            thumbnail: { url: nft.thumbnailUrl },
            fields: [
                {
                    name: `🎉 You Earned A NFT!`,
                    value: `You have been awarded a(n) ${nft.rarity.toLowerCase()} **${nft.name}**!`
                },
            ],	
        })}).catch(() => bot.sendDisabledDmMessage(user));
        return true;
    }
    
    /**
     * Function specifically for awarding qna NFTs to every user in the Q&A VC
     * @returns {Promise<void>} promise that resolves when function execution is complete
     */
    async qna({msg, nft} = {}) {
        const bot = this.bot;
        const [connected, unconnected] = [[], []];
        //add a custom 'leyline' prop to each GuildMember in the vc
        for(const member of (await bot.channels.fetch(bot.config.channels.qna_vc)).members.values())
            await Firebase.isUserConnectedToLeyline(member.id) ?
                connected.push(member) :
                unconnected.push(member);
        if(!connected.length && !unconnected.length) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **There are no users in the <#${bot.config.channels.qna_vc}> voice channel!**`,
        }).Error()});

        //send confirm prompt with some custom values
        if(!(await this.sendConfirmPrompt({
            msg,
            nft,
            qna: true,
            description: `**${connected.length} out of the ${connected.length + unconnected.length} users** in the voice channel have connected their Leyline & Discord accounts`,
            connected: !!connected.length ? [{
                name: '✅ Will Receive NFT',
                value: connected.map(m => bot.formatUser(m.user)).join('\n'),
                inline: false
            }] : [],
            unconnected: !!unconnected.length ? [{
                name: '❌ Will NOT Receive NFT',
                value: unconnected.map(m => bot.formatUser(m.user)).join('\n'),
                inline: false
            }] : [],
        }))) return msg.channel.send({embed: new EmbedBase(bot, {
                description: `❌ **NFT Award Canceled**`,
            }).Error()});

        //start typing in channel because award process will take some time
        //this improves user experience
        msg.channel.startTyping();

        // award each member an NFT, and log in private channels
        // store a prop noting whether the NFT was awarded or not
        for(const member of connected) {
            member.awarded = await this.awardNFT({
				msg,
				nft,
				user: member.user,
				lluser: await new LeylineUser(await Firebase.getLeylineUID(member.id)),
				log_same_chat: false,
			}) && await this.messageUser({nft, user: member.user});
        }

        //sort award results into arrays for the follow-up msg
        const [awarded, unawarded] = [
            connected.filter(m => m.awarded),
            connected.filter(m => !m.awarded)
        ];

        //stop typing as we are about to send the msg
        msg.channel.stopTyping(true);

        msg.channel.send({embed: new EmbedBase(bot, {
            description: `**${awarded.length} out of ${connected.length} NFTs** were awarded`,
            fields: [
                ...(!!awarded.length ? [
                    {
                        name: '✅ Users Awarded',
                        value: awarded.map(m => bot.formatUser(m.user)).join('\n'),
                        inline: false
                    }
                ] : []),
                ...(!!unawarded.length ? [
                    {
                        name: '❌ Users NOT Awarded',
                        value: unawarded.map(m => bot.formatUser(m.user)).join('\n'),
                        inline: false
                    }
                ] : []),
            ],
        })});

        return;
    }

    async run(msg, args) {
        const bot = this.bot;

        //Filter out args
        const nftid = args.shift()?.match(/\d+/g)?.shift();
        if(!nftid) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **That's not a valid Leyline NFT ID**`,
        }).Error()});

        const nft = await Firebase.getNFT(nftid);
        if(!nft?.id) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **I couldn't locate that NFT in Leyline's database**`,
        }).Error()});

        if(['qna', 'q&a', 'qa', 'qanda'].includes(args[0]?.toLowerCase()))
            return this.qna({msg, nft});

        const uid = args.shift()?.match(/\d+/g)?.shift();
        if(!uid) return msg.channel.send({embed: new EmbedBase(bot, {
                description: `❌ **You didn't mention a valid Discord user**`,
        }).Error()});
        
        const user = await bot.users.fetch(uid).catch(() => undefined);
        if(!user) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **I couldn't find that user**`,
        }).Error()});
        if(!(await Firebase.isUserConnectedToLeyline(uid))) return msg.channel.send({embed: new EmbedBase(bot, {
            description: `❌ **That user has not connected their Leyline & Discord accounts**`,
        }).Error()});

        const lluser = await new LeylineUser(await Firebase.getLeylineUID(user.id));

        //send Confirm prompt
        if(!(await this.sendConfirmPrompt({msg, nft, lluser})))
            return msg.channel.send({embed: new EmbedBase(bot, {
                description: `❌ **NFT Award Canceled**`,
            }).Error()});

        //award NFT and send log messages
        await this.awardNFT({msg, nft, user, lluser}) &&
            await this.messageUser({user, nft});
        return;
    }
}

module.exports = awardnft;
