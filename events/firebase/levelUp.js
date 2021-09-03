const EmbedBase = require('../../classes/EmbedBase');
const FirebaseEvent = require('../../classes/FirebaseEvent');
const XPService = require('../../classes/XPService');

class LevelUp extends FirebaseEvent {
    constructor(bot) {
        super(bot, {
            name: 'LevelUp',
            description: 'Perform actions when a user levels up',
            collection: XPService.COLLECTION_PATH,
        });
    }

    didUserLevelUp({xp, nextlevel} = {}) {
        return xp >= nextlevel.xp;
        //user stats must have greater than the minimum requirement
        for(const [name, val] of Object.entries(level.requirements))
            if(!stats[name]) return false;
            else if(stats[name] < val) return false;
        //check if the stat just added equals the minimum value for that level's stat
        return stats[stat_type] === level.requirements[stat_type];
    }

    async generateLevelUpMsg({uid, level} = {}) {
        return new EmbedBase(this.bot, {
            title: '⬆  User Leveled Up',
            description: `${this.bot.formatUser(await this.bot.users.fetch(uid))} reached level **${level.number}**!\nWay to change the game & Leylight the way!`,
        });
    }

    /**
     * 
     * @param {FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>} doc 
     */
    async onAdd(doc) {
        const { bot } = this;
        const uid = doc.data().uid;
        if(!uid) return bot.logger.error(`${this.name} onAdd() could not find a uid for doc ${doc.ref.path}`);
        const xp = await XPService.getUserXP(uid);
        const curlevel = await XPService.getUserLevel(uid);    //this returns what's in the db, which should be the user's old level
        const nextlevel = XPService.getLevel(curlevel.number + 1);
        // Check the user's profile to see if they leveled up
        // Tag the user in the public bot log
        // Distribute awards
        if(doc.data()?.metadata?.migrated_on) return;
        if(!this.didUserLevelUp({xp, nextlevel})) return;

        await XPService.userLevelUp(uid);

        const member = await bot.leyline_guild.members.fetch(uid);
        if(!member) 
            return bot.logDiscord({ embed: new EmbedBase(bot, {
                fields: [{
                    name: '⬆ User Level Up',
                    value: `Discord user <@${doc.data().uid}> just leveled up, but I could not find them in the server`
                }],
            }).Error()});

        /*await*/ bot.msgBotChannel({embed: await this.generateLevelUpMsg({uid, level: nextlevel})});

        //distribute awards
        for(const r of nextlevel.rewards) {
            XPService[r.function]({...r.args, member, bot, level: nextlevel});
        }
    }
}

module.exports = LevelUp;
