const Command = require('../../classes/Command');
const CommunityPoll = require('../../classes/CommunityPoll');
const EmbedBase = require('../../classes/EmbedBase');

class poll extends Command {
    constructor(bot) {
        super(bot, {
            name: 'poll',
            description: 'Create an approved poll',
            options: [
                {
                    type: 'STRING',
                    name: 'question',
                    description: 'The poll question that users will vote on',
                    required: true,
                },
                {
                    type: 'NUMBER',
                    name: 'duration',
                    description: 'The duration of the poll, in days. Decimals are supported. Max duration is 24 days',
                    required: true,
                },
                {
                    type: 'STRING',
                    name: 'choice1',
                    description: 'A choice for the user to select',
                    required: true,
                },
                {
                    type: 'STRING',
                    name: 'choice2',
                    description: 'A choice for the user to select',
                    required: true,
                },
                {
                    type: 'STRING',
                    name: 'choice3',
                    description: 'A choice for the user to select',
                },
                {
                    type: 'STRING',
                    name: 'choice4',
                    description: 'A choice for the user to select',
                },
                {
                    type: 'STRING',
                    name: 'choice5',
                    description: 'A choice for the user to select',
                },
                {
                    type: 'STRING',
                    name: 'choice6',
                    description: 'A choice for the user to select',
                },
                {
                    type: 'STRING',
                    name: 'choice7',
                    description: 'A choice for the user to select',
                },
                {
                    type: 'STRING',
                    name: 'choice8',
                    description: 'A choice for the user to select',
                },
                {
                    type: 'STRING',
                    name: 'choice9',
                    description: 'A choice for the user to select',
                },
                {
                    type: 'STRING',
                    name: 'choice10',
                    description: 'A choice for the user to select',
                },
            ],
            category: 'admin',
        });
    }

    async run({intr, opts}) {
        const bot = this.bot;
        
        //validate args
        if(opts.getNumber('duration') > 24)
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **24 days is the maximum duration of the poll!**`,
            }).Error()});

        //generate and send poll preview
        const com_pol = new CommunityPoll(bot, {
            question: opts.getString('question'),
            duration: Math.round(opts.getNumber('duration') * 24 * 3600 * 1000),
            author: intr.user,
            choices: opts.data.filter(o => o.name.startsWith('choice')),
        });
        bot.intrReply({intr, embed: com_pol.embed});

        if(!(await bot.intrConfirm({intr, embed: com_pol.embed, content: `Confirm this is the poll that will be sent to <#${bot.config.channels.polls}>`})))
            return bot.intrReply({intr, embed: new EmbedBase(bot, {
                description: `❌ **Poll canceled**`,
            }).Error(), content: '\u200b'});

        //send poll
        await com_pol.publish();

        //edit response with msg id
        bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `✅ **Poll Published Succesfully** ([Click to view](${com_pol.msg.url}))`,
        }).Success(), content: '\u200b'});
    }
}

module.exports = poll;
