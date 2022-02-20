import { MessageEmbed, Util } from 'discord.js';
import truncate from 'truncate';

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
        this.cleanup();
    }

    // --------- Utility ---------
    
    // Ensure an embed stays within Discord's embed limits
    // https://discord.com/developers/docs/resources/channel#embed-limits
    cleanup() {
        this.title &&= truncate(this.title, 255);
        this.description &&= truncate(this.description, 4095);
        this.fields = this.fields.slice(0, 25).map(f => ({
            name: truncate(f.name, 255),
            value: truncate(f.value, 1023),
        }));
        this.footer.text &&= truncate(this.footer.text, 2047);
        this.author.name &&= truncate(this.author.name, 255);

        //TODO: if total sum of chars > 6000, embed is rejected

        return this;
    }

    /**
     * Splits a single embed field into multiple fields if it exceeds the Discord embed limits.
     * Each embed field will have the passed `args.name` with " (x of y)" appended to it.
     * @param {Object} args Destructured arguments
     * @param {string} args.name Name of the embed field
     * @param {string} args.value Value of the embed field
     * @param {string} [args.separator] Separator to use when determining character count
     * @param {boolean} [args.inline] Whether the embed fields should all be inline
     * @returns {Array<Object>} An array of split embed fields
     */
    static splitField({name, value, separator='\n', inline=false} = {}) {
        return Util.splitMessage(value, {maxLength: 1024, char: separator})
            .reduce((acc, val) => {
                const charcount = acc[acc.length - 1].join().length;
                (charcount + val.length) > 1024 
                    ? acc.push([val])
                    : acc[acc.length - 1].push(val);
                return acc;
            }, [[]])
            .map((v, i, a) => ({
                name: `${name} (${i + 1} of ${a.length})`,
                value: v.join(separator),
                inline,
            }));
    }
    
    // --------- Presets ---------
    Error() {
        this.color = 0xf5223c;
        return this;
    }

    ErrorDesc(msg) {
        this.description = `❌ **${msg}**`;
        return this.Error();
    }

    Warn() {
        this.color = 0xf5a122;  //0xf59a22 for slightly less bright
        return this;
    }

    Success() {
        this.color = 0x31d64d;
        return this;
    }

    Sentence() {
        this.color = 0xe3da32;
        return this;
    }
}
