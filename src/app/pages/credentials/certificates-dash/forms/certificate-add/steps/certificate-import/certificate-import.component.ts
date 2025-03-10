import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import _ from 'lodash';
import { Observable, of } from 'rxjs';
import { helptextSystemCertificates } from 'app/helptext/system/certificates';
import { Certificate } from 'app/interfaces/certificate.interface';
import { Option } from 'app/interfaces/option.interface';
import { SummaryProvider, SummarySection } from 'app/modules/common/summary/summary.interface';
import { matchOtherValidator } from 'app/modules/entity/entity-form/validators/password-validation/password-validation';
import { EntityUtils } from 'app/modules/entity/utils';
import { getCertificatePreview } from 'app/pages/credentials/certificates-dash/utils/get-certificate-preview.utils';
import { DialogService, WebSocketService } from 'app/services';

@UntilDestroy()
@Component({
  selector: 'ix-certificate-import',
  templateUrl: './certificate-import.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateImportComponent implements OnInit, SummaryProvider {
  form = this.formBuilder.group({
    csrExistsOnSystem: [false],
    csr: [null as number],
    certificate: [''],
    privatekey: [''],
    passphrase: ['', [matchOtherValidator('passphrase2')]],
    passphrase2: [''],
  });

  csrs: Certificate[] = [];
  csrOptions$: Observable<Option[]> = of([]);

  readonly helptext = helptextSystemCertificates;

  constructor(
    private formBuilder: FormBuilder,
    private translate: TranslateService,
    private ws: WebSocketService,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef,
  ) {}

  get csrExists(): boolean {
    return this.form.controls.csrExistsOnSystem.value;
  }

  get selectedCsr(): Certificate | undefined {
    return this.csrs.find((csr) => csr.id === this.form.value.csr);
  }

  ngOnInit(): void {
    this.loadCsrs();
    this.setFieldValidators();
  }

  getSummary(): SummarySection {
    const values = this.form.value;
    const certificatePreview = getCertificatePreview(values.certificate);

    const summary: SummarySection = [];

    if (this.form.value.csrExistsOnSystem) {
      summary.push({
        label: this.translate.instant('Using CSR'),
        value: this.selectedCsr.name,
      });
    }

    summary.push({
      label: this.translate.instant('Certificate'),
      value: certificatePreview,
    });

    if (values.passphrase || this.selectedCsr?.passphrase) {
      summary.push({ label: 'Passphrase', value: 'With passphrase' });
    }

    return summary;
  }

  getPayload(): Omit<CertificateImportComponent['form']['value'], 'csrExistsOnSystem' | 'passphrase2'> {
    const values = this.form.value;

    if (this.csrExists) {
      return {
        certificate: values.certificate,
        privatekey: this.selectedCsr?.privatekey,
        passphrase: this.selectedCsr?.passphrase,
      };
    }

    return _.pick(values, ['certificate', 'privatekey', 'passphrase']);
  }

  private loadCsrs(): void {
    this.ws.call('certificate.query', [[['CSR', '!=', null]]])
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (csrs) => {
          this.csrs = csrs;
          this.csrOptions$ = of(
            csrs.map((csr) => ({
              label: csr.name,
              value: csr.id,
            })),
          );
          this.cdr.markForCheck();
        },
        error: (error) => {
          new EntityUtils().handleWsError(this, error, this.dialogService);
        },
      });
  }

  private setFieldValidators(): void {
    this.form.controls.csrExistsOnSystem.valueChanges
      .pipe(untilDestroyed(this))
      .subscribe((csrExists) => {
        if (csrExists) {
          this.form.controls.privatekey.setValidators(null);
          this.form.controls.csr.setValidators([Validators.required]);
        } else {
          this.form.controls.certificate.setValidators([Validators.required]);
          this.form.controls.csr.setValidators(null);
        }

        this.form.controls.privatekey.updateValueAndValidity();
        this.form.controls.csr.updateValueAndValidity();
      });
  }
}
