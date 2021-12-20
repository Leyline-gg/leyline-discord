import { Collection } from 'discord.js';
import { EmbedBase } from '..';
import * as Firebase from '../../api';

/**
 * A community event that allows users to claim an exclusive NFT.
 * Code structure based heavily off of `CommunityPoll`
 */
export class CommunityClaimEvent {
    constructor(bot, {
        id = '',
        title = '',
        description = '',
        duration = 0,   //milliseconds
        nft = null,
        author = null,
        embed = null,
    }) {
        this.bot = bot;
        this.id = id.replace(' ', '-');
        this.title = title.trim(),
        this.description = description.trim();
        this.duration = duration;
        this.nft = nft;
        this.author = bot.users.resolve(author);
        this.embed = new EmbedBase(this.bot, !!embed ? {
            ...embed.toJSON(),
            footer: `Organized by ${this.author.tag}`,
        } : {
            title: this.title,
            description: this.description,
            image: {
                url: this.nft.cloudinaryImageUrl,
            },
            footer: `Organized by ${this.author?.tag}`,
        });
        this.claim_cache = new Collection();
    }

    end() {
        const { bot } = this;
        //log event expiration
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'Event Ended',
                value: `The [event](${this.msg.url}) created by ${bot.formatUser(this.author)} with the title \`${this.title}\` just ended`,
            }],
        })});
        this.msg.disableComponents();
        this.embed.description = this.embed.description.replace('expires', 'expired');
        this.#updateMessageEmbed();
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

        //add xp
        await XPService.addPollClaim({uid: claim.user.id, poll_id: this.id});

        //Update the embed field
        this.#updatePollEmbedClaims();
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
        //this.embed.fields = []
    }

    /**
     * Checks the local cache to see if a user has already claimed
     * @param {User} user User to check for 
     * @returns {boolean}
     */
    hasUserClaimed(user) {
        return this.claim_cache.has(user.id);
    }

    createCollector({msg, duration}) {
        const { bot } = this;
        this.msg ||= msg;
        this.id ||= msg.id;

        msg.createMessageComponentCollector({
            filter: (i) => i.customId === 'event-claim-btn',
            time: duration,
        }).on('collect', async (intr) => {
            if(this.hasUserClaimed(intr.user))
                return bot.intrReply({
                    intr, 
                    embed: new EmbedBase(bot).ErrorDesc('You already claimed an NFT!'), 
                    ephemeral: true,
                });
            //state: user is already trying to claim, prevent them from clicking the button again
            
            //record claim
            await this.#storeClaim(claim);
            //log claim
            bot.logDiscord({embed: new EmbedBase(bot, {
                fields: [{
                    name: 'User Claimd on Poll',
                    value: `${bot.formatUser(claim.user)} claimd for option number \`${claim.customId}\` on the [poll](${this.msg.url}) with the question \`${this.question}\``,
                }],
            })});

            return bot.intrUpdate({intr: claim, embed: new EmbedBase(bot, {
                description: `✅ **Claim Submitted**`,
            }).Success()});
        }).once('end', () => this.end());
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
     * @returns {Promise<Message>} the poll `Message` that was sent
     */
    async publish({channel}) {
        const { bot } = this;
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
                            name: '📝',
                        },
                    },
                ],
                type: 1,
            }]
        });

        this.msg = msg;
        this.id = msg.id;

        //store event in database
        await Firebase.createEvent(this);
        
        this.createCollector(msg);

        //log event creation
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'Event Started',
                value: `${bot.formatUser(this.author)} started a new [event](${this.msg.url}) called \`${'Winter 2021'}\`, set to expire on ${bot.formatTimestamp(Date.now() + this.duration, 'F')}`,
            }],
        })});

        this.createThread();

        return this.msg;
    }
}
