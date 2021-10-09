import { MessageEmbed } from "discord.js";

//base Embed object, customized for Leyline
export class EmbedBase extends MessageEmbed {
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
        footer = '',
        ...other
    } = {}) {
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
            footer: {
                text: `${footer &&= footer + '  •  '}LeylineBot ${bot.CURRENT_VERSION}`,
                icon_url: bot.user.avatarURL(),
            },
            ...other,
        });
    }
    
    // --------- Presets ---------
    Error() {
        this.color = 0xf5223c;
        return this;
    }

    ErrorMsg(msg) {
        const default_msg = '❌ I ran into an error while trying to run that command';
        this.Error();
        if(!msg) this.description = `**${default_msg}**`;
        else {
            this.title = default_msg;
            this.description = msg;
        }
        return this;
    }

    Warn() {
        this.color = 0xf5a122;  //0xf59a22 for slightly less bright
        return this;
    }

    Success() {
        this.color = 0x35de2f;
        return this;
    }

    Punish() {
        this.color = 0xe3da32;
        return this;
    }
}
