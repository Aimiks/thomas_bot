const Anime = require('../model/Anime.js');
const fs = require('fs');
const Partie = require('../model/Partie.js');
const Player = require('../model/Player.js');
const ytsearch = require('youtube-search');
const ytdl = require('ytdl-core');
const stringSimilarity = require('string-similarity');
const Discord = require('discord.js'); // Require the Discord.js library.




const prefix = {
    add: '>btadd ',
    play: '>blindtest ',
    replace: '>btreplace ',
    remove: '>btremove '
}
module.exports.prefix = prefix;



/**
 * 
 * @param {Anime[]} animes 
 * @param {Function} callback 
 */
let addToJsonFile = function (animes, callback = null) {
    let animes_obj = {};
    //animes that the list already have
    let already_have = [];
    animes.forEach(a => {
        // add anime.name property that contains animes property to have an easy browse
        animes_obj[a.name + " " + a.type] = { ...a };
    });
    let json_list = JSON.stringify(animes_obj);
    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err, res) => {
                if (err) throw err;

                let obj = JSON.parse(res);
                animes.forEach(anime => {
                    // if the list doesn't already have the anime
                    if (!obj[anime.name + " " + anime.type]) {
                        // add it to the list
                        obj[anime.name + " " + anime.type] = { ...anime }
                    } else {
                        already_have.push(anime.name + " " + anime.type);
                    }
                });
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) throw err;
                    if (callback) callback({ already_have, size: Object.keys(obj).length });
                });
            });
        } else {
            fs.writeFile('animelist.json', json_list, 'utf8', err => {
                if (err) throw err;
                if (callback) callback({ already_have, size: animes.length });
            });
        }
    });
}



/**
 * @param {function} callback 
 */
let unserializeAnimeList = function (callback) {
    if (typeof callback !== "function") {
        console.error("[unserializeAnimeList] callback is not a function");
    }
    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err, res) => {
                if (err) throw err;
                let animes = [];
                let objs = JSON.parse(res);
                Object.values(objs).forEach(({ name, type, link }) => {
                    animes.push(new Anime(name, type, link));
                });
                callback(animes);
            });
        } else {
            throw "Animelist does not exist."
        }
    });
}

exports.util = {
    unserializeAnimeList,
    addToJsonFile
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
    let regex = /ed[1-9][0-9]?$|op[1-9][0-9]?$/gim
    let types = [];
    let names = [];

    //trim the args
    args = args.map((arg) => arg.trim());
    // remove command prefix from args
    args[0] = args[0].substring(prefix.add.length);
    if (args[0].length === 0) {
        message.channel.send(`Veuillez renseigner des animes à ajouter.\nEx : ${prefix.add} mirai nikki op1, big order ed1`);
        return;
    }
    let err = false;
    args.forEach((arg) => {
        let matches = arg.match(regex);
        let ost_split = arg.split("ost:");
        if (!matches && ost_split.length === 0) {
            message.channel.send(`:x: ${arg} ne contient aucun type. Chaques anime doit avoir un type (opN, edN, ost:ost_name) __**en dernier argument**__.`);
            err = true;
            return;
        } else if (matches) {
            types.push(matches[0]);
            names.push(arg.replace(regex, '').trim());
        } else {
            // take the last occurence in case the anime contain 'ost:'
            let ost_name = ost_split[ost_split.length - 1];
            types.push("ost:" + ost_name.trim());
            names.push(arg.replace("ost:" + ost_name, '').trim());
        }

    });
    if (err) return;
    let opts = {
        maxResults: 1,
        key: YTKEY,
        type: "video"
    };
    // create an array of promise from the yt searcher
    bt_queue = args.map((arg) => ytsearch(arg, opts));
    // when all promises are done
    Promise.all(bt_queue).then((res) => {
        //send an embed message in DM to the user
        let opt = {
            title: "Liste des musiques ajoutées",
            description: `En cas d'erreur sur le lien utiliser la commande ${prefix.replace}`,
            color: client.resolver.resolveColor([226, 186, 99]),
            author: { name: message.author.username, icon_url: message.author.avatarURL }
        };
        res = res.map(r => r.results[0]);
        let animes = [];
        res.forEach((r, ind) => {
            animes.push(new Anime(names[ind].toLowerCase(), types[ind].toLowerCase(), r.link));
        });

        //callback for the addToJsonFile
        let callback = ({ already_have, size }) => {
            let warning = "";
            let embed = new Discord.RichEmbed(opt);
            let state_msg = "";
            if (already_have.length > 0) {
                res = res.filter((a, ind) => !already_have.includes(names[ind] + " " + types[ind]));

                warning = `\n:warning: Certains animes n'ont pas été ajoutés car ils existent déjà dans la liste : ${already_have.join(', ')}.`;
            }
            res.forEach((r, ind) => {
                embed.addField(`${args[ind]}`, `[${r.title}](${r.link})`);
            });
            embed.setFooter("Nombres d'animes dans la liste : " + size);
            if (res.length === 0) {
                state_msg = ":x: Aucun animes n'a été ajoutés.";
            } else {
                state_msg = ":heavy_plus_sign: Animes ajoutés !";
                message.author.send(embed);
            }
            state_msg += warning;
            message.channel.send(state_msg);


        }
        addToJsonFile(animes, callback);

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
        message.channel.send(`Nombres d'arguments invalides.\nEx : ${prefix.replace}mirai nikki op1, lien_youtube`);
        return;
    }
    let index = args[0].trim();
    let replacement = args[1].trim();

    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err, res) => {
                if (err) {
                    message.channel.send("Une erreur est survenue");
                    throw err;
                }
                let obj = JSON.parse(res);
                // if its a numeric
                if (!isNaN(index)) {
                    let numeric = parseInt(index);
                    if (numeric < Object.keys(obj).length) {
                        index = Object.keys(obj)[index];
                    }
                    else {
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
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) {
                        message.channel.send("Une erreur est survenue");
                        throw err;
                    } else {
                        message.channel.send(`:ballot_box_with_check: Lien de l'anime ${index} remplacé par ${replacement} !`);
                    }
                });
            });

        } else {
            message.channel.send("Aucune anime list n'a encore été créée, impossible de remplacer.");
        }
    });
}

