const dedent = require('dedent');
const Command = require('../../classes/Command');

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
                response: dedent`
                    Connecting your Leyline & Discord accounts is easy and takes less than two minutes!
                    [This guide](<${bot.connection_tutorial}>) explains the whole process.
                `,
            },
            {
                name: 'goodacts',
                response: dedent`
                    The <#${bot.config.events.goodActs.target_channel}> channel is dedicated to posting Good Acts in the real world. Post a photo or video of your good deeds. \
                    It can be anything from: teaching, cleaning your neighborhood, exercising, mindfulness, blood donation, donating clothes/toys, planting trees, and more.
                    Our mods will approve your post and you will earn Leyline Points and XP that you can use to claim prizes and NFTs.
                `,
            },
            {
                name: 'xp',
                response: dedent`
                    Our XP system is custom-designed to encourage real-world altruism and community involvement in the Leyline Discord!
                    [This Notion page](${bot.xp_doc}) explains how you can earn XP, as well as how much XP is needed per level.
                `,
                aliases: ['level', 'levels'],
            },
            {
                name: 'wallet',
                response: dedent`
                    Crypto wallets come in all shapes and sizes, it can be daunting to get started. Let’s help you out!
                    [This Notion page](https://leyline.notion.site/What-crypto-wallet-should-I-use-538fe0997eb14715b271c2aabb36c027) is a very handy resource on crypto wallet usage & management.
                `,
                aliases: ['wallets', 'cryptowallets'],
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
        
        bot.intrReply({intr, content: `${!!target ? `_Tag suggestion for ${target.toString()}:_\n` : ''}${tag.response}`});
    }
}

module.exports = tag;
