// Bot configuration settings
module.exports = {
    get production() {
        return {
            prefix: '!',
            leyline_guild_id: '751913089271726160',
            //private logs
            discord_log_channel: '843892751276048394',
            //public logs
            discord_bot_channel: '810265135419490314',
            events: {
                goodActs: {
                    target_channel: '840679701118189579',
                },
            },
        }
    },
    get development() {
        return {
            prefix: '!!',
            leyline_guild_id: '857839180608307210',
            //private logs
            discord_log_channel: '858141871788392448',
            //public logs
            discord_bot_channel: '858141914841481246',
            events: {
                goodActs: {
                    target_channel: '858141836513771550',
                },
            },
        }
    },
    get staging() {
        return {
            ...this.development,
            prefix: '$',
        }
    },
}
