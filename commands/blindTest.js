const Anime = require("../model/Anime.js");
const fs = require("fs");
const Partie = require("../model/Partie.js");
const Player = require("../model/Player.js");
const PrepAnimeCombi = require("../model/PrepAnimeCombi.js");
const ytsearch = require("youtube-search");
const ytdl = require("ytdl-core");
const stringSimilarity = require("string-similarity");
const Discord = require("discord.js"); // Require the Discord.js library.
const Ffmpeg = require("fluent-ffmpeg");

const prefix = {
  add: ">btadd ",
  play: ">btplay ",
  replace: ">btreplace ",
  remove: ">btremove ",
  count: ">btcount",
  clear: ">btclear",
  update: ">btupdate",
  testValidity: ">bttest",
};
module.exports.prefix = prefix;

const helpCommandsObj = {
  add: `\`\`\`Markdown\n# Ajoute une musique d'un anime dans la liste.\n${prefix.add.trim()} <anime_name> <(opN | edN | ost:ost_name)>, ... , <anime_name> <(opN | edN | ost:ost_name)>\`\`\``,
  play: `\`\`\`Markdown\n# Lance une partie de blindtest dans le channel vocal où vous êtes.\n${prefix.play.trim()} <nombre_round> [seed?]\`\`\``,
  replace: `\`\`\`Markdown\n# Remplace le lien de la musique d'un anime.\n${prefix.replace.trim()} <(anime_name type | index)>, <new_link>\`\`\``,
  remove: `\`\`\`Markdown\n# Supprime une musique de la liste.\n${prefix.remove.trim()} <(anime_name type | index)>\`\`\``,
  count: `\`\`\`Markdown\n# Compte les entrées dans la liste.\n${prefix.count}\`\`\``,
  clear: `\`\`\`Markdown\n# Supprime les entrées dont la vidéo n'est plus disponible.\n${prefix.clear}\`\`\``,
  update: `\`\`\`Markdown\n# Met à jour les animes qui ne sont plus valides.\n${prefix.update}\`\`\``,
  testValidity: `\`\`\`Markdown\n# Test la validité du lien.\n${prefix.testValidity} <lien>\`\`\``,
};

/**
 *
 * @param {Anime[]} animes
 * @param {Function} callback
 */
let addToJsonFile = function (animes, callback = null) {
  let animes_obj = {};
  //animes that the list already have
  let already_have = [];
  animes.forEach((a) => {
    // add anime.name property that contains animes property to have an easy browse
    animes_obj[a.name + " " + a.type] = { ...a };
  });
  let json_list = JSON.stringify(animes_obj);
  fs.readFile(__dirname + "/../animelist.json", "utf8", (err, res) => {
    if (err) {
      if (err.code === "ENOENT") {
        /* write file */
        fs.writeFile(
          __dirname + "/../animelist.json",
          json_list,
          "utf8",
          (err) => {
            if (err) throw err;
            if (callback) callback({ already_have, size: animes.length });
          }
        );
        return;
      }
      throw err;
    }

    let obj = JSON.parse(res);
    animes.forEach((anime) => {
      // if the list doesn't already have the anime
      if (!obj[anime.name + " " + anime.type]) {
        // add it to the list
        obj[anime.name + " " + anime.type] = { ...anime };
      } else {
        already_have.push(anime.name + " " + anime.type);
      }
    });
    json_list = JSON.stringify(obj);
    fs.writeFile(__dirname + "/../animelist.json", json_list, "utf8", (err) => {
      if (err) throw err;
      if (callback) callback({ already_have, size: Object.keys(obj).length });
    });
  });
};

/**
 * @param {function} callback
 * @return {Anime[]} animes
 */
let unserializeAnimeList = function (callback) {
  if (typeof callback !== "function") {
    console.error("[unserializeAnimeList] callback is not a function");
  }
  fs.readFile(__dirname + "/../animelist.json", "utf8", (err, res) => {
    if (err) {
      if (err.code === "ENOENT") {
        console.log("Failed to get the anime list");

        throw "Animelist does not exist.";
      }
      throw err;
    }
    let animes = [];
    let objs = JSON.parse(res);
    Object.values(objs).forEach(({ name, type, link }) => {
      animes.push(new Anime(name, type, link));
    });
    callback(animes);
  });
};

