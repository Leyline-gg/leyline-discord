import { Command, EmbedBase, ReactionCollector } from '../../classes';
import * as Firebase from '../../api';

class ApproveGoodAct extends Command {
    constructor() {
        super({
            name: 'Approve Good Act',
            category: 'moderator',
            type: 'MESSAGE',
        });
    }

    async run({intr, msg}) {
        const { bot } = this;

        //Input Validations
        const cloud_collector = await Firebase.fetchCollector(msg.id);
        if(cloud_collector?.approved)
            return bot.intrReply({
                intr,
                embed: new EmbedBase(bot).ErrorDesc('This submission has already been approved'),
                ephemeral: true,
            });
        if(!!cloud_collector?.rejected_by)
            return bot.intrReply({
                intr,
                embed: new EmbedBase(bot).ErrorDesc('This submission has already been rejected'),
                ephemeral: true,
            });
        if(cloud_collector?.expires < Date.now())
            return bot.intrReply({
                intr,
                embed: new EmbedBase(bot).ErrorDesc('The approval window for this submission has expired'),
                ephemeral: true,
            });

        //Send confirmation prompt
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
        const collector = new ReactionCollector(bot, { type: ReactionCollector.Collectors.GOOD_ACTS, msg });
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
                                value: emoji?.id || emoji.name,
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

        //parse emoji and setup collector
        const emoji = bot.emojis.resolve(response_intr.values[0]) ?? response_intr.values[0];
        await Firebase.createCollector(collector);  //needs to be performed first
        await collector.approveSubmission({user: intr.user, approval_emoji: emoji});
        collector.createThread();
        msg.react(emoji.toString());

        return bot.intrReply({intr, embed: new EmbedBase(bot, {
            description: `✅ **Good Act Approved**`,
        }).Success(), content: '\u200b', components: [], ephemeral: true});
    }
}

export default ApproveGoodAct;
