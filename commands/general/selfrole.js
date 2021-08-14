const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

//roles available to be self-roled
const roles = [
    //'853414453206188063',   //do good alerts
    //'874704370103615559',   //Bot Updates
    '873234204706631720',
    '865629785015320608',
];

class selfrole extends Command {
    constructor(bot) {
        super(bot, {
            name: 'selfrole',
            description: 'Give a role to yourself',
            usage: '[role name]',
            aliases: [],
            category: 'general'
        });
    }
    
    async run(msg, args) {
        try {
            const bot = this.bot;
            
            //obtain and filter Role objects
            const avail_roles = (await bot.leyline_guild.roles.fetch()).filter(r => roles.includes(r.id));

            const m = {
                components: [
                    {
                        custom_id: 'role-menu',
                        disabled: false,
                        placeholder: 'Select a role...',
                        min_values: 1,
                        options: avail_roles.map(r => {return {
                            label: r.name,
                            value: r.id,
                        }}),
                        type: 3
                    }
                ],
                type: 1
            };
            
            return this.awaitInteraction({
                msg: await msg.channel.send({
                    content: `Choose from the below list. Roles you don't already have will be added to you, and roles you do have will be removed.`,
                    components: [m],
                }),
                cb: this.interactionResponse.bind(this),    //funky syntax reason: https://stackoverflow.com/a/59060545/8396479
            });
        } catch (err) {
            this.bot.logger.error(`${this.name} Error: ${err}`);
        }
    }

    async interactionResponse(i) {
        const bot = this.bot;
        try {
            const [add, rem] = [[], []];
            //filter roles so we can reference them later
            for(const role of i.values) 
                i.member.roles.cache.has(role) ? rem.push(role) : add.push(role);
            await i.member.roles.add(add, `Self-assigned with the ${this.name} command`);
            await i.member.roles.remove(rem, `Self-removed with the ${this.name} command`);

            i.update({embeds: [new EmbedBase(bot, {
                fields: [
                    ...(!!add.length ? [{
                        name: 'Roles Added',
                        value: add.map(role => bot.leyline_guild.roles.resolve(role).toString()).join('\n'),
                    }] : []),
                    ...(!!rem.length ? [{
                        name: 'Roles Removed',
                        value: rem.map(role => bot.leyline_guild.roles.resolve(role).toString()).join('\n'),
                    }] : []),
                ],
            })], components: [], content: '\u200b',})
        } catch (err) {
            bot.logger.error(`${this.name} Error: ${err}`);
        }
    }
}

module.exports = selfrole;
