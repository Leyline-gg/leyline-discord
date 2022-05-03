//A local cache that stays in sync with Firestore configuration but can be queried synchronously
import admin from 'firebase-admin';

export class CloudConfig {
    static PATH = 'discord/bot';
    static _cache = new Map(); //immutablity implies that local changes do not sync w database
    static ready = false;

    static init() {
        const doc_ref = admin.firestore().doc(this.PATH);

        // Synchronously load data from Firestore and
        // Set up watcher to keep local cache up to date
        doc_ref.onSnapshot((doc) => {
            if(!doc.exists) return;    //document was removed, keep locally cached data the same
            const data = doc.get('config');
            //fs.writeFile('cache/test.json', data);
            
            //create temporary new cache to copy most recent doc data into
            //all deleted doc fields will be removed from the current cache
            const tmp = new Map();
            for(const [key, val] of Object.entries(data))
                tmp.set(key, val);
            this._cache = tmp;
            this.ready ||= true;
        }, console.error);

        return this.awaitReady();
    }

    static get(id) {
        //if(this.cache.has(id)) throw new Error(`Could not find ${id} in ${this.constructor.name}`);
        return this._cache.get(id);
    }

    static keys() {
        return [...this._cache.keys()];
    }
    
    static values() {
        return [...this._cache.values()];
    }

    // Implement setter that updates local & cloud?

    /**
     * 
     * @returns {Promise<boolean>} Promise that resolves to true when class has finished initialization
     */
    static awaitReady() {
        const self = this;
        return new Promise((resolve, reject) => {
            (function resolveReady() {
                self.ready ? resolve(true) : setTimeout(resolveReady, 500);
            })();
        });
    }
}
