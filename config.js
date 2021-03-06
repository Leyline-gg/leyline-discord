// Bot configuration settings
export default {
    get production() {
        return {
            // Which users/roles get access to all commands
            command_perms: {
                categories: {
                    moderator: [
                        {   // Admin
                            id: '784875278593818694',
                            type: 'ROLE',
                            permission: true,
                        },
                        {   // Moderator
                            id: '752363863441145866',
                            type: 'ROLE',
                            permission: true,
                        },
                        {
                            // Ollog10
                            id: '139120967208271872',
                            type: 'USER',
                            permission: true,
                        },
                    ],
                    admin: [
                        {   // Admin
                            id: '784875278593818694',
                            type: 'ROLE',
                            permission: true,
                        },
                        {   // Moderator
                            id: '752363863441145866',
                            type: 'ROLE',
                            permission: true,
                        },
                        {
                            // Ollog10
                            id: '139120967208271872',
                            type: 'USER',
                            permission: true,
                        },
                        {   // Leyline staff
                            id: '751919243062411385',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                },
                names: {
                    awardnft: [
                        {
                            // *drops
                            id: '914629494319501332',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                    awardgp: [
                        {
                            // *drops
                            id: '914629494319501332',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                    poap: [
                        {
                            // *drops
                            id: '914629494319501332',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                },
            },
            leyline_guild_id: '751913089271726160',
            channels: {
                private_log: '843892751276048394',
                public_log: '810265135419490314',
                reward_log: '872724760805654538',
                mod_log: '896539306800328734', //private mod log
                submission_log: '903056355311644732',   //private submission log
                ama_vc: '794283967460147221',
                polls: '790063418898907166',
                staff: '751938945364787360',    //staff-only channel
                announcements: '751938743065378907',
            },
            events: {
                goodActs: {
                    target_channel: '840679701118189579',
                },
                kindWords: {
                    target_channel: '830163592803254352',
                },
                addAlphaTesterRole: {
                    alpha_role: '751919744528941126',
                },
            },
            emoji: {
                leyline_logo: '<:LeylineLogo:846152082226282506>',
                deafened: '<:deafened:945040413901852723>',
                unconnected: '<:unconnected:945042216764727326>',
            },
            // LeylineBot.checkMod() returns true if user has any of these roles
            mod_roles: [
                '784875278593818694',   //Admin
                '752363863441145866',   //Mod
            ],
            // Can be self-assigned using a command
            self_roles: [
                '853414453206188063',   //do good alerts
                '874704370103615559',   //Bot Updates
                '957052350588125185',   //Event Announcements
            ],
            roles: {
                muted: '896538689734324224',
                good_acts: '853414453206188063',
                event_announcements: '957052350588125185',
            },
        };
    },
    get development() {
        return {
			// Which users/roles get access to all commands
			command_perms: {
				categories: {
					moderator: [
						{
							// Moderator
							id: '904095889558212660',
							type: 'ROLE',
							permission: true,
						},
					],
					admin: [
						{
							// Moderator
							id: '904095889558212660',
							type: 'ROLE',
							permission: true,
						},
						{
							// Leyline staff
							id: '858144532318519326',
							type: 'ROLE',
							permission: true,
						},
					],
				},
                names: {
                    awardnft: [
                        {
                            // *drops
                            id: '914642168939962378',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                    poap: [
                        {
                            // *drops
                            id: '914642168939962378',
                            type: 'ROLE',
                            permission: true,
                        },
                    ],
                },
			},
			leyline_guild_id: '857839180608307210',
			channels: {
				private_log: '858141871788392448',
				public_log: '858141914841481246',
				reward_log: '904081593029759006',
				mod_log: '892268882285457439', //private mod log
				submission_log: '903055896173764659', //private submission log
				ama_vc: '869993145499287604',
				polls: '877229054456107069',
                staff: '973691346319736843',    //staff-only channel
                announcements: '973691873178832967',
			},
			events: {
				goodActs: {
					target_channel: '877229121086840912',
				},
				kindWords: {
					target_channel: '877229143786422323',
				},
				addAlphaTesterRole: {
					alpha_role: '879817566799925298',
				},
			},
			emoji: {
				leyline_logo: '<:LeylineLogo:859111140696391680>',
                deafened: '<:deafened:945042605438279723>',
                unconnected: '<:unconnected:945042427624955904>',
			},
			mod_roles: [
				'858144532318519326', //Leyline Staff
			],
			self_roles: ['873234204706631720', '865629785015320608'],
			roles: { 
                muted: '894741083186139156',
                event_announcements: '978445045206229012',
            },
		};
    },
    get staging() {
        return {
            ...this.development,
        };
    },
};
