import admin from 'firebase-admin';

// Leyline-Discord user connections

/**
 * Checks if a discord user has connected their leyline acct
 * @param {String} discord_uid UID of the discord user to check
 * @returns {Promise<boolean>} `true` if connected, `false` if not
 */
export const isUserConnectedToLeyline = async function (discord_uid) {
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
export const getLeylineUID = async function (discord_uid) {
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
export const getDiscordDoc = async function (discord_uid, include_metadata = false) {
    const res = await admin.firestore().doc(`discord/bot/users/${discord_uid}`).get();
    if (!res.exists) return null;
    return include_metadata ? res : res.data();
}

/**
 * Creates a discord user under discord/bot/users
 * @param {String} discord_uid UID of the discord user to create
 * @returns {Promise<boolean>} `true` if succesfully created, `false` if not
 */
export const createDiscordUser = async function (discord_uid) {
    return admin.firestore()
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
export const getLeylineDoc = async function (leyline_uid, include_metadata = false) {
    const res = await admin.firestore().doc(`users/${leyline_uid}`).get();
    if (!res.exists) return null;
    return include_metadata ? res : res.data();
}