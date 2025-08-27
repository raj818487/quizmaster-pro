import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'split',
  standalone: true
})
export class SplitPipe implements PipeTransform {
  transform(value: string, delimiter: string = ','): string[] {
    if (!value) return [];
    return value.split(delimiter);
  }
}
