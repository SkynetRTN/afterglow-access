import { PipeTransform, Pipe } from '@angular/core';

import { DataFile } from '../data-files/models/data-file'

@Pipe({
  name: 'filteredFiles',
  pure: false
})
export class FilteredFilesPipe implements PipeTransform {
  transform(files: DataFile[], filter: string): any {
    return files.filter(file => file.name.toLowerCase().indexOf(filter.toLocaleLowerCase()) !== -1);
  }
}