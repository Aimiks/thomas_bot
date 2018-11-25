const lewho_TOKEN = 'NTE1NjYwMzQ1MTI2MTU4MzQ3.DtoWGw.V8xlVNyMDL6QohpLvDPJCdAIcwA';
const mx_TOKEN = 'MzE4Nzc1NDgxNTE0MDY1OTIw.DsecPg.P2ggfh1QZQghQbjDx834n2Z8Plg';
const TOKEN = lewho_TOKEN;
const YTKEY = 'AIzaSyByJq7Dq91jNOYGESfWC1hjl84Kg-kzZHI';

const Discord = require('discord.js'); // Require the Discord.js library.
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const commands = require("./commands");
const Partie = require('./model/Partie.js');
const Player = require('./model/Player.js');
const Bot = require('./model/Bot.js');



//var mpTable = ["Lewho", "「Mx」"];
var mpTable = [];
var started = false;
var Game;


const client = new Bot();
client.music.start(client, {
    botPrefix: ">",
    youtubeKey: YTKEY, // Set the api key used for YouTube.
    cooldown: {
        disabled: true
    }
});
client.login(TOKEN);
client.on('ready', function () {
    console.log("Je suis connecté !");
});

/*
// Music
client.on('message', (message) => {
    if (message.content.startsWith('>play ')) {
        let arg = message.content.split(' ')[1];
        let link = arg.split('&')[0]; // remove extra parameters from yt
        const streamOptions = { seek: 0, volume: 1 };
        var voiceChannel = message.member.voiceChannel;
        voiceChannel.join().then(connection => {
            console.log("joined channel");
            const stream = ytdl(link, { filter: 'audioonly' });
            const dispatcher = connection.playStream(stream, streamOptions);
            dispatcher.on("end", end => {
                console.log("left channel");
                voiceChannel.leave();
            });
        }).catch(err => console.log(err));
    }
});*/

client.on('message', (message) => {
    if (message.author.bot) {return;}

    if (message.content.startsWith(commands.blindTest.prefix.play)) {
        let noRounds = message.content.split(' ')[1];
        let seed = message.content.split(' ')[2];
        Game = new Partie(noRounds, seed);
        commands.blindTest.play(message, mpTable, Game);
        console.log(mpTable);
        
    }

	if (message.guild === null){        
        if (mpTable.includes(message.author)) {
            console.log(mpTable[0].id);
            commands.blindTest.privateMessage(message,Game,started,mpTable)
        }
	}
});


//
client.on('voiceStateUpdate', (oldMember, newMember) => {
    let newUserChannel = newMember.voiceChannel
    let oldUserChannel = oldMember.voiceChannel

    if (oldUserChannel === undefined && newUserChannel !== undefined) {
        // User join a voice channel

        if (!newMember.user.bot && newMember.user.username === "kaaris") {
            client.playFF(newUserChannel);
        }

    } else if (newUserChannel === undefined) {
        // User leaves a voice channel
    }
});

client.on('message', (message) => {
    if (!message.author.bot) {
        if (message.content.startsWith(commands.blindTest.prefix.add)) {
            commands.blindTest.add(Discord, client, message, YTKEY);
        } else if (message.content.startsWith(">test")) {
            commands.blindTest.util.unserializeAnimeList( (res) => console.log(res));
        } else if (message.content.startsWith(commands.blindTest.prefix.replace)) {
            commands.blindTest.replaceLink(message);
        } else if (message.content.startsWith(commands.blindTest.prefix.remove)) {
            commands.blindTest.remove(message);
        }
        
    }
});

client.on('message', (message) => {
    if (message.author.bot) {
        return;
    }
    if (message.guild === null && message.content.startsWith(">roll")) {
        //seedrandom("27");
        message.author.send(Math.random());
    }    
});

