import { Component } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { AdminPopupComponent } from '@app/components/admin-popup/admin-popup.component';
import { JoinGamePopupComponent } from '@app/components/join-game-popup/join-game-popup.component';
import { AdminGuardService } from '@app/services/admin-guard.service';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss', '../../../assets/shared.scss'],
})
export class MainPageComponent {
    constructor(
        private adminPopup: MatDialog,
        private joinGamePopup: MatDialog,
        private adminGuardService: AdminGuardService,
    ) {
        this.initializeComponent();
    }

    initializeComponent(): void {
        if (this.adminGuardService.showAdminPopup()) {
            this.openAdminPopup();
        }
    }

    openAdminPopup() {
        const adminPopupConfig = new MatDialogConfig();
        adminPopupConfig.autoFocus = true;
        this.adminPopup.open(AdminPopupComponent, adminPopupConfig);
    }

    openJoinGamePopup() {
        const joinGamePopupConfig = new MatDialogConfig();
        joinGamePopupConfig.autoFocus = true;
        this.joinGamePopup.open(JoinGamePopupComponent, joinGamePopupConfig);
    }
}
