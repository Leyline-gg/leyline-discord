import { Command, EmbedBase, CommunityPoll, } from '../../classes';;

class poll extends Command {
    constructor() {
        super({
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
        const [duration, question] = [opts.getNumber('duration'), opts.getString('question')];
        
        //validate args
        if(duration > 24)
            return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **24 days is the maximum duration of the poll!**`,
            }).Error()});
        if(duration <= 0)
            return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **The duration of the poll must be \`>\` 0 days**`,
            }).Error()});

        //generate and send poll preview
        const com_pol = new CommunityPoll({
            question,
            duration: Math.round(duration * 24 * 3600 * 1000),
            author: intr.user,
            choices: opts.data.filter(o => o.name.startsWith('choice')),
        });

        if(!(await bot.intrConfirm({intr, embed: com_pol.embed, content: `Confirm this is the poll that will be sent to <#${bot.config.channels.polls}>`})))
            return bot.intrReply({intr, embed: new EmbedBase({
                description: `❌ **Poll canceled**`,
            }).Error(), content: '\u200b'});

        //send poll
        await com_pol.publish();

        //edit response with msg id
        bot.intrReply({intr, embed: new EmbedBase({
            description: `✅ **Poll Published Succesfully** ([Click to view](${com_pol.msg.url}))`,
        }).Success(), content: '\u200b'});
    }
}

export default poll;
