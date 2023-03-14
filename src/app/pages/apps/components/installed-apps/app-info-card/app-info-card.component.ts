import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { startCase } from 'lodash';
import { filter } from 'rxjs';
import helptext from 'app/helptext/apps/apps';
import { UpgradeSummary } from 'app/interfaces/application.interface';
import { ChartReleaseEvent } from 'app/interfaces/chart-release-event.interface';
import { ChartRelease } from 'app/interfaces/chart-release.interface';
import { EntityJobComponent } from 'app/modules/entity/entity-job/entity-job.component';
import { EntityUtils } from 'app/modules/entity/utils';
import { ChartUpgradeDialogComponent } from 'app/pages/apps-old/dialogs/chart-upgrade/chart-upgrade-dialog.component';
import { ChartUpgradeDialogConfig } from 'app/pages/apps-old/interfaces/chart-upgrade-dialog-config.interface';
import { ApplicationsService } from 'app/pages/apps/services/applications.service';
import { RedirectService, AppLoaderService, DialogService } from 'app/services';

@UntilDestroy()
@Component({
  selector: 'ix-app-info-card',
  templateUrl: './app-info-card.component.html',
  styleUrls: ['./app-info-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppInfoCardComponent {
  @Input() app: ChartRelease;
  @Input() events: ChartReleaseEvent[];

  constructor(
    private appLoaderService: AppLoaderService,
    private redirect: RedirectService,
    private appService: ApplicationsService,
    private matDialog: MatDialog,
    private dialogService: DialogService,
    private translate: TranslateService,
  ) {}

  portalName(name = 'web_portal'): string {
    return startCase(name);
  }

  portalLink(chart: ChartRelease, name = 'web_portal'): void {
    this.redirect.openWindow(chart.portals[name][0]);
  }

  updateButtonPressed(): void {
    const name = this.app.name;

    this.appLoaderService.open();
    this.appService.getChartUpgradeSummary(name).pipe(untilDestroyed(this)).subscribe({
      next: (summary: UpgradeSummary) => {
        this.appLoaderService.close();

        const dialogRef = this.matDialog.open(ChartUpgradeDialogComponent, {
          width: '50vw',
          minWidth: '500px',
          maxWidth: '750px',
          data: {
            appInfo: this.app,
            upgradeSummary: summary,
          } as ChartUpgradeDialogConfig,
        });
        dialogRef.afterClosed().pipe(
          filter(Boolean),
          untilDestroyed(this),
        ).subscribe((version: string) => {
          const jobDialogRef = this.matDialog.open(EntityJobComponent, {
            data: {
              title: helptext.charts.upgrade_dialog.job,
            },
          });
          jobDialogRef.componentInstance.setCall('chart.release.upgrade', [name, { item_version: version }]);
          jobDialogRef.componentInstance.submit();
          jobDialogRef.componentInstance.success.pipe(untilDestroyed(this)).subscribe(() => {
            this.dialogService.closeAllDialogs();
            // this.refreshChartReleases();
          });
          jobDialogRef.componentInstance.failure.pipe(untilDestroyed(this)).subscribe((error) => {
            this.dialogService.closeAllDialogs();
            new EntityUtils().handleWsError(this, error, this.dialogService);
          });
        });
      },
      error: (error) => {
        this.appLoaderService.close();
        this.dialogService.errorReportMiddleware(error);
      },
    });
  }

  deleteButtonPressed(): void {
    const name = this.app.name;

    this.dialogService.confirm({
      title: helptext.charts.delete_dialog.title,
      message: this.translate.instant('Delete {name}?', { name }),
      secondaryCheckbox: true,
      secondaryCheckboxText: this.translate.instant('Delete docker images used by the app'),
    })
      .pipe(untilDestroyed(this))
      .subscribe((result) => {
        if (!result.confirmed) {
          return;
        }

        const deleteUnusedImages = result.secondaryCheckbox;
        if (result.secondaryCheckbox) {
          this.appLoaderService.open();
          this.appService.getChartReleaesUsingChartReleaseImages(name)
            .pipe(untilDestroyed(this))
            .subscribe((imagesNotTobeDeleted) => {
              this.appLoaderService.close();
              const imageNames = Object.keys(imagesNotTobeDeleted);
              if (imageNames.length > 0) {
                const imageMessage = imageNames.reduce((prev: string, current: string) => {
                  return prev + '<li>' + current + '</li>';
                }, '<ul>') + '</ul>';
                this.dialogService.confirm({
                  title: this.translate.instant('Images not to be deleted'),
                  message: this.translate.instant('These images will not be removed as there are other apps which are consuming them')
              + imageMessage,
                  disableClose: true,
                  buttonText: this.translate.instant('OK'),
                }).pipe(filter(Boolean), untilDestroyed(this))
                  .subscribe(() => {
                    this.executeDelete(name, deleteUnusedImages);
                  });
              } else {
                this.executeDelete(name, deleteUnusedImages);
              }
            });
        } else {
          this.executeDelete(name, deleteUnusedImages);
        }
      });
  }

  executeDelete(name: string, deleteUnusedImages: boolean): void {
    const dialogRef = this.matDialog.open(EntityJobComponent, {
      data: {
        title: helptext.charts.delete_dialog.job,
      },
    });
    dialogRef.componentInstance.setCall('chart.release.delete', [name, { delete_unused_images: deleteUnusedImages }]);
    dialogRef.componentInstance.submit();
    dialogRef.componentInstance.success.pipe(untilDestroyed(this)).subscribe(() => {
      this.dialogService.closeAllDialogs();
      // this.refreshChartReleases();
    });
  }
}
