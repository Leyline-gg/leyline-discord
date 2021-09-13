//A local cache that stays in sync with Firestore but can be queried synchronously
import admin from 'firebase-admin';

export class FirebaseCache {
    _cache = new Map(); //immutablity implies that local changes do not sync w database
    ready = false;  //true when initialization is complete
    constructor({
        path=null,   //firebase path to watch
        collection=true,    //whether we're watching a collection or a document
    } = {}) {
        const col_ref = admin.firestore().collection(path);

        // Synchronously load data from Firestore and
        // Set up watcher to keep local cache up to date
        col_ref.onSnapshot((snapshot) => {
            if(snapshot.empty) return;
            for(const docChange of snapshot.docChanges()) {
                //if doc was created before the bot came online, ignore it
                //if(docChange.doc.createTime.toMillis() < Date.now()) continue;
                switch(docChange.type) {
                    case 'added':
                    case 'modified':
                        this._cache.set(docChange.doc.id, docChange.doc.data());
                        break;
                    case 'removed':
                        this._cache.delete(docChange.doc.id);
                        break;
                }
            }
            this.ready ||= true;
        }, console.error); 
    }

    get(id) {
        //if(this.cache.has(id)) throw new Error(`Could not find ${id} in ${this.constructor.name}`);
        return this._cache.get(id);
    }

    keys() {
        return [...this._cache.keys()];
    }
    
    values() {
        return [...this._cache.values()];
    }

    // Implement setter that updates local & cloud?

    /**
     * 
     * @returns {Promise<boolean>} Promise that resolves to true when class has finished initialization
     */
    awaitReady() {
        const self = this;
        return new Promise((resolve, reject) => {
            (function resolveReady() {
                self.ready ? resolve(true) : setTimeout(resolveReady, 500);
            })();
        });
    }
}
