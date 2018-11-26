const {BOT_TOKEN} = require('./sensitive_infos');
const {YT_KEY} = require('./sensitive_infos.js');

const Discord = require('discord.js'); // Require the Discord.js library.
const ytdl = require('ytdl-core');
const commands = require("./commands");
const Partie = require('./model/Partie.js');
const Bot = require('./model/Bot.js');



//var mpTable = ["Lewho", "「Mx」"];
var Game = null;


const client = new Bot();
client.music.start(client, {
    botPrefix: ">",
    youtubeKey: YT_KEY, // Set the api key used for YouTube.
    cooldown: {
        disabled: true
    }
});
client.login(BOT_TOKEN);
client.on('ready', function () {
    console.log(`Je suis connecté à ${client.guilds.array().length} serveur(s) !`);
});


///////////////
/////////Commandes play/switch/pause/unpause
////////////
var dispatcher;
var streamOptions;
var stream;
var conn;
// Music
client.on('message', (message) => {
    if (message.content.startsWith('>playL ')) {
        let link = message.content.split(' ')[1];
        //const streamOptions = { seek: 0, volume: 1 };
        var voiceChannel = message.member.voiceChannel;
        voiceChannel.join().then(connection => {
            conn = connection;
            console.log("joined channel");
            streamOptions = { seek: 0, volume: 1 };
            stream = ytdl(link, { filter: 'audioonly' });
            dispatcher = connection.playStream(stream, streamOptions);
        }).catch(err => console.log(err));
    }else if(message.content.startsWith('>pauseL')){
        dispatcher.pause();
    }else if(message.content.startsWith('>unpauseL')){
        dispatcher.resume();
    }else if(message.content.startsWith('>switchOnL ')){
        let arg = message.content.split(' ')[1];
        let link = arg.split('&')[0]; // remove extra parameters from yt

        streamOptions = { seek: 0, volume: 1 };
        stream = ytdl(link, { filter: 'audioonly' });
        dispatcher = conn.playStream(stream, streamOptions);
    }
});



client.on('message', (message) => {
    if (message.author.bot) {return;}
    message.content = message.content.toLowerCase();
    /** PRIVATE MESSAGE */
    if(message.guild === null) {
        if ( Game !== null){        
            if (Game.mpTable.includes(message.author)) {
                commands.blindTest.privateMessage(message,Game);
            }
        }
  
    } 
    /** NO PRIVATE MESSAGE */  
    else {
        /** PLAY BLINDTEST */
        if (message.content.startsWith(commands.blindTest.prefix.play)) {
            let noRounds = message.content.split(' ')[1];
            let seed = message.content.split(' ')[2];
            Game = new Partie(noRounds, seed);
            Game.started = true;
            commands.blindTest.play(message, Game);
        } 
        /** ADD TO BLINDTEST */
        else if (message.content.startsWith(commands.blindTest.prefix.add)) {
            commands.blindTest.add(Discord, client, message, YT_KEY);
        } 
        /** REPLACE ANIME SONG LINK IN BLINDTEST  */
        else if (message.content.startsWith(commands.blindTest.prefix.replace)) {
            commands.blindTest.replaceLink(message);
        } 
        /** REMOVE ANIME IN BLINDTEST */
        else if (message.content.startsWith(commands.blindTest.prefix.remove)) {
            commands.blindTest.remove(message);
        }

        /** TEST COMMANDS */

        /** ROLL TEST RANDOM */
        else if (message.guild === null && message.content.startsWith(">roll")) {
            //seedrandom("27");
            message.author.send(Math.random());
        } 
        /** TEST UNSERIALIZE */
        else if (message.content.startsWith(">test")) {
            commands.blindTest.util.unserializeAnimeList( (res) => console.log(res));
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

