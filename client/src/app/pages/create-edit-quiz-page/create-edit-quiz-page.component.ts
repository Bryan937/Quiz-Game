import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationPopupComponent } from '@app/components/confirmation-popup/confirmation-popup.component';
import { QuizQuestionInfoComponent } from '@app/components/quiz-question-info/quiz-question-info.component';
import { Question, Quiz } from '@app/interfaces/quiz';
import { QuizManagerService } from '@app/services/quiz-manager.service';
import { blankQuiz } from './utils';

@Component({
    selector: 'app-create-edit-quiz-page',
    templateUrl: './create-edit-quiz-page.component.html',
    styleUrls: ['./create-edit-quiz-page.component.scss'],
})
export class CreateEditQuizPageComponent implements OnInit {
    @ViewChild(QuizQuestionInfoComponent, { static: false }) quizQuestionInfo: QuizQuestionInfoComponent;

    newQuiz: Quiz;
    quizId: string;
    pageTitle: string;
    resetQuiz: Quiz;
    isGeneralInfoFormValid: boolean;

    constructor(
        private quizManagerService: QuizManagerService,
        private confirmationDialogReference: MatDialog,
        private route: ActivatedRoute,
    ) {
        this.isGeneralInfoFormValid = false;
    }

    ngOnInit(): void {
        this.loadQuiz();
    }

    async loadQuiz(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        const modifiedQuiz = await this.quizManagerService.fetchQuiz(id);
        this.newQuiz = modifiedQuiz ?? JSON.parse(JSON.stringify(blankQuiz));
        this.pageTitle = this.newQuiz.id ? 'Modifier un jeu questionnaire' : 'Créer un jeu questionnaire';
    }

    modifyQuestion(selectedQuestion: Question, selectedIndex: number) {
        this.quizQuestionInfo.loadQuestionInformation(selectedQuestion, selectedIndex);
    }

    setIsGeneralInfoFormValid(shouldBlockSubmit: boolean): void {
        this.isGeneralInfoFormValid = !shouldBlockSubmit;
    }

    isQuizFormValid(): boolean {
        if (this.newQuiz.questions.length > 0 && this.isGeneralInfoFormValid) {
            if (this.newQuiz.id !== '') {
                return this.quizManagerService.hasQuizBeenModified(this.newQuiz);
            } else {
                return true;
            }
        }

        return false;
    }

    deleteQuestion(index: number): void {
        this.quizManagerService.deleteQuestion(index, this.newQuiz);
        if (this.quizManagerService.modifiedIndex === index && this.quizManagerService.isModifiedQuestion) {
            this.quizQuestionInfo.resetForm();
            this.quizManagerService.isModifiedQuestion = false;
        }
    }

    moveQuestionUp(index: number) {
        this.quizManagerService.moveQuestionUp(index, this.newQuiz);
    }

    moveQuestionDown(index: number) {
        this.quizManagerService.moveQuestionDown(index, this.newQuiz);
    }

    openQuizConfirmation(): void {
        const quizConfirmationDialogReference = this.confirmationDialogReference.open(ConfirmationPopupComponent);
        quizConfirmationDialogReference.componentInstance.setConfirmationText('Sauvegarder ce quiz?');

        quizConfirmationDialogReference.afterClosed().subscribe((wantsToSave) => {
            if (wantsToSave) {
                this.saveQuiz();
            }
        });
    }

    saveQuiz() {
        if (this.newQuiz) {
            this.quizManagerService.saveQuiz(this.newQuiz);
        }
    }
}
