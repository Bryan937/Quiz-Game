export enum GameEvents {
    StartGame = 'startGame',
    PlayerLeaveGame = 'playerLeaveGame',
    EndGame = 'endGame',
    GoodAnswer = 'goodAnswer',
    QuestionChoiceSelect = 'questionChoiceSelect',
    QuestionChoiceUnselect = 'questionChoiceUnselect',
    GiveBonus = 'giveBonus',
    AddPointsToPlayer = 'addPointsToPlayer',
    NextQuestion = 'nextQuestion',
    PlayerAbandonedGame = 'abandonedGame',
    GameAborted = 'gameAborted',
}