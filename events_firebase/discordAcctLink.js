const FirebaseEvent = require('../classes/FirebaseEvent');

class DiscordAcctLink extends FirebaseEvent {
    alpha_role = '751919744528941126';
    constructor(bot) {
        super(bot, {
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
        console.log('Doc Created', doc.data());
        //doc was created in discord/webapp/users, this means they just connected their discord acct
        //if they're in the Leyline discord, give them the role
        const member = await this.bot.leyline_guild.members.fetch(doc.data().discordUID);
        if(!member) return console.log(`Discord user <@${doc.data().discordUID}> just linked their accounts, but I could not find them in the server`);
        if(member.roles.cache.has(this.alpha_role))
            return this.bot.logDiscord(`<${member.id}> just connected their Leyline & Discord accounts, but they already had the \`Alpha Tester\` role so I didn't award it`);
        member.roles.add(this.alpha_role, 'Linked Leyline & Discord accounts');
        this.bot.logDiscord(`<${member.id}> just connected their Leyline & Discord accounts, and I awarded them the \`Alpha Tester\` role`);
        member.send('You just linked your Leyline & Discord accounts and received the `Alpha Tester` role!')
            .catch((err) => this.bot.logger.debug(`Tried to DM ${member.user.tag} (${member.id}), but I encountered an error: ${err}`));   //send DM to user
    }

    /**
     * 
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     */
    onRemove(doc) {
        console.log('Doc Deleted', doc.data());
    }
}

module.exports = DiscordAcctLink;