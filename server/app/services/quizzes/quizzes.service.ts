import { Quiz } from '@app/model/database/quiz';
import { Constants } from '@common/constants';
import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as randomstring from 'randomstring';

const quizzesPath = join(__dirname, Constants.QUIZZES_PATH);

@Injectable()
export class QuizzesService {
    // if implement DB service (MongoDB) use constructor to populate DB
    // constructor(
    //   @InjectModel(Quiz.id) public QuizModel: Model<Quiz>,
    //   private readonly logger: Logger,
    // ) {
    //   this.start(); //implement start code below if needed, start should populate db
    // }

    get quizzesPath() {
        return quizzesPath;
    }

    // Time not in EST for some reason
    getDate(): string {
        return new Date().toISOString();
    }

    verifyQuiz(quiz: Quiz): void {
        const errors = [];

        if (!quiz.$schema || typeof quiz.$schema !== 'string') errors.push('Schéma de quiz invalide ou manquant');
        // not checking id here because it is generated in addQuiz()
        // unless we want to check for imports leave d commented
        // if (!quiz.id || typeof quiz.id !== 'string') errors.push('id de quiz invalide ou manquant');
        if (!quiz.title || typeof quiz.title !== 'string') errors.push('Titre de quiz invalide ou manquant');
        if (!quiz.duration || typeof quiz.duration !== 'number') errors.push('La durée du quiz est manquante doit être un nombre');
        if (quiz.duration < Constants.MIN_DURATION || quiz.duration > Constants.MAX_DURATION)
            errors.push('La durée du quiz doit être entre 10 et 60 secondes');
        if (!quiz.lastModification || typeof quiz.lastModification !== 'string') errors.push('Date de dernière modification invalide ou manquante');
        if (!Array.isArray(quiz.questions)) {
            errors.push('Les questions sont manquantes');
        } else {
            quiz.questions.forEach((question, index) => {
                if (!question.type || typeof question.type !== 'string') errors.push(`Type de la question ${index + 1} invalide ou manquant`);
                if (!question.text || typeof question.text !== 'string') errors.push(`Texte de la question ${index + 1} est invalide ou manquant`);
                if (typeof question.points !== 'number') errors.push(`Les points de la question ${index + 1} sont manquants ou invalides`);
                if (!Array.isArray(question.choices)) {
                    errors.push(`Les choix de la question ${index + 1} sont manquants`);
                } else {
                    question.choices.forEach((choice, indexChoice) => {
                        if (!choice.text || typeof choice.text !== 'string')
                            errors.push(`Texte du choix ${indexChoice + 1} de la question ${index + 1} invalide ou manquant`);
                        if (typeof choice.isCorrect !== 'boolean')
                            errors.push(`La propriété "isCorrect" du choix ${indexChoice + 1} de la question ${index + 1} est invalide ou manquante`);
                    });
                }
            });
        }

        if (errors.length) throw new Error(errors.join('\n'));
    }

    checkIdAvailability(quizzes: Quiz[], id: string) {
        const quizIndex = quizzes.findIndex((quiz) => quiz.id === id);
        return quizIndex === Constants.INDEX_NOT_FOUND;
    }

    createID(quizzes: Quiz[], quiz: Quiz) {
        quiz.id = randomstring.generate(Constants.RANDOM_STRING_LENGTH);
        if (!this.checkIdAvailability(quizzes, quiz.id)) {
            quiz.id = randomstring.generate(Constants.RANDOM_STRING_LENGTH);
            this.createID(quizzes, quiz);
        }
    }

    async checkQuizAvailability(id: string): Promise<boolean> {
        try {
            const quizzes = await this.getQuizzes();
            return !this.checkIdAvailability(quizzes, id);
        } catch (error) {
            return Promise.reject(new Error(`${error.message}`));
        }
    }

    async checkVisibility(id: string) {
        try {
            const quiz = await this.getQuiz(id);
            return quiz.visibility;
        } catch (error) {
            return Promise.reject(new Error(`${error.message}`));
        }
    }

    async getQuizIndex(id: string) {
        const quizzes = await this.getQuizzes();
        const quizIndex = quizzes.findIndex((quiz) => quiz.id === id);
        if (quizIndex === Constants.INDEX_NOT_FOUND) {
            throw new Error(`Quiz ${id} not found`);
        }
        return quizIndex;
    }

    async getQuizzes(): Promise<Quiz[]> {
        try {
            const quizzes = await fs.readFile(this.quizzesPath, 'utf8');
            return JSON.parse(quizzes);
        } catch (error) {
            return Promise.reject(new Error(`Failed to get Quizzes: ${error.message}`));
        }
    }

    async getQuiz(id: string): Promise<Quiz> {
        try {
            const quizzes = await this.getQuizzes();
            const quizIndex = await this.getQuizIndex(id);
            return quizzes[quizIndex];
        } catch (error) {
            return Promise.reject(new Error(`${error.message}`));
        }
    }

    // TODO addQuiz() should check if id already exists and validate input
    async addQuiz(quiz: Quiz): Promise<Quiz> {
        try {
            const quizzes = await this.getQuizzes();
            this.createID(quizzes, quiz);
            quiz.lastModification = this.getDate();
            quizzes.push(quiz);
            await fs.writeFile(this.quizzesPath, JSON.stringify(quizzes, null, 2));
            return quiz;
        } catch (error) {
            return Promise.reject(new Error(`Failed to add Quiz: ${error.message}`));
        }
    }

    async updateQuiz(id: string, updatedQuiz: Quiz): Promise<Quiz> {
        try {
            const quizzes = await this.getQuizzes();
            const quizIndex = await this.getQuizIndex(id);
            updatedQuiz.lastModification = this.getDate();
            quizzes[quizIndex] = updatedQuiz;
            await fs.writeFile(this.quizzesPath, JSON.stringify(quizzes, null, 2));
            return updatedQuiz;
        } catch (error) {
            return Promise.reject(new Error(`${error.message}`));
        }
    }

    async deleteQuiz(id: string): Promise<Quiz[]> {
        try {
            const quizzes = await this.getQuizzes();
            await this.getQuizIndex(id);
            // if only one Quiz in Quizzes, empty Quizzes filter method not removing last obj in json array
            if (quizzes.length === 1) {
                const updatedEmptyQuizzes = [];
                await fs.writeFile(this.quizzesPath, JSON.stringify(updatedEmptyQuizzes, null, 2));
                return updatedEmptyQuizzes;
            }
            const updatedQuizzes = quizzes.filter((quiz) => quiz.id !== id);
            await fs.writeFile(this.quizzesPath, JSON.stringify(updatedQuizzes, null, 2));
            return updatedQuizzes;
        } catch (error) {
            return Promise.reject(new Error(`${error.message}`));
        }
    }

    async importQuiz(quiz: Quiz): Promise<Quiz> {
        try {
            this.verifyQuiz(quiz);
            return await this.addQuiz(quiz);
        } catch (error) {
            throw new Error(`${error.message}`);
        }
    }
}
