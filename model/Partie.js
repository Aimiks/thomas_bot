const Player = require('./Player.js');

class Partie{
    constructor(noRounds) {
        this.noRounds = noRounds;
        this.curRound = 0;
        this.ID = Math.random();
        this.Players = [];
        this.listSongs = [];
        this.PlayersReady = false;
        this.PlayersHaveResponded = false;
    }

    addPlayer(playerID) {
        this.Players.push(new Player(playerID));
    }

    areAllPlayersReady(){
        this.Players.forEach(element => {
            if (!element.PlayerReady) {
                return false;
            }
        });
        return true;
    }

    PlayerReady(playerID){
        let curPlayer =  this.Players.find(function(element) {
            return element.ID === playerID;
          });

        curPlayer.PlayerReady = true;
        if (this.areAllPlayersReady()) {
            this.PlayersReady = true;
        }
    }

    PlayerHaveSelectMode(playerID){
        let curPlayer =  this.Players.find(function(element) {
            return element.ID === playerID;
          });

        curPlayer.PlayerHaveSelectMode = true;
    }
    getPlayerSelectModeState(playerID){
        let curPlayer =  this.Players.find(function(element) {
            return element.ID === playerID;
          });
        return curPlayer.PlayerHaveSelectMode;
    }
    setPlayerSelectMode(playerID,modeType){
        let curPlayer =  this.Players.find(function(element) {
            return element.ID === playerID;
          });
        curPlayer.modeType = modeType;
    }
    getPlayerSelectMode(playerID){
        let curPlayer =  this.Players.find(function(element) {
            return element.ID === playerID;
          });
        return curPlayer.modeType;
    }
    PlayerHaveResponded(playerID){
        let curPlayer =  this.Players.find(function(element) {
            return element.ID === playerID;
          });

        curPlayer.PlayerHaveResponded = true;
        if (this.areAllPlayersHaveResponded()) {
            this.PlayersHaveResponded = true;
        }
    }

    areAllPlayersHaveResponded(){
        this.Players.forEach(element => {
            if (!element.PlayerHaveResponded) {
                return false;
            }
        });
        return true;
    }

    reset(){
        this.Players.forEach(element => {
            element.reset();
        });
    }
};

module.exports = Partie;