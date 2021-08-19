const admin = require('firebase-admin');
const pubsub = new (require('@google-cloud/pubsub').PubSub)();

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
		return data.filter((doc) => Number(doc.id));
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
			.map((d) => ({ ...d.data(), itemId: d.data().id, id: d.id }))
			.map((item) => {
				const baseItem = items.filter((i) => i.id == item.itemId)[0];
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

					transactionId: userIsOnKlaytn
						? item.klaytn_tx_hash
						: item.tx_hash,
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
	 * Get a Leyline user's total LLP earned
	 * Taken from webapp's api `userService.ts`
	 * @param {String} uid Leyline UID 
	 * @returns {Promise<Number>} Total LLP earned up until this point
	 */
	static async getTotalEarnedLLP(uid) {
		const snapshotRef = await admin
			.firestore()
			.collection('leaderboards')
			.orderBy('snapshot_time', 'desc')
			.limit(1)
			.get();

		const userRankingRef = await admin
			.firestore()
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
	static async getVolunteerLLP(uid) {
		const snapshot = await admin
			.firestore()
			.collection('leyline_points')
			.where('uid', '==', uid)
			.where('metadata.category', '==', 'Leyline Volunteer Program')
			.get();

		return snapshot.docs.reduce((a, b) => a + (b.data()?.leyline_points > 0 ? b.data().leyline_points : 0), 0);
	}

	/**
	 * Get the number of reactions to approved posts given out by a Discord user
	 * @param {String} uid Discord UID
	 * @returns {Promise<Number>}
	 */
	static async getDiscordReactions(uid) {
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
	 * Award a specific amount of LLP to a user, with an option to include transaction metadata
	 * @param {String} uid Leyline UID
	 * @param {Number} amount Amount of LLP to award
	 * @param {Object} [metadata] Metadata for transaction. Should contain a `category` property
	 */
	static async awardLLP(uid, amount, metadata = {}) {
		return await admin.firestore().collection('leyline_points').add({
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

	/**
	 * Add an item to a LL user's inventory and return the inventory id
	 * Taken from webapp's api package `userService.ts`
	 * @param {String} uid Leyline UID 
	 * @param {Object} item Item object
	 * @param {String} item.id ID of item to award
	 * @param {String} [klaytn_tx_hash] 
	 * @returns {Promise<String>} The inventory item id of the item just added
	 */
	static async #addInventoryItem(uid, item, klaytn_tx_hash) {
		let inventoryItemId = '';
		const itemData = { ...item };
		if (klaytn_tx_hash) {
			itemData.klaytn_tx_hash = klaytn_tx_hash;
		}
		await admin.firestore().runTransaction(async (t) => {
			const userDoc = admin.firestore().doc(`users/${uid}`);
			var newInventoryItem = await userDoc.collection('inventory').add(itemData);
			inventoryItemId = newInventoryItem.id;
		});
		return inventoryItemId;
	}

	/**
	 * 
	 * Taken from webapp's api package `service.ts`
	 * @param {String} uid Leyline UID
	 * @param {String} itemId 
	 * @returns {Promise<Boolean>}
	 */
	static async rewardNFT(uid, itemId) {
		const userDoc = await admin.firestore().doc(`users/${uid}`).get();

		const newInventoryItem = await this.#addInventoryItem(uid, {
			id: itemId,
		});

		if (userDoc.data()?.isKlaytnEnabled) {
			console.log(`Minting item ${itemId} for user ${uid} on Klaytn`);

			await pubsub.topic('mint-klaytn-nft').publishJSON({
				userId: uid,
				inventoryItemIds: [newInventoryItem],
			});

			return true;
		} else {
			console.log(`Minting item ${itemId} for user ${uid} on VeChain`);
			const walletDoc = await admin.firestore().doc(`wallets/${uid}`).get();
			const userWalletAddress = JSON.parse(walletDoc.data()?.wallet).address;

			await pubsub.topic('mint-rewards').publishJSON({
				userId: uid,
				account: userWalletAddress,
				rewards: [[itemId, 1]],
				inventoryItemId: newInventoryItem,
			});

			return true;
		}
	}

	/**
	 * Retrieve a Leyline NFT's information from Firestore
	 * @param {String} id NFT ID 
	 * @returns {Promise<Object | null>} NFT information if it exists, else `null`
	 */
	static async getNFT(id) {
		const doc = (await admin.firestore()
			.collection('items')
			.where('id', '==', id)
			.limit(1)
			.get())?.docs?.shift();
		if(!doc || !doc?.exists) return null;
		return doc.data();
	}

	/**
	 * Get a random Leyline NFT from Firestore, with the option to filter the result
	 * @param {Object} options Destructured args 
	 * @param {String} options.rarity NFT rarity, in uppercase
	 * @param {String} options.reward_type NFT rewardType, in uppercase
	 * @returns {Object | null} Random NFT information if one was found, else `null` 
	 */
	static async getRandomNFT({rarity=null, reward_type='MYSTERY_BOX'} = {}) {
		let q = admin.firestore()
			.collection('items')
			.where('rewardType', '==', reward_type);
		if(!!rarity) q = q.where('rarity', '==', rarity);
		const coll = await q.get();
		return coll.empty ? null : coll.docs[Math.floor(Math.random() * coll.docs.length)].data();
	}

	// ---------------------------
	//  ReactionCollector Methods
	// ---------------------------
	/**
	 * Creates a collector in Firestore from the given `ReactionCollectorBase` object
	 * Assumes collector is still pending mod approval
	 * @param {ReactionCollectorBase} collector 
	 */
	 static async createCollector(collector) {
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
	static async approveCollector({collector, user, metadata}) {
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
	static async rejectCollector({collector, user}) {
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
	static async storeUserReaction({collector, user}) {
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


	// ----------------
	//   Poll Methods
	// ----------------
	/**
	 * Creates a poll in Firestore from the given `CommunityPoll` object
	 * @param {CommunityPoll} poll 
	 */
	static async createPoll(poll) {
		await admin.firestore()
			.collection('discord/bot/polls')
			.doc(poll.id)
			.set({
				expires: Date.now() + poll.duration,
				created_on: poll?.msg?.createdTimestamp || Date.now(),
				created_by: poll.author.id,
				choices: poll.choices || [],
			});
		return;
	}

	/**
	 * Retrieves the `DocumentSnapshot.data()` for a given poll
	 * @param {String} id ID of the poll to retrieve
	 * @param {boolean} [include_metadata] Whether or not to return the raw DocumentSnapshot if it exists (pass `true`), or an Object with the document's data (default)
	 * @returns {Promise<Object | FirebaseFirestore.DocumentSnapshot | null>} `null` if document does not exist, else see `include_metadata`
	 */
	static async getPoll(id, include_metadata = false) {
		const res = await admin.firestore()
			.collection('discord/bot/polls')
			.doc(id)
			.get();
		if (!res.exists) return null;
		return include_metadata ? res : res.data();
	}

	/**
	 * 
	 * @param {Object} args Destructured args
	 * @param {CommunityPoll} args.poll The poll to store the vote under
	 * @param {ButtonInteraction} args.vote The interaction that represents the user's vote
	 * @returns {Promise<Object>} The stored vote data that was written
	 */
	static async storePollVote({poll, vote}) {
		const obj = {
			voted: true,
			timestamp: Date.now(),
			choice: vote.customId.split('choice').pop(),
		};
		await admin.firestore()
			.collection('discord/bot/polls').doc(poll.id)
			.collection('votes').doc(vote.user.id)
			.set(obj);
		return obj;
	}
}

module.exports = FirebaseAPI;
