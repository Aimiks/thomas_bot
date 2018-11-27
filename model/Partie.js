const Player = require('./Player.js');
const seedrandom = require("seedrandom");
const blindTest = require("../commands/blindTest");


class Partie {
    constructor(noRounds, ID = null) {
        this.noRounds = noRounds;
        this.curRound = 0;
        if (ID === null) {
            this.ID = (Math.random() * 1000000).toString();
        }else{
            this.ID = ID
        }
        var rng = Math.seedrandom(this.ID);
        /**@type {Player[] } */
        this.players = [];
        /** @type {import('./Anime')[]}*/
        this.listAllSongs = [];
        /** @type {import('./Anime')[]}*/
        this.listSongs = [];
        this.playersReady = false;
        this.playersHaveResponded = false;
        this.duo = null;
        this.duoSol = null;
        this.carre = null;
        this.carreSol = null;
        this.timerValue = 0;
        this.timerId = null; 
        /** @type {String[]} */
        this.mpTable = [];
        this.started = false;
        /** @type {import('discord.js').VoiceConnection} */
        this.connection = null;
        /** @type {import('discord.js').StreamDispatcher} */
        this.currStream = null;
        /** @type {import('discord.js').VoiceChannel} */
        this.voiceChannel = null;
        this.firstToFindCash = true;
        this.firstToFindCarre = true;
        this.firstToFindDouble = true;
    }

    addPlayer(user) {
        this.players.push(new Player(user));
    }

    areAllPlayersReady(){
        return this.players.findIndex( (p) => !p.isReady)===-1;
    }

    playerReady(playerID){
        let curPlayer =  this.players.find((p) => p.ID === playerID);

        curPlayer.isReady = true;
        if (this.areAllPlayersReady()) {
            this.playersReady = true;
        }
    }

    playerHaveSelectMode(playerID){
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        curPlayer.isModeSelected = true;
    }
    getPlayerSelectModeState(playerID){
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        return curPlayer.isModeSelected;
    }
    setPlayerSelectMode(playerID,modeType){
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        curPlayer.modeType = modeType;
        this.playerHaveSelectMode(playerID);
    }
    getPlayerSelectMode(playerID){
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        return curPlayer.modeType;
    }
    playerHaveResponded(playerID){
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        curPlayer.hasResponded = true;
        if (this.areAllPlayersHaveResponded()) {
            this.playersHaveResponded = true;
        }
    }

    areAllPlayersHaveResponded(){
        return this.players.findIndex( (p) => !p.hasResponded)===-1;
    }

    reset(){
        this.players.forEach(element => {
            element.reset();
        });
        this.playersHaveResponded = false;
        this.duo = null;
        this.carre = null;
        this.firstToFindCash = true;
        this.firstToFindCarre = true;
        this.firstToFindDouble = true;
    }

    getDuo(){
        if (this.duo === null) {
            let theId = Math.floor(Math.random()*2);
            let tab1 = [];
            this.duoSol = theId+1;
            for (let index = 0; index < 2; index++) {
                if (index === theId) {
                    tab1[index] = this.listSongs[this.curRound].name;
                }else{
                    let rng;
                    do {
                    rng = Math.floor(Math.random()*this.listAllSongs.length);
                    } while ( tab1.includes(this.listAllSongs[rng].name) || (this.listSongs[this.curRound].name ===  this.listAllSongs[rng].name));                       
                    tab1[index] = this.listAllSongs[rng].name;
                }
            }
            this.duo = tab1;
            return this.duo;
        }
        else{
            return this.duo;
        }
    }

    getCarre(){
        if (this.carre === null) {
            let theId = Math.floor(Math.random()*4);
            let tab2 = [];
            this.carreSol = theId+1;
            for (let index = 0; index < 4; index++) {
                if (index === theId) {
                    tab2[index] = this.listSongs[this.curRound].name;
                }else{
                    let rng;
                    do {
                    rng = Math.floor(Math.random()*this.listAllSongs.length);
                    
                    } while (tab2.includes(this.listAllSongs[rng].name) || (this.listSongs[this.curRound].name ===  this.listAllSongs[rng].name) );

                    tab2[index] = this.listAllSongs[rng].name;
                }
            }
            this.carre = tab2;
            return tab2;
        }
        else{
            return this.carre;
        }
    }

    playerAddScore(playerID,scoreToAdd){
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        
        curPlayer.score += scoreToAdd;
    }

    getPlayerScore(playerID) {
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        return curPlayer.score;
    }
    getPlayerUserName(playerID) {
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        return curPlayer.username;
    }
    /**
     * 
     * @param {*} playerID 
     * @return {import('discord.js').User}
     */
    getPlayerUser(playerID) {
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        return curPlayer.user;
    }

    getBestPlayerScore() {
        let best = this.players[0];
        this.players.forEach(e => {
            if (best.score < e.score) {
                best = e;
            }
        });
        return best.ID;
    }

    /**
     * @return {import('./Anime')} anime
     */
    getCurrentRoundAnime() {
        return this.listSongs[this.curRound];
    }

    updatePlayerBestScore(playerID,score,song, time) {
        let curPlayer =  this.players.find((p) => p.ID === playerID);
        
        curPlayer.updateBestScore(score,song, time);
    }

    getEndBoardResult(){
        let resTab = [];

        this.players.forEach(e => {
            resTab.push(e);
        });

        resTab.sort((a,b) => {
            return b.score-a.score;
        });
        
        return resTab;
    }
    
};

module.exports = Partie;