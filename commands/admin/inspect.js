import { Command, EmbedBase } from '../../classes';
import * as Firebase from '../../api';

class inspect extends Command {
    constructor(bot) {
        super(bot, {
            name: 'inspect',
            description: 'Conveniently view information about a Discord user that would otherwise be hard to find',
            options: [
                {
                    type: 'USER',
                    name: 'user',
                    description: 'The Discord user you want to inspect',
                    required: true,
                },
            ],
            category: 'admin',
        });
    }

    async run({intr, opts}) {
        const { bot } = this;

        const user = opts.getUser('user') || intr.user;
        const member = await bot.leyline_guild.members.fetch(user);
        const llid = await Firebase.getLeylineUID(user.id);
        const lldoc = !!llid && await Firebase.getLeylineDoc(llid);

        bot.intrReply({intr, embed: new EmbedBase(bot, {
            author: {
                name: user.tag,
                icon_url: user.avatarURL(),
            },
            fields: [
                {
                    name: 'User Joined Discord',
                    value: bot.formatTimestamp(user.createdTimestamp),
                    inline: true,
                },
                {
                    name: 'User Joined Server',
                    value: bot.formatTimestamp(member.joinedTimestamp),
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true, },
                {
                    name: 'Leyline Acct Connected',
                    value: `${!!lldoc ? bot.formatTimestamp((await Firebase.getDiscordDoc(user.id)).connectedLeylineAt.toMillis()) : 'N/A'}`,
                    inline: true,
                },
                {
                    name: 'Leyline Username',
                    value: `${!!lldoc ? lldoc?.username || `leylite#${llid}`.substring(0, 15) : 'N/A'}`,
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true, },
                {
                    name: 'GP Balance',
                    value: `${!!lldoc ? await Firebase.getPointsBalance(llid) : 'N/A'}`,
                    inline: true,
                },
                {
                    name: 'Leyline Email',
                    value: `${!!lldoc ? (await Firebase.getFirestoreUser(llid))?.email : 'N/A'}`,
                    inline: true,
                },
                { name: '\u200b', value: '\u200b', inline: true, },                
                {
                    name: 'Metamask Wallet',
                    value: `${!!lldoc ? lldoc?.metamaskAddress : 'N/A'}`,
                    inline: true,
                },
            ],
        })});
    }
}

export default inspect;
