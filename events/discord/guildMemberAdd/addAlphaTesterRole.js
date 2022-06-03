import * as Firebase from '../../../api';
import { DiscordEvent } from '../../../classes';

export default class extends DiscordEvent {
    constructor() {
        super({
            name: 'addAlphaTesterRole',
            description: 'Give the alpha tester role to a user who linked their accts prior to joining the Leyline server',
            event_type: 'guildMemberAdd',
        });
    }

    async run(member) {
        if(await Firebase.isUserConnectedToLeyline(member.id))
            member.roles.add(this.alpha_role, 'Joined server after linking Leyline & Discord accounts');
        return;
    }
}