/**
 * @param {import('discord.js').Message} message
 */
module.exports.remove = (message) => {
    message.content = message.content.substring(prefix.remove.length);
    if (message === "") {
        message.channel.send(`Nombres d'arguments invalides.\nEx : ${prefix.remove}mirai nikki op1`);
        return;
    }
    let index = message.content.trim();
    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err, res) => {
                if (err) {
                    message.channel.send("Une erreur est survenue");
                    throw err;
                }
                let obj = JSON.parse(res);
                // if its a numeric
                if (!isNaN(index)) {
                    let numeric = parseInt(index);
                    if (numeric < Object.keys(obj).length) {
                        index = Object.keys(obj)[index];
                    }
                    else {
                        message.channel.send("L'index fournit n'est pas dans l'anime liste");
                        return;
                    }
                }
                if (!obj[index]) {
                    message.channel.send("L'index fournit ne correspond à aucune entrée dans l'anime liste");
                    return;
                }
                let tmp = obj[index];
                delete obj[index];
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) {
                        message.channel.send("Une erreur est survenue");
                        throw err;
                    } else {
                        message.channel.send(`:ballot_box_with_check: Anime ${tmp.name} ${tmp.type} supprimé !`);
                    }
                });
            });

        } else {
            message.channel.send("Aucune anime list n'a encore été créée, impossible de supprimer.");
        }
    });
}

/**
 * @param {import('discord.js').Message} message
 * @param {Partie} Game
 */
