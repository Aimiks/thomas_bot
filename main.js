const { BOT_TOKEN } = require("./sensitive_infos");
const { YT_KEY } = require("./sensitive_infos.js");

const Discord = require("discord.js"); // Require the Discord.js library.
const ytdl = require("ytdl-core");
const commands = require("./commands");
const Partie = require("./model/Partie.js");
const Bot = require("./model/Bot.js");

//var mpTable = ["Lewho", "「Mx」"];
/** @type Partie  */
var Game = null;

const client = new Bot();
client.music.start(client, {
  botPrefix: ">",
  youtubeKey: YT_KEY, // Set the api key used for YouTube.
  cooldown: {
    disabled: true,
  },
});
client.login(BOT_TOKEN);
client.on("ready", function () {
  console.log(
    `Je suis connecté à ${client.guilds.array().length} serveur(s) !`
  );
});

///////////////
/////////Commandes play/switch/pause/unpause
////////////
var dispatcher;
var streamOptions;
var stream;
var conn;
// Music
// SHITTY DO NOT USE
client.on("message", (message) => {
  if (message.content.startsWith(">playL ")) {
    let link = message.content.split(" ")[1];
    //const streamOptions = { seek: 0, volume: 1 };
    var voiceChannel = message.member.voiceChannel;
    voiceChannel
      .join()
      .then((connection) => {
        conn = connection;
        console.log("joined channel");
        streamOptions = { seek: 0, volume: 1 };
        stream = ytdl(link, { filter: "audioonly" });
        dispatcher = connection.playStream(stream, streamOptions);
      })
      .catch((err) => console.log(err));
  } else if (message.content.startsWith(">pauseL")) {
    dispatcher.pause();
  } else if (message.content.startsWith(">unpauseL")) {
    dispatcher.resume();
  } else if (message.content.startsWith(">switchOnL ")) {
    let arg = message.content.split(" ")[1];
    streamOptions = { seek: 0, volume: 1 };
    stream = ytdl(link, { filter: "audioonly" });
    dispatcher = conn.playStream(stream, streamOptions);
  }
});

client.on("message", (message) => {
  if (message.author.bot) {
    return;
  }
  /*let noLowerCaseMessage = message.content;
  message.content = message.content.toLowerCase();*/
  /** PRIVATE MESSAGE */
  if (message.guild === null) {
    message.content = message.content.toLowerCase();
    /** ANSWER TO PRIVATE MESSAGE WHILE IN GAME */
    if (Game !== null) {
      commands.blindTest.privateMessage(message, Game, client);
    }
    /** TEST ROLL */
    if (message.content.startsWith(">roll")) {
      //seedrandom("27");
      message.author.send(Math.random());
    }
  } else {
    try {
      /** NO PRIVATE MESSAGE */
      /** PLAY BLINDTEST */
      let firstArg = message.content.split(" ")[0].toLowerCase();
      switch (firstArg) {
        case commands.blindTest.prefix.play:
          let noRounds = message.content.split(" ")[1];
          let seed = message.content.split(" ")[2];
          if (parseInt(noRounds) > 300) {
            message.channel.send("Nombre de round trop élévé, max: 300");
            return;
          }
          Game = new Partie(noRounds, seed);
          commands.blindTest.play(message, Game, client);
          client.user.setActivity("BlindTest Anime", { type: "PLAYING" });
          break;
        case commands.blindTest.prefix.add:
          /** ADD ANIME SONG */
          commands.blindTest.add(client, message, YT_KEY);
          break;
        case commands.blindTest.prefix.replace:
          /** REPLACE ANIME SONG LINK IN BLINDTEST  */
          commands.blindTest.replaceLink(message);
          break;
        case commands.blindTest.prefix.remove:
          /** REMOVE ANIME IN BLINDTEST */
          commands.blindTest.remove(message);
          break;
        case commands.blindTest.prefix.count:
          /** SEND SOME OCCURENCES NUMBER IN THE LIST */
          commands.blindTest.countList(message.channel);
          break;
        case ">bthelp":
          commands.blindTest.help(message);
          break;
        case commands.blindTest.prefix.clear:
          commands.blindTest.clearInvalids(message);
          break;
        case commands.blindTest.prefix.update:
          commands.blindTest.updateAnimes(client, message, YT_KEY);
          break;
        case commands.blindTest.prefix.testValidity:
          commands.blindTest.testValidity(message);
          break;
        case ">test":
          /** TEST COMMANDS */
          /** TEST X */
          commands.blindTest.util.unserializeAnimeList((animes) => {
            commands.blindTest.util
              .getUniqueAnimeList(animes)
              .then((string) => {
                if (string.length > 2000) {
                  for (let i = 0; i < string.length / 2000; i++) {
                    message.channel.send(
                      string.substring(i * 2000, (i + 1) * 2000)
                    );
                  }
                } else {
                  message.channel.send(string);
                }
              });
            message.channel.send("En cours de test...");
          });

          break;
        case commands.blindTest.prefix.update:
          commands.blindTest.updateAnimes(client, message, YT_KEY);
          break;
      }
    } catch (err) {}
  }
});

// Play "false brother" music for the most FF guy in the discord
client.on("voiceStateUpdate", (oldMember, newMember) => {
  let newUserChannel = newMember.voiceChannel;
  let oldUserChannel = oldMember.voiceChannel;

  if (oldUserChannel === undefined && newUserChannel !== undefined) {
    // User join a voice channel

    if (!newMember.user.bot && newMember.user.username === "Legitness") {
      client.playFF(newUserChannel);
    }
  } else if (newUserChannel === undefined) {
    // User leaves a voice channel
  }
});
