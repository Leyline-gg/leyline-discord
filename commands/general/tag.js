import { Command, FirebaseCache } from '../../classes';

class tag extends Command {
    constructor(bot) {
        super(bot, {
            name: 'tag',
            description: 'Quickly send a pre-typed response using a reference keyword',
            category: 'general',
            options: [
                {
                    type: 'STRING',
                    name: 'tagname',
                    description: 'The name of the tag',
                    required: false,
                },
                {
                    type: 'USER',
                    name: 'target',
                    description: "User to mention",
                    required: false,
                },
            ],
        });

        this.TAGS = new FirebaseCache({
            path: 'discord/bot/tags',
        });
    }

    async run({intr, opts}) {
        const { bot, TAGS } = this;
        await TAGS.awaitReady();   //ensure tags have been loaded

        const tagname = opts.getString('tagname');
        if(!tagname) return bot.intrReply({
            intr,
            ephemeral: true,
            content: `__**List of tags:**__\n${TAGS.keys().join('\n')}`,
        });

        const tag = TAGS.get(tagname.toLowerCase()) || TAGS.values().find(tag => tag?.aliases?.includes(tagname.toLowerCase()));
        if(!tag) return bot.intrReply({
            intr, 
            ephemeral: true,
            content: `That's not a valid tag!\nRun the command without any arguments to see the list of tags`,
        });

        //Parse a tag's response
        const parseResponse = function (res) {
            return res.replaceAll('\\n', '\n');
        };

        const target = opts.getUser('target');
        
        bot.intrReply({intr, content: `${!!target ? `_Tag suggestion for ${target.toString()}:_\n` : ''}${parseResponse(tag.response)}`});
    }
}

export default tag;
