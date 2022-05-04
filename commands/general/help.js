import bot from '../../bot';
import { Command, EmbedBase } from '../../classes';

class help extends Command {
    constructor() {
        super({
            name: 'help',
            description: 'Displays a traditional command menu, with each command sorted by its category',
            category: 'general',
        });
    }

    run({intr}) {

        //get each category from all the commands and put them into an array where each category appears only once
        //remove all development cmds
        //remove all instances of the admin category if author is not mod
        const embed_fields = Array.from(new Set(bot.commands.map((cmd) => cmd.category)
            .filter((category) => category !== 'development' && (category !== 'admin' || bot.checkMod(intr.user.id)))));
        return bot.intrReply({intr, embed: new EmbedBase({
            title: 'Bot Commands',
            description: `Hover over a command for more info`,
            fields: embed_fields.map((category) => ({
                name: category,
                value: `${bot.commands.filter((command) => command.category === category).map(command => `[\`${command.name}\`](https://leyline.gg "${command.description}")`).join('\n')}\n\u200b\n`,
                inline: true
            })),
        })});
    }
}

export default help;
