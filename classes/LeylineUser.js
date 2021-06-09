const Firebase = require('../classes/FirebaseAPI');

class LeylineUser {
    // hours donated, blood donated, llp balance, days slept/exercised
    // leaderboard positions? for all time
    // avatar, total items in inventory
    constructor(uid) {
        return (async () => {
            const doc = await Firebase.getLeylineDoc(uid);
            this.uid = uid;
            this._username = doc?.username;
            this.llp = doc?.balance_snapshot?.snapshot_value || 0;
            this.stats = await Firebase.getUserRankings(uid);
            this.inventory = await Firebase.getInventoryItems(uid);
            this.profile_id = doc?.profile_id;

            return this;
        })();
    }

    get username() {
        return this._username || `leylite#${this.uid}`.substring(0, 15);
    }

    get avatarUrl() {
        let url = 'https://i.ibb.co/qBBpDdh/avatar-default.png';  //default avatar
        const inv = this.inventory;
        if(!inv.length) return url;
        
        for(const item of inv) 
            //is item an avatar and is it equipped?
            if(item.isEquipped && item.equipSlot === 'SKIN') {
                url = item?.avatarUrl || url;
                break;
            }
        return url;
    }
}

module.exports = LeylineUser;