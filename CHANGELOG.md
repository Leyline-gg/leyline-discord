# [2.3.0](https://github.com/Leyline-gg/leyline-discord/releases/tag/v2.3.0) (2021-09-12)

## Dev Notes
Minor changes and bug fixes with particular attention to user-submitted submissions

## New Features
- Good acts submissions posted without a description will be automatically rejected
    - The author will be DM'd with an explanation

## Existing Feature Changes
- Any non-moderators that attempt to react with an ❌ to an unapproved submission will have their reaction automatically removed
- When a submission is rejected by a moderator, the ❌ reaction will stay on that submission
    - Previously all ❌ reactions would be removed when a submission was rejected
- Responses for the `tag` command now pull from a database and can be dynamically updated
- Significant internal code cleanup

## Bug Fixes
- `profile` command displaying Good Acts stat as zero for all users
- In certain situations, threads were not being auto-created by the bot due to the large length of the thread title

# [2.2.0](https://github.com/Leyline-gg/leyline-discord/releases/tag/v2.2.0) (2021-09-03)

## Dev Notes
The bot will now make use of threads to redirect discussion and encourage cleanliness of the server's channels.
This feature may be expanded in the future.

## New Features
- Whenever a submission is created in #good-acts, a thread will automatically be created for that submission to discourage discussion in the main channel
- All new polls will have a thread automatically created in the #polls channel for that poll, to enable discussion around the poll topic

## Bug Fixes
- Users with unconnected Leyline & Discord accounts could not level up past level 0
- After being approved, bot-added reactions on some posts in #good-acts would not be automatically removed

# [2.1.0](https://github.com/Leyline-gg/leyline-discord/releases/tag/v2.1.0) (2021-08-24)

## Dev Notes
New features have been added to address the rapidly growing userbase of Leyline's Discord server.
In particular, the new `tag` command will allow community moderators and veterans to quickly point new users to helpful resources.

## New Features
- New command: `tag`
    - This command can be used to quickly reference a pre-typed message by inputting a tag name
    - To view the list of tag names, run the command without any arguments
- Users who now join the Leyline Discord **after** connecting their Leyline & Discord accounts will automatically receive the alpha tester role
- Users who create a submission in #good-acts prior to connecting their Leyline & Discord accounts will be sent a DM with a tutorial link reminding them to do so before their submission is approved, to ensure they receive their LLP

## Existing Feature Changes
- The `awardnft` subcommand `ama` has been changed to `channel`
    - This allows moderators to pick any voice channel when mass-awarding NFTs, rather than having the AMA channel as the only option

## Bug Fixes
- The bot would not log an error in #bot-log if a Leyline user connected a Discord account that was not in the Leyline server
- After being approved, bot-added reactions on some posts in #good-acts would not be automatically removed 


# [2.0.1](https://github.com/Leyline-gg/leyline-discord/releases/tag/v2.0.1) (2021-08-19)

## Existing Feature Changes
- Messages sent in #kind-words will immediately receive reactions from the bot, which can be used by mods to approve/reject the submission

## Bug Fixes
- Profile command not working properly


# [2.0.0](https://github.com/Leyline-gg/leyline-discord/releases/tag/v2.0.0) (2021-08-19)

## Dev Notes
This is the first major update that required a significant version change. Nearly the entire codebase was refactored to migrate the current message-based command system (`!command`) to Discord's new, fancy **slash command system**. If you've never heard of slash commands, you can read more about them [here](https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ).

Going forward, all release notes will be published on GitHub for consistency.

## New Features
- **Slash commands!** The bot will no longer respond to the `!` prefix. See the above notes for more information about what slash commands are and how they work
- **The XP system has been overhauled**
    - The latest iteration of the system considers numeric experience values when determining a user's level, rather than just their number of approved posts
    - This allows for several different sources to contribute to a user's level, which will be addressed below
    - All posts approved prior to this release will be migrated to the new XP system, with a rate of 5 XP earned per post
        - **This will not affect user levels**. If you were level 5 prior to this release, you will still be level 5 after the release
    - View the [notion page](https://www.notion.so/leyline/d0dc285583b7443cb315851bdbf09fb4) for a breakdown of the new XP system
- **Poll system**
    - Moderators can create a poll using the `poll` command
    - A poll can last anywhere from 1 second to 24 days and have 2-10 choices
    - Once a poll has been created, it will be sent in a public channel where users can vote on it
    - Each user can vote on a poll once, and their vote cannot be changed once it has been cast
    - Every vote cast on a poll earns the voter +1 XP
- **Kind Words submissions**
    - Similar to the Good Acts submissions, users can now receive LLP and XP for contributing in the kind-words channel!
    - Any message sent in the channel can be approved or rejected by a moderator using the ✅ and ❌ reactions, respectively
    - Unlike Good Acts submissions, these emojis are not automatically added to every message
    - Moderators have one week to approve a message after it has been sent in the channel
    - Once a message has been approved, all users who reacted prior to its approval receive +1 LLP
    - All users who react within 24 hours of its approval will receive +1 LLP (maximum of one reaction per user per message)
    - The author of the message will receive +10 LLP and +1 XP for having their submission approved
    - The only way to reject a submission after approval is to delete the submission from the channel
- **Moderators can now reject Good Acts submissions before they have been approved**
    - Clicking on the "❌" emoji will reject a submission
    - All bot reactions will be removed
    - All "❌" reactions to the submission will be removed (out of consideration)
    - The post will no longer be eligible for approval
    - Users can still react to the post as if it were a normal Discord message, but they will not receive LLP

## Existing Feature Changes
- `good-acts` submissions, upon approval, now use Discord's inline replies to reference the approved message
### Commands
- All command aliases have been removed
- `awardnft`
    - now has two subcommands: `user` and `ama` (renamed from `qna`)
    - all reaction confirmations have been replaced with buttons
    - `ama` subcmd - when NFT awardal is complete, the final embed will be green if all users were rewarded, and orange if at least one user was not rewarded
- `selfrole`
    - "Bot Updates" added to list of self-assignable roles
    - no longer takes arguments
    - now allows for removal of self-assignable roles
    - running the command without arguments now brings up a Discord Select Menu
    - bot responses have been changed to embeds
- `help`
    - no longer takes arguments
    - admin cmds are now displayed if the initiator is an administrator
- `addrole` / `delrole`
    - each individual command was removed and consolidated into a single `role` command
    - `role` cmd has two subcommands, `add` and `remove`
    - responses now use embeds instead of reactions
- `sudosay` 
    - now gives an error if the target channel is not a text channel
    - instead of reacting to indicate success, the bot will send an embed
- `shutdown` 
    - asks for confirmation before proceeding 
    - bot responses have been changed to embeds
- `restart` 
    - asks for confirmation before proceeding 
    - bot responses have been changed to embeds
- `setstatus`
    - previously, to clear the bot's status, the command would be run without arguments
    - now, the command must be run with the `text` argument set to "clear"
    - instead of reacting to indicate success, the bot will send an embed

## Bug Fixes
- Sometimes `good-acts` submissions could still be approved after the one-week window for a moderator to approve them had closed
- The "inventory" section of the Leyline profile would sometimes return an incorrect value