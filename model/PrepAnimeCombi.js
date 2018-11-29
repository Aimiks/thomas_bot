const Anime = require('./Anime.js');

class PrepAnimeCombi{
    /**
     * 
     * @param {Anime} anime 
     */
    constructor(anime,allAnimeList) {
        /**@type Anime*/
        this.anime = anime;        
        /**@type string[]*/
        this.combinaisons = this.getcombi();
        this.duoSol = null;
        this.duoProp = this.generateDuo(allAnimeList);
        this.carreSol = null;
        this.carreProp = this.generateCarre(allAnimeList);        
    }

    getcombi(){
        let combinai = [];
        let tabSplit = this.anime.name.split(" ");

        this.combi("", tabSplit, tabSplit.length, combinai);

        if (combinai.length >= 6) {
            let tempo = [];
            for (let j = 0; j < combinai.length; j++) {
                let temp = combinai[j].split(" ");
                let regroupedConcat = "";

                for (let k = 1; k < temp.length; k++) {
                    regroupedConcat += temp[k][0];
                }
                tempo.push(regroupedConcat);
            }
            tempo.forEach(ele => {
                combinai.push(ele);
            });
        }

        return combinai;
    }

    combi(tabRes, tabSplit, k, PTabFinal) {
        if (k > tabSplit.length) {
            return;
        } else if (k == 0) {
            PTabFinal.push(tabRes);
        } else {
            tabSplit.forEach(e => {
                let G = tabSplit.filter((word) => word != e)
                let L2 = tabRes + " " + e;
    
                this.combi(L2, G, k - 1, PTabFinal);
            });
        }
    }

    generateDuo(listAllSongs){
        let theId = Math.floor(Math.random()*2);
        let tab1 = [];
        this.duoSol = theId+1;
        for (let index = 0; index < 2; index++) {
            if (index === theId) {
                tab1[index] = this.anime.name;
            }else{
                let rng;
                do {
                rng = Math.floor(Math.random()*listAllSongs.length);
                } while ( tab1.includes(listAllSongs[rng].name) || (this.anime.name ===  listAllSongs[rng].name));                       
                tab1[index] = listAllSongs[rng].name;
            }
        }
        this.duo = tab1;
        return this.duo;
    }

    generateCarre(listAllSongs){
        let theId = Math.floor(Math.random()*4);
        let tab2 = [];
        this.carreSol = theId+1;
        for (let index = 0; index < 4; index++) {
            if (index === theId) {
                tab2[index] = this.anime.name;
            }else{
                let rng;
                do {
                rng = Math.floor(Math.random()*listAllSongs.length);
                
                } while (tab2.includes(listAllSongs[rng].name) || (this.anime.name ===  listAllSongs[rng].name) );

                tab2[index] = listAllSongs[rng].name;
            }
        }
        this.carre = tab2;
        return tab2;
    }
}

module.exports = PrepAnimeCombi;