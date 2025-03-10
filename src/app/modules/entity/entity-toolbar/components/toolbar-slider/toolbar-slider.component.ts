import {
  Component, EventEmitter, Input, Output,
} from '@angular/core';

@Component({
  selector: 'ix-toolbar-slider',
  styleUrls: ['./toolbar.component.scss'],
  templateUrl: './toolbar-slider.component.html',
})
export class ToolbarSliderComponent {
  @Input() value?: number;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step? = 1;
  @Input() label?: string;
  @Input() name: string;
  @Output() valueChange = new EventEmitter<number>();

  onChange(updatedValue: string): void {
    this.value = +updatedValue;
    this.valueChange.emit(this.value);
  }
}
