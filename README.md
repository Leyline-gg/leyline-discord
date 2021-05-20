# leyline-discord
This repository houses the source code for the bot inside the Leyline.gg discord server. [`discord.js`](https://discord.js.org/#/) is the library used to communicate with the Discord API. A connection to Firebase is formed using a service account; there is no Google CLI or functions emulator. Google Cloud Run provides CI for the repository and keeps the production bot online. Two bots exist; one for development and one for production.

# Setup Project
Prerequisites: You will need access to Web-App-Dev firestore
1. Clone this repository and open the terminal under the home directory
2. Run `npm install`
    - If you see an error, it is probably because you have an outdated version of node. Node v14 or higher is required; v14.17.0 is recommended
3. Copy the text from `.env.sample` into a new `.env` file which you must first create
4. Retrieve the discord bot token following one of these two approaches:
   - **Recommended**: Navigate to the `web-app` repository in terminal, and run the command `firebase functions:config:get`. The output should be a JSON object; look for the value under `discord.bot.token`. Copy that and paste it into the `BOT_TOKEN` env variable.
   - **Alternative**: Request access to the Leyline Team under the Discord Developer portal by DMing `ollog10#2051` on discord. Once you have access to this team, you should be able to click on [this](https://discord.com/developers/applications/841458162425921537/bot) link and click the "Copy" button under the "Token" section. Paste this as the value for the `BOT_TOKEN` env variable.
5. Generate a new private service account key from [this](https://console.firebase.google.com/u/1/project/leyline-web-app-dev/settings/serviceaccounts/adminsdk) link.
    - Place the `.json` file in the repository home directory
    - Copy the name of the file, including the extension, and paste it as the value of the `FIREBASE_CREDENTIAL` env variable
    - **IMPORTANT:** Make sure you never push this file to the repository or share it with anyone outside of Leyline. It should be automatically included in the `.gitignore` file.
6. At this point, the application should be ready to run. Type the command `npm start` to bring the bot online