let getMeanVolume = function (stream) {
  return new Promise((resolve, reject) => {
    new Ffmpeg({ source: stream })
      .withAudioFilter("volumedetect")
      .addOption("-f", "null")
      .addOption("-t", "20") // duration
      .noVideo()
      .on("error", function (err) {
        console.error("[GetMeanVolume] Error : " + err.message);
        resolve(12);
        //reject("failed");
      })
      .on("end", function (stdout, stderr) {
        // find the mean_volume in the output
        let match = stderr.match(/mean_volume:\s-[0-9]+.\d+/);
        if (!match || (match && !match[0])) {
          console.log(stderr);
        }
        return match && match[0]
          ? resolve(
              parseFloat(match[0].substring("mean_volume:".length).trim())
            )
          : reject("failed");
      })

      .saveToFile("./");
  });
};
let getUniqueAnimeList = (animes) => {
  return Promise.resolve().then(() => {
    let copy_indx = [];
    let strings_to_return = "----Test unicité----";
    Object.values(animes).forEach((anime, i) => {
      Object.values(animes).forEach((other, ind) => {
        if (anime !== other && copy_indx.findIndex((e) => e === i) === -1) {
          console.log(
            `[${i}] Testing ${anime.name} ${anime.type} with [${ind}] ${other.name} ${other.type}...`
          );
          if (
            ((anime.name.split(" ").length &&
              other.name.split(" ").length &&
              anime.name.split(" ")[0] === other.name.split(" ")[0]) ||
              IAAdapt(new PrepAnimeCombi(anime, null), other.name)) &&
            anime.type === other.type
          ) {
            copy_indx.push(ind);
            strings_to_return += `\n[${ind}] __${other.name} ${other.type}__ semble être une copie de [${i}] __${anime.name} ${anime.type}__`;
          }
        }
      });
    });
    return strings_to_return;
  });
};
/**
 *
 * @param {*} anime
 * @returns {bool} isValid
 */
let isVideoValid = async function (anime) {
  let link = "";
  if (typeof anime === "string" && anime.startsWith("http")) {
    link = anime;
  } else {
    link = anime.link;
  }
  let isValid = false;
  try {
    await ytdl.getBasicInfo(link);
    isValid = await new Promise((resolve) => {
      let stream = ytdl(link, {
        filter: "audioonly",
        range: { start: 0, end: 1 },
      });
      stream.on("error", (err) => {
        resolve(false);
        stream.destroy();
      });
      stream.on("data", () => {
        resolve(true);
        stream.destroy();
      });
    });
  } catch (err) {
    isValid = false;
  }
  return isValid;
};

exports.util = {
  unserializeAnimeList,
  addToJsonFile,
  getMeanVolume,
  getUniqueAnimeList,
  isVideoValid,
};

/**
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').Client} client
 * Args = animes... || links...
 */
