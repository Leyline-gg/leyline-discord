import { firestore } from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub";
const pubsub = new PubSub();
import { addInventoryItem } from "./items";

/**
 * 
 * Taken from webapp's api package `service.ts`
 * @param {String} uid Leyline UID
 * @param {String} itemId 
 * @returns {Promise<Boolean>}
 */
export const rewardNFT = async function (uid, itemId) {
    const userDoc = await firestore().doc(`users/${uid}`).get();

    const newInventoryItem = await addInventoryItem(uid, {
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
        const walletDoc = await firestore().doc(`wallets/${uid}`).get();
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
export const getNFT = async function (id) {
    const doc = (await firestore()
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
 * @returns {Promise<Object | null>} Random NFT information if one was found, else `null` 
 */
export const getRandomNFT = async function ({rarity=null, reward_type='MYSTERY_BOX'} = {}) {
    let q = firestore()
        .collection('items')
        .where('rewardType', '==', reward_type);
    if(!!rarity) q = q.where('rarity', '==', rarity);
    const coll = await q.get();
    return coll.empty ? null : coll.docs[Math.floor(Math.random() * coll.docs.length)].data();
}
