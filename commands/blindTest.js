const { YTSearcher } = require('ytsearcher');
const Anime = require('../model/Anime.js');
const fs = require('fs');
const Partie = require('../model/Partie.js');


let addToJsonFile = function (animes) {
    let animes_obj = {};
    animes.forEach( a => {
        // add anime.name property that contains animes property to have an easy browse
        animes_obj[a.name] =  {...a};
    });
    let json_list = JSON.stringify(animes_obj);
    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err,res) => {
                if(err) throw err;

                let obj = JSON.parse(res);
                animes.forEach( anime => {
                    // if the list doesn't already have the anime
                    if(!obj[anime.name]) {
                        // add it to the list
                        obj[anime.name] = {...anime}
                    }
                });
                json_list = JSON.stringify(obj);
                fs.writeFile('animelist.json', json_list, 'utf8', err => {
                    if(err) throw err;
                });
            });
        } else {
            fs.writeFile('animelist.json', json_list, 'utf8', err => {
                if(err) throw err;
            });
        }
    });
}

/**
 * 
 * @param {function} callback 
 */
let unserializeAnimeList = function (callback) {
    if(typeof callback !== "function") {
        console.error("[unserializeAnimeList] callback is not a function");
    }
    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', (err,res) => {
                if(err) throw err;
                callback(JSON.parse(res));
            });
        } else {
            throw "Animelist does not exist."
        }
    });
}

exports.util = {
    unserializeAnimeList
};


const prefix = {
    add: '>btadd ',
    play: '>blindtest '
}
exports.prefix = prefix;
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
       // message.author.send(embed);
    });
};

/**
 * @param {import('discord.js').Message} message
 */
exports.replace = (message) => {
    // replace an anime in the blindTest
    let args = message.content.split(" ");
    if (args.length < 4) {
        //err
        return;
    }
    let name = args[1];
    let index = args[2];
    let replacement = args[3];
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
    catch(error) {
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
}