import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { AppsFiltersValues } from 'app/interfaces/apps-filters-values.interface';
import { AvailableApp } from 'app/interfaces/available-app.interfase';
import { AppLoaderService } from 'app/modules/loader/app-loader.service';
import { ApplicationsService } from 'app/pages/apps/services/applications.service';
import { LayoutService } from 'app/services/layout.service';

interface AppSection {
  title: string;
  totalApps: number;
  apps$: BehaviorSubject<AvailableApp[]>;
  fetchMore?: () => void;
}

@UntilDestroy()
@Component({
  templateUrl: './available-apps.component.html',
  styleUrls: ['./available-apps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailableAppsComponent implements OnInit, AfterViewInit {
  @ViewChild('pageHeader') pageHeader: TemplateRef<unknown>;

  apps: AvailableApp[] = [];
  filters: AppsFiltersValues = {
    search: '',
    catalogs: [],
    sort: undefined,
    categories: [],
  };

  allRecommendedApps: AvailableApp[] = [];
  allNewAndUpdatedApps: AvailableApp[] = [];
  sliceAmount = 6;
  appSections: AppSection[] = [];

  recommendedApps$ = new BehaviorSubject<AvailableApp[]>([]);
  newAndUpdatedApps$ = new BehaviorSubject<AvailableApp[]>([]);

  constructor(
    private layoutService: LayoutService,
    private loader: AppLoaderService,
    private appService: ApplicationsService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  ngAfterViewInit(): void {
    this.layoutService.pageHeaderUpdater$.next(this.pageHeader);
  }

  trackByAppId(id: number, app: AvailableApp): string {
    return `${app.catalog}-${app.train}-${app.name}`;
  }

  trackByAppSectionTitle(_: number, appSection: AppSection): string {
    return `${appSection.title}`;
  }

  changeFilters(filters: AppsFiltersValues): void {
    this.filters = filters;
    this.loadApplications(true);
  }

  private loadApplications(hideLoader?: boolean): void {
    if (!hideLoader) {
      this.loader.open();
    }

    combineLatest([this.appService.getAvailableApps(this.filters), this.appService.getAllAppsCategories()])
      .pipe(untilDestroyed(this))
      .subscribe(([apps, appCategories]) => {
        this.setupApps(apps, appCategories);
        if (!hideLoader) {
          this.loader.close();
        }
        this.cdr.markForCheck();
      });
  }

  private setupApps(apps: AvailableApp[], appCategories: string[]): void {
    this.apps = apps;

    this.allRecommendedApps = this.apps.filter((app) => app.recommended);
    this.allNewAndUpdatedApps = this.apps
      .sort((a, b) => new Date(a.last_update).getTime() - new Date(b.last_update).getTime());

    this.recommendedApps$.next(this.allRecommendedApps.slice(0, this.sliceAmount));
    this.newAndUpdatedApps$.next(this.allNewAndUpdatedApps.slice(0, this.sliceAmount));

    this.appSections = [];
    this.appSections.push(
      {
        title: this.translate.instant('Recommended Apps'),
        apps$: this.recommendedApps$,
        totalApps: this.allNewAndUpdatedApps.length,
        fetchMore: () => this.recommendedApps$.next(this.allRecommendedApps),
      },
      {
        title: this.translate.instant('New & Updated Apps'),
        apps$: this.newAndUpdatedApps$,
        totalApps: this.allNewAndUpdatedApps.length,
        fetchMore: () => this.newAndUpdatedApps$.next(this.allNewAndUpdatedApps),
      },
    );

    const categories = this.filters.categories.length ? this.filters.categories : appCategories;
    categories.forEach((category) => {
      const categorizedApps = this.apps.filter((app) => app.categories.some((appCategory) => appCategory === category));

      this.appSections.push(
        {
          title: category,
          apps$: new BehaviorSubject(categorizedApps.slice(0, this.sliceAmount)),
          totalApps: categorizedApps.length,
          // TODO: Implement logic to show all apps page per category
          fetchMore: () => {},
        },
      );
    });

    this.cdr.markForCheck();
  }
}
