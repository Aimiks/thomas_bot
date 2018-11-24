const Player = require('./Player.js');
const seedrandom = require("seedrandom");



class Partie {
    constructor(noRounds, ID = null) {
        this.noRounds = noRounds;
        this.curRound = 0;
        if (ID === null) {
            this.ID = Math.random() * 1000000;
        }else{
            this.ID = ID
        }
        var rng = seedrandom(this.ID);
        this.players = [];
        this.listSongs = [];
        this.playersReady = false;
        this.playersHaveResponded = false;
    }

    addPlayer(playerID) {
        this.players.push(new Player(playerID));
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
    }
};

module.exports = Partie;