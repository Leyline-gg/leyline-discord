import { Command, EmbedBase, LeylineUser, } from '../../classes';
import fs from 'node:fs';
import https from 'node:https';
import * as Firebase from '../../api';

class poap extends Command {
    constructor(bot) {
        super(bot, {
            name: 'poap',
            description: 'POAP event actions',
            options: [
                {
                    type: 'SUB_COMMAND',
                    name: 'load',
                    description: 'Load a file of claim codes into the bot',
                },
                {
                    type: 'SUB_COMMAND',
                    name: 'drop',
                    description: 'Award a POAP claim code to all users in a voice channel',
                    options: [
                        {
                            type: 'CHANNEL',
                            name: 'channel',
                            description: 'The voice channel where all members inside it will receive a POAP',
                            required: true,
                            channelTypes: [
                                'GUILD_VOICE',
                                'GUILD_STAGE_VOICE',
                            ],
                        },
                    ],
                },
            ],
            category: 'admin',
            deferResponse: true,
        });
    }

    download(url, location) {
        return new Promise(async (resolve, reject) => {
            // ensure directory exists
            await fs.promises.mkdir(location.split('/').slice(0, -1).join('/'), {recursive: true});
            // Check file does not exist yet before hitting network
            fs.access(location, fs.constants.F_OK, (err) => {
                if (err === null) reject('File already exists');

                const request = https.get(url, (response) => {
                    if (response.statusCode === 200) {
                        const file = fs.createWriteStream(location, { flags: 'wx' });
                        file.on('finish', () => resolve());
                        file.on('error', (err) => {
                            file.close();
                            if (err.code === 'EEXIST') reject('File already exists');
                            else fs.unlink(location, () => reject(err.message)); // Delete temp file
                        });
                        response.pipe(file);
                    } else if (response.statusCode === 302 || response.statusCode === 301) {
                        //Recursively follow redirects, only a 200 will resolve.
                        download(response.headers.location, location).then(() => resolve());
                    } else {
                        reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
                    }
                });

                request.on('error', (err) => {
                    reject(err.message);
                });
            });
        });
    };

    subcommands = {
        load: ({intr}) => {
            const { bot, download } = this;
            const msgFilter = async function (msg) {
                console.log(msg.id);
                console.log(msg.channel.id !== intr.channelId)
                console.log(msg.author.id !== intr.user.id)
                console.log(!msg.attachments?.first()?.url?.toLowerCase()?.endsWith('.txt'))
                if(msg.channel.id !== intr.channelId ||
                    msg.author.id !== intr.user.id ||
                    !msg.attachments?.first()?.url?.toLowerCase()?.endsWith('.txt')) return;
                    
                //disable this watcher
                bot.off('messageCreate', msgFilter);

                download(msg.attachments.first().url, `cache/poap/${Date.now()}.txt`);
            };

            const watcher = bot.on('messageCreate', msgFilter);
        },
    }

    async run({intr, opts}) {
        const { bot } = this;

        this.subcommands[opts.getSubcommand()]({intr, opts});
    }
}

export default poap;
