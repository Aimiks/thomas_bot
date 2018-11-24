const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');


class Bot extends Discord.Client {
    constructor(options) {
        super(options);
        this.music = require("discord.js-musicbot-addon");
        this.ff_music = " https://www.youtube.com/watch?v=3yNrSBO6L60&t=85"
        fs.createReadStream("song.mp3").on("error", () => this.downloadMusic(this.ff_music, 9, "song"));
    }
    
    downloadMusic(link, duration, outputname) {
        let url = new URL(link);
        let time = url.searchParams.get("t");
        if (!time) { time = 0; }
        console.log(time);
        let options = {
            filter: "audioonly"
        };
        let command = ffmpeg().input(ytdl(link, options)).format('mp3').setStartTime(time).duration(duration)
            .on('error', (err) => {
                console.log(err);
            }).on('end', () => {
                console.log('Processing finished !');
            });
        let out = fs.createWriteStream(outputname+".mp3");
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
};

module.exports = Bot;