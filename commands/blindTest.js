const { YTSearcher } = require('ytsearcher');
const Anime = require('../model/Anime.js');
const fs = require('fs');


function addToJsonFile(name, animes) {
    let json_list = JSON.stringify({name : { animes: [...animes] }});
    fs.exists('animelist.json', bool => {
        if (bool) {
            fs.readFile('animelist.json', 'utf8', res => {
                let list = JSON.parse(res);
                list[name] = { animes: [...animes] };
                json_list = JSON.stringify(list);
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
            animes.push(new Anime(args[ind], "osef atm", r.url));
        });
        addToJsonFile(args,animes);
        message.author.send(embed);
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
 */
exports.play = (message, listSongs, mpTable) => {
    let arg = message.content.split(' ')[1];
    let voiceChannel = message.member.voiceChannel;
    voiceChannel.join().then(connection => {
        let mem = voiceChannel.members.array();
        for (let index = 0; index < mem.length; index++) {
            if (mem[index].user.bot) {
                continue;
            }
            let element = mem[index];
            mpTable.push(element.id);
            element.send(":crab:Hi ready to play ?:crab:")
        }

    });
    for (let index = 0; index < arg; index++) {
        listSongs.push(new Anime("Ginatama", "E25", "https://www.youtube.com/watch?v=4_mBUQM14I0"));
    }
}