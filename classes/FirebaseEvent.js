class FirebaseEvent {
    constructor(bot, {
        name = null,
        description = 'No description provided',
        collection = null,
    }) {
        this.bot = bot;
        this.name = name;
        this.description = description;
        this.collection = collection;
    }

    //These should be implemented for each individual class
    onAdd(doc) { return; }
    onModify(doc) { return; }
    onRemove(doc) { return; }
}

module.exports = FirebaseEvent;