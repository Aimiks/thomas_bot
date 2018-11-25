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
                    } else {
                        already_have.push(anime.name);
                    }
                });
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if (err) throw err;
                    if (callback) callback(already_have);
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
 * Args = animes... || links...
 */
exports.add = (Discord, client, message, YTKEY) => {
    const searcher = new YTSearcher(YTKEY);
    let bt_queue;
    let args = message.content.split(",");
    // remove command prefix from args
    args[0] = args[0].substring(prefix.add.length);
    if (args[0].length === 0) {
        message.reply(`Veuillez renseigner des animes à ajouter.\nEx : ${prefix.add} mirai nikki op1, big order ed1`);
        return;
    }
    //trim the args
    args = args.map((arg) => arg.trim());
    // create an array of promise from the yt searcher
    bt_queue = args.map((arg) => searcher.search(arg));
    // when all promises are done
    Promise.all(bt_queue).then((res) => {
        //send an embed message in DM to the user
        let opt = {
            title: "Liste des musiques ajoutées",
            description: `En cas d'erreur sur le lien utiliser la commande ${prefix.replace}`,
            color: client.resolver.resolveColor([226, 186, 99])
        };
        res = res.map(r => r.first);
        let animes = [];
        res.forEach((r, ind) => {
            animes.push(new Anime(args[ind], "osef atm", r.url));
        });

        //callback for the addToJsonFile
        let callback = (already_have) => {
            let warning;
            if (already_have.length > 0) {
                res = res.filter((ind, a) => args[ind] !== already_have[ind]);
                warning = `:warning: Certains animes n'ont pas été ajoutés car ils existent déjà dans la liste : ${already_have.join(', ')}.`;
            }
            let embed = new Discord.RichEmbed(opt);
            res.forEach((r, ind) => {
                embed.addField(`${args[ind]}`, `[${r.title}](${r.url})`);
            });
            if(res.length===0) {
                message.channel.send(`:x: Aucun animes n'a été ajoutés.`);
            } else {
                message.channel.send(`:heavy_plus_sign: Animes ajoutés !`);
                message.author.send(embed);
            }
            if (warning)
                message.channel.send(warning);
            

        }
        addToJsonFile(animes, callback);

    });
};

/**
 * @param {import('discord.js').Message} message
 */
exports.replaceLink = (message) => {
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
exports.remove = (message) => {
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
                mpTable.push(element.id);
                Game.addPlayer(element.id);
                element.send(":crab:Hi ready to play ?:crab:")
            }

        });
    }
    catch (error) {
        message.channel.send("You must be in a voice channel");
    }


    for (let index = 0; index < Game.noRounds; index++) {
        Game.listSongs.push(new Anime("Ginatama", "E25", "https://www.youtube.com/watch?v=4_mBUQM14I0"));
    }
}

/**
* @param {import('discord.js').Message} message 
* @param {Partie} Game 
*/
exports.privateMessage = (message, Game) => {
    let regex = /(oui|o)|(y*$|yes)/gmi;
    if (!started && message.content.search(regex) >= 0) {
        Game.playerReady(message.author.id);
        started = Game.areAllPlayersReady();
        message.author.send("Choisi\n1: Reponse Ouverte\n2: 4 Propositions\n3: 2 Propositions\n");
        //MpSomeone(message.toString());
        return;
    } else if (!started && !message.content.search(regex) >= 0) {
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

    } else {
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
}