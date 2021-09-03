const Firebase = require('./FirebaseAPI');

class Analytics {
    static async #getAnalyticsUser(uid) {
        const doc = await Firebase.getDiscordDoc(uid);
        if(!doc) doc = Firebase.createDiscordUser(uid).then(async () => await Firebase.getDiscordDoc(uid, true)).catch(() => console.log(`Error creating Discord user with id ${uid} in Analytics class`));
        return await doc.ref.collection('analytics').get();
    }

    
    //add AnalyticsUser class? reference firebase bot/users collection... make bot/analytics? nah idk
    static logCommand(cmd, user) {
        this.#getAnalyticsUser();
    }
}

module.exports = Analytics;
