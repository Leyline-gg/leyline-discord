import parse from 'parse-duration';
import { Command, EmbedBase } from '../../classes';
import * as Firebase from '../../api';

class winter2021 extends Command {
    constructor(bot) {
        super(bot, {
            name: 'winter2021',
            description: 'Begin the winter 2021 event',
            options: [
                {
                    type: 'CHANNEL',
                    name: 'channel',
                    description: 'The text channel where the bot will send the embed',
                    required: true,
                    channelTypes: [
                        'GUILD_TEXT',
                        'GUILD_NEWS',
                    ],
                },
                {
                    type: 'INTEGER',
                    name: 'nft-id',
                    description: 'The ID of the NFT to be dropped',
                    required: true,
                },
                {
                    type: 'STRING',
                    name: 'duration',
                    description: 'The duration of the event, eg: 7d. No duration means indefinite',
                    required: false,
                },
                {
                    type: 'STRING',
                    name: 'text',
                    description: 'The text to be displayed in the embed. \\n is a newline',
                    required: false,
                },
            ],
            category: 'admin',
        });
    }

    async parseInput(opts) {
        const [channel, nft, duration, text] = [
            opts.getChannel('channel'),
            await Firebase.getNFT(opts.getInteger('nft-id').toString()),
            opts.getString('duration'),
            opts.getString('text').replaceAll('\\n', '\n'),
        ];

        const parsed_dur = parse(duration); //ms
        if(!!duration && !parsed_dur)
            throw new Error(`That's not a valid duration`);

        //convert duration to epoch timestamp
        const expires = !!duration 
            ? Date.now() + parsed_dur 
            : null;

        return { channel, nft, duration, text, expires };
    }

    async run({intr, opts}) {
        const { bot } = this;

        const { channel, nft, duration, text, expires } = await this.parseInput(opts);

        //events collection in firestore
        //event with id 'winter2021'
        //started prop = true
        //id of message to watch for interactions
        //claimed collection
        //docs are ids of users that have claimed with 'claimed' prop = true

        const embed = new EmbedBase(bot, {
            title: 'Winter 2021 Event',
            description: text,
            image: {
                url: nft.cloudinaryImageUrl,
            },
            //footer: `Organized by ${this.author?.tag}`,
        });

        //send and store message
        const msg = await bot.channels.resolve(channel).send({
            embeds: [embed],
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
            }],
        });

        //store event in database
        await Firebase.createEvent({
            id: 'winter2021',
            metadata: {
                nft_id: nft.id,
                expires,
                msg: msg.id,
            },
        });
        
        this.createCollector(msg);

        //log event creation
        bot.logDiscord({embed: new EmbedBase(bot, {
            fields: [{
                name: 'Event Started',
                value: `${bot.formatUser(intr.user)} started a new [event](${msg.url}) called \`${'Winter 2021'}\`, set to expire on ${bot.formatTimestamp(expires, 'F')}`,
            }],
        })});


        bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `✅ **Event created**`,
        }).Success()});
    }
}

export default winter2021;
