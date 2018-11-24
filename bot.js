const TOKEN = 'MzE4Nzc1NDgxNTE0MDY1OTIw.DsecPg.P2ggfh1QZQghQbjDx834n2Z8Plg';
const YTKEY = 'AIzaSyByJq7Dq91jNOYGESfWC1hjl84Kg-kzZHI';
const Discord = require('discord.js'); // Require the Discord.js library.
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const commands = require("./commands");

class Bot extends Discord.Client {
    constructor(options) {
        super(options);
        this.music = require("discord.js-musicbot-addon");
        this.ff_music = " https://www.youtube.com/watch?v=3yNrSBO6L60&t=85"
        fs.createReadStream("song.mp3").on("error", () => this.downloadAndPlayMusic(this.ff_music));
    }

    downloadAndPlayMusic(link) {
        //link.replace(new RegExp('&feature=youtu.be','gi'),"");
        let url = new URL(link);
        let time = url.searchParams.get("t");
        if (!time) { time = 0; }
        console.log(time);
        let options = {
            filter: "audioonly"
        };
        let command = ffmpeg().input(ytdl(link, options)).format('mp3').setStartTime(time).duration(9)
            .on('error', (err) => {
                console.log(err);
            }).on('end', () => {
                console.log('Processing finished !');
            });
        let out = fs.createWriteStream("song.mp3");
        let ffstream = command.pipe(out);
    }

    playFF(voiceChannel) {
        const streamOptions = { seek: 0, volume: 1 };
        voiceChannel.join().then(connection => {
            const dispatcher = connection.playFile("song.mp3", streamOptions);
            dispatcher.on("end", end => {
                console.log("left channel");
                voiceChannel.leave();
            });
        }).catch(err => console.log(err));
    }
}
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
// Music
/*
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
});
*/
//
client.on('voiceStateUpdate', (oldMember, newMember) => {
    let newUserChannel = newMember.voiceChannel
    let oldUserChannel = oldMember.voiceChannel

    if (oldUserChannel === undefined && newUserChannel !== undefined) {
        // User join a voice channel
        if (!newMember.user.bot && newMember.user.username === "Unknow") {
            client.playFF(newUserChannel);
        }

    } else if (newUserChannel === undefined) {
        // User leaves a voice channel
    }
});

client.on('message', (message) => {
    if (!message.author.bot) {
        if (message.content.startsWith(">bt ")) {
            commands.blindTest(Discord, client, message, YTKEY);
        }
    }
});