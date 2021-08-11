const { MessageEmbed } = require('discord.js');
//base Embed object, customized for Leyline
class EmbedBase extends MessageEmbed {
    constructor(bot, {
        color = 0x2EA2E0,
        title,
        url,
        author = {},
        description,
        thumbnail = {},
        fields = [],
        image = {},
        timestamp = new Date(),
        footer = {
            text: `LeylineBot ${bot.CURRENT_VERSION}`,
            icon_url: bot.user.avatarURL()
        },
        ...other
    }) {
        super({
            color,
            title,
            url,
            author,
            description,
            thumbnail,
            fields,
            image,
            timestamp,
            footer,
            ...other,
        });
    }
    
    // --------- Presets ---------
    Error() {
        this.color = 0xf5223c;
        return this;
    }

    Warn() {
        this.color = 0xf57a22;
        return this;
    }

    Success() {
        this.color = 0x35de2f;
        return this;
    }
}

module.exports = EmbedBase;
