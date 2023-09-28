import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { CountdownComponent } from '@app/components/countdown/countdown.component';
import { ProfileComponent } from '@app/components/profile/profile.component';
import { QuestionZoneComponent } from '@app/components/question-zone/question-zone.component';
import { TopBarComponent } from '@app/components/top-bar/top-bar.component';
import { CommunicationService } from '@app/services/communication.service';
import { of } from 'rxjs';
import { GamePageComponent } from './game-page.component';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import SpyObj = jasmine.SpyObj;
import { PopupMessageComponent } from '@app/components/popup-message/popup-message.component';
import { PopupMessageConfig } from '@app/interfaces/popup-message-config';
// import { PopupMessageConfig } from '@app/interfaces/popup-message-config';

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let communicationServiceMock: jasmine.SpyObj<CommunicationService>;
    let mockDialog: SpyObj<MatDialog>;
    let mockDialogRef: SpyObj<MatDialogRef<PopupMessageComponent>>;
    const mockedQuiz = {
        $schema: 'test.json',
        id: '123',
        title: 'Test quiz',
        description: 'Test quiz description',
        visibility: true,
        duration: 60,
        lastModification: '2018-11-13T20:20:39+00:00',
        questions: [],
    };

    beforeEach(() => {
        communicationServiceMock = jasmine.createSpyObj('CommunicationService', ['getQuiz']);
        communicationServiceMock.getQuiz.and.returnValue(of(mockedQuiz));
        mockDialog = jasmine.createSpyObj('mockDialog', ['open']);
        mockDialogRef = jasmine.createSpyObj('mockDialogRef', ['componentInstance']);
    });

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [GamePageComponent, TopBarComponent, ProfileComponent, ChatComponent, QuestionZoneComponent, CountdownComponent],
            imports: [MatIconModule, RouterModule, MatDialogModule],
            providers: [
                { provide: CommunicationService, useValue: communicationServiceMock },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: { get: () => '123' }, url: [{ path: 'game/123/test' }, { path: 'game/123' }] } },
                },
                { provide: MatDialog, useValue: mockDialog },
                { provide: MatDialogRef, useValue: mockDialogRef },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(GamePageComponent);
        mockDialog.open.and.returnValue(mockDialogRef);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set link to /home if route doesn\'\t contain "test"', () => {
        component.checkGameRoute(false);
        expect(component.title).toEqual('Partie');
        expect(component.link).toEqual('/home');
    });

    it('should link to /game/new if route does contain "test"', () => {
        component.checkGameRoute(true);
        expect(component.title).toEqual('Partie - Test');
        expect(component.link).toEqual('/game/new');
    });

    it('should fetch the quiz ', () => {
        expect(communicationServiceMock.getQuiz).toHaveBeenCalledWith('123');
        expect(component.quiz).toEqual(mockedQuiz);
    });

    it('should popup a message when the user tries to delete a quiz with the correct configuration', () => {
        const mockConfig: PopupMessageConfig = {
            message: 'Êtes-vous sûr de vouloir quitter la partie?',
            hasCancelButton: true,
            okButtonText: 'Quitter',
            cancelButtonText: 'Annuler',
        };

        component.openQuitPopUp();
        const config = mockDialogRef.componentInstance.config;

        expect(mockDialog.open).toHaveBeenCalled();
        expect(config.message).toEqual(mockConfig.message);
        expect(config.hasCancelButton).toEqual(mockConfig.hasCancelButton);
        expect(config.okButtonText).toEqual(mockConfig.okButtonText);
        expect(config.cancelButtonText).toEqual(mockConfig.cancelButtonText);
        expect(config.okButtonFunction).toBeDefined();
    });
});
