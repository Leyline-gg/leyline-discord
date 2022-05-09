import { Client } from '@notionhq/client';
import bot from '../../bot';
import { Command } from '../../classes';

class notion extends Command {
	constructor() {
		super({
			name: 'notion',
			description: 'testing notion events',
			category: 'development',
		});
	}

    async run({ intr, opts }) {
        const notion = new Client({ auth: process.env.NOTION_SECRET });
        
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
        
        const event = events.results[0];

        const blocks = await notion.blocks.children.list({ block_id: event.id });
        //console.log(event);
        console.log(event.properties.Name.title[0].plain_text);
        console.log(event.properties.Date.date.start);
        const desc_header_idx = blocks.results.findIndex(b => b[b.type].rich_text[0].plain_text.toLowerCase().includes('description')) + 1;
        const desc = desc_header_idx > 0 ? blocks.results[desc_header_idx][blocks.results[desc_header_idx].type].rich_text[0].plain_text : null;
        console.log(desc);
        console.log(event.properties['Discord Channel'].select.name.split('#')[1]);
        
        const vc = await bot.leyline_guild.channels.fetch(event.properties['Discord Channel'].select.name.split('#')[1]);
        
        await bot.leyline_guild.scheduledEvents.create({
            name: event.properties.Name.title[0].plain_text,
            scheduledStartTime: event.properties.Date.date.start,
            privacyLevel: 'GUILD_ONLY',
            entityType: 
                vc.type === 'GUILD_VOICE' ? 'VOICE'
                    : vc.type === 'GUILD_STAGE_VOICE' ? 'STAGE_INSTANCE'
                        : 'EXTERNAL',
            channel: vc,
            description: desc,
            reason: 'Weekly automated event importation from Notion',
        });
    }
}

export default notion;
