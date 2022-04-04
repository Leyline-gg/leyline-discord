import { FirebaseEvent, EmbedBase } from '../../classes';

class DiscordAcctLink extends FirebaseEvent {
    alpha_role = '751919744528941126';
    constructor() {
        super({
            name: 'DiscordAcctLink',
            description: 'Watch when a Leyline user links their discord acct',
            collection: 'discord/webapp/users'
        });
    }

    /**
     * 
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     */
    async onAdd(doc) {
        // Apply the Alpha Tester role to the user that linked their acct
        // Log a message in the #bot-log channel
        //doc was created in discord/webapp/users, this means they just connected their discord acct
        //if they're in the Leyline discord, give them the role
        const member = await bot.leyline_guild.members.fetch(doc.data().discordUID).catch(() => null);
        if(!member) return bot.logDiscord({ embed: new EmbedBase(bot, {
            fields: [{
                name: '🔗 Leyline & Discord Accounts Linked',
                value: `Discord user <@${doc.data().discordUID}> just linked their accounts, but I could not find them in the server`
            }],
        }).Error()});
        
        if(member.roles.cache.has(this.alpha_role)) {
            bot.logDiscord({ embed: new EmbedBase(bot, {
                fields: [{
                    name: '🔗 Leyline & Discord Accounts Linked',
                    value: `${bot.formatUser(member.user)} just connected their Leyline & Discord accounts, but they already had the <@&${this.alpha_role}> role so I didn't award it`
                }],
            }).Warn()});
            bot.sendDM({user: member.user, embed: new EmbedBase(bot, {
                fields: [{
                    name: '🔗 Leyline & Discord Accounts Linked',
                    value: 'You succesfully linked your Leyline & Discord accounts!'
                }]
            }).Success()}).catch(err => bot.logger.error(`${this.name} Error: ${err}`));
            return;
        }
        
        member.roles.add(this.alpha_role, 'Linked Leyline & Discord accounts');
        bot.logDiscord({ embed: new EmbedBase(bot, {
            fields: [{
                name: '🔗 Leyline & Discord Accounts Linked',
                value: `${bot.formatUser(member.user)} just connected their Leyline & Discord accounts, and I awarded them the <@&${this.alpha_role}> role`
            }],
        })});
        bot.sendDM({user: member.user, embed: new EmbedBase(bot, {
            fields: [{
                name: '🔗 Leyline & Discord Accounts Linked',
                value: 'You just linked your Leyline & Discord accounts and received the `Alpha Tester` role!'
            }]
        }).Success()}).catch(err => bot.logger.error(`${this.name} Error: ${err}`));
    }

    /**
     * 
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     */
    onRemove(doc) {
        console.log('Doc Deleted', doc.data());
    }
}

export default DiscordAcctLink;
