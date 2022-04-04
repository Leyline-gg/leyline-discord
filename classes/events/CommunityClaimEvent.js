import { Collection } from 'discord.js';
import { EmbedBase, LeylineUser } from '..';
import * as Firebase from '../../api';

/**
 * A community event that allows users to claim an exclusive NFT.
 * Code structure based heavily off of `CommunityPoll`
 */
export class CommunityClaimEvent {
    constructor({
        id = '',
        title = '',
        description = '',
        duration = 0,   //milliseconds
        nft = null,
        author = null,
        embed = null,
    }) {
        this.id = id.replace(' ', '-');
        this.title = title.trim(),
        this.description = description.trim();
        this.duration = duration;
        this.nft = nft;
        this.author = bot.users.resolve(author);
        this.embed = new EmbedBase(bot, !!embed ? {
            ...embed.toJSON(),
            footer: `Organized by ${this.author.tag}`,
        } : {
            title: this.title,
            description: this.description,
            image: {
                url: this.nft.cloudinaryImageUrl,
            },
            fields: [
                {
                    name: 'Claims',
                    value: '0',
                    inline: true,
                },
                {
                    name: 'Ends On',
                    value: bot.formatTimestamp(Date.now() + this.duration, 'F'),
                    inline: true,
                },
            ],
            footer: `Organized by ${this.author?.tag}`,
        });
        this.claim_cache = new Collection();
    }

