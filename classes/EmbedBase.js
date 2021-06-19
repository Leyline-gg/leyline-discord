//base Embed object, customized for Leyline
class EmbedBase {
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
        this.color          =   color;
        this.title          =   title;
        this.url            =   url;
        this.author         =   author;
        this.description    =   description;
        this.thumbnail      =   thumbnail;
        this.fields         =   fields;
        this.image          =   image;
        this.timestamp      =   timestamp;
        this.footer         =   footer;
        Object.assign(this, other);
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
}

module.exports = EmbedBase;