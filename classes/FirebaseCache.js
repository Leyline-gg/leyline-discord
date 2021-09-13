import admin from 'firebase-admin';

export class FirebaseCache {
    cache = new Map();
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
                        this.cache.set(docChange.doc.id, docChange.doc.data());
                        break;
                    case 'removed':
                        this.cache.delete(docChange.doc.id);
                        break;
                }
            }
            this.ready ||= true;
        }, console.error); 
    }

    get(id) {
        //if(this.cache.has(id)) throw new Error(`Could not find ${id} in ${this.constructor.name}`);
        return this.cache.get(id);
    }

    keys() {
        return [...this.cache.keys()];
    }
    
    values() {
        return [...this.cache.values()];
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
