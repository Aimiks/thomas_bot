const Player = require('./Player.js');
const PrepAnimeCombi = require('./PrepAnimeCombi.js');
const seedrandom = require("seedrandom");
const blindTest = require("../commands/blindTest");
const ytdl = require('ytdl-core');



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
        /** @type {PrepAnimeCombi[]}*/
        this.listSongs = [];
        this.listReadableStreamSongs = [];
        this.playersReady = false;
        this.playersHaveResponded = false;
        this.duo = null;
        this.duoSol = null;
        this.carre = null;
        this.carreSol = null;
        this.timerValue = 0;
        this.timerId = null; 
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
         /**@type {String[] } */
        this.playersIdAcceptedAnswers = [];
    }

    init(animes) {
        for (let i = 0; i < animes.length; i++) {
            this.listAllSongs.push(animes[i]);
        }
        let listrngtemp = [];
        for (let index = 0; index < this.noRounds; index++) {
            let rng;
            do {
                rng = Math.floor(Math.random() * animes.length);
            } while (listrngtemp.includes(rng));
            listrngtemp.push(rng);
            this.addSong(animes[rng]);
        }
    }

    addPlayer(user) {
        this.players.push(new Player(user));
        this.playersIdAcceptedAnswers.push(user.id);
    }
    addSong(anime){
        let prepAnime = new PrepAnimeCombi(anime, this.listAllSongs);
        this.listSongs.push(prepAnime);
        this.listReadableStreamSongs.push(ytdl(anime.link, { filter: 'audioonly' }));
        console.log("generation DONE For round no°" + this.listSongs.length);

    }
    getAllPlayersUser() {
        /** @type {import('discord.js').User[]} */
        return this.players.map(p => p.user);
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
        this.duoSol = this.listSongs[this.curRound].duoSol;
        return this.listSongs[this.curRound].duoProp;

    }

    getCarre(){
        this.carreSol = this.listSongs[this.curRound].carreSol;
        return this.listSongs[this.curRound].carreProp;
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
        return this.listSongs[this.curRound].anime;
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

    removeIdFromAcceptedAnswers(pId) {
        this.playersIdAcceptedAnswers = this.playersIdAcceptedAnswers.filter( (id) => id!==pId);
    }
    
};

module.exports = Partie;