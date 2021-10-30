import { Command, EmbedBase, GoodActsReactionCollector } from '../../classes';
import * as Firebase from '../../api';

class ApproveGoodAct extends Command {
    constructor(bot) {
        super(bot, {
            name: 'Approve Good Act',
            category: 'admin',
            type: 'MESSAGE',
        });
    }

    async run({intr, msg}) {
        const { bot } = this;

        if(await Firebase.collectorExists(msg.id)) return bot.intrReply({intr,
            embed: new EmbedBase().ErrorDesc('Please use a reaction to approve this submission!')
        });

        if (!(await bot.intrConfirm({
            intr,
            embed: new EmbedBase(bot, {
                description: `⚠ **Are you sure you want to approve this Good Act?\nIt will permanently be on this user's Proof of Good ledger.**`,
            }),
            ephemeral: true,
        })))
			return bot.intrReply({
				intr,
				embed: new EmbedBase(bot, {
					description: `❌ **Approval canceled**`,
				}).Error(),
                ephemeral: true,
			});

        //instantiate collector to get mod_emojis
        const collector = new GoodActsReactionCollector(bot, { msg });
        const response_intr = await (await bot.intrReply({
            intr,
            content: `Select an approval category`,
            components: [{
                components: [
                    {
                        custom_id: 'category-menu',
                        disabled: false,
                        placeholder: 'Select a category...',
                        min_values: 1,
                        max_values: 1,
                        options: collector.MOD_EMOJIS
                            .filter(e => e.name !== '❌')
                            .map(emoji => ({
                                label: emoji.keyword,
                                value: emoji.keyword,
                                emoji: {
                                    name: emoji.name,
                                    id: emoji?.id,
                                    animated: emoji?.animated,
                                },
                            })
                        ),
                        type: 3,
                    },
                ],
                type: 1,
            }],
        })).awaitInteractionFromUser({user: intr.user});
        console.log(response_intr);
    }
}

export default ApproveGoodAct;
