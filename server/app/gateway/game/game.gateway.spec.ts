// Raison: les any sont nécessaire pour tester les méthodes privées
/* eslint-disable @typescript-eslint/no-explicit-any */
// Raison: tout les tests sont necessaires, dans leur intégralité, pour tester de manière exhaustive le gateway
/* eslint-disable max-lines */
import { Quiz } from '@app/model/database/quiz';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SinonStubbedInstance, createStubInstance, stub } from 'sinon';
import { BroadcastOperator, Server, Socket } from 'socket.io';
import { GameGateway } from './game.gateway';
import { GameEvents } from './game.gateway.events';

describe('GameGateway', () => {
    let roomId: string;
    let gateway: GameGateway;
    let logger: SinonStubbedInstance<Logger>;
    let socket: SinonStubbedInstance<Socket>;
    let server: SinonStubbedInstance<Server>;
    let roomManagerServiceMock: RoomManagerService;

    beforeEach(async () => {
        roomId = 'testId';
        logger = createStubInstance(Logger);
        socket = createStubInstance<Socket>(Socket);
        server = createStubInstance<Server>(Server);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameGateway,
                {
                    provide: Logger,
                    useValue: logger,
                },
                RoomManagerService,
            ],
        }).compile();

        gateway = module.get<GameGateway>(GameGateway);
        roomManagerServiceMock = module.get<RoomManagerService>(RoomManagerService);
        roomManagerServiceMock.rooms = [
            {
                id: roomId,
                quiz: {} as Quiz,
                organizer: { socketId: 'organizerId', name: 'Organisateur' },
                players: [
                    { socketId: 'playerId1', name: 'name1', points: 50, bonusCount: 0 },
                    { socketId: 'playerId2', name: 'name2', points: 200, bonusCount: 1 },
                    { socketId: socket.id, name: 'testName', points: 0, bonusCount: 0 },
                ],
                isLocked: false,
                bannedNames: [],
                answerTimes: [
                    { userId: 'playerId1', timeStamp: 1698849004046 },
                    { userId: 'playerId2', timeStamp: 1698849011696 },
                    { userId: socket.id, timeStamp: 1298849004046 },
                ],
                timer: null,
                results: [],
                chatMessage: [],
            },
        ];

        gateway['server'] = server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    it('handleStartGame() should emit a message to the server when the game is about to begin', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.StartGame);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleStartGame(socket, roomId);
        expect(server.to.calledWith(roomId)).toBeTruthy();
    });

    it('handlePlayerLeaveGame() should delete the room if there are no more players in an active game', () => {
        roomManagerServiceMock.rooms[0].players = [{ socketId: socket.id, name: 'testName', points: 0, bonusCount: 0 }];
        roomManagerServiceMock.rooms[0].organizer.socketId = '';
        roomManagerServiceMock.rooms[0].answerTimes = [];
        const removePlayerSpy = jest.spyOn(roomManagerServiceMock, 'removePlayer');
        const deleteRoomSpy = jest.spyOn(roomManagerServiceMock, 'deleteRoom');
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string, playerName: string) => {
                expect(event).toEqual(GameEvents.PlayerAbandonedGame);
                expect(playerName).toEqual('testName');
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handlePlayerLeaveGame(socket, { roomId, isInGame: true });
        expect(server.to.calledWith(roomId)).toBeTruthy();
        expect(removePlayerSpy).toHaveBeenCalled();
        expect(deleteRoomSpy).toHaveBeenCalled();
        expect(roomManagerServiceMock.rooms.length).toBe(0);
        expect(socket.leave.calledOnceWith(roomId)).toBeTruthy();
        expect(socket.disconnect.calledOnce).toBeTruthy();
    });

    // // TODO add emit event
    it('handleGoodAnswerOnClick() should be called with a click and added to the list of answerTimes and emit', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.GoodAnswerOnClick);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleGoodAnswerOnClick(socket, roomId);
        expect(roomManagerServiceMock.rooms[0].answerTimes.length).toBeGreaterThan(2);
        expect(roomManagerServiceMock.rooms[0].answerTimes[2].userId).toBe(socket.id);
        expect(roomManagerServiceMock.rooms[0].answerTimes[2].timeStamp).toBeDefined();
    });

    it('handleGoodAnswerOnFinishedTimer() should add the timestamp of the good answer to the answersTime list and emitted to organizer', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.GoodAnswerOnFinishedTimer);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleGoodAnswerOnFinishedTimer(socket, roomId);
        expect(roomManagerServiceMock.rooms[0].answerTimes.length).toBeGreaterThan(2);
        expect(roomManagerServiceMock.rooms[0].answerTimes[2].userId).toBe(socket.id);
        expect(roomManagerServiceMock.rooms[0].answerTimes[2].timeStamp).toBeDefined();
    });

    it('handleBadAnswerOnClick() should emit when good answer submitted on click to organizer that a bad answer was submitted', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.BadAnswerOnClick);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleBadAnswerOnClick(socket, roomId);
        expect(server.to.calledWith(roomManagerServiceMock.rooms[0].organizer.socketId)).toBeTruthy();
    });

    it('handleBadAnswerOnFinishedTimer() should emit to organizer that a bad answer was submitted when timer runs out', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.BadAnswerOnFinishedTimer);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleBadAnswerOnFinishedTimer(socket, roomId);
    });

    it('handleQuestionChoiceSelect() should show the organizer the total answer choice counts of players of a given question', () => {
        const questionChoiceIndex = 1;
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string, index: number) => {
                expect(event).toEqual(GameEvents.QuestionChoiceSelect);
                expect(index).toEqual(questionChoiceIndex);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleQuestionChoiceSelect(socket, { roomId, questionChoiceIndex });
        expect(server.to.calledWith(roomManagerServiceMock.rooms[0].organizer.socketId)).toBeTruthy();
    });

    it('handleQuestionChoiceUnelect() should show the organizer the total answer choice counts of players of a given question', () => {
        const questionChoiceIndex = 1;
        stub(socket, 'rooms').value(new Set([roomId]));
        socket.join(roomId);
        server.to.returns({
            emit: (event: string, index: number) => {
                expect(event).toEqual(GameEvents.QuestionChoiceUnselect);
                expect(index).toEqual(questionChoiceIndex);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleQuestionChoiceUnselect(socket, { roomId, questionChoiceIndex });
        expect(server.to.calledWith(roomManagerServiceMock.rooms[0].organizer.socketId)).toBeTruthy();
    });

    it('handleQuestionChoiceSelect() should emit the selected choice index', () => {
        const questionChoiceIndex = 2;
        stub(socket, 'rooms').value(new Set([roomId]));

        server.to.returns({
            emit: (event: string, index: number) => {
                expect(event).toEqual(GameEvents.QuestionChoiceSelect);
                expect(index).toEqual(questionChoiceIndex);
            },
        } as BroadcastOperator<unknown, unknown>);

        gateway.handleQuestionChoiceSelect(socket, { roomId, questionChoiceIndex });
    });

    it('handleQuestionChoiceUnselect() should emit the unselected choice index', () => {
        const questionChoiceIndex = 1;
        stub(socket, 'rooms').value(new Set([roomId]));

        server.to.returns({
            emit: (event: string, index: number) => {
                expect(event).toEqual(GameEvents.QuestionChoiceUnselect);
                expect(index).toEqual(questionChoiceIndex);
            },
        } as BroadcastOperator<unknown, unknown>);

        gateway.handleQuestionChoiceUnselect(socket, { roomId, questionChoiceIndex });
    });

    it('handleSubmitQuestionOnClick() should emit to organizer when a question was submitted by click from player', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        roomManagerServiceMock.rooms[0].organizer.socketId = socket.id;
        const organizerId = roomManagerServiceMock.rooms[0].organizer.socketId;
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.SubmitQuestionOnClick);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleSubmitQuestionOnClick(socket, roomId);
        expect(server.to.calledWith(organizerId)).toBeTruthy();
    });

    it('handleSubmitQuestionOnFinishedTimer() should emit to organizer when a question was submitted by timer ended', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        roomManagerServiceMock.rooms[0].organizer.socketId = socket.id;
        const organizerId = roomManagerServiceMock.rooms[0].organizer.socketId;
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.SubmitQuestionOnFinishedTimer);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleSubmitQuestionOnFinishedTimer(socket, roomId);
        expect(server.to.calledWith(organizerId)).toBeTruthy();
    });

    it('handleGiveBonus() should assign the bonus to player with fastest time when all times are different', () => {
        const getQuickestTimeSpy = jest.spyOn(roomManagerServiceMock, 'getQuickestTime');
        stub(socket, 'rooms').value(new Set([roomId]));
        roomManagerServiceMock.rooms[0].answerTimes.push({ userId: socket.id, timeStamp: 1698849004046 });
        const fastestPlayer = roomManagerServiceMock.getQuickestTime(roomManagerServiceMock.findRoom(roomId));
        const fastestPlayerName = 'testName';
        const organizerId = roomManagerServiceMock.rooms[0].organizer.socketId;

        server.to.returns({
            emit: (event: string, playerName: string) => {
                if (event === GameEvents.BonusUpdate) {
                    expect(event).toEqual(GameEvents.BonusUpdate);
                    expect(playerName).toEqual(fastestPlayerName);
                }
                if (event === GameEvents.GiveBonus) {
                    expect(event).toEqual(GameEvents.GiveBonus);
                }
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleGiveBonus(socket, roomId);
        expect(server.to.calledWith(fastestPlayer.userId)).toBeTruthy();
        expect(server.to.calledWith(organizerId)).toBeTruthy();
        expect(getQuickestTimeSpy).toHaveBeenCalled();
        expect(getQuickestTimeSpy).toHaveReturnedWith(fastestPlayer);
        expect(roomManagerServiceMock.rooms[0].players[2].bonusCount).toBeGreaterThan(0);
        expect(server.to.calledWith(fastestPlayer.userId)).toBeTruthy();
        expect(server.to.calledWith(organizerId)).toBeTruthy();
    });

    it('handleGiveBonus() should not give the bonus if no player got the correct answer', () => {
        roomManagerServiceMock.rooms[0].answerTimes = [];
        const getQuickestTimeSpy = jest.spyOn(roomManagerServiceMock, 'getQuickestTime');
        stub(socket, 'rooms').value(new Set([roomId]));
        socket.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.GiveBonus);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleGiveBonus(socket, roomId);
        expect(socket.to.called).toBeFalsy();
        expect(getQuickestTimeSpy).toHaveBeenCalled();
        expect(getQuickestTimeSpy).toHaveReturnedWith(undefined);
    });

    it('handleAddPointsToPlayer() should give points to the player if the question is answered correctly', () => {
        const room = roomManagerServiceMock.findRoom(roomId);
        const goodAnswerPoints = 100;
        const addPointsToPlayerSpy = jest.spyOn(roomManagerServiceMock, 'addPointsToPlayer');

        roomManagerServiceMock['addPlayerToRoom'](room, socket.id);
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.AddPointsToPlayer);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleAddPointsToPlayer(socket, { roomId, points: goodAnswerPoints });

        expect(server.to.calledWith(roomManagerServiceMock.rooms[0].organizer.socketId)).toBeTruthy();
        expect(addPointsToPlayerSpy).toHaveBeenCalledWith(socket.id, goodAnswerPoints, room);
        expect(roomManagerServiceMock.rooms[0].players[2].points).toEqual(goodAnswerPoints);
    });

    it('handleAddPointsToPlayer() should not add points if room is not found', () => {
        const addPointsToPlayerSpy = jest.spyOn(roomManagerServiceMock, 'addPointsToPlayer');
        const invalidRoomId = 'nonexistentRoomId';
        const pointsToAdd = 10;
        stub(socket, 'rooms').value(new Set([invalidRoomId]));

        gateway.handleAddPointsToPlayer(socket, { roomId: invalidRoomId, points: pointsToAdd });
        expect(addPointsToPlayerSpy).not.toHaveBeenCalled();
        expect(server.to.withArgs(roomManagerServiceMock.rooms[0].organizer.socketId).called).toBeFalsy();
    });

    it('handleAddPointsToPlayer() should not add points if points are negative', () => {
        const addPointsToPlayerSpy = jest.spyOn(roomManagerServiceMock, 'addPointsToPlayer');
        const invalidPoints = -100;
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.AddPointsToPlayer);
            },
        } as BroadcastOperator<unknown, unknown>);

        gateway.handleAddPointsToPlayer(socket, { roomId, points: invalidPoints });
        expect(addPointsToPlayerSpy).not.toHaveBeenCalled();
        expect(server.to.called).toBeFalsy();
    });

    it('handleNextQuestion() should reset players answersTimes list going into a new question', () => {
        const room = roomManagerServiceMock.findRoom(roomId);
        const resetAnswerTimesSpy = jest.spyOn(roomManagerServiceMock, 'resetAnswerTimes');

        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.NextQuestion);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleNextQuestion(socket, roomId);

        expect(resetAnswerTimesSpy).toHaveBeenCalledWith(room);
        expect(roomManagerServiceMock.rooms[0].answerTimes.length).toEqual(0);
        expect(server.to.calledWith()).toBeTruthy();
    });

    it('handlePlayerLeaveGame() remove the players from the room, disconnect them from the server and emit if the game has started', () => {
        const room = roomManagerServiceMock.findRoom(roomId);
        const removePlayerSpy = jest.spyOn(roomManagerServiceMock, 'removePlayer');
        socket.join(roomId);
        roomManagerServiceMock['addPlayerToRoom'](room, socket.id);

        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.PlayerAbandonedGame);
            },
        } as BroadcastOperator<unknown, unknown>);

        gateway.handlePlayerLeaveGame(socket, { roomId, isInGame: true });

        expect(removePlayerSpy).toHaveBeenCalledWith(room, socket.id);
        expect(socket.leave.calledOnceWith(roomId)).toBeTruthy();
        expect(socket.disconnect.called).toBeTruthy();
    });

    it('handlePlayerLeaveGame() remove the players from the room, disconnect them from the server and not emit if the game has started', () => {
        const room = roomManagerServiceMock.findRoom(roomId);
        const removePlayerSpy = jest.spyOn(roomManagerServiceMock, 'removePlayer');

        roomManagerServiceMock['addPlayerToRoom'](room, socket.id);

        stub(socket, 'rooms').value(new Set([roomId]));
        gateway.handlePlayerLeaveGame(socket, { roomId, isInGame: false });
        expect(server.to.called).toBeFalsy();

        expect(removePlayerSpy).toHaveBeenCalledWith(room, socket.id);
        expect(socket.leave.calledOnceWith(roomId)).toBeTruthy();
        expect(socket.disconnect.called).toBeTruthy();
    });

    it('handleShowResults() should send emit game results event to the specified room', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.ShowResults);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleShowResults(socket, roomId);
        expect(server.to.calledWith(roomId)).toBeTruthy();
    });

    it('handleSendResults() should emit to organizer when the results are ready to be displayed', () => {
        stub(socket, 'rooms').value(new Set([roomId]));
        roomManagerServiceMock.rooms[0].organizer.socketId = socket.id;
        const organizerId = roomManagerServiceMock.rooms[0].organizer.socketId;
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.SendResults);
            },
        } as BroadcastOperator<unknown, unknown>);
        gateway.handleSendResults(socket, roomId);
        expect(server.to.calledWith(organizerId)).toBeTruthy();
    });

    it('handleEndGame() should not disconnect players if room does not exist', async () => {
        const nonExistentId = 'nonExistentRoomId';
        const nbRooms = roomManagerServiceMock.rooms.length;
        stub(socket, 'rooms').value(new Set([roomId]));

        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.GameAborted);
            },
        } as BroadcastOperator<unknown, unknown>);
        await gateway.handleEndGame(socket, { roomId: nonExistentId, gameAborted: false });
        expect(server.to.called).toBeFalsy();
        expect(roomManagerServiceMock.rooms).toHaveLength(nbRooms);
    });

    it('handleEndGame() should clear timer if game has been aborted', async () => {
        stub(socket, 'rooms').value(new Set([roomId]));

        socket.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(GameEvents.GameAborted);
            },
        } as BroadcastOperator<unknown, unknown>);

        await gateway.handleEndGame(socket, { roomId, gameAborted: false });
        expect(socket.to.withArgs(roomId).called).toBeFalsy();
        expect(roomManagerServiceMock.rooms).toHaveLength(1);
    });
});
