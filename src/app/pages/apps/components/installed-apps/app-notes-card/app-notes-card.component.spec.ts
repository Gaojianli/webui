import { Spectator } from '@ngneat/spectator';
import { createComponentFactory } from '@ngneat/spectator/jest';
import { ChartRelease } from 'app/interfaces/chart-release.interface';
import { AppNotesCardComponent } from './app-notes-card.component';

describe('AppNotesCardComponent', () => {
  let spectator: Spectator<AppNotesCardComponent>;

  const app = {
    id: 'ix-test-app',
    name: 'test-app',
    chart_metadata: {
      name: 'test-app',
    },
    update_available: true,
  } as ChartRelease;

  const createComponent = createComponentFactory({
    component: AppNotesCardComponent,
    declarations: [],
    providers: [],
  });

  beforeEach(() => {
    spectator = createComponent({
      props: {
        app,
      },
    });
  });

  it('shows header', () => {
    expect(spectator.query('mat-card-header h3')).toHaveText('Notes');
  });
});
