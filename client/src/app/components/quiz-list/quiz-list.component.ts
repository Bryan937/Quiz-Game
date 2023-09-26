import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ImportPopupComponent } from '@app/components/import-popup/import-popup.component';
import { PopupMessageComponent } from '@app/components/popup-message/popup-message.component';
import { PopupMessageConfig } from '@app/interfaces/popup-message-config';
import { Quiz } from '@app/interfaces/quiz';
import { CommunicationService } from '@app/services/communication.service';
import { ImportService } from '@app/services/import.service';
import { BehaviorSubject } from 'rxjs';

@Component({
    selector: 'app-quiz-list',
    templateUrl: './quiz-list.component.html',
    styleUrls: ['./quiz-list.component.scss'],
})
export class QuizListComponent implements OnInit {
    quizList: BehaviorSubject<Quiz[]> = new BehaviorSubject<Quiz[]>([]);

    constructor(
        private communicationService: CommunicationService,
        private popup: MatDialog,
        private importService: ImportService,
    ) {}

    ngOnInit(): void {
        this.fetchQuizzes();
    }

    fetchQuizzes(): void {
        this.communicationService.getQuizzes().subscribe((quizzes: Quiz[]) => {
            this.quizList.next(quizzes);
        });
    }

    deleteQuiz(quiz: Quiz): void {
        this.communicationService.deleteQuiz(quiz.id).subscribe(() => {
            this.fetchQuizzes();
        });
    }

    //  https://stackoverflow.com/questions/57922872/angular-save-blob-in-local-text-file
    exportQuiz(quiz: Quiz): void {
        //  TODO: logique quiz est bon
        const exportedQuiz = { ...quiz };
        delete exportedQuiz.visibility;
        //  const exportedQuizQuestions = [ ...quiz.questions ]
        const quizName: string = quiz.title;

        //  create blob file
        const blob = new Blob([JSON.stringify(exportedQuiz)], { type: 'application/json' });
        const blobUrl = window.URL.createObjectURL(blob);
        //  create anchor element (invisible in html)
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = quizName;

        anchor.click();

        window.URL.revokeObjectURL(blobUrl);
    }

    editQuiz(quiz: Quiz): void {
        // Implement edit logic here
        quiz.title = 'editing...';
    }

    toggleVisibility(quiz: Quiz): void {
        quiz.visibility = !quiz.visibility;
        this.communicationService.updateQuiz(quiz.id, quiz).subscribe();
    }

    openPopupDelete(quiz: Quiz): void {
        const config: PopupMessageConfig = {
            message: "Ëtes-vous sûr de vouloir supprimer ce quiz? Cette action n'est pas reversible.",
            hasCancelButton: true,
            okButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
            okButtonFunction: () => {
                this.deleteQuiz(quiz);
            },
        };
        const dialogRef = this.popup.open(PopupMessageComponent);
        const popupInstance = dialogRef.componentInstance;
        popupInstance.config = config;
    }

    async handleImport(event: Event) {
        try {
            await this.importService.selectQuiz(event);
            await this.importService.importQuiz();
            this.importSuccessPopup();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Une erreur s'est produite.";
            this.popup.open(ImportPopupComponent, {
                data: { errorMessage },
            });
        } finally {
            this.importService.resetInput(event);
            this.fetchQuizzes();
        }
    }

    importSuccessPopup(): void {
        const config: PopupMessageConfig = {
            message: 'Importation réussie',
            hasCancelButton: false,
        };
        const dialogRef = this.popup.open(PopupMessageComponent);
        const popupInstance = dialogRef.componentInstance;
        popupInstance.config = config;
    }
}
