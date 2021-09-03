import { firestore } from 'firebase-admin'

/**
 * Get the latest LLP balance of a Leyline user
 * Taken from webapp's api package `userService.ts`
 * @param {String} uid Leyline UID 
 * @returns {Promise<Number>} User's most up-to-date LLP balance
 */
export const getLLPBalance = async function (uid) {
    const userDoc = await firestore().doc(`users/${uid}`).get();
    const userData = userDoc.data();

    // get balance last snapshot
    const snapshotValue = userData?.balance_snapshot?.snapshot_value || 0;
    const snapshotTime = userData?.balance_snapshot?.snapshot_time?.toMillis() || 0;

    // get points since last snapshot
    const pointsDoc = await firestore()
        .collection('leyline_points')
        .where('uid', '==', uid)
        .where('created', '>', snapshotTime)
        .get();
    const points = pointsDoc.docs.reduce((acc, doc) => {
        return acc + doc.data().leyline_points;
    }, 0);

    return snapshotValue + points;
}

/**
 * Get a Leyline user's total LLP earned
 * Taken from webapp's api `userService.ts`
 * @param {String} uid Leyline UID 
 * @returns {Promise<Number>} Total LLP earned up until this point
 */
export const getTotalEarnedLLP = async function (uid) {
    const snapshotRef = await firestore()
        .collection('leaderboards')
        .orderBy('snapshot_time', 'desc')
        .limit(1)
        .get();

    const userRankingRef = 
        await firestore()
        .collection(`${'leaderboards'}/${snapshotRef.docs[0].id}/timeframes/all/categories/earned_llp/ranking`)
        .get();

    const userRankDoc = userRankingRef.docs.find((doc) => doc.id === uid);

    return userRankDoc?.data()?.score || 0;
}

/**
 * Get a Leyline user's total LLP earned for volunteering
 * @param {String} uid Leyline UID 
 * @returns {Promise<Number>} Approximate total LLP earned for volunteering
 */
export const getVolunteerLLP = async function (uid) {
    const snapshot = await firestore()
        .collection('leyline_points')
        .where('uid', '==', uid)
        .where('metadata.category', '==', 'Leyline Volunteer Program')
        .get();

    return snapshot.docs.reduce((a, b) => a + (b.data()?.leyline_points > 0 ? b.data().leyline_points : 0), 0);
}

/**
 * Award a specific amount of LLP to a user, with an option to include transaction metadata
 * @param {String} uid Leyline UID
 * @param {Number} amount Amount of LLP to award
 * @param {Object} [metadata] Metadata for transaction. Should contain a `category` property
 */
export const awardLLP = async function (uid, amount, metadata = {}) {
    return await firestore().collection('leyline_points').add({
        uid: uid,
        leyline_points: amount,
        created: Date.now(),
        metadata: {
            category: 'Discord Participation',
            ...metadata,
            fromDiscord: true,
        },
    });
}
