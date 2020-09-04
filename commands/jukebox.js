/** TODO */
module.exports.play = (message, client) => {
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
            Game.addSong(res[rng]);
        }
    });

}