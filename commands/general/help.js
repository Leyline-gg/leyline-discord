const Command = require('../../classes/Command');
const EmbedBase = require('../../classes/EmbedBase');

class help extends Command {
    constructor(bot) {
        super(bot, {
            name: 'help',
            description: 'View the list of commands available to run',
            aliases: [],
            category: 'general'
        });
    }

    //generate a generic help embed for all commands
    #generateHelpEmbed = function(commands) {
        //get each category from all the commands and put them into an array where each category appears only once. remove all instances of the admin category
        const embed_fields = Array.from(new Set(commands.map((cmd) => cmd.category).filter((category) => category !== 'admin')));
        return new EmbedBase(this.bot, {
            title: 'Bot Commands',
            description: `Hover over a command for more info`,
            fields: embed_fields.map((category) => ({
                name: category,
                value: `${commands.filter((command) => command.category === category).map(command => `[\`${command.name}\`](https://leyline.gg "${command.description}")`).join('\n')}\n\u200b\n`,
                inline: true
            })),
        });
    }
    
    //an embed for a single command
    #generateCommandEmbed = function (command) {
        return new EmbedBase(this.bot, {
            description: 'Fields surrounded by `<>` are required, and fields surrounded by `[]` are optional',
            fields: [
                {
                    name: 'Name',
                    value: `\`${command.name}\``
                },
                {
                    name: 'Description',
                    value: `\`${command.description}\``
                },
                {
                    name: 'Aliases',
                    value: `\`${command.aliases.length > 0 ? command.aliases.join('`, `') : '`None`'}\``
                },
                {
                    name: 'Usage',
                    value: `\`${this.bot.config.prefix}${command.name}${!!command.usage ? ` ${command.usage}` : ''}\``
                }
            ],
        });
    }

    run({intr, opts}) {
        const { commands } = this.bot;
        if(args.length > 0) {
            const name = args[0].toLowerCase();
            const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
            if(!command) return msg.reply('That\'s not a valid command');
            return this.bot.sendEmbed({msg, embed: this.#generateCommandEmbed(command) });
        }

        return this.bot.sendEmbed({msg, embed:this.#generateHelpEmbed(commands) });
    }
}

module.exports = help;
