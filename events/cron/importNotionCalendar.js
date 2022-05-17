import { Client } from '@notionhq/client';
import bot from '../../bot';
import { CronEvent, EmbedBase } from '../../classes';

export default class extends CronEvent {
    constructor() {
		super({
			name: 'importNotionCalendar',
            schedule: '0 12 * * 0',
		});
        this.notion = new Client({ auth: process.env.NOTION_SECRET });
	}

    async run() {
        bot.logger.log(`${this.name} cron event execution started`);
        const { notion } = this;

        const events = await notion.databases.query({
            database_id: process.env.NOTION_CALENDAR_ID,
            filter: {
                and: [
                    {
                        property: 'Date',
                        date: {
                            next_week: {},
                        },
                    },
                    {
                        property: 'Leyline Discord',
                        checkbox: {
                            equals: true,
                        },
                    },
                ],
            },
        });

        const scheduled_events = [];
        const failed_events = [];

        for(const event of events.results) {
            try {
                const blocks = await notion.blocks.children.list({ block_id: event.id });
                if(!event.properties['Discord Channel'].select) 
                    throw new Error(`Event ${event.id} is not linked to a Discord channel`);
                
                const [name, scheduledStartTime, channel, desc_header_idx] = [
                    event.properties.Name.title[0].plain_text,
                    event.properties.Date.date.start,
                    (await bot.leyline_guild.channels.fetch()).find(c => c.name.includes(event.properties['Discord Channel'].select.name)),
                    blocks.results.findIndex(b => b[b.type].rich_text[0]?.plain_text?.toLowerCase()?.includes('description')) + 1,
                ];

                if(!channel) throw new Error(`Event ${event.id} passed "${event.properties['Discord Channel'].select.name}" as an invalid voice channel`);

                let description = desc_header_idx > 0 
                    ? blocks.results[desc_header_idx][blocks.results[desc_header_idx].type].rich_text[0].plain_text
                    : null;
                description === '<Put description here>' && (description = null);

                scheduled_events.push(await bot.leyline_guild.scheduledEvents.create({
                    reason: 'Weekly automated event importation from Notion',
                    name,
                    scheduledStartTime,
                    privacyLevel: 'GUILD_ONLY',
                    entityType: 
                        channel.type === 'GUILD_VOICE' ? 'VOICE'
                            : channel.type === 'GUILD_STAGE_VOICE' ? 'STAGE_INSTANCE'
                                : 'EXTERNAL',
                    channel,
                    description,
                }));
            } catch(e) {
                bot.logger.error(e);
                failed_events.push(event.url);
            }
        }

        //send a message with created events in mod log
        bot.logStaff({embed: new EmbedBase({
            title: 'Weekly Notion Calendar Event Import',
            description: `**${scheduled_events.length} out of ${scheduled_events.length + failed_events.length} events imported**`,
            fields: [
                ...(!!scheduled_events.length ? EmbedBase.splitField({
                    name: '✅ Successfully Imported',
                    value: scheduled_events.map(e => `[${e.name}](${e.url}) on ${bot.formatTimestamp(e.scheduledStartTimestamp, 'F')}`).join('\n'),
                    inline: false,
                }) : []),
                ...(!!failed_events.length ? EmbedBase.splitField({
                    name: '❌ Import Failed',
                    value: failed_events.join('\n'),
                    inline: false,
                }) : []),
            ],
        })});


        //send a message with created events in announcements
        !!scheduled_events.length && 
            bot.sendAnnouncement({
                content: `@everyone`,
                embed: new EmbedBase({
                    title: `📅  This Week's Events`,
                    fields: scheduled_events.map(e => ({
                        name: e.name,
                        value: `
                            ${bot.formatTimestamp(e.scheduledStartTimestamp, 'F')}
                            *${e?.description ?? ''}*
                            [More info](${e.url})
                        `,
                        inline: false,
                    })),
                }),
            });
    }
}
