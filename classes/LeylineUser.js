import * as Firebase from '../api';

export class LeylineUser {
    // hours donated, blood donated, gp balance, days slept/exercised
    // leaderboard positions? for all time
    // avatar, total items in inventory
    constructor(uid) {
        return (async () => {
            console.time('Fetching doc')
            const doc = await Firebase.getLeylineDoc(uid);
            console.timeEnd('Fetching doc')

            this.uid = uid;
            //this.discord_uid = discord_uid || (await Firebase.getDiscordDoc(uid, true)).id;
            this._username = doc?.username;
            
            console.time('Fetching gp')
            this.gp = await Firebase.getPointsBalance(uid);
            console.timeEnd('Fetching gp')

            console.time('Fetching total_gp')
            this.total_gp = await Firebase.getTotalEarnedPoints(uid);
            console.timeEnd('Fetching total_gp')

            console.time('Fetching volunteer_gp')
            this.volunteer_gp = await Firebase.getVolunteerPoints(uid);
            console.timeEnd('Fetching volunteer_gp')

            console.time('Fetching userRankings')
            this.rankings = await Firebase.getUserRankings(uid);
            console.timeEnd('Fetching userRankings')

            console.time('Fetching inventory')
            this.inventory = await Firebase.getInventoryItems(uid);
            console.timeEnd('Fetching inventory')

            this.profile_url = `https://leyline.gg/profile/${doc?.profile_id}`;

            return this;
        })();
    }

    get username() {
        return this._username || `leylite#${this.uid}`.substring(0, 15);
    }

    get avatar_url() {
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


