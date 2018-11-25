const { YTSearcher } = require('ytsearcher');
const Anime = require('../model/Anime.js');
const fs = require('fs');
const Partie = require('../model/Partie.js');

const prefix = {
    add: '>btadd ',
    play: '>blindtest ',
    replace: '>btreplace ',
    remove: '>btremove '
}
exports.prefix = prefix;

let addToJsonFile = function (animes) {
    let animes_obj = {};
    animes.forEach(a => {
        // add anime.name property that contains animes property to have an easy browse
        animes_obj[a.name] = { ...a };
    });
    let json_list = JSON.stringify(animes_obj);
    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err, res) => {
                if (err) throw err;

                let obj = JSON.parse(res);
                animes.forEach(anime => {
                    // if the list doesn't already have the anime
                    if (!obj[anime.name]) {
                        // add it to the list
                        obj[anime.name] = { ...anime }
                    }
                });
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) throw err;
                });
            });
        } else {
            fs.writeFile('animelist.json', json_list, 'utf8', err => {
                if (err) throw err;
            });
        }
    });
}

/**
 * 
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
                Object.values(objs).forEach( ({name,type,link}) => {
                    animes.push(new Anime(name,type,link));
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
 * Args = animes... || links...
 */
exports.add = (Discord, client, message, YTKEY) => {
    const searcher = new YTSearcher(YTKEY);
    let bt_queue;
    let args = message.content.split(",");
    // remove command prefix from args
    args[0] = args[0].substring(prefix.add.length);
    if (args[0].length === 0 || !args[1]) {
        message.reply(`Veuillez renseigner un nom et des animes. \n ex : ${prefix.add} mirai nikki op1, big order ed1`);
        return;
    }
    // create an array of promise from the yt searcher
    bt_queue = args.map((arg) => searcher.search(arg));
    // when all promises are done
    Promise.all(bt_queue).then((res) => {
        //send an embed message in DM to the user
        let opt = {
            title: "Liste des musiques du blind test",
            description: "En cas d'erreur...",
            color: client.resolver.resolveColor([226, 186, 99])
        };
        let embed = new Discord.RichEmbed(opt);
        res = res.map(r => r.first);
        let animes = [];
        res.forEach((r, ind) => {
            embed.addField(`Musique n°${ind}`, `[${r.title}](${r.url})`);
            animes.push(new Anime(args[ind].trim(), "osef atm", r.url));
        });
        addToJsonFile(animes);
        message.author.send(embed);
    });
};

/**
 * @param {import('discord.js').Message} message
 */
exports.replaceLink = (message) => {
    // replace an animeLink in the blindTest
    message.content.substring("")
    let args = message.content.split(",");
    if (args.length < 3) {
        message.channel.send("Nombres d'arguments invalides.\n Ex : >btreplace mirai nikki op1, lien_youtube");
        return;
    }
    let index = args[1];
    let replacement = args[2];

    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err, res) => {
                if (err) {
                    message.channel.send("Une erreur est survenue");
                    throw err;
                }
                let obj = JSON.parse(res);
                obj[index].url = replacement;
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) {
                        message.channel.send("Une erreur est survenue");
                        throw err;
                    }
                });
            });

        } else {
            message.channel.send("Aucune anime list n'a encore été créée, impossible de remplacer.");
        }
    });
}

exports.remove = (message) => {
    let args = message.content.split(" ");
    if (args.length < 3) {
        message.channel.send("Nombres d'arguments invalides.\n Ex : >btreplace mirai nikki op1");
        return;
    }
    let index = args[1];
    let replacement = args[2];

    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err, res) => {
                if (err) {
                    message.channel.send("Une erreur est survenue");
                    throw err;
                }
                let obj = JSON.parse(res);
                obj[index].url = replacement;
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) {
                        message.channel.send("Une erreur est survenue");
                        throw err;
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
 * @param {Partie} Game
 */
exports.play = (message, mpTable, Game) => {
    let voiceChannel = message.member.voiceChannel;

    try {
        voiceChannel.join().then(connection => {
            let mem = voiceChannel.members.array();
            for (let index = 0; index < mem.length; index++) {
                if (mem[index].user.bot) {
                    continue;
                }
                let element = mem[index];
                mpTable.push(element.user);
                Game.addPlayer(element.id);
                element.send(":crab:Hi ready to play ?:crab:")
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
* @param {import('discord.js').Message} message 
* @param {Partie} Game 
*/
exports.privateMessage = (message, Game,started,mpTable) => {
    let regex = /(oui|o)|(y*$|yes)/gmi;
    if (!Game.areAllPlayersReady()) {
        if (message.content.search(regex) >= 0) {
            Game.playerReady(message.author.id);

            if (Game.areAllPlayersReady()) {
                mpTable.forEach(e => {
                    e.send("La Prochaine Manche va commencer");
                    e.send("Choisi\n1: Reponse Ouverte\n2: 4 Propositions\n3: 2 Propositions\n");
                });
            }
            return;
        } else if (!started && !message.content.search(regex) >= 0) {
            message.author.send("You must respond [y]es/[o]ui");
            return;
        }
    }
    let t = 8;
    if (Game.getPlayerSelectModeState(message.author.id)) {        
        switch (Game.getPlayerSelectMode(message.author.id)) {
            case 1:
            Game.playerHaveResponded(message.author.id);
                ///formule : ( 1/t*12 ) * 5pts
                console.log(message.content + " et " + Game.listSongs[Game.curRound].name);
                
                if (Game.listSongs[Game.curRound].name === message.content) {
                    console.log("Player " + message.author.username+ " find the response");
                    Game.playerAddScore( message.author.id ,( 1/t*12 ) * 5);
                }
                break;
            case 2:
            Game.playerHaveResponded(message.author.id);
                ///formule : (1/t*8) * 3 pts
                if (message.content === Game.carreSol) {
                    console.log("Player " + message.author.username+ " find the response");
                    Game.playerAddScore( message.author.id ,(1/t*8) * 3);
                }
                break;
            case 3:
            Game.playerHaveResponded(message.author.id);
                ///Formule : 1/t*2+1
                if (message.content === Game.duoSol) {
                    console.log("Player " + message.author.username+ " find the response");
                    Game.playerAddScore( message.author.id ,1/t*2+1);
                }
                break;
        }

        message.author.send("Le bonne reponse etait " + Game.listSongs[Game.curRound].name + " " + Game.listSongs[Game.curRound].link);

        if (Game.playersHaveResponded) {
            Game.reset();
            Game.curRound++;
            mpTable.forEach(e => {
                e.send("La Prochaine Manche va commencer");
                e.send("Choisi\n1: Reponse Ouverte\n2: 4 Propositions\n3: 2 Propositions\n");
            });
        }else{
            message.author.send("En attante des autre joueurs.... ");
        }
        

    } else {

        switch (message.content) {
            case "1":
                message.author.send("Quel est votre reponse ouverte ?");
                Game.setPlayerSelectMode(message.author.id, 1);
                break;
            case "2":
            let temptab1 = Game.getCarre();

                message.author.send("1: "+temptab1[0]+"\n2: "+temptab1[1]+"\n3: "+temptab1[2]+"\n4: "+temptab1[3]);
                Game.setPlayerSelectMode(message.author.id, 2);
                break;
            case "3":
            let temptab2 = Game.getDuo();            
                message.author.send("1: "+temptab2[0]+"\n2: "+temptab2[1]);
                Game.setPlayerSelectMode(message.author.id, 3);
                break;
            default:
                message.author.send("reponse attendu 1 2 ou 3");
                break;
        }
    }
}