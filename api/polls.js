import admin from 'firebase-admin';

/**
 * Creates a poll in Firestore from the given `CommunityPoll` object
 * @param {CommunityPoll} poll
 */
export const createPoll = async function (poll) {
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
};

/**
 * Retrieves the `DocumentSnapshot.data()` for a given poll
 * @param {String} id ID of the poll to retrieve
 * @param {boolean} [include_metadata] Whether or not to return the raw DocumentSnapshot if it exists (pass `true`), or an Object with the document's data (default)
 * @returns {Promise<Object | FirebaseFirestore.DocumentSnapshot | null>} `null` if document does not exist, else see `include_metadata`
 */
export const getPoll = async function (id, include_metadata = false) {
	const res = await admin.firestore().collection('discord/bot/polls').doc(id).get();
	if (!res.exists) return null;
	return include_metadata ? res : res.data();
};

/**
 *
 * @param {Object} args Destructured args
 * @param {CommunityPoll} args.poll The poll to store the vote under
 * @param {ButtonInteraction} args.vote The interaction that represents the user's vote
 * @returns {Promise<Object>} The stored vote data that was written
 */
export const storePollVote = async function ({ poll, vote }) {
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
};
