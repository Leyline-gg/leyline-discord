import { MessageEmbed, Util } from 'discord.js';
import truncate from 'truncate';

//base Embed object, customized for Leyline
export class EmbedBase extends MessageEmbed {
    constructor({
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
                text: `${typeof footer === 'string' ? footer &&= footer + '  •  ' : ''}LeylineBot ${bot.CURRENT_VERSION}`,
                icon_url: bot.user.avatarURL(),
            },
            ...other,
        });
        return this.cleanup(bot);
    }

    get char_count() {
        // console.log(this.fields.reduce((acc, f) => acc + f.name.length + f.value.length, 0));
        // console.log(this.fields);
        return (this.title?.length || 0) + 
            (this.description?.length || 0) + 
            (this.footer.text?.length || 0) + 
            (this.author.name?.length || 0) + 
            this.fields.reduce((acc, f) => acc + f.name.length + f.value.length, 0);
    }

    // --------- Utility ---------
    
    // Ensure an embed stays within Discord's embed limits
    // https://discord.com/developers/docs/resources/channel#embed-limits
    cleanup(bot=null) {
        this.title &&= truncate(this.title.trim(), 255);
        this.description &&= truncate(this.description.trim(), 4095);
        this.fields = this.fields.slice(0, 25).map(f => ({
            ...f,
            name: truncate(f.name.trim(), 255),
            value: truncate(f.value.trim(), 1023),
        }));
        this.footer.text &&= truncate(this.footer.text.trim(), 2047);
        this.author.name &&= truncate(this.author.name.trim(), 255);

        if(this.char_count > 6000) 
            return this.splitEmbed({bot, ...this});

        return this;
    }

    /**
     * Recursively splits an embed into multiple embeds if it exceeds the Discord embed limits.
     * @returns {EmbedBase[]} An array of split embeds
     */
    splitEmbed({bot, fields=this.fields, embeds=[], ...other} = {}) {
        if(!fields.length) return embeds;
        const embed = new EmbedBase(other);
        embeds.push(embed);
        while(embed.char_count < 6000 && !!fields.length) {
            embed.fields.push(fields.shift());
        }
        //remove the last field of this embed because we ended up going over 6000 when exiting the loop
        if(embed.char_count > 6000) fields.unshift(embed.fields.pop());
        return this.splitEmbed({bot, fields, embeds});
    }

    /**
     * Splits a single embed field into multiple fields if it exceeds the Discord embed limits.
     * Each embed field will have the passed `args.name` with " (x of y)" appended to it,
     * if multiple fields are created.
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
                name: `${name} ${a.length > 1 ? `(${i + 1} of ${a.length})` : ''}`,
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
