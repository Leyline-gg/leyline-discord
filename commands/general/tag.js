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
                    autocomplete: true,
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

    async autocomplete({intr, opts}) {
        //only allow autocompletes for the 'tagname' option
        if(opts.getFocused(true).name !== this.options[0].name) return;
        
        const { TAGS } = this;
        await TAGS.awaitReady();   //ensure tags have been loaded

        //get the value the user is currently typing
        const val = opts.getFocused().toLowerCase();

        //get the list of tags that contain the value
        const tags = [
			...TAGS.keys().filter((tag) => tag.toLowerCase().startsWith(val)),
			...TAGS.values().reduce((acc, tag) => acc.concat(tag?.aliases?.filter((alias) => alias.startsWith(val)) || []), []),
		];

        //respond with the first 25 options (25 is a Discord API limit)
        intr.respond(tags.slice(0, 25).map(tag => ({
            name: tag,
            value: tag,
        })));

        return;
    }
}

export default tag;
