class Player{
    constructor(ID) {
        this.ID = ID;
        this.PlayerReady = false;
        this.PlayerHaveSelectMode = false;
        this.PlayerHaveResponded = false;
        this.score = 0;
        this.modeType = -1;
    }

    reset(){
        this.PlayerHaveSelectMode = false;
        this.PlayerHaveResponded = false;
        this.modeType = -1;
    }
};

module.exports = Player;