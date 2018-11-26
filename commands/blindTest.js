const Anime = require('../model/Anime.js');
const fs = require('fs');
const Partie = require('../model/Partie.js');
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
 * @param {function} callback 
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
    unserializeAnimeList
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
    args.forEach( (arg) => {
        let matches = arg.match(regex);
        if(!matches) {
            message.channel.send(`:x: ${arg} ne contient aucun type. Chaques anime doit avoir un type (opN, edN, ostN).`)
            return;
        }
        types.push(matches[0]);
        names.push(arg.replace(regex,'').trim());
    });
    let opts = {
        maxResults: 1,
        key: YTKEY
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
            animes.push(new Anime(names[ind], types[ind], r.link));
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
                obj[index].url = replacement;
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
                delete obj[index];
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) {
                        message.channel.send("Une erreur est survenue");
                        throw err;
                    } else {
                        message.channel.send(":ballot_box_with_check: Anime supprimé !");
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
        for (let index = 0; index < Game.noRounds; index++) {           
            let rng = Math.round(Math.random() * res.length);
            console.log(rng);
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
    Game.mpTable.forEach(e => {
        e.send("La Prochaine Manche va commencer");
        e.send("Choisi\n1: Reponse Ouverte\n2: 4 Propositions\n3: 2 Propositions\n");
    });
    // play song
    let streamOptions = { seek: 0, volume: 1 };
    let stream = ytdl(Game.getCurrentRoundAnime().link, { filter: 'audioonly' });
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
        if (message.content.search(regex) >= 0) {
            Game.playerReady(message.author.id);

            if (Game.areAllPlayersReady()) {
                startNewRound(Game);
            }
            return;
        } else if (!started && !message.content.search(regex) >= 0) {
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
                let res = IAAdapt(Game.listSongs[Game.curRound].name.toLowerCase,message.content.toLowerCase);
                if (res) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    Game.playerAddScore( message.author.id, ( 1/Game.timerValue*12 ) * 5);
                }
                break;
            case 2:
            Game.playerHaveResponded(message.author.id);
                ///formule : (1/t*8) * 3 pts
                if (replied_number === Game.carreSol) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    Game.playerAddScore( message.author.id, (1/Game.timerValue*8) * 3);
                }
                break;
            case 3:
            Game.playerHaveResponded(message.author.id);
                ///Formule : 1/t*2+1
                if (replied_number === Game.duoSol) {
                    console.log(`${message.author.username} a trouvé la réponse en ${Game.timerValue} secondes !`);
                    Game.playerAddScore( message.author.id ,1/Game.timerValue*2+1);
                }
                break;
        }
        console.log("Timer value : " + Game.timerValue);
        console.log(`${message.author.username} a ${Game.getPlayerScore(message.author.id)} points de score`);

        message.author.send("Le bonne reponse etait " + Game.listSongs[Game.curRound].name + " " + Game.listSongs[Game.curRound].link);

        if (Game.playersHaveResponded) {
            Game.reset();
            if (Game.curRound === Game.noRounds-1) {
                let idWinner = Game.getBestPlayerScore();
                let nameWinner = Game.getPlayerUserName(idWinner);
                let scoreWinner = Game.getPlayerScore(idWinner);
                let mptabtemp = Game.mpTable.slice();
                Game.mpTable = [];

                mptabtemp.forEach(e => {
                    e.send(`:headphones: Le blind test est finit !\n:first_place: Le gagnant est __${nameWinner}__ avec **${scoreWinner.toFixed(2)}** de score. :crab: :ok_woman:`);
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

                message.author.send(":one: "+temptab1[0]+"\n:two: "+temptab1[1]+"\n:three: "+temptab1[2]+"\n:four: "+temptab1[3]);
                Game.setPlayerSelectMode(message.author.id, 2);
                break;
            case "3":
            let temptab2 = Game.getDuo();            
                message.author.send(":one: "+temptab2[0]+"\n:two: "+temptab2[1]);
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
    if (rightAnwser.length <= 6 && !rightAnwser.includes(" ")) {
        return rightAnwser === anwser;
    }else if (rightAnwser.length <= 6 && rightAnwser.includes(" ")) {
        let newRightAnwser =  rightAnwser.replace(" ","");
        let newAnwser = anwser.replace(" ","");

        return newRightAnwser === newAnwser;
    }
    else if(rightAnwser.length > 6 && rightAnwser.length <= 12){
        let newRightAnwser =  rightAnwser.replace(" ","");
        let newAnwser = anwser.replace(" ","");
        
        let coerence = stringSimilarity.compareTwoStrings(newAnwser , newRightAnwser);

        return coerence > 0.8;
    }
    else if (rightAnwser.length > 12 && rightAnwser.length <= 20) {
        let newRightAnwser =  rightAnwser.replace(" ","");
        let newAnwser = anwser.replace(" ","");
        
        let coerence = stringSimilarity.compareTwoStrings(newAnwser , newRightAnwser);

        return coerence > 0.70;
    }
    else if (rightAnwser.length > 20) {
        let newRightAnwser =  rightAnwser.replace(" ","");
        let newAnwser = anwser.replace(" ","");
        
        let coerence = stringSimilarity.compareTwoStrings(newAnwser , newRightAnwser);

        return coerence > 0.55;
    }
}