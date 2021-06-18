const admin = require('firebase-admin');

class FirebaseAPI {
	/**
	 * Checks if a discord user has connected their leyline acct
	 * @param {String} discord_uid UID of the discord user to check
	 * @returns {Promise<boolean>} `true` if connected, `false` if not
	 */
	static async isUserConnectedToLeyline(discord_uid) {
		const discord_doc = await admin.firestore().doc(`discord/bot/users/${discord_uid}`).get();
		if (!discord_doc.exists) return false;
		if (!discord_doc.data()?.leylineUID) return false;
		return true;
	}

	/**
	 * Retrieves the Leyline UID of the specified discord user
	 * @param {String} discord_uid UID of the discord user
	 * @returns {Promise<String | null>} Leyline UID if it exists, else `null`
	 */
	static async getLeylineUID(discord_uid) {
		const discord_doc = await admin.firestore().doc(`discord/bot/users/${discord_uid}`).get();
		if (!discord_doc.exists || !discord_doc.data()?.leylineUID) return null;
		return discord_doc.data().leylineUID;
	}

	/**
	 * Retrieves the `DocumentSnapshot.data()` for a given discord user (under the collection `discord/bot/users`)
	 * @param {String} discord_uid Discord UID of the user to retrieve the doc for
	 * @param {boolean} [include_metadata] Whether or not to return the raw DocumentSnapshot if it exists (pass `true`), or an Object with the document's data (default)
	 * @returns {Promise<Object | FirebaseFirestore.DocumentSnapshot | null>} `null` if document does not exist, else see `include_metadata`
	 */
	static async getDiscordDoc(discord_uid, include_metadata = false) {
		const res = await admin.firestore().doc(`discord/bot/users/${discord_uid}`).get();
		if (!res.exists) return null;
		return include_metadata ? res : res.data();
	}

	/**
	 * Creates a discord user under discord/bot/users
	 * @param {String} discord_uid UID of the discord user to create
	 * @returns {Promise<boolean>} `true` if succesfully created, `false` if not
	 */
	static async createDiscordUser(discord_uid) {
		return admin
			.firestore()
			.collection('discord/bot/users')
			.doc(discord_uid)
			.create()
			.then(() => true)
			.catch(() => false);
	}

	/**
	 * Retrieves the `DocumentSnapshot.data()` for a given Leyline user (under the collection `users`)
	 * @param {String} leyline_uid Leyline UID of the user to retrieve the doc for
	 * @param {boolean} [include_metadata] Whether or not to return the raw DocumentSnapshot if it exists (pass `true`), or an Object with the document's data (default)
	 * @returns {Promise<Object | FirebaseFirestore.DocumentSnapshot | null>} `null` if document does not exist, else see `include_metadata`
	 */
	static async getLeylineDoc(leyline_uid, include_metadata = false) {
		const res = await admin.firestore().doc(`users/${leyline_uid}`).get();
		if (!res.exists) return null;
		return include_metadata ? res : res.data();
	}

	static async getLeylineInfo(uid) {}

	/**
	 * Retrieve the most recent leaderboard rankings for the target leyline user.
	 * Taken from webapp's api package `userService.ts` file
	 * @param {String} uid Leyline uid to get rankings for
	 * @returns Object of rankings for leyling user
	 */
	static async getUserRankings(uid) {
		// get latest leaderboard snapshot
		const snapshotRef = await admin
			.firestore()
			.collection('leaderboards')
			.orderBy('snapshot_time', 'desc')
			.limit(1)
			.get();

		// function to query the latest snapshot for the doc count in the provided category
		const getCategoryRankings = async (category) => {
			const rankingDocsRef = await admin
				.firestore()
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
		const { total: sleepTotalUsers, rank: sleepRanking, score: sleepScore } = await getCategoryRankings('sleep');

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

	/**
	 * Returns all items in the database
	 * Taken from webapp's api package `itemsService.ts` file
	 * @param {Number} limit number of items to return
	 * @returns Array of items
	 */
	static async getAllItems(limit = 1000) {
		const snapshot = await admin.firestore().collection('items').orderBy('name', 'asc').limit(limit).get();

		const data = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
		return data;
	}

	/**
	 * Retrieve all the current inventory items for the given Leyline user.
	 * Taken from webapp's api package `userService.ts`
	 * @param {String} uid Leyline UID
	 * @returns Array of items
	 */
	static async getInventoryItems(uid) {
		const user = await admin.firestore().doc(`users/${uid}`).get();
		const userIsOnKlaytn = user.data()?.isKlaytnEnabled;

		const userInventory = await admin.firestore().collection('users').doc(uid).collection('inventory').get();

		const items = await this.getAllItems();

		return userInventory.docs
			.map((d) => ({ ...d.data(), itemId: d.id }))
			.map((item) => {
				const baseItem = items.filter((i) => i.id == item.id)[0];
				return {
					isEquipped: false,
					...item,
					imageUrl: baseItem.imageUrl,
					thumbnailUrl: baseItem.thumbnailUrl,
					avatarUrl: baseItem.avatarUrl,
					name: baseItem.name,
					description: baseItem.description,
					equipSlot: baseItem.equipSlot,
					rarity: baseItem.rarity,
					rewardType: baseItem.rewardType,

					transactionId: userIsOnKlaytn ? item.klaytn_tx_hash : item.tx_hash,
					artistCredit: baseItem.artistCredit,
					isKlaytn: userIsOnKlaytn,
				};
			});
	}

	/**
	 * Get the latest LLP balance of a Leyline user
	 * Taken from webapp's api package `userService.ts`
	 * @param {String} uid Leyline UID 
	 * @returns {Promise<Number>} User's most up-to-date LLP balance
	 */
	static async getLLPBalance(uid) {
		const userDoc = await admin.firestore().doc(`users/${uid}`).get();
		const userData = userDoc.data();

		// get balance last snapshot
		const snapshotValue = userData?.balance_snapshot?.snapshot_value || 0;
		const snapshotTime = userData?.balance_snapshot?.snapshot_time?.toMillis() || 0;
		
		// get points since last snapshot
		const pointsDoc = await admin
			.firestore()
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
	 *
	 * @param {String} uid Leyline UID
	 * @param {Number} amount Amount of LLP to award
	 * @param {Object} [metadata] Metadata for transaction. Should contain a `category` property
	 */
	static async awardLLP(uid, amount, metadata = {}) {
		return await admin.firestore().runTransaction(async (t) => {
			await t.create(admin.firestore().collection('leyline_points').doc(), {
				uid: uid,
				leyline_points: amount,
				created: Date.now(),
				metadata: {
					category: 'Discord Participation',
					...metadata,
					fromDiscord: true,
				},
			});
			return true;
		});
	}
}

module.exports = FirebaseAPI;