module.exports.add = (client, message, YTKEY) => {
  let bt_queue;
  let args = message.content.split(",");
  // regex to find type
  let regex = /ed[1-9][0-9]?$|op[1-9][0-9]?$/gim;
  let types = [];
  let names = [];

  //trim the args
  args = args.map((arg) => arg.trim());
  // remove command prefix from args
  args[0] = args[0].substring(prefix.add.length);
  if (args[0].length === 0) {
    message.channel.send(
      `Veuillez renseigner des animes à ajouter.\nEx : ${prefix.add} mirai nikki op1, big order ed1`
    );
    return;
  }
  let err = false;
  args.forEach((arg) => {
    let matches = arg.match(regex);
    let ost_split = arg.split("ost:");
    if (!matches && ost_split.length === 1) {
      message.channel.send(
        `:x: ${arg} ne contient aucun type. Chaques anime doit avoir un type (opN, edN, ost:ost_name) __**en dernier argument**__.`
      );
      err = true;
      return;
    } else if (matches) {
      types.push(matches[0]);
      names.push(arg.replace(regex, "").trim());
    } else {
      // take the last occurence in case the anime contain 'ost:'
      let ost_name = ost_split[ost_split.length - 1];
      types.push("ost:" + ost_name.trim());
      names.push(arg.replace("ost:" + ost_name, "").trim());
    }
  });
  if (err) return;
  let opts = {
    maxResults: 1,
    key: YTKEY,
    type: "video",
  };
  message.channel.send(`:pencil: Ajout des animes...`);
  // create an array of promise from the yt searcher
  bt_queue = args.map((arg) => ytsearch(arg, opts));
  // when all promises are done
  Promise.all(bt_queue)
    .then((res) => {
      //send an embed message in DM to the user
      let opt = {
        title: "Liste des musiques ajoutées",
        description: `En cas d'erreur sur le lien utiliser la commande ${prefix.replace}`,
        color: client.resolver.resolveColor([226, 186, 99]),
        author: {
          name: message.author.username,
          icon_url: message.author.avatarURL,
        },
      };
      res = res.map((r) => r.results[0]);
      let animes = [];
      res.forEach((r, ind) => {
        animes.push(
          new Anime(names[ind].toLowerCase(), types[ind].toLowerCase(), r.link)
        );
      });

      //callback for the addToJsonFile
      let callback = ({ already_have, size }) => {
        let warning = "";
        let embed = [new Discord.RichEmbed(opt)];
        let state_msg = "";
        if (already_have.length > 0) {
          res = res.filter(
            (a, ind) => !already_have.includes(names[ind] + " " + types[ind])
          );

          warning = `\n:warning: Certains animes n'ont pas été ajoutés car ils existent déjà dans la liste : ${already_have.join(
            ", "
          )}.`;
        }
        res.forEach((r, ind) => {
          if (embed.length - 1 < Math.floor(ind / 24)) {
            embed.push(new Discord.RichEmbed(opt));
          }
          embed[Math.floor(ind / 24)].addField(
            `${args[ind]}`,
            `[${r.title}](${r.link})`
          );
        });
        embed[embed.length - 1].setFooter(
          "Nombres d'animes dans la liste : " + size
        );
        if (res.length === 0) {
          state_msg = ":x: Aucun animes n'a été ajoutés.";
        } else {
          state_msg = ":heavy_plus_sign: Animes ajoutés !";
          for (let i = 0; i < embed.length; i++) {
            message.author.send(embed[i]);
          }
        }
        state_msg += warning;
        message.channel.send(state_msg);
      };
      addToJsonFile(animes, callback);
    })
    .catch((err) => {
      message.channel.send(
        `:x: Erreur durant l'ajout des animes. L'ajout a été annulé.`
      );
      console.log(err);
    });
};

/**
 * @param {import('discord.js').Message} message
 */
module.exports.replaceLink = (message) => {
  // remove an animeLink in the blindTest
  message.content = message.content.substring(prefix.replace.length);
  let args = message.content.split(",");
  if (args.length < 2) {
    message.channel.send(
      `Nombres d'arguments invalides.\nEx : ${prefix.replace}mirai nikki op1, lien_youtube`
    );
    return;
  }
  let index = args[0].trim();
  let replacement = args[1].trim();

  fs.readFile(__dirname + "/../animelist.json", "utf8", (err, res) => {
    if (err) {
      if (err.code === "ENOENT") {
        message.channel.send(
          "Aucune anime list n'a encore été créée, impossible de remplacer."
        );
        return;
      } else {
        message.channel.send("Une erreur est survenue");
        throw err;
      }
    }
    let obj = JSON.parse(res);
    // if its a numeric
    if (!isNaN(index)) {
      let numeric = parseInt(index);
      if (numeric < Object.keys(obj).length) {
        index = Object.keys(obj)[index];
      } else {
        message.channel.send("L'index fournit n'est pas dans l'anime liste");
        return;
      }
    }
    if (!obj[index]) {
      message.channel.send("L'index fournit n'est pas dans l'anime liste");
      return;
    }
    obj[index].link = replacement;
    json_list = JSON.stringify(obj);
    fs.writeFile(__dirname + "/../animelist.json", json_list, "utf8", (err) => {
      if (err) {
        message.channel.send("Une erreur est survenue");
        throw err;
      } else {
        message.channel.send(
          `:ballot_box_with_check: Lien de l'anime ${index} remplacé par ${replacement} !`
        );
      }
    });
  });
};

/**
 * @param {import('discord.js').Message} message
 */
