import admin from 'firebase-admin';

// Methods I couldn't categorize in other files

/**
 * Retrieve the most recent leaderboard rankings for the target leyline user.
 * Taken from webapp's api package `userService.ts` file
 * @param {String} uid Leyline uid to get rankings for
 * @returns Object of rankings for leyling user
 */
export const getUserRankings = async function (uid) {
    // get latest leaderboard snapshot
    const snapshotRef = await admin.firestore()
        .collection('leaderboards')
        .orderBy('snapshot_time', 'desc')
        .limit(1)
        .get();

    // function to query the latest snapshot for the doc count in the provided category
    const getCategoryRankings = async (category) => {
        const rankingDocsRef = await admin.firestore()
            .collection(`${'leaderboards'}/${snapshotRef.docs[0].id}/timeframes/all/categories/${category}/ranking`)
            .get();

        const userRankDoc = rankingDocsRef.docs.find((doc) => doc.id === uid);

        return {
            total: rankingDocsRef.docs.length,
            rank: userRankDoc?.data().rank,
            score: userRankDoc?.data().score,
        };
    };

    // query for total docs and user ranking for each category
    const {
        total: bloodDonationTotalUsers,
        rank: bloodDonationRanking,
        score: bloodDonationScore,
    } = await getCategoryRankings('blood_donation');
    const {
        total: dailyExerciseTotalUsers,
        rank: dailyExerciseRanking,
        score: dailyExerciseScore,
    } = await getCategoryRankings('daily_exercise');
    const {
        total: donatedHoursTotalUsers,
        rank: donatedHoursRanking,
        score: donatedHoursScore,
    } = await getCategoryRankings('donated_hours');
    const { 
        total: sleepTotalUsers,
        rank: sleepRanking,
        score: sleepScore,
    } = await getCategoryRankings('sleep');

    return {
        bloodDonationRanking,
        bloodDonationTotalUsers,
        bloodDonationScore,
        dailyExerciseRanking,
        dailyExerciseTotalUsers,
        dailyExerciseScore,
        donatedHoursRanking,
        donatedHoursTotalUsers,
        donatedHoursScore,
        sleepRanking,
        sleepTotalUsers,
        sleepScore,
    };
}
