import admin from 'firebase-admin';

/**
 * Get the latest GP balance of a Leyline user
 * Taken from webapp's api package `userService.ts`
 * @param {String} uid Leyline UID 
 * @returns {Promise<Number>} User's most up-to-date GP balance
 */
export const getPointsBalance = async function (uid) {
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    const userData = userDoc.data();

    // get balance last snapshot
    const snapshotValue = userData?.balance_snapshot?.snapshot_value || 0;
    const snapshotTime = userData?.balance_snapshot?.snapshot_time?.toMillis() || 0;

    // get points since last snapshot
    const pointsDoc = await admin.firestore()
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
 * Get a Leyline user's total GP earned
 * Taken from webapp's api `userService.ts`
 * @param {String} uid Leyline UID 
 * @returns {Promise<Number>} Total GP earned up until this point
 */
export const getTotalEarnedPoints = async function (uid) {
    const snapshotRef = await admin.firestore()
        .collection('leaderboards')
        .orderBy('snapshot_time', 'desc')
        .limit(1)
        .get();

    const userRankDoc = await admin.firestore()
        .collection(`${'leaderboards'}/${snapshotRef.docs[0].id}/timeframes/all/categories/earned_llp/ranking`)
        .doc(uid)
        .get();

    return userRankDoc?.data()?.score || 0;
}

/**
 * Get a Leyline user's total GP earned for volunteering
 * @param {String} uid Leyline UID 
 * @returns {Promise<Number>} Approximate total GP earned for volunteering
 */
export const getVolunteerPoints = async function (uid) {
    const snapshot = await admin.firestore()
        .collection('leyline_points')
        .where('uid', '==', uid)
        .where('metadata.category', '==', 'Leyline Volunteer Program')
        .get();

    return snapshot.docs.reduce((a, b) => a + (b.data()?.leyline_points > 0 ? b.data().leyline_points : 0), 0);
}

/**
 * Award a specific amount of GP to a user, with an option to include transaction metadata
 * @param {String} uid Leyline UID
 * @param {Number} amount Amount of GP to award
 * @param {Object} [metadata] Metadata for transaction. Should contain a `category` property
 */
export const awardPoints = async function (uid, amount, metadata = {}) {
    return await admin.firestore().collection('leyline_points').add({
        uid,
        leyline_points: amount,
        created: Date.now(),
        metadata: {
            category: 'Discord Participation',
            ...metadata,
            fromDiscord: true,
        },
    });
}