module.exports.remove = (message) => {
  message.content = message.content.substring(prefix.remove.length);
  if (message.content === "") {
    message.channel.send(
      `Nombres d'arguments invalides.\nEx : ${prefix.remove}mirai nikki op1`
    );
    return;
  }
  let index = message.content.trim();
  fs.readFile(__dirname + "/../animelist.json", "utf8", (err, res) => {
    if (err) {
      if (err.code === "ENOENT") {
        message.channel.send(
          "Aucune anime list n'a encore été créée, impossible de supprimer."
        );
        return;
      } else {
        message.channel.send("Une erreur est survenue");
        throw err;
      }
    }
    let obj = JSON.parse(res);
    // if its a numeric
    if (!isNaN(index)) {
      let numeric = parseInt(index);
      if (numeric < Object.keys(obj).length) {
        index = Object.keys(obj)[index];
      } else {
        message.channel.send("L'index fournit n'est pas dans l'anime liste");
        return;
      }
    }
    if (!obj[index]) {
      message.channel.send(
        "L'index fournit ne correspond à aucune entrée dans l'anime liste"
      );
      return;
    }
    let tmp = obj[index];
    delete obj[index];
    json_list = JSON.stringify(obj);
    fs.writeFile(__dirname + "/../animelist.json", json_list, "utf8", (err) => {
      if (err) {
        message.channel.send("Une erreur est survenue");
        throw err;
      } else {
        message.channel.send(
          `:ballot_box_with_check: Anime ${tmp.name} ${tmp.type} supprimé !`
        );
      }
    });
  });
};

/**
 * @param {import('discord.js').Message} message
 * @param {Partie} Game
 */
module.exports.play = (message, Game, client) => {
  let voiceChannel = message.member.voiceChannel;
  if (voiceChannel) {
    new Promise(async (resolve, reject) => {
      let tmpmsg = [];
      tmpmsg.push(await message.channel.send("Création de la partie..."));
      unserializeAnimeList(async (animes) => {
        tmpmsg.push(await message.channel.send("Chargement des musiques..."));
        Game.init(animes);
        tmpmsg.push(await message.channel.send(":ok:"));
        resolve();
        tmpmsg.forEach((m) => m.delete());
      });
    }).then(() => {
      try {
        voiceChannel.join().then((connection) => {
          Game.connection = connection;
          Game.voiceChannel = voiceChannel;
          let mem = voiceChannel.members.array();
          for (let index = 0; index < mem.length; index++) {
            if (mem[index].user.bot) {
              continue;
            }
            let member = mem[index];
            Game.addPlayer(member.user);
            member.send(
              ":crab: Salut mon pote, prêt à jouer ? :crab: (oui/non) (yes/no)"
            );
            setTimeout(() => {
              let currP = Game.players.find((p) => p.ID === member.id);
              if (currP && !currP.isReady) {
                member.send("Tu ne fais donc pas partie du jeu. :wave:");
                Game.players = Game.players.filter((p) => p.ID !== member.id);
                Game.removeIdFromAcceptedAnswers(member.id);
                // stop the game if no one play
                if (Game.players.length === 0) {
                  Game.started = false;
                  Game.voiceChannel.leave();
                  client.user.setActivity("");
                } else if (Game.areAllPlayersReady() && !Game.started) {
                  startNewRound(Game, client);
                  Game.started = true;
                }
              }
            }, 10000);
          }
        });
      } catch (error) {
        message.channel.send(
          ":no_entry: Vous devez être dans un channel vocal"
        );
      }
    });
  } else {
    message.channel.send(":no_entry: Vous devez être dans un channel vocal");
  }
};

/**
 *
 * @param {String[]} mpTable
 * @param {Partie} Game
 */
