const Anime = require('../model/Anime.js');
const fs = require('fs');
const Partie = require('../model/Partie.js');
const Player = require('../model/Player.js');
const ytsearch = require('youtube-search');
const ytdl = require('ytdl-core');
const stringSimilarity = require('string-similarity');



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
                        already_have.push(anime.name  + " " + anime.type);
                    }
                });
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) throw err;
                    if (callback) callback({already_have, size: Object.keys(obj).length});
                });
            });
        } else {
            fs.writeFile('animelist.json', json_list, 'utf8', err => {
                if (err) throw err;
                if (callback) callback({already_have, size: animes.length});
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
module.exports.add = (Discord, client, message, YTKEY) => {
    let bt_queue;
    let args = message.content.split(",");
    // regex to find type
    let regex = /ed[1-9][0-9]?$|op[1-9][0-9]?$|ost[1-9][0-9]?$/gim
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
    args.forEach( (arg) => {
        let matches = arg.match(regex);
        if(!matches) {
            message.channel.send(`:x: ${arg} ne contient aucun type. Chaques anime doit avoir un type (opN, edN, ostN) __**en dernier argument**__.`);
            err = true;
            return;
        }
        types.push(matches[0]);
        names.push(arg.replace(regex,'').trim());
    });
    if(err) return;
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
            author: { name: message.author.username, icon_url: message.author.avatarURL}
        };
        res = res.map(r => r.results[0]);
        let animes = [];
        res.forEach((r, ind) => {
            animes.push(new Anime(names[ind].toLowerCase(), types[ind].toLowerCase(), r.link));
        });

        //callback for the addToJsonFile
        let callback = ({already_have, size}) => {
            let warning ="";
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
            if(res.length===0) {
                state_msg = ":x: Aucun animes n'a été ajoutés.";
            } else {
                state_msg = ":heavy_plus_sign: Animes ajoutés !";
                message.author.send(embed);
            }
            state_msg+=warning;
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
module.exports.play = (message, Game) => {
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
                Game.addPlayer(element.id,element.user.username);
                element.send(":crab: Hi ready to play ? :crab: (yes/no)");
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
function startNewRound(Game) {
    console.log("======================");
    console.log("Round n°" + Game.curRound);
    console.log("======================");
    Game.mpTable.forEach(e => {
        e.send("La Prochaine Manche va commencer");
        e.send("Choisi\n1: Reponse Ouverte\n2: 4 Propositions\n3: 2 Propositions\n");
    });
    // play song
    let streamOptions = { seek: 0, volume: 1 };
    let stream = ytdl(Game.getCurrentRoundAnime().link, { filter: 'audioonly' });
    // TODO : fix bug bot parle h24 et pas de musiques
    Game.connection.playStream(stream, streamOptions);

    // clear en start timer
    if(Game.timerId) clearInterval(Game.timerId);
    Game.timerValue = 0;
    Game.timerId = setInterval(() => {
        Game.timerValue+=0.01;
    }, 10);



}
/**
* @param {import('discord.js').Message} message 
* @param {Partie} Game 
* @param {import('discord.js').User[]} mpTable
*/
module.exports.privateMessage = (message, Game) => {
    let {started} = Game;
    if (message.author.bot) {
        return;
    }
    let regex = /(^ok$)|(^oui$)|(^o$)|(^yes$)|(^y$)|(^go$)/gmi;
    if (!Game.areAllPlayersReady()) {
        let NIQUETOIFDP = false;
        if (started) {
            if (!(message.content.search(regex) >= 0)) {               
                NIQUETOIFDP = true;
            }
        }

        if (message.content.search(regex) >= 0) {
            Game.playerReady(message.author.id);

            if (Game.areAllPlayersReady()) {
                startNewRound(Game);
            }
            return;
        }else if (NIQUETOIFDP) {
            message.author.send("Vous devez répondre [y]es/[o]ui");
            return;
        }
    }
    if (Game.getPlayerSelectModeState(message.author.id)) {     
        let replied_number = -1;
        message.content = message.content.trim();
        if(!isNaN(message.content)) {
            replied_number = parseInt(message.content);
        }   
        switch (Game.getPlayerSelectMode(message.author.id)) {
            case 1:
            Game.playerHaveResponded(message.author.id);
                ///formule : ( 1/t*12 ) * 5pts                 
                let res = IAAdapt(Game.listSongs[Game.curRound].name,message.content);
                if (res) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    console.log(`\x1b[33m${message.author.username}\x1b[0m a trouvé \x1b[33m${Game.listSongs[Game.curRound].name}\x1b[0m !`);
                    if (Game.firstToFindCash) {
                        Game.firstToFindCash = false;
                        Game.mpTable.forEach(e => {
                            e.send(`:clap::clap: ${message.author.username} a trouver la repose en premier en ${Game.timerValue.toFixed(1)}s dans le mode reponse ouverte ! :clap::clap:`);
                        });
                    }
                    let sc = ( 1/Game.timerValue*12 ) * 5;
                    Game.playerAddScore( message.author.id, sc);
                    Game.updatePlayerBestScore(message.author.id, sc, Game.listSongs[Game.curRound].name);
                    message.author.send(`:tada: Tu as trouvé la bonne réponse ! :tada:`);
                }
                break;
            case 2:
            Game.playerHaveResponded(message.author.id);
                ///formule : (1/t*8) * 3 pts
                if (replied_number === Game.carreSol) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    let sc = (1/Game.timerValue*8) * 3;
                    Game.playerAddScore(message.author.id, sc);
                    Game.updatePlayerBestScore(message.author.id, sc, Game.listSongs[Game.curRound].name);
                    if (Game.firstToFindCarre) {
                        Game.firstToFindCarre = false;
                        Game.mpTable.forEach(e => {
                            e.send(`:thumbsup::thumbsup: ${message.author.username} a trouver la repose en premier en ${Game.timerValue.toFixed(1)}s dans le mode 4 prositions ! :thumbsup::thumbsup:`);
                        });
                    }
                }
                break;
            case 3:
            Game.playerHaveResponded(message.author.id);
                ///Formule : 1/t*2+1
                if (replied_number === Game.duoSol) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    let sc = 1/Game.timerValue*2+1
                    Game.playerAddScore( message.author.id ,sc);
                    Game.updatePlayerBestScore(message.author.id , sc,Game.listSongs[Game.curRound].name);

                    if (Game.firstToFindCarre) {
                        Game.firstToFindCarre = false;
                        Game.mpTable.forEach(e => {
                            e.send(`:middle_finger::middle_finger: ${message.author.username} a trouver la repose en premier en ${Game.timerValue.toFixed(1)}s dans le mode 2 prositions ! :middle_finger::middle_finger:`);
                        });
                    }
                }
                break;
        }
        console.log("Timer value : " + Game.timerValue);
        console.log(`${message.author.username} a ${Game.getPlayerScore(message.author.id)} points de score`);

        message.author.send("Le bonne reponse était " + toTitleCase(Game.listSongs[Game.curRound].name) + " " + Game.listSongs[Game.curRound].link);

        if (Game.playersHaveResponded) {
            Game.reset();
            if (Game.curRound === Game.noRounds-1) {
                let idWinner = Game.getBestPlayerScore();
                let nameWinner = Game.getPlayerUserName(idWinner);
                let scoreWinner = Game.getPlayerScore(idWinner);
                let mptabtemp = Game.mpTable.slice();
                Game.mpTable = [];
                /**@type {Player[]} */
                let finalBoard = Game.getEndBoardResult();

                mptabtemp.forEach(e => {
                    e.send(`:headphones: Le blind test est finit !\n`);
                    let resteDuTableau = [];
                    for (let index = 0; index < finalBoard.length; index++) {
                        if (index == 0) {
                            resteDuTableau.push(`:first_place: Le 1er est __${nameWinner}__ avec **${scoreWinner.toFixed(2)}** de score. Son Meilleur score etait sur ${finalBoard[0].bestSong} avec **${finalBoard[0].bestScore.toFixed(2)}**.`);
                        }else{
                            resteDuTableau.push(`Le ${index+1}eme est __${finalBoard[index].username}__ avec **${finalBoard[index].score.toFixed(2)}** de score. Son Meilleur score etait sur ${finalBoard[index].bestSong} avec **${finalBoard[index].bestScore.toFixed(2)}**.\n`);
                        }
                    }
                    e.send(resteDuTableau);               
                });
                Game.started = false;
                Game.voiceChannel.leave();
                return;
                
            }else{
                Game.curRound++;
                startNewRound(Game);
            }
        }else{
            message.author.send("En attente des autres joueurs.... ");
        }
        

    } else {

        switch (message.content) {
            case "1":
                message.author.send("Quel est votre réponse ouverte ?");
                Game.setPlayerSelectMode(message.author.id, 1);
                break;
            case "2":
            let temptab1 = Game.getCarre();

                message.author.send(":one: "+toTitleCase(temptab1[0])+"\n:two: "+toTitleCase(temptab1[1])+"\n:three: "+toTitleCase(temptab1[2])+"\n:four: "+toTitleCase(temptab1[3]));
                Game.setPlayerSelectMode(message.author.id, 2);
                break;
            case "3":
            let temptab2 = Game.getDuo();            
                message.author.send(":one: "+toTitleCase(temptab2[0])+"\n:two: "+toTitleCase(temptab2[1]));
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
function IAAdapt(rightAnwser,anwser) {
    let newRightAnwser =  rightAnwser.replace(" ","");
    let newAnwser = anwser.replace(" ","");

    newRightAnwser =  newRightAnwser.replace(/[^a-z]/gmi,"");
    newAnwser = newAnwser.replace(/[^a-z]/gmi,"");

    let coherence = stringSimilarity.compareTwoStrings(newAnwser , newRightAnwser);

    if (rightAnwser.length <= 6) {
        return newRightAnwser === newAnwser;
    }else if(rightAnwser.length > 6 && rightAnwser.length <= 12){       
        return coherence > 0.8;
    }
    else if (rightAnwser.length > 12 && rightAnwser.length <= 20) {
        return coherence > 0.70;
    }
    else if (rightAnwser.length > 20) {
        return coherence > 0.55;
    }
}
/**
 * 
 * @param {String} str 
 */
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}