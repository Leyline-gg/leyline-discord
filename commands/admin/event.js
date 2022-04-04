import parse from 'parse-duration';
import { Command, EmbedBase, CommunityClaimEvent } from '../../classes';
import * as Firebase from '../../api';

class event extends Command {
    constructor() {
        super({
            name: 'event',
            description: 'Create a Community Claim Event',
            options: [
                {
                    type: 'STRING',
                    name: 'title',
                    description: 'The title of the event',
                    required: true,
                },
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
        const [title, channel, nft, duration, text] = [
            opts.getString('title'),
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

        return { title, channel, nft, duration: parsed_dur, text, expires };
    }

    async run({intr, opts}) {

        const { title, channel, nft, duration, text, expires } = await this.parseInput(opts);

        //events collection in firestore
        //event with id 'winter2021'
        //started prop = true
        //id of message to watch for interactions
        //claimed collection
        //docs are ids of users that have claimed with 'claimed' prop = true

        //generate and send event preview
        const event = new CommunityClaimEvent(bot, {
            title,
            description: text,
            duration,
            author: intr.user,
            nft: nft,            
        });

        if(!(await bot.intrConfirm({intr, embed: event.embed, content: `Confirm this is the embed that will be sent to ${channel}`})))
            return bot.intrReply({intr, embed: new EmbedBase(bot).ErrorDesc('Event canceled'), content: '\u200b'});

        //send poll
        await event.publish({channel});

        //edit response with msg id
        bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `✅ **Event Published Succesfully** ([Click to view](${event.msg.url}))`,
        }).Success(), content: '\u200b'});
    }
}

export default event;
