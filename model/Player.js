class Player{
    constructor(ID) {
        this.ID = ID;
        this.isReady = false;
        this.isModeSelected = false;
        this.hasResponded = false;
        this.score = 0;
        this.modeType = -1;
    }

    reset(){
        this.isModeSelected = false;
        this.hasResponded = false;
        this.modeType = -1;
    }
};

module.exports = Player;