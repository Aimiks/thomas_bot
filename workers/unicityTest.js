const { parentPort } = require("worker_threads");
const commands = require("../commands");
const PrepAnimeCombi = require("../model/PrepAnimeCombi.js");

const { unserializeAnimeListAsync, IAAdapt } = commands.blindTest.util;
(async () => {
  let animes;
  try {
    animes = await unserializeAnimeListAsync();
  } catch (err) {
    throw err;
  }

  let copy_indx = [];
  let strings_to_return = ["----Test unicité----"];
  let nb_strings = 0;
  /* browse every animes */
  Object.values(animes).forEach((anime, i) => {
    /* prepare combi */
    let combi = new PrepAnimeCombi(anime, null);

    /* check every animes*/
    Object.values(animes).forEach((other, ind) => {
      let actual_string = strings_to_return[nb_strings];
      /* if not already done || same anime */
      if (anime !== other && copy_indx.findIndex((e) => e === i) === -1) {
        /*console.log(
          `[${i}] Testing ${anime.name} ${anime.type} with [${ind}] ${other.name} ${other.type}...`
        );*/
        /* test equality */
        if (IAAdapt(combi, other.name) && anime.type === other.type) {
          /* save the information that we already test it and found a copy*/
          copy_indx.push(ind);

          /* build final string */
          const tmp_string = `\n[${ind}] __${other.name} ${other.type}__ semble être une copie de [${i}] __${anime.name} ${anime.type}__`;
          /* if superior to 2000 char we have to build another string */
          if (actual_string.length + tmp_string.length < 2000) {
            actual_string += tmp_string;
            strings_to_return[nb_strings] = actual_string;
          } else {
            strings_to_return.push(tmp_string);
            nb_strings++;
          }
        }
      }
    });
  });
  parentPort.postMessage(strings_to_return);
})();
