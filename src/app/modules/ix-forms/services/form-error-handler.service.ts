import { Injectable } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormGroup } from '@angular/forms';
import { ResponseErrorType } from 'app/enums/response-error-type.enum';
import { Job } from 'app/interfaces/job.interface';
import { WebsocketError } from 'app/interfaces/websocket-error.interface';
import { EntityUtils } from 'app/modules/entity/utils';
import { DialogService } from 'app/services';

@Injectable({ providedIn: 'root' })
export class FormErrorHandlerService {
  constructor(
    private dialog: DialogService,
  ) {}

  /**
   * @param error
   * @param formGroup
   * @param fieldsMap Overrides backend field names with frontend field names.
   * TODO: See if second `string` in fieldsMap can be typed to key of formGroup.
   */
  handleWsFormError(
    error: WebsocketError | Job,
    formGroup: UntypedFormGroup,
    fieldsMap: Record<string, string> = {},
  ): void {
    if ('type' in error && error.type === ResponseErrorType.Validation && error.extra) {
      this.handleValidationError(error, formGroup, fieldsMap);
      return;
    }

    if ('exc_info' in error && error.exc_info.type === ResponseErrorType.Validation && error.exc_info.extra) {
      this.handleValidationError({ ...error, extra: error.exc_info.extra as Job['extra'] }, formGroup, fieldsMap);
      return;
    }

    // Fallback to old error handling
    (new EntityUtils()).errorReport(error, this.dialog);
  }

  private handleValidationError(
    error: WebsocketError | Job,
    formGroup: UntypedFormGroup,
    fieldsMap: Record<string, string>,
  ): void {
    for (const extraItem of (error as WebsocketError).extra) {
      const field = extraItem[0].split('.')[1];
      const errorMessage = extraItem[1];

      let control = this.getFormField(formGroup, field, fieldsMap);

      if (!control) {
        console.error(`Could not find control ${field}.`);
        // Fallback to default modal error message.
        (new EntityUtils()).errorReport(error, this.dialog);
        return;
      }

      if ((control as UntypedFormArray).controls?.length) {
        const isExactMatch = (text: string, match: string): boolean => new RegExp(`\\b${match}\\b`).test(text);

        control = (control as UntypedFormArray).controls
          .find((controlOfArray) => isExactMatch(errorMessage, controlOfArray.value));
      }

      control.setErrors({
        manualValidateError: true,
        manualValidateErrorMsg: errorMessage,
        ixManualValidateError: { message: errorMessage },
      });

      control.markAsTouched();
    }
  }

  private getFormField(formGroup: UntypedFormGroup, field: string, fieldsMap: Record<string, string>): AbstractControl {
    const fieldName = fieldsMap[field] ?? field;
    return formGroup.get(fieldName);
  }
}
