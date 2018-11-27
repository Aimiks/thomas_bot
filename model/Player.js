class Player{
    constructor(User) {
        this.user = User;
        this.ID = User.id;
        this.username = User.username;
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
    updateBestScore(score,song, time){
        if (score > this.bestScore) {
            this.bestScore = score;
            this.bestSong = song;
            this.time = time;
        }
    }
    getBestScore(){
        return this.bestScore;
    }
};

module.exports = Player;