function startNewRound(Game, client) {
  console.log("======================");
  console.log("Round n°" + Game.curRound);
  console.log("======================");
  let queue_promises = [];
  isVideoValid(Game.getCurrentRoundAnime()).then((isValid) => {
    const currAnime = Game.getCurrentRoundAnime();
    if (!isValid) {
      Game.getAllPlayersUser().forEach((e) => {
        e.send(
          `:robot: Vidéo supprimé ou plus disponible. Skip du round. Anime: __${currAnime.name} [${currAnime.type}]__ :robot:`
        );
      });
      return;
    }
    console.log(`Current anime : ${currAnime.name} [${currAnime.type}`);
    Game.getAllPlayersUser().forEach((e) => {
      e.send(
        `:new: La manche n°**${Game.curRound + 1}**${
          Game.curRound + 1 == Game.noRounds ? " __DERNIERE MANCHE__" : ""
        } va commencer ! **Préparez vous**`
      );
      let opts_embed = {
        title: ` Faites votre choix !`,
        description: ``,
        color: client.resolver.resolveColor("RANDOM"),
      };
      let embed_choices = new Discord.RichEmbed(opts_embed);
      embed_choices.addField(
        `Tapez directement votre réponse ouverte :dollar:`,
        "Vous devrez répondre par le nom de l'anime !"
      );
      embed_choices.addField(
        `:two: 4 propositions :capital_abcd:`,
        "Vous choisirez votre réponse parmis 4 propositions !"
      );
      embed_choices.addField(
        `:three: 2 propositions :wheelchair:`,
        "Vous choisirez votre réponse parmis 2 propositions !"
      );

      queue_promises.push(e.send(embed_choices));
    });
    // stop timer and and curr stream
    if (Game.timerId && Game.currStream) {
      if (Game.timerId) clearInterval(Game.timerId);
      Game.currStream.end();
    }
    // wait that every ppl got the message

    let stream = ytdl(Game.getCurrentRoundAnime().link, {
      filter: "audioonly",
    });
    stream.on("error", (err) => {
      console.error(`[startNewRound] stream error`, err);
      Game.getAllPlayersUser().forEach((e) => {
        e.send(
          `:robot: Vidéo supprimé ou plus disponible. Skip du round. Anime: __${currAnime.name} [${currAnime.type}]__ :robot:`
        );
      });
      if (Game.curRound + 1 != Game.noRounds) {
        Game.curRound++;
        startNewRound(Game, client);
      } else {
        Game.reset();
        sendEndBoardResult(Game, client);
      }
      return;
    });
    //let stream = Game.listReadableStreamSongs[Game.curRound];
    /*stream
    .on("error", () => {})
    .on("finish", () => {
        startNewRound(Game, client);
    });*/
    queue_promises.push(getMeanVolume(stream));
    Promise.all(queue_promises)
      .then((res) => {
        // accept players PM
        Game.playersIdAcceptedAnswers = Game.players.map((p) => p.ID);
        let db = res[res.length - 1] === "failed" ? -20 : res[res.length - 1];
        db *= -1;
        let default_volume = 1;
        let gain = Math.pow(2, (db - 20) / 6);
        let volume = default_volume * gain;
        console.log(
          "Volume music : " + volume + " [" + gain.toFixed(1) + "] | db : " + db
        );
        let streamOptions = { seek: 0, volume, bitrate: 30000 };
        //console.log(stream);
        //console.log(Game.listReadableStreamSongs);
        let str = ytdl(Game.getCurrentRoundAnime().link, {
          filter: "audioonly",
        });
        Game.currStream = Game.connection.playStream(str, streamOptions);

        //start timer

        Game.timerId = setInterval(() => {
          Game.timerValue = Game.currStream.time / 1000;
        }, 50);
      })
      .catch((err) => console.log(err));
  });
}

/**
 * @param {import('discord.js').Message} message
 * @param {Partie} Game
 * @param {import('discord.js').User[]} mpTable
 */
