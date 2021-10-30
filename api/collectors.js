import admin from 'firebase-admin';

/**
 * Creates a collector in Firestore from the given `ReactionCollectorBase` object
 * Assumes collector is still pending mod approval
 * @param {ReactionCollectorBase} collector 
*/
export const createCollector = async function (collector) {
    await admin.firestore()
        .collection(`discord/bot/reaction_collectors/`)
        .doc(collector.id)
        .set({
            type: collector.type,
            channel: collector.msg.channel.id,
            author: collector.msg.author.id,
            approved: false,
            expires: Date.now() + (collector.APPROVAL_WINDOW * 3600 * 1000),
        });
    return;
}

/**
 * Update an exisiting collector document to indicate its approval
 * @param {Object} args Destructured args
 * @param {ReactionCollectorBase} args.collector The collector to reject
 * @param {User} args.user The user that initiated the rejection
 * @param {Object} [args.metadata] Data to be included in the Firestore document
 * @returns {Promise<void>} Resolves when the write has been completed
 */
export const approveCollector = async function ({collector, user, metadata}) {
    //set expiration time to right now, so collector does not get picked up during initialization
    await admin.firestore()
        .collection(`discord/bot/reaction_collectors/`)
        .doc(collector.id)
        .set({
            ...metadata,
            expires: Date.now() + collector.REACTION_WINDOW * 3600 * 1000,
            approved: true,
            approved_by: user.id,
            approved_on: Date.now(),
        }, { merge: true });
    return;	
}

/**
 * "Reject" a collector by setting its approval status to false, expiration time to `Date.now()`,
 * and storing the id of the user that initiated the rejection
 * @param {Object} args Destructured args
 * @param {ReactionCollectorBase} args.collector The collector to reject
 * @param {User} args.user The user that initiated the rejection
 * @returns {Promise<void>} Resolves when the write has been completed
 */
export const rejectCollector = async function ({collector, user}) {
    //set expiration time to right now, so collector does not get picked up during initialization
    await admin.firestore()
        .collection(`discord/bot/reaction_collectors/`)
        .doc(collector.id)
        .set({
            expires: Date.now(),
            approved: false,
            rejected_by: user.id,
        }, { merge: true });
    return;	
}

/**
 * 
 * @param {Object} args Destructured args
 * @param {ReactionCollectorBase} args.collector The collector to store the reaction under
 * @param {User} args.user The user that reacted
 * @returns {Promise<void>} Resolves when the write has been completed
 */
export const storeUserReaction = async function ({collector, user}) {
    await admin.firestore()
        .collection(`discord/bot/reaction_collectors/`)
        .doc(collector.id)
        .collection('reacted_users')
        .doc(user.id)
        .set({
            reacted: true,
            timestamp: Date.now(),
        }, { merge: true });
    return;
}

/**
 * Get the number of reactions to approved posts given out by a Discord user
 * @param {String} uid Discord UID
 * @returns {Promise<Number>}
 */
export const getDiscordReactions = async function (uid) {
    let res = 0;
    const collectors = await admin
        .firestore()
        .collection('discord/bot/reaction_collectors')
        //.where('author', '==', uid)
        .where('approved', '==', true)
        .get();

    for(const c of collectors.docs)
        for(const doc of (await c.ref.collection('reacted_users').get()).docs)
            doc.id === uid && res++;
    return res;
}

/**
 * Get the Firestore document for a collector, if it exists
 * @param {String} id The collector's id
 * @returns {Promise<FirebaseFirestore.DocumentData | undefined>} JSON collector data or undefined if non-existent
 */
export const fetchCollector = async function (id) {
    const collector = await admin
        .firestore()
        .collection('discord/bot/reaction_collectors')
        .doc(id)
        .get();
    return collector.data();
}