    end() {
        //log event expiration
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'Event Ended',
                value: `The [event](${this.msg.url}) created by ${bot.formatUser(this.author)} with the title \`${this.title}\` just ended`,
            }],
        })});
        this.msg.disableComponents();
    }

    /**
     * Stores a claim interaction in the cloud & the local cache, and updates the claim embed
     * @param {ButtonInteraction} claim the claim interaction to store
     * @returns {Promise<void>} Resolves when claim has been stored and embed updated
     */
    async #storeClaim(claim) {
        //store the claim in firebase
        const data = await Firebase.storeEventClaim({event: this, claim});
        //locally store whatever was written to Firebase
        this.claim_cache.set(claim.user.id, data);

        //Update the embed field
        this.#updateEventEmbedClaims();
        //Publish changes
        await this.#updateMessageEmbed(); 

        return;
    }

    /**
     * Replaces the event message embed with `this.embed`
     * @returns {Promise<Message>} the updated message
     */
    #updateMessageEmbed() {
        return this.msg.edit({embeds: [this.embed]});
    }

    /**
     * Update the fields on the local embed object that display number of claims
     */
    #updateEventEmbedClaims() {
        this.embed.fields = this.embed.fields.map(obj => {
            switch (obj.name) {
                case 'Claims':
                    obj.value = this.claim_cache.size.toString();
                    break;
            }
            return obj;
        })
    }
    
    /**
     * perform the whole NFT awardal process, including logs
     * @param {Object} params Destructured params
     * @param {Interaction} params.intr Discord.js `Interaction` that initiated the cmd
     * @param {Object} [params.nft] NFT object retrieved from Firestore
     * @param {User} params.user Discord.js User object, receipient of NFT
     * @param {LeylineUser} params.lluser User that will receive the NFT
     * @returns {Promise<boolean>} `true` if NFT was awarded and logs succesfully issued, `false` otherwise
     */
     async #awardNFT({intr, nft=this.nft, user, lluser} = {}) {
        try {
            //Award NFT to LL user
            await Firebase.rewardNFT(lluser.uid, nft.id);

            const reward_embed = new EmbedBase(bot, {
                thumbnail: { url: nft.cloudinaryImageUrl },
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
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            });
            bot.logReward({embed: reward_embed});
            return true;
        } catch(err) {
            bot.logger.error(`Error awarding NFT with id ${nft.id} to LL user ${lluser.uid}`);
            bot.logger.error(err);
            bot.logDiscord({embed: new EmbedBase(bot, {
                thumbnail: { url: nft.cloudinaryImageUrl },
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
                    { name: '\u200b', value: '\u200b', inline: true },
                ],
            }).Error()}).then(m => //chained so we can include the URL of the private log msg
                bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `❌ **I ran into an error, please check the log [message](${m.url}) for more information**`,
                }).Error(), ephemeral: true}));
            return false;
        }
    }

    /**
     * Message a user with a dynamic NFT awardal message
     * @param {Object} params Desctructured params
     * @param {User} params.user Discord.js user to receive message
     * @param {Object} [params.nft] NFT object, retrieved from Firestore
     * @returns {Promise<true>} Promise that resolves to true after message has been sent (not delivered) 
     */
     async #messageUser({user, nft=this.nft} = {}) {
        bot.sendDM({user, embed: new EmbedBase(bot, {
            thumbnail: { url: nft.cloudinaryImageUrl },
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
     * Checks the local cache to see if a user has already claimed
     * @param {User} user User to check for 
     * @returns {boolean}
     */
    hasUserClaimed(user) {
        return this.claim_cache.has(user.id);
    }

    createCollector(msg=this.msg) {
        this.msg ||= msg;
        this.id ||= msg.id;

        msg.createMessageComponentCollector({
            filter: (i) => i.customId === 'event-claim-btn',
            time: this.duration,
        }).on('collect', async (intr) => {
            await intr.deferReply({ ephemeral: true });
            
            const { user } = intr;
            if(this.hasUserClaimed(user))
                return bot.intrReply({
                    intr, 
                    embed: new EmbedBase(bot).ErrorDesc('You have already claimed an NFT!'), 
                    ephemeral: true,
                });
            
            if(!(await Firebase.isUserConnectedToLeyline(user.id)))
                return bot.intrReply({
                    intr,
                    embed: new EmbedBase(bot).ErrorDesc('You have not connected your Leyline & Discord accounts!'),
                    ephemeral: true,
                });
            //state: user is already trying to claim, prevent them from clicking the button again
            
            //record claim
            await this.#storeClaim(intr);

            //award NFT and send log messages
            const lluser = await new LeylineUser(await Firebase.getLeylineUID(user.id));
            await this.#awardNFT({intr, user, lluser}) &&
                await this.#messageUser({user});

            //log claim
            bot.logDiscord({embed: new EmbedBase(bot, {
                fields: [{
                    name: 'User Claimed NFT',
                    value: `${bot.formatUser(user)} claimed the NFT for the \`${this.title}\` event`,
                }],
            })});

            return bot.intrReply({
                intr,
                embed: new EmbedBase(bot, {
                    description: `✅ **NFT Claimed Successfully**`,
                }).Success(),
                ephemeral: true,
            });
        }).once('end', () => this.end());

        return this;
    }

    /**
     * Load information into the local cache from the Firestore doc for this event
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     * @returns {Promise<CommunityClaimEvent>} the current class, for chaining
     */
    async importFirestoreData(doc) {
        const data = await doc.ref.collection('claims').get();
        for(const doc of data.docs)
            this.claim_cache.set(doc.id, doc.data());
        return this;
    }

    /**
     * Send an event and watch for claims
     * @returns {Promise<Message>} the event `Message` that was sent
     */
    async publish({channel}) {
        //send and store message
        const msg = await bot.channels.resolve(channel).send({
            embeds: [this.embed],
            components: [{
                components: [
                    {
                        type: 2,
                        style: 1,
                        custom_id: 'event-claim-btn',
                        disabled: false,
                        label: 'Claim',
                        emoji: {
                            name: '🎁',
                        },
                    },
                ],
                type: 1,
            }],
        });

        this.msg = msg;
        this.id = msg.id;
        this.channel = channel.id;

        //store event in database
        await Firebase.createEvent(this);
        
        this.createCollector(msg);

        //log event creation
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'Event Started',
                value: `${bot.formatUser(this.author)} started a new [event](${this.msg.url}) called \`${this.title}\`, set to expire on ${bot.formatTimestamp(Date.now() + this.duration, 'F')}`,
            }],
        })});

        return this.msg;
    }
}