module.exports.privateMessage = (message, Game, client) => {
  if (message.author.bot) {
    return;
  }
  if (
    !(
      Game.getAllPlayersUser().includes(message.author) &&
      Game.playersIdAcceptedAnswers.includes(message.author.id)
    )
  ) {
    return;
  }

  if (!Game.areAllPlayersReady()) {
    let regex = /(^ok$)|(^oui$)|(^o$)|(^yes$)|(^y$)|(^go$)/gim;
    if (message.content.search(regex) >= 0) {
      Game.playerReady(message.author.id);

      if (Game.areAllPlayersReady()) {
        Game.started = true;
        startNewRound(Game, client);
      }
      return;
    } else if (message.content.search(/(^no$)|(^n$)|(^nn$)|(^non$)/) >= 0) {
      message.author.send("Tu ne fais donc pas partie du jeu. :wave:");
      Game.players = Game.players.filter((p) => p.ID !== message.author.id);
      // stop the game if no one play
      if (Game.players.length === 0) {
        Game.started = false;
        Game.voiceChannel.leave();
        client.user.setActivity("");
      } else if (Game.areAllPlayersReady() && !Game.started) {
        startNewRound(Game, client);
        Game.started = true;
      }

      return;
    } else {
      message.author.send("Vous devez répondre [y]es/[n]o");
      return;
    }
  }
  if (
    Game.getPlayerSelectModeState(message.author.id) ||
    (message.content.length >= 3 &&
      message.content.replace(/[^a-z]/, "").length !== 0)
  ) {
    let replied_number = -1;
    message.content = message.content.trim();
    if (!isNaN(message.content)) {
      replied_number = parseInt(message.content);
    }
    switch (Game.getPlayerSelectMode(message.author.id)) {
      case 1:
        Game.playerHaveResponded(message.author.id);
        ///formule : ( 1/t*12 ) * 5pts
        let res = IAAdapt(Game.listSongs[Game.curRound], message.content);
        if (res) {
          console.log(
            `${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`
          );
          console.log(
            `\x1b[33m${message.author.username}\x1b[0m a trouvé \x1b[33m${
              Game.listSongs[Game.curRound].anime.name
            }\x1b[0m !`
          );
          if (Game.firstToFindCash) {
            Game.firstToFindCash = false;
            Game.getAllPlayersUser().forEach((e) => {
              e.send(
                `:dollar: __${
                  message.author.username
                }__ a trouvé la réponse en premier en **${Game.timerValue.toFixed(
                  1
                )}s** dans le mode réponse ouverte ! :dollar:`
              );
            });
          }
          let sc = (1 / Game.timerValue) * 12 * 5;
          Game.playerAddScore(message.author.id, sc);
          Game.updatePlayerBestScore(
            message.author.id,
            sc,
            Game.listSongs[Game.curRound].anime.name,
            Game.timerValue.toFixed(1)
          );
          message.author.send(`:tada: Tu as trouvé la bonne réponse ! :tada:`);
        } else {
          message.author.send(
            `:woman_gesturing_no: Mauvaise réponse... :woman_gesturing_no:`
          );
        }
        break;
      case 2:
        Game.playerHaveResponded(message.author.id);
        ///formule : (1/t*8) * 3 pts
        if (replied_number === Game.carreSol) {
          Game.timerValue = Game.timerValue < 0.5 ? 0.5 : Game.timerValue;
          console.log(
            `${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`
          );
          let sc = (1 / Game.timerValue) * 8 * 3;
          Game.playerAddScore(message.author.id, sc);
          Game.updatePlayerBestScore(
            message.author.id,
            sc,
            Game.listSongs[Game.curRound].anime.name,
            Game.timerValue.toFixed(1)
          );
          if (Game.firstToFindCarre) {
            Game.firstToFindCarre = false;
            Game.getAllPlayersUser().forEach((e) => {
              e.send(
                `:capital_abcd: __${
                  message.author.username
                }__ a trouvé la réponse en premier en **${Game.timerValue.toFixed(
                  1
                )}s** dans le mode 4 propositions ! :capital_abcd: `
              );
            });
          }
          message.author.send(`:tada: Tu as trouvé la bonne réponse ! :tada:`);
        } else {
          message.author.send(
            `:woman_gesturing_no: Mauvaise réponse... :woman_gesturing_no:`
          );
        }
        break;
      case 3:
        Game.playerHaveResponded(message.author.id);
        ///Formule : 1/t*2+1
        if (replied_number === Game.duoSol) {
          Game.timerValue = Game.timerValue < 0.5 ? 0.5 : Game.timerValue;
          console.log(
            `${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`
          );
          let sc = (1 / Game.timerValue) * 2 + 1;
          Game.playerAddScore(message.author.id, sc);
          Game.updatePlayerBestScore(
            message.author.id,
            sc,
            Game.listSongs[Game.curRound].anime.name,
            Game.timerValue.toFixed(1)
          );

          if (Game.firstToFindDouble) {
            Game.firstToFindDouble = false;
            Game.getAllPlayersUser().forEach((e) => {
              e.send(
                `:wheelchair: __${
                  message.author.username
                }__ a trouvé la réponse en premier en **${Game.timerValue.toFixed(
                  1
                )}s** dans le mode 2 propositions ! :wheelchair:`
              );
            });
          }
          message.author.send(`:tada: Tu as trouvé la bonne réponse ! :tada:`);
        } else {
          message.author.send(
            `:woman_gesturing_no: Mauvaise réponse... :woman_gesturing_no:`
          );
        }
        break;
    }
    Game.removeIdFromAcceptedAnswers(message.author.id);
    console.log("Timer value : " + Game.timerValue);
    console.log(
      `${message.author.username} a ${Game.getPlayerScore(
        message.author.id
      )} points de score`
    );
    let curr_anime = Game.listSongs[Game.curRound].anime;
    let opts_embed = {
      title: `:o: La bonne réponse était`,
      color: client.resolver.resolveColor("RANDOM"),
    };
    let embed_answer = new Discord.RichEmbed(opts_embed);
    embed_answer.addField(
      ":label: Nom de l'anime",
      `[${toTitleCase(curr_anime.name)}](${curr_anime.link})`
    );
    embed_answer.addField(":musical_note: Type de la musique", curr_anime.type);

    embed_answer.setThumbnail(
      `http://i3.ytimg.com/vi/${new URL(curr_anime.link).searchParams.get(
        "v"
      )}/0.jpg`
    );
    message.author.send(embed_answer);

    if (Game.playersHaveResponded) {
      Game.reset();
      if (Game.curRound === Game.noRounds - 1) {
        sendEndBoardResult(Game, client);
        return;
      } else {
        Game.curRound++;
        startNewRound(Game, client);
      }
    } else {
      message.author.send(
        ":hourglass_flowing_sand: En attente des autres joueurs.... "
      );
    }
  } else {
    switch (message.content) {
      case "1":
        message.author.send("Quel est votre réponse ouverte ?");
        Game.setPlayerSelectMode(message.author.id, 1);
        break;
      case "2":
        let temptab1 = Game.getCarre();

        message.author.send(
          ":one: " +
            toTitleCase(temptab1[0]) +
            "\n:two: " +
            toTitleCase(temptab1[1]) +
            "\n:three: " +
            toTitleCase(temptab1[2]) +
            "\n:four: " +
            toTitleCase(temptab1[3])
        );
        Game.setPlayerSelectMode(message.author.id, 2);
        break;
      case "3":
        let temptab2 = Game.getDuo();
        message.author.send(
          ":one: " +
            toTitleCase(temptab2[0]) +
            "\n:two: " +
            toTitleCase(temptab2[1])
        );
        Game.setPlayerSelectMode(message.author.id, 3);
        break;
      default:
        message.author.send("Réponse attendue 1, 2 ou 3");
        break;
    }
  }
};

