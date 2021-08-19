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

    didUserLevelUp({stat_type, stats, level} = {}) {
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
        const bot = this.bot;
        const uid = doc.data().uid;
        if(!uid) return bot.logger.error(`${this.name} onAdd() was not provided a uid in the document data`);
        const stats = await XPService.getUserStats(uid);
        const level = XPService.getUserLevelSync(stats);
        // Check the user's profile to see if they leveled up
        // Tag the user in the public bot log
        // Distribute awards
        if(!this.didUserLevelUp({stats, level, stat_type: doc.data().type})) return;

        await XPService.userLevelUp(uid);

        const member = await bot.leyline_guild.members.fetch(uid);
        if(!doc.data()?.metadata?.migrated_on && !member) return bot.logDiscord({ embed: new EmbedBase(bot, {
            fields: [{
                name: '⬆ User Level Up',
                value: `Discord user <@${doc.data().uid}> just leveled up, but I could not find them in the server`
            }],
        }).Error()});
        
        !doc.data()?.metadata?.migrated_on && 
            /*await*/ bot.msgBotChannel({embed: await this.generateLevelUpMsg({uid, level})});

        //distribute awards
        for(const r of level.rewards) {
            XPService[r.function]({...r.args, member, bot, level});
        }
    }
}

module.exports = LevelUp;
