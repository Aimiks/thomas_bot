#!/bin/bash

sudo apt update

sudo apt install curl

# install node
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -

# install yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

sudo apt update

sudo apt install nodejs
sudo apt install yarn

#git
sudo apt install git

#ffmpeg
sudo apt install ffmpeg

#bot discord
mkdir discordBot

cd ./discordBot

git clone https://github.com/Aimiks/thomas_bot.git

cd ./thomas_bot

yarn install

echo module.exports = {  >> sensitive_infos.js
echo BOT_TOKEN:\"\", >> sensitive_infos.js
echo YT_KEY:\"\" >> sensitive_infos.js
echo } >> sensitive_infos.js

