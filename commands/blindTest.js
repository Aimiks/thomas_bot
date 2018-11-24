const { YTSearcher } = require('ytsearcher');
exports.blindTest = (Discord, client, message, YTKEY) => {
    const searcher = new YTSearcher(YTKEY);
    let bt_queue;
    let args = message.content.split(",");
    args[0] = args[0].substring(">bt ".length);
    bt_queue = args.map((arg) => searcher.search(arg));
    Promise.all(bt_queue).then((res) => {
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