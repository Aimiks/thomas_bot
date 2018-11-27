class Player{
    constructor(ID, username) {
        this.ID = ID;
        this.username = username;
        this.isReady = false;
        this.isModeSelected = false;
        this.hasResponded = false;
        this.score = 0;
        this.modeType = -1;
        this.bestScore = 0;
        this.bestSong = "";
    }

    reset(){
        this.isModeSelected = false;
        this.hasResponded = false;
        this.modeType = -1;
    }
    updateBestScore(score,song){
        if (score > this.bestScore) {
            this.bestScore = score;
            this.bestSong = song;
        }
    }
    getBestScore(){
        return this.bestScore;
    }
};

module.exports = Player;