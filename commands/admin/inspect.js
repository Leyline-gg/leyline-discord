const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');
const Firebase = require('../../classes/FirebaseAPI');

class inspect extends Command {
    constructor(bot) {
        super(bot, {
            name: 'inspect',
            description: 'Conveniently view information about a Discord user that would otherwise be hard to find',
            options: [
                {
                    type: 6,
                    name: 'user',
                    description: 'The Discord user you want to inspect',
                    required: true,
                },
            ],
            aliases: [],
            category: 'admin',
        });
    }

    async run({intr, opts}) {
        const bot = this.bot;

        const user = opts.getUser('user') || intr.user;
        const member = await bot.leyline_guild.members.fetch(user);
        const llid = await Firebase.getLeylineUID(user.id);

        bot.intrReply({intr, embed: new EmbedBase(bot, {
            author: {
                name: user.tag,
                icon_url: user.avatarURL(),
            },
            fields: [
                {
                    name: 'User Joined Discord',
                    value: `<t:${Math.floor(user.createdTimestamp/1000)}:D>`,
                    inline: true
                },
                {
                    name: 'User Joined Server',
                    value: `<t:${Math.floor(member.joinedTimestamp/1000)}:D>`,
                    inline: true
                },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: 'Leyline Acct Connected',
                    value: `${!!llid ? `<t:${(await Firebase.getDiscordDoc(user.id)).connectedLeylineAt.seconds}:D>` : 'N/A'}`,
                    inline: true
                },
                {
                    name: 'Leyline Username',
                    value: `${!!llid ? (await Firebase.getLeylineDoc(llid))?.username || `leylite#${llid}`.substring(0, 15) : 'N/A'}`,
                    inline: true
                },
                {
                    name: 'LLP Balance',
                    value: `${!!llid ? await Firebase.getLLPBalance(llid) : 'N/A'}`,
                    inline: true
                },
            ],
        })});
    }
}

module.exports = inspect;