module.exports.play = (message, Game, client) => {
    let voiceChannel = message.member.voiceChannel;

    try {
        voiceChannel.join().then(connection => {
            let mem = voiceChannel.members.array();
            for (let index = 0; index < mem.length; index++) {
                if (mem[index].user.bot) {
                    continue;
                }
                let element = mem[index];
                Game.connection = connection;
                Game.voiceChannel = voiceChannel;
                Game.mpTable.push(element.user);
                Game.addPlayer(element.user);
                element.send(":crab: Hi ready to play ? :crab: (yes/no)");
                setTimeout(() => {
                    if (!Game.players.find((p) => p.ID === element.id).isReady) {
                        element.send("Vous ne faites donc pas partie du jeu. :wave:");
                        Game.mpTable = Game.mpTable.filter((s) => s.id !== element.id);
                        Game.players = Game.players.filter((p) => p.ID !== element.id);
                        // stop the game if no one play
                        if (Game.mpTable.length === 0) {
                            Game.started = false;
                            Game.voiceChannel.leave();
                            client.user.setActivity("");
                        }
                        else if (Game.areAllPlayersReady() && !Game.started) {
                            startNewRound(Game, client);
                            Game.started = true;
                        }
                    }
                }, 10000);
            }

        });
    }
    catch (error) {
        message.channel.send("You must be in a voice channel");
    }

    unserializeAnimeList((res) => {
        for (let i = 0; i < res.length; i++) {
            Game.listAllSongs.push(res[i]);
        }
        let listrngtemp = [];
        for (let index = 0; index < Game.noRounds; index++) {
            let rng;
            do {
                rng = Math.floor(Math.random() * res.length);
            } while (listrngtemp.includes(rng));
            listrngtemp.push(rng);
            Game.listSongs.push(res[rng]);
        }
    });
}

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
    Game.mpTable.forEach(e => {
        e.send(`:new: La manche n°**${Game.curRound}** va commencer ! **Préparez vous**`);
        let opts_embed = {
            title: ` Faites votre choix !`,
            description: ``,
            color: client.resolver.resolveColor('RANDOM')
        }
        let embed_choices = new Discord.RichEmbed(opts_embed);
        embed_choices.addField(`Tapez directement votre réponse ouverte :dollar:`, "Vous devrez répondre par le nom de l'anime !");
        embed_choices.addField(`:two: 4 propositions :capital_abcd:`, "Vous choisirez votre réponse parmis 4 propositions !");
        embed_choices.addField(`:three: 2 propositions :wheelchair:`, "Vous choisirez votre réponse parmis 2 propositions !");

        queue_promises.push(e.send(embed_choices));
    });
    // stop timer and and curr stream
    if (Game.timerId && Game.currStream) {
        if (Game.timerId) clearInterval(Game.timerId);
        Game.currStream.end();
    }

    // wait that every ppl got the message
    Promise.all(queue_promises).then(() => {
        // play song
        let streamOptions = { seek: 0, volume: 1 };
        let stream = ytdl(Game.getCurrentRoundAnime().link, { filter: 'audioonly' });
        Game.currStream = Game.connection.playStream(stream, streamOptions);
        Game.currStream.setBitrate(30000);

        //start timer

        Game.timerId = setInterval(() => {
            Game.timerValue = (Game.currStream.time) / 1000;
        }, 50);
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
    let regex = /(^ok$)|(^oui$)|(^o$)|(^yes$)|(^y$)|(^go$)/gmi;
    if (!Game.areAllPlayersReady()) {

        if (message.content.search(regex) >= 0) {
            Game.playerReady(message.author.id);

            if (Game.areAllPlayersReady()) {
                Game.started = true;
                startNewRound(Game, client);
            }
            return;
        } else if (message.content.search(/(^no$)|(^n$)|(^nn$)|(^non$)/) >= 0) {
            message.author.send("Vous ne faites donc pas partie du jeu. :wave:");
            Game.mpTable = Game.mpTable.filter((s) => s != message.author);
            Game.players = Game.players.filter((p) => p.ID != message.author.id);
            // stop the game if no one play
            if (Game.mpTable.length === 0) {
                Game.started = false;
                Game.voiceChannel.leave();
                client.user.setActivity("");
            }

            return;
        } else {
            message.author.send("Vous devez répondre [y]es/[n]o");
            return;
        }
    }
    if (Game.getPlayerSelectModeState(message.author.id) || (message.content.length >= 3 && message.content.replace(/[^a-z]/, "").length != 0)) {
        let replied_number = -1;
        message.content = message.content.trim();
        if (!isNaN(message.content)) {
            replied_number = parseInt(message.content);
        }
        switch (Game.getPlayerSelectMode(message.author.id)) {
            case 1:
                Game.playerHaveResponded(message.author.id);
                ///formule : ( 1/t*12 ) * 5pts                 
                let res = IAAdapt(Game.listSongs[Game.curRound].name, message.content);
                
                if (res) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    console.log(`\x1b[33m${message.author.username}\x1b[0m a trouvé \x1b[33m${Game.listSongs[Game.curRound].name}\x1b[0m !`);
                    if (Game.firstToFindCash) {
                        Game.firstToFindCash = false;
                        Game.mpTable.forEach(e => {
                            e.send(`:dollar: __${message.author.username}__ a trouvé la réponse en premier en **${Game.timerValue.toFixed(1)}s** dans le mode réponse ouverte ! :dollar:`);
                        });
                    }
                    let sc = (1 / Game.timerValue * 12) * 5;
                    Game.playerAddScore(message.author.id, sc);
                    Game.updatePlayerBestScore(message.author.id, sc, Game.listSongs[Game.curRound].name, Game.timerValue.toFixed(1));
                    message.author.send(`:tada: Tu as trouvé la bonne réponse ! :tada:`);
                }
                break;
            case 2:
                Game.playerHaveResponded(message.author.id);
                ///formule : (1/t*8) * 3 pts
                if (replied_number === Game.carreSol) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    let sc = (1 / Game.timerValue * 8) * 3;
                    Game.playerAddScore(message.author.id, sc);
                    Game.updatePlayerBestScore(message.author.id, sc, Game.listSongs[Game.curRound].name, Game.timerValue.toFixed(1));
                    if (Game.firstToFindCarre) {
                        Game.firstToFindCarre = false;
                        Game.mpTable.forEach(e => {
                            e.send(`:capital_abcd: __${message.author.username}__ a trouvé la réponse en premier en **${Game.timerValue.toFixed(1)}s** dans le mode 4 propositions ! :capital_abcd: `);
                        });
                    }
                }
                break;
            case 3:
                Game.playerHaveResponded(message.author.id);
                ///Formule : 1/t*2+1
                if (replied_number === Game.duoSol) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    let sc = 1 / Game.timerValue * 2 + 1
                    Game.playerAddScore(message.author.id, sc);
                    Game.updatePlayerBestScore(message.author.id, sc, Game.listSongs[Game.curRound].name, Game.timerValue.toFixed(1));

                    if (Game.firstToFindCarre) {
                        Game.firstToFindCarre = false;
                        Game.mpTable.forEach(e => {
                            e.send(`:wheelchair: ${message.author.username} a trouvé la réponse en premier en ${Game.timerValue.toFixed(1)}s dans le mode 2 propositions ! :wheelchair:`);
                        });
                    }
                }
                break;
        }
        console.log("Timer value : " + Game.timerValue);
        console.log(`${message.author.username} a ${Game.getPlayerScore(message.author.id)} points de score`);
        let curr_anime = Game.listSongs[Game.curRound];
        let opts_embed = {
            title: `:o: La bonne réponse était`,
            color: client.resolver.resolveColor('RANDOM')
        }
        let embed_answer = new Discord.RichEmbed(opts_embed);
        embed_answer.addField(":label: Nom de l'anime", `[${toTitleCase(curr_anime.name)}](${curr_anime.link})`);
        embed_answer.addField(":musical_note: Type de la musique", curr_anime.type);

        embed_answer.setThumbnail(`http://i3.ytimg.com/vi/${new URL(curr_anime.link).searchParams.get("v")}/0.jpg`);

        message.author.send(embed_answer);

        if (Game.playersHaveResponded) {
            Game.reset();
            if (Game.curRound === Game.noRounds - 1) {
                let idWinner = Game.getBestPlayerScore();
                let nameWinner = Game.getPlayerUserName(idWinner);
                let scoreWinner = Game.getPlayerScore(idWinner);
                let mptabtemp = Game.mpTable.slice();
                Game.mpTable = [];
                /**@type {Player[]} */
                let finalBoard = Game.getEndBoardResult();
                let opts_embed = {
                    title: `:headphones: Le blind test est finit !`,
                    description: `Le seed de la partie était : ${Game.ID}`,
                    color: client.resolver.resolveColor('RANDOM')
                }
                let final_embed_message = new Discord.RichEmbed(opts_embed);
                final_embed_message.setThumbnail(Game.getPlayerUser(idWinner).avatarURL);
                let emojis = [":trophy:", ":second_place:", ":third_place:", ":slight_smile:", ":slight_smile:", ":neutral_face:", ":neutral_face:", ":neutral_face:", ":neutral_face:", ":neutral_face:"];
                let default_emoji = ":worried:";
                emojis = emojis.fill(default_emoji, 10, 25);
                final_embed_message.addField(`:trophy: **${nameWinner}** :trophy:`, `**Score** : __${scoreWinner.toFixed(2)}__ :small_orange_diamond:\n**Meilleur score** : __${finalBoard[0].bestScore.toFixed(2)}__ sur __${finalBoard[0].bestSong}__ trouvé en ${finalBoard[0].time} secondes`);
                for (let index = 1; index < finalBoard.length && index < 24; index++) {
                    let stats = '';
                    if (index < 6) {
                        stats = `\n**Meilleur score** : __${finalBoard[index].bestScore.toFixed(2)}__ sur __${finalBoard[index].bestSong}__ trouvé en ${finalBoard[index].time} secondes`;
                    }
                    if (index === 23) {
                        final_embed_message.addField("...", "...");
                    } else {
                        final_embed_message.addField(`${emojis[index]} ${finalBoard[index].username}`, `Score : __${finalBoard[index].score.toFixed(2)}__ :small_orange_diamond:${stats}`, true);
                    }
                }

                mptabtemp.forEach(e => {
                    e.send(final_embed_message);
                });
                Game.started = false;
                Game.voiceChannel.leave();
                client.user.setActivity("");
                return;

            } else {
                Game.curRound++;
                startNewRound(Game, client);
            }
        } else {
            message.author.send(":hourglass_flowing_sand: En attente des autres joueurs.... ");
        }


    } else {

        switch (message.content) {
            case "1":
                message.author.send("Quel est votre réponse ouverte ?");
                Game.setPlayerSelectMode(message.author.id, 1);
                break;
            case "2":
                let temptab1 = Game.getCarre();

                message.author.send(":one: " + toTitleCase(temptab1[0]) + "\n:two: " + toTitleCase(temptab1[1]) + "\n:three: " + toTitleCase(temptab1[2]) + "\n:four: " + toTitleCase(temptab1[3]));
                Game.setPlayerSelectMode(message.author.id, 2);
                break;
            case "3":
                let temptab2 = Game.getDuo();
                message.author.send(":one: " + toTitleCase(temptab2[0]) + "\n:two: " + toTitleCase(temptab2[1]));
                Game.setPlayerSelectMode(message.author.id, 3);
                break;
            default:
                message.author.send("Réponse attendue 1, 2 ou 3");
                break;
        }
    }
}