module.exports.countList = (channel) => {
  unserializeAnimeList((animes) => {
    let op_nb = 0;
    let ed_nb = 0;
    let ost_nb = 0;
    Object.values(animes).forEach((a) => {
      if (a.type.match(/ost/)) {
        ost_nb++;
        return;
      }
      if (a.type.match(/op/)) {
        op_nb++;
        return;
      }
      if (a.type.match(/ed/)) {
        ed_nb++;
        return;
      }
    });
    let popular = animes
      .slice()
      .sort(
        (a, b) =>
          animes.filter((an) => an.name === a.name).length -
          animes.filter((an) => an.name === b.name).length
      )
      .pop();
    let pop_nb = animes.filter((a) => a.name === popular.name).length;
    channel.send(
      `La liste contient __${
        Object.keys(animes).length
      }__ entrées dont **${op_nb}** openings, **${ed_nb}** endings et **${ost_nb}** osts ! L'anime le plus récurrent est __${toTitleCase(
        popular.name
      )}__ (${pop_nb}).`
    );
  });
};

module.exports.help = (message) => {
  let args = message.content.split(" ");
  let command;
  if (args.length > 1) {
    command = args[1];
  }
  let final_string = "";
  if (command && helpCommandsObj[command]) {
    final_string += helpCommandsObj[command];
  } else {
    Object.values(helpCommandsObj).forEach((h) => {
      final_string += h;
    });
  }

  message.channel.send(final_string);
};

/**
 * @param {*} message
 */
module.exports.clearInvalids = function (message) {
  message.channel.send("Suppression des animes invalides...");
  let total = 0;
  unserializeAnimeList(async (animes) => {
    for (const anime of Object.values(animes)) {
      console.log(`[clearInvalids] Testing ${anime.name}...`);
      const isValid = await isVideoValid(anime);
      if (!isValid) {
        const { name, type } = anime;
        message.content = `>btremove ${name} ${type}`;
        module.exports.remove(message);
        total++;
      }
    }
    message.channel.send(
      `Fin de la suppression des animes invalides ! ${total} animes supprimés !`
    );
  });
};

module.exports.updateAnimes = function (client, message, YT_KEY) {
  message.channel.send("Mise à jour des animes...");
  let total = 0;
  unserializeAnimeList(async (animes) => {
    for (const anime of Object.values(animes)) {
      console.log(`[updateAnimes] Testing ${anime.name}...`);
      const isValid = await isVideoValid(anime);
      if (!isValid) {
        const { name, type } = anime;
        message.content = `>btremove ${name} ${type}`;
        module.exports.remove(message);
        message.content = `>btadd ${name} ${type}`;
        module.exports.add(client, message, YT_KEY);
        total++;
      }
    }
    message.channel.send(
      `Fin de la mise à jour des animes, ${total} animes on été mis à jour !`
    );
  });
};

