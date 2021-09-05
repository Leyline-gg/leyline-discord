import dedent from 'dedent';
import { Command } from '../../classes';

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
                aliases: [],
            },
            {
                name: 'goodacts',
                response: dedent`
                    The <#${bot.config.events.goodActs.target_channel}> channel is dedicated to posting Good Acts in the real world. Post a photo or video of your good deeds. \
                    It can be anything from: teaching, cleaning your neighborhood, exercising, mindfulness, blood donation, donating clothes/toys, planting trees, and more.
                    Our mods will approve your post and you will earn Leyline Points and XP that you can use to claim prizes and NFTs.
                `,
                aliases: [],
            },
            {
                name: 'xp',
                response: dedent`
                    Our XP system is custom-designed to encourage real-world altruism and community involvement in the Leyline Discord!
                    [This Notion page](<${bot.xp_doc}>) explains how you can earn XP, as well as how much XP is needed per level.
                `,
                aliases: ['level', 'levels'],
            },
            {
                name: 'wallet',
                response: dedent`
                    Crypto wallets come in all shapes and sizes, it can be daunting to get started. Let’s help you out!
                    [This Notion page](<https://leyline.notion.site/What-crypto-wallet-should-I-use-538fe0997eb14715b271c2aabb36c027>) \
                    is a very handy resource on crypto wallet usage & management.
                `,
                aliases: ['wallets', 'cryptowallets'],
            },
            {
                name: 'leylinebot',
                response: dedent`
                    Our Discord bot is custom-coded by a staff member. The code is open source and community members are welcome to contribute or make suggestions.

                    Check out the Github repo: <https://github.com/Leyline-gg/leyline-discord>
                `,
                aliases: ['bot'],
            },
            {
                name: 'scholarship',
                response: dedent`
                    To celebrate the [Leyline](<https://leyline.gg>) partnership with [Unix Axie Gaming Guild](<https://discord.gg/unix>), \
                    Leyline is offering three scholarships to users who complete all the tasks outlined on \
                    [this Notion page](<https://leyline.notion.site/Leyline-Unix-Axie-Infinity-Scholarship-Contest-f4d0daf09c0c4e169ab49295816ef4ae>).

                    Please do not send resumes or applications in this Discord server. The scholarship submission process is outlined in the guide linked above.
                `,
                aliases: ['scholar'],
            },
            {
                name: 'llp',
                response: dedent`
                    **Leyline Points (LLP)** is a digital currency exclusive to the Leyline platform.
                    [This FAQ section](<https://www.notion.so/leyline/FAQ-58cff0616c86481bb82a47e06ce3ad7c#af0f350070ab45d69f1bc3efb81142cf>) \
                    explains how you can earn LLP.
                    Points can be spent in the Leyline [prize pool](<https://leyline.gg/prizepool/>) for digital rewards.
                `,
                aliases: ['leylinepoints'],
            },
            {
                name: 'nfts',
                response: dedent`
                    NFTs can be an unfamiliar topic to new users!
                    Check out [this message](<https://discord.com/channels/751913089271726160/821870584307908640/853348014596685845>) \
                    from our CEO for beginner resources.
                `,
                aliases: [],
            },
            {
                name: 'boinc',
                response: dedent`
                BOINC is an open-source program created by the University of California, Berkeley. \
                It allows individuals to contribute to scientific research by donating their computing power whether their computer is active or idle.

                Our [FAQ page](<https://www.notion.so/leyline/FAQ-58cff0616c86481bb82a47e06ce3ad7c#1de015e68db4481db142b2ec91a7cf6f>) \
                answers several common questions about what BOINC is and how it works.

                Once you've familiarized yourself with the platform, check out our \
                [BOINC guides](<https://www.notion.so/leyline/Leyline-User-Guides-e0041f57850940fab4ecad1f17a369cf#61ee246b5f1841578eab75e058d0c523>) \
                to learn how to install, setup, and synchronize BOINC with your Leyline account.
                `,
                aliases: [],
            },
        ];
    }

    async run({intr, opts}) {
        const { bot } = this;
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
            content: `That's not a valid tag!\nRun the command without any arguments to see the list of tags`,
        });

        const target = opts.getUser('target');
        
        bot.intrReply({intr, content: `${!!target ? `_Tag suggestion for ${target.toString()}:_\n` : ''}${tag.response}`});
    }
}

export default tag;
