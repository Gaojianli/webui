import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { MockComponent } from 'ng-mocks';
import { AvailableApp } from 'app/interfaces/available-app.interfase';
import { AppCardLogoComponent } from 'app/pages/apps/components/app-card-logo/app-card-logo.component';
import { AppCardComponent } from 'app/pages/apps/components/available-apps/app-card/app-card.component';

describe('AppCardComponent', () => {
  let spectator: Spectator<AppCardComponent>;
  const createComponent = createComponentFactory({
    component: AppCardComponent,
    declarations: [
      MockComponent(AppCardLogoComponent),
    ],
  });

  beforeEach(() => {
    spectator = createComponent({
      props: {
        app: {
          name: 'SETI@home',
          icon_url: 'https://www.seti.org/logo.png',
          app_readme: 'Use your computer to help SETI@home search for extraterrestrial intelligence.',
          latest_version: '1.0.0',
          catalog: 'official',
          train: 'charts',
        } as AvailableApp,
      },
    });
  });

  it('shows app name', () => {
    expect(spectator.query('.name')).toHaveExactText('SETI@home');
  });

  it('shows app logo', () => {
    expect(spectator.query(AppCardLogoComponent).url).toBe('https://www.seti.org/logo.png');
  });

  it('shows installed badge when [installed] is true', () => {
    spectator.setInput({ installed: true });
    expect(spectator.query('.installed-badge')).toExist();
  });

  it('shows app description', () => {
    const description = spectator.query('.description');
    expect(description).toHaveExactText('Use your computer to help SETI@home search for extraterrestrial intelligence.');
  });

  it('shows catalog name', () => {
    expect(spectator.query('.catalog')).toHaveText('Official');
  });

  it('shows train name', () => {
    expect(spectator.query('.train')).toHaveExactText('Train: charts');
  });

  it('shows app version', () => {
    expect(spectator.query('.version')).toHaveExactText('v1.0.0');
  });
});
