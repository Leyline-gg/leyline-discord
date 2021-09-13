// Bot configuration settings
export default {
    get production() {
        return {
            // Which users/roles get access to all commands
            command_perms: [
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
                {   // Leyline staff
                    id: '751919243062411385',
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
            leyline_guild_id: '751913089271726160',
            channels: {
                private_log: '843892751276048394',
                public_log: '810265135419490314',
                reward_log: '872724760805654538',
                ama_vc: '794283967460147221',
                polls: '790063418898907166',
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
            ],
        };
    },
    get development() {
        return {
            // Which users/roles get access to all commands
            command_perms: [
                {   // Leyline staff
                    id: '858144532318519326',
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
            leyline_guild_id: '857839180608307210',
            channels: {
                private_log: '858141871788392448',
                public_log: '858141914841481246',
                reward_log: '858141836513771550',
                ama_vc: '869993145499287604',
                polls: '877229054456107069',
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
            },
            mod_roles: [
                '858144532318519326',   //Leyline Staff
            ],
            self_roles: [
                '873234204706631720',
                '865629785015320608',
            ],
        };
    },
    get staging() {
        return {
            ...this.development,
        };
    },
};
