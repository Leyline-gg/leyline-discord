// Bot configuration settings
module.exports = {
    get production() {
        return {
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
            },
            emoji: {
                leyline_logo: '<:LeylineLogo:846152082226282506>',
            },
            mod_roles: [
                '784875278593818694',   //Admin
                '752363863441145866',   //Mod
                '751919243062411385',   //Leyline staff
            ],
            self_roles: [
                '853414453206188063',   //do good alerts
                '874704370103615559',   //Bot Updates
            ],
        }
    },
    get development() {
        return {
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
        }
    },
    get staging() {
        return {
            ...this.development,
        }
    },
}
