import { Command, EmbedBase } from '../../classes';

class selfrole extends Command {
    constructor() {
        super({
            name: 'selfrole',
            description: 'Give or take assignable roles from yourself',
            category: 'general',
        });
    }
    
    async run({intr}) {
        try {
            
            //obtain and filter Role objects
            const avail_roles = (await bot.leyline_guild.roles.fetch()).filter(r => bot.config.self_roles.includes(r.id));
            
            const response_intr = await (await bot.intrReply({
                intr,
                content: `Choose from the below list. Roles you don't already have will be added to you, and roles you do have will be removed.`,
                components: [{
                    components: [
                        {
                            custom_id: 'role-menu',
                            disabled: false,
                            placeholder: 'Select a role...',
                            min_values: 1,
                            options: avail_roles.map(r => ({
                                label: r.name,
                                value: r.id,
                            })),
                            type: 3,
                        },
                    ],
                    type: 1,
                }],
            })).awaitInteractionFromUser({user: intr.user});

            const [add, rem] = [[], []];
            //filter roles so we can reference them later
            for(const role of response_intr.values) 
                response_intr.member.roles.cache.has(role) ? rem.push(role) : add.push(role);
            await response_intr.member.roles.add(add, `Self-assigned with the ${this.name} command`);
            await response_intr.member.roles.remove(rem, `Self-removed with the ${this.name} command`);

            bot.intrReply({intr, embed: new EmbedBase(bot, {
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
            }), components: [], content: '\u200b'})
        } catch (err) {
            bot.logger.error(`${this.name} Error: ${err}`);
        }
    }
}

export default selfrole;
