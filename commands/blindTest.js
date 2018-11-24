const { YTSearcher } = require('ytsearcher');
const Anime = require('../model/Anime.js');


exports.add = (Discord, client, message, YTKEY) => {
    const searcher = new YTSearcher(YTKEY);
    let bt_queue;
    let args = message.content.split(",");
    // remove command prefix from args
    args[0] = args[0].substring(">bt ".length);
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
        res.forEach((r, ind) => {
            embed.addField(`Musique n°${ind}`, `[${r.title}](${r.url})`);
        });
        message.author.send(embed);
    });
};

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