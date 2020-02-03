import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { ImageFile, getPixel } from '../../../data-files/models/data-file';

@Component({
  selector: 'app-image-viewer-status-bar',
  templateUrl: './image-viewer-status-bar.component.html',
  styleUrls: ['./image-viewer-status-bar.component.css']
})
export class ImageViewerStatusBarComponent implements OnInit, OnChanges {
  @Input() imageFile: ImageFile;
  @Input() imageMouseX: number;
  @Input() imageMouseY: number;

  raHours: number;
  decDegs: number;
  pixelValue: number;


  constructor() { }

  ngOnInit() {
  }

  ngOnChanges() {
    if(this.imageMouseX == null || this.imageMouseY == null || !this.imageFile) {
      this.pixelValue = null;
      this.raHours = null;
      this.decDegs = null;
      return;
    }
  
    if(this.imageFile.headerLoaded) {
      this.pixelValue = getPixel(this.imageFile, this.imageMouseX, this.imageMouseY);
      if(this.imageFile.wcs.isValid()) {
        let wcs = this.imageFile.wcs;
        let raDec = wcs.pixToWorld([this.imageMouseX, this.imageMouseY]);
        this.raHours = raDec[0];
        this.decDegs = raDec[1];
      }
      else {
        this.raHours = null;
        this.decDegs = null;
      }
    }
    
  }
}