/**
 * 
 * @param {string} rightAnwser 
 * @param {string} anwser 
 */
function IAAdapt(rightAnwser, anwser) {
    /**@type string[] */
    let combinaisons = [];
    let tabSplit = rightAnwser.split(" ");

    combi("", tabSplit, tabSplit.length, combinaisons);

    if (combinaisons.length >= 6) {
        let tempo = [];
        for (let j = 0; j < combinaisons.length; j++) {
            let temp = combinaisons[j].split(" ");
            let regroupedConcat = "";

            for (let k = 1; k < temp.length; k++) {
                regroupedConcat += temp[k][0];
            }
            tempo.push(regroupedConcat);
        }
        tempo.forEach(ele => {
            combinaisons.push(ele);
        });        
    }

    let result = [];
    for (let i = 0; i < combinaisons.length; i++) {

        let newRightAnwser = combinaisons[i].replace(" ", "");
        let newAnwser = anwser.replace(" ", "");

        newRightAnwser = newRightAnwser.replace(/[^a-z]/gmi, "");
        newAnwser = newAnwser.replace(/[^a-z]/gmi, "");

        let coherence = stringSimilarity.compareTwoStrings(newAnwser, newRightAnwser);

        if (combinaisons[i].length <= 6) {
            if (newRightAnwser === newAnwser) {
                return true;
            }
        } else if (combinaisons[i].length > 6 && combinaisons[i].length <= 12) {
            if (coherence > 0.8) {
                return true;
            } 
        }
        else if (combinaisons[i].length > 12 && combinaisons[i].length <= 20) {
            if (coherence > 0.70) {
                return true;
            }
        }
        else if (combinaisons[i].length > 20) {
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

/**
 * 
 * @param {string[]} tabRes 
 * @param {string[]} tabSplit 
 *
 */
function combi(tabRes, tabSplit, k, PTabFinal) {
    if (k > tabSplit.length) {
        return;
    } else if (k == 0) {
        PTabFinal.push(tabRes);
    } else {
        tabSplit.forEach(e => {
            let G = tabSplit.filter((word) => word != e)
            let L2 = tabRes + " " + e;

            combi(L2, G, k - 1, PTabFinal);
        });
    }
}