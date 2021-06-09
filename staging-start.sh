cd ../staging
rm -rf leyline-discord/
git clone -b staging --single-branch git@github.com:Leyline-gg/leyline-discord.git
cd leyline-discord/
npm install
pm2 delete staging 2> /dev/null
npm run staging