const { Collection } = require('discord.js');
const EmbedBase = require('./EmbedBase');
const Firebase = require('./FirebaseAPI');
const XPService = require('./XPService');

class CommunityPoll {
    nums_unicode = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    constructor(bot, {
        question = '',
        duration = 0,   //milliseconds
        choices = [],
        author = null,
        embed = null,
    }) {
        this.bot = bot;
        this.question = question.trim().endsWith('?') ? question.trim() : question.trim() + '?';
        this.duration = duration;
        this.choices = choices.map(choice => ({
            name: choice.name.split('choice')?.pop() || choice.name,
            value: choice.value.trim(),
        }));
        this.author = bot.users.resolve(author);
        this.embed = new EmbedBase(this.bot, !!embed ? {
            ...embed.toJSON(),
            footer: `Created by ${this.author.tag}`,
        } : {
            title: this.question,
            description: `This poll expires ${bot.formatTimestamp(Date.now() + duration, 'R')}`,
            fields: this.choices.map(c => ({
                name: `${this.nums_unicode[c.name]}  ${c.value.trim()}`,
                value: this.#parseVotes({cur: 0, total: 1}),
                inline: false,
            })),
            footer: `Created by ${this.author?.tag}`,
        });
        this.vote_components = this.#generateVoteMenu();
        this.vote_cache = new Collection();
    };

    end() {
        const bot = this.bot;
        //log poll closure
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'Poll Ended',
                value: `The [poll](${this.msg.url}) created by ${bot.formatUser(this.author)} with the question \`${this.question}\` just expired`,
            }],
        })});
        this.msg.disableComponents();
        this.embed.description = this.embed.description.replace('expires', 'expired');
        this.#updateMessageEmbed();
    }

    /**
     * Stores a vote interaction in the cloud & the local cache,
     * increases the user's XP, and updates the Poll embed
     * @param {ButtonInteraction} vote the vote interaction to store
     * @returns {Promise<void>} Resolves when vote has been stored and embed updated
     */
    async #storeVote(vote) {
        //store the vote in firebase
        const data = await Firebase.storePollVote({poll: this, vote});
        //locally store whatever was written to Firebase
        this.vote_cache.set(vote.user.id, data);

        //add xp
        await XPService.addPollVote({uid: vote.user.id, poll_id: this.id});

        //Update the embed field
        this.#updatePollEmbedVotes();
        //Publish changes
        await this.#updateMessageEmbed(); 

        return;
    }

    /**
     * Replaces the Poll message embed with `this.embed`
     * @returns {Promise<Message>} the updated message
     */
    #updateMessageEmbed() {
        return this.msg.edit({embeds: [this.embed]});
    }

    /**
     * Update the fields on the local embed object that display number of votes
     */
    #updatePollEmbedVotes() {
        this.embed.fields = this.choices.map(c => ({
            name: `${this.nums_unicode[c.name]}  ${c.value.trim()}`,
            value: this.#parseVotes({
                cur: this.vote_cache.filter(v => v.choice === c.name).size, 
                total: this.vote_cache.size,
            }),
            inline: false,
        }));
    }

    /**
     * Generate a ready-to-send array of components for a user to use during voting
     * @returns {Array<Object>}
     */
    #generateVoteMenu() {
        const components = [];
        this.choices.forEach((ch, idx) => {
            //Math.floor(idx/2)
            const row = components[idx % 5] || {
                type: 1,
                components: [],
            };
            row.components.push({
                type: 2,
                style: 2,
                custom_id: ch.name,
                label: ch.value,
                emoji: {
                    name: this.nums_unicode[ch.name],
                },
            });
            components[idx % 5] = row;
        });
        return components;
    }
    
    #parseVotes({cur, total} = {}) {
        const percent = Math.round((cur / total) * 100);
        const progress = Math.round(percent/10);
        return `**${percent}%** ${'🟩'.repeat(progress)}${'⬛'.repeat(10 - progress)} [ ${cur} votes ]`;
    }


    /**
     * Sends a confirm prompt to a user, validating their poll choice
     * @param {ButtonInteraction} vote the vote to confirm
     * @returns {Promise<Boolean>} Confirmation result of the prompt
     */
    #confirmVote(vote) {
        return this.bot.intrConfirm({intr: vote, embed: new EmbedBase(this.bot, {
            title: 'Confirm Vote',
            fields: [{
                name: `${this.nums_unicode[vote.customId]}  ${vote.component.label}`,
                value: '⚠ You cannot change your vote later',
            }],
        }), content: '\u200b', ephemeral: true});
    }

    /**
     * Checks the local cache to see if a user has already voted
     * @param {User} user User to check for 
     * @returns {boolean}
     */
    hasUserVoted(user) {
        return this.vote_cache.has(user.id);
    }

    createCollector(msg) {
        const bot = this.bot;
        this.msg ||= msg;
        this.id ||= msg.id;

        msg.createMessageComponentCollector({
            filter: (i) => i.customId === 'poll-vote-btn',
            time: this.duration,
        }).on('collect', async (intr) => {
            if(this.hasUserVoted(intr.user))
                return bot.intrReply({intr, embed: new EmbedBase(bot, {
                    description: `❌ **You already voted!**`,
                }).Error(), ephemeral: true});
            //state: user is already trying to vote, prevent him from clicking the button again
            const menu = await bot.intrReply({intr, components: this.vote_components, content: 'Pick an option below to vote', ephemeral: true, fetchReply: true});
            const vote = await menu.awaitInteractionFromUser({user:intr.user});
            if(!(await this.#confirmVote(vote)))
                return bot.intrUpdate({intr: vote, embed: new EmbedBase(bot, {
                    description: `❌ **Vote Canceled**`,
                }).Error()});
            
            //record vote
            await this.#storeVote(vote);
            //log vote
            bot.logDiscord({embed: new EmbedBase(bot, {
                fields: [{
                    name: 'User Voted on Poll',
                    value: `${bot.formatUser(vote.user)} voted for option number \`${vote.customId}\` on the [poll](${this.msg.url}) with the question \`${this.question}\``,
                }],
            })});

            return bot.intrUpdate({intr: vote, embed: new EmbedBase(bot, {
                description: `✅ **Vote Submitted**`,
            }).Success()});
        }).once('end', () => this.end());

        return this;
    }

    /**
     * Load information into the local cache from the Firestore doc for this poll
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     * @returns {Promise<CommunityPoll>} the current class, for chaining
     */
    async importFirestoreData(doc) {
        const data = await doc.ref.collection('votes').get();
        for(const doc of data.docs)
            this.vote_cache.set(doc.id, doc.data());
        return this;
    }

    /**
     * Send a poll and watch for votes
     * @returns {Promise<Message>} the poll `Message` that was sent
     */
    async publish() {
        const bot = this.bot;
        //send and store message
        const msg = await bot.channels.resolve(bot.config.channels.polls).send({
            embeds: [this.embed],
            components: [{
                components: [
                    {
                        type: 2,
                        style: 1,
                        custom_id: 'poll-vote-btn',
                        disabled: false,
                        label: 'Vote',
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

        //store poll in database
        await Firebase.createPoll(this);
        
        this.createCollector(msg);

        //log poll creation
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'Poll Created',
                value: `${bot.formatUser(this.author)} created a new [poll](${this.msg.url}) with the question \`${this.question}\`, set to expire on ${bot.formatTimestamp(Date.now() + this.duration, 'F')})`,
            }],
        })});

        return this.msg;
    }
}

module.exports = CommunityPoll;
