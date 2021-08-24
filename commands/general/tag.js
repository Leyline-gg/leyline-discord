const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

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

        this.TAGS = [
            {
                name: 'unconnected',
                response: `\
                    \rConnecting your Leyline & Discord accounts is easy and takes less than two minutes!\
                    \r[This guide](<${bot.connection_tutorial}>) explains the whole process.
                `,
            },
        ];
    }

    async run({intr, opts}) {
        const bot = this.bot;
        const tagname = opts.getString('tagname');
        if(!tagname) return bot.intrReply({
            intr, 
            ephemeral: true,
            content: `__**List of tags:**__\n${this.TAGS.map(tag => tag.name).join('\n')}`,
        });

        const tag = this.TAGS.find(o => o.name === tagname.toLowerCase() || o?.aliases?.includes(tagname.toLowerCase()));
        if(!tag) return bot.intrReply({
            intr, 
            ephemeral: true,
            content: `That's not a valid tag!`,
        });

        const target = opts.getUser('target');
        
        bot.intrReply({intr, content: `_Tag suggestion for ${target.toString()}:_` + tag.response});
    }
}

module.exports = tag;
