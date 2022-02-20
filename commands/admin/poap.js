import { Command, EmbedBase, } from '../../classes';
import fs from 'node:fs';
import https from 'node:https';
import { partition } from 'lodash-es';

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

    async loadLatestCodes() {
        const files = await fs.promises.readdir('cache/poap');
        const file = files.sort((a, b) => Number(b.split('.')[0]) - Number(a.split('.')[0]))[0];
        const codes = (await fs.promises.readFile(`cache/poap/${file}`, 'utf8')).split('\n');
        return codes.filter(c => c.startsWith('http://POAP.xyz/claim/') || c.startsWith('https://POAP.xyz/claim/'));
    }

    awardPOAP({user, code}) {
        const { bot } = this;
        return bot.sendDM({user, embed: new EmbedBase(bot, {
            //thumbnail: { url: nft.thumbnailUrl },
            fields: [
                {
                    name: `🎉 You Earned a POAP!`,
                    value: code,
                },
            ],	
        })}).then(() => true).catch((e) => {
            console.log(e);
            return false;
        });
    }

    subcommands = {
        load: ({intr}) => {
            const { bot, download, loadLatestCodes } = this;
            const msgFilter = async function (msg) {
                if(msg.channel.id !== intr.channelId ||
                    msg.author.id !== intr.user.id ||
                    !msg.attachments?.first()?.url?.toLowerCase()?.endsWith('.txt')) return;
                    
                //disable this watcher & the inactivity timeout
                bot.off('messageCreate', msgFilter);
                clearTimeout(inactivity);

                //delete the message
                msg.delete();

                //download the file
                await download(msg.attachments.first().url, `cache/poap/${Date.now()}.txt`);

                //load the file
                const codes = await loadLatestCodes();
                
                //respond to user
                bot.intrUpdate({
                    intr, 
                    embed: new EmbedBase(bot, {
                        description: `✅ **I have successfully loaded ${codes.length} POAP codes and they are ready to be dropped.**`,
                    }).Success(),
                });
            };

            bot.intrReply({
                intr, 
                embed: new EmbedBase(bot, {
                    description: 'Please upload the text file containing the POAP codes',
                }),
            });

            bot.on('messageCreate', msgFilter);

            //stop watching for messages after a period of time
            const inactivity = setTimeout(() => {
                bot.off('messageCreate', msgFilter);
                bot.intrUpdate({
                    intr, 
                    embed: new EmbedBase(bot).ErrorDesc('Load command cancelled due to inactivity'),
                });
            }, 20000);
        },
        drop: async ({intr, opts}) => {
            const { bot, loadLatestCodes } = this;
            
            const codes = await loadLatestCodes();
            const ch = opts.getChannel('channel');
            const voice_members = [...(await bot.channels.fetch(ch.id, {force: true})).members.values()];
            if(!voice_members.length)
                return bot.intrReply({
                    intr, 
                    embed: new EmbedBase(bot).ErrorDesc(`There are no users in the ${ch.toString()} voice channel!`),
                });
            if(codes.length < voice_members.length)
                return bot.intrReply({
                    intr, 
                    embed: new EmbedBase(bot).ErrorDesc(`There are not enough codes for the number of users in the ${ch.toString()} voice channel!`),
                });

            const [eligible, ineligible] = partition(voice_members, m => !m.voice.selfDeaf);

            //start typing in channel because award process will take some time
            //this improves user experience
            intr.channel.sendTyping();

            for(const member of eligible) 
                member.awarded = await this.awardPOAP({
                    user: member,
                    code: codes.shift(),
                });
            
            
            //sort award results into arrays for the follow-up response
            const [awarded, unawarded] = partition(eligible, m => m.awarded);

            const embed = new EmbedBase(bot, {
                description: `**${awarded.length} out of ${eligible.length} POAPs** were awarded`,
                //thumbnail: { url: nft.thumbnailUrl },
                fields: [
                    ...(!!awarded.length ? EmbedBase.splitField({
                        name: '✅ Users Awarded',
                        value: awarded.map(m => bot.formatUser(m.user)).join('\n'),
                    }) : []),
                    ...(!!unawarded.length ? EmbedBase.splitField({
                        name: '⚠ Users Award FAILED',
                        value: unawarded.map(m => bot.formatUser(m.user)).join('\n'),
                     }) : []),
                    ...(!!ineligible.length ? EmbedBase.splitField({
                        name: '❌ Users Award INELIGIBLE',
                        value: ineligible.map(m => bot.formatUser(m.user)).join('\n'),
                        inline: false
                    }) : []),
                ],
            });
            !unawarded.length ? embed.Success() : embed.Warn();
            bot.intrReply({intr, embed});

            return;
        },
    }

    async run({intr, opts}) {
        this.subcommands[opts.getSubcommand()]({intr, opts});
    }
}

export default poap;
