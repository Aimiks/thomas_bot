const lewho_TOKEN = 'NTE1NjYwMzQ1MTI2MTU4MzQ3.DtoWGw.V8xlVNyMDL6QohpLvDPJCdAIcwA';
const mx_TOKEN = 'MzE4Nzc1NDgxNTE0MDY1OTIw.DsecPg.P2ggfh1QZQghQbjDx834n2Z8Plg';
const TOKEN = mx_TOKEN;
const YTKEY = 'AIzaSyByJq7Dq91jNOYGESfWC1hjl84Kg-kzZHI';

const Discord = require('discord.js'); // Require the Discord.js library.
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const commands = require("./commands");
const Partie = require('./model/Partie.js');
const Player = require('./model/Player.js');


//var mpTable = ["Lewho", "「Mx」"];
var mpTable = [];
var started = false;
var Game;


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

client.on('message', (message) => {
    if (message.author.bot) {
        //console.log(message);
        return;
    }
    if (message.content.startsWith(commands.blindTest.prefix.play)) {
        let arg = message.content.split(' ')[1];
        Game = new Partie(arg);
        commands.blindTest.play(message, mpTable, Game);
    }

	if (message.guild === null){        
        if (mpTable.includes(message.author.id)) {
            //console.log(message);
            let regex = /(oui|o)|(y*$|yes)/gmi;            
            if (!started && message.content.search(regex)>=0) {
                Game.playerReady(message.author.id);
                started = Game.areAllPlayersReady();
                message.author.send("Choisi\n1: Reponse Ouverte\n2: 4 Propositions\n3: 2 Propositions\n");
                //MpSomeone(message.toString());
                return;
            }else if(!started && !message.content.search(regex)>=0){
                message.author.send("You must respond [y]es/[o]ui");
                return;
            }
            if (Game.getPlayerSelectModeState(message.author.id)) {

                /////TODO
                switch (Game.getPlayerSelectMode(message.author.id)) {
                    case "1":
                        Game
                        break;
                    case "2":
                        message.author.send("1: SNK\n2: tokyo ghoul\n3: gintama\n4: code geass");
                        break;
                    case "3":
                        message.author.send("1: SNK \n2: tokyo ghoul");
                        break;
                }

            }else{
                switch (message.content) {
                    case "1":
                        message.author.send("Quel est votre reponse ouverte ?");
                        Game.setPlayerSelectMode(message.author.id, 1);
                        break;
                    case "2":
                        message.author.send("1: SNK\n2: tokyo ghoul\n3: gintama\n4: code geass");
                        Game.setPlayerSelectMode(message.author.id, 2);
                        break;
                    case "3":
                        message.author.send("1: SNK \n2: tokyo ghoul");
                        Game.setPlayerSelectMode(message.author.id, 3);
                        break;
                    default:
                        message.author.send("reponse attendu 1 2 ou 3");
                        break;
                }
            }
        }else{
            console.log(message.author.username);
            
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
        }
        if(message.content.startsWith(">test")) {
            commands.blindTest.util.unserializeAnimeList( (res) => console.log(res));
        }
    }
});

function MpSomeone(id) {
    let someone = client.fetchUser(id);

    someone.then(x => x.send("yes"));
}