module.exports.testValidity = async function (message) {
  message.content = message.content
    .substring(prefix.testValidity.length)
    .trim();
  if (message.content.length > 0) {
    let videoValid = await isVideoValid(message.content);
    if (!videoValid) {
      message.channel.send("Vidéo invalide :no_entry_sign:");
    } else {
      message.channel.send("Vidéo valide :woman_gesturing_ok:");
    }
  } else {
    message.channel.send(`Arguments invalides, ${prefix.testValidity} <link>`);
  }
};
/**
 *
 * @param {PrepAnimeCombi} prep
 * @param {string} anwser
 */
function IAAdapt(prep, anwser) {
  let combinaisons = prep.combinaisons;

  for (let i = 0; i < combinaisons.length; i++) {
    let newRightAnwser = combinaisons[i].replace(" ", "");
    let newAnwser = anwser.replace(" ", "");

    newRightAnwser = newRightAnwser.replace(/[^a-z]/gim, "");
    newAnwser = newAnwser.replace(/[^a-z]/gim, "");

    let coherence = stringSimilarity.compareTwoStrings(
      newAnwser,
      newRightAnwser
    );

    if (combinaisons[i].length <= 6) {
      if (newRightAnwser === newAnwser) {
        return true;
      }
    } else if (combinaisons[i].length > 6 && combinaisons[i].length <= 12) {
      if (coherence > 0.8) {
        return true;
      }
    } else if (combinaisons[i].length > 12 && combinaisons[i].length <= 20) {
      if (coherence > 0.7) {
        return true;
      }
    } else if (combinaisons[i].length > 20) {
      if (coherence > 0.55) {
        return true;
      }
    }
  }
  return false;
}

/**
 *
 * @param {String} str
 */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function sendEndBoardResult(Game, client) {
  let idWinner = Game.getBestPlayerScore();
  let nameWinner = Game.getPlayerUserName(idWinner);
  let scoreWinner = Game.getPlayerScore(idWinner);
  let mptabtemp = Game.getAllPlayersUser().slice();
  /**@type {Player[]} */
  let finalBoard = Game.getEndBoardResult();
  let opts_embed = {
    title: `:headphones: Le blind test est finit !`,
    description: `Le seed de la partie était : ${Game.ID}`,
    color: client.resolver.resolveColor("RANDOM"),
  };
  let final_embed_message = new Discord.RichEmbed(opts_embed);
  final_embed_message.setThumbnail(Game.getPlayerUser(idWinner).avatarURL);
  let emojis = [
    ":trophy:",
    ":second_place:",
    ":third_place:",
    ":slight_smile:",
    ":slight_smile:",
    ":neutral_face:",
    ":neutral_face:",
    ":neutral_face:",
    ":neutral_face:",
    ":neutral_face:",
  ];
  let default_emoji = ":worried:";
  emojis = emojis.fill(default_emoji, 10, 25);
  final_embed_message.addField(
    `:trophy: **${nameWinner}** :trophy:`,
    `**Score** : __${scoreWinner.toFixed(
      2
    )}__ :small_orange_diamond:\n**Meilleur score** : __${finalBoard[0].bestScore.toFixed(
      2
    )}__ sur __${finalBoard[0].bestSong}__ trouvé en ${
      finalBoard[0].time
    } secondes`
  );
  for (let index = 1; index < finalBoard.length && index < 24; index++) {
    let stats = "";
    if (index < 6) {
      stats = `\n**Meilleur score** : __${finalBoard[index].bestScore.toFixed(
        2
      )}__ sur __${finalBoard[index].bestSong}__ trouvé en ${
        finalBoard[index].time
      } secondes`;
    }
    if (index === 23) {
      final_embed_message.addField("...", "...");
    } else if (index < 23) {
      final_embed_message.addField(
        `${emojis[index]} ${finalBoard[index].username}`,
        `Score : __${finalBoard[index].score.toFixed(
          2
        )}__ :small_orange_diamond:${stats}`,
        true
      );
    }
  }

  mptabtemp.forEach((e) => {
    e.send(final_embed_message);
  });
  Game.started = false;
  Game.voiceChannel.leave();
  client.user.setActivity("");
}
