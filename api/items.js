import { firestore } from "firebase-admin";

/**
 * Add an item to a LL user's inventory and return the inventory id
 * Taken from webapp's api package `userService.ts`
 * @param {String} uid Leyline UID 
 * @param {Object} item Item object
 * @param {String} item.id ID of item to award
 * @param {String} [klaytn_tx_hash] 
 * @returns {Promise<String>} The inventory item id of the item just added
 */
export const addInventoryItem = async function (uid, item, klaytn_tx_hash) {
    let inventoryItemId = '';
    const itemData = { ...item };
    if (klaytn_tx_hash) {
        itemData.klaytn_tx_hash = klaytn_tx_hash;
    }
    await firestore().runTransaction(async (t) => {
        const userDoc = firestore().doc(`users/${uid}`);
        var newInventoryItem = await userDoc.collection('inventory').add(itemData);
        inventoryItemId = newInventoryItem.id;
    });
    return inventoryItemId;
}

/**
 * Returns all items in the database
 * Taken from webapp's api package `itemsService.ts` file
 * @param {Number} [limit] number of items to return
 * @returns Array of items
 */
export const getAllItems = async function (limit = 1000) {
    const snapshot = await firestore().collection('items').orderBy('name', 'asc').limit(limit).get();

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
export const getInventoryItems = async function (uid) {
    const user = await firestore().doc(`users/${uid}`).get();
    const userIsOnKlaytn = user.data()?.isKlaytnEnabled;

    const userInventory = await firestore().collection('users').doc(uid).collection('inventory').get();

    const items = await getAllItems();

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
