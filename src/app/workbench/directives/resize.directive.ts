/** https://github.com/mohit1325/flex-resize-demo/blob/master/src/app/directives/resize.directive.ts */

import { Directive, Input, HostListener, ElementRef } from '@angular/core';
@Directive({
  selector: '[appResize]'
})
export class ResizeDirective {
  @Input('leftElement') leftElement: HTMLElement;
  @Input('rightElement') rightElement: HTMLElement;
  @Input('resizeLeft') resizeLeft: boolean = true;
  grabber: boolean = false;
  width: number;
  x: number = 0;
  y: number = 0;
  leftWidth: number = 0;
  rightWidth: number = 0;
  constructor(private el: ElementRef<HTMLElement>) { }
  @HostListener('window:resize', ['$event']) onResize(event) {
    this.width = event.target.outerWidth;
  }
  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent) {
    if (this.leftElement && this.rightElement) {
      this.grabber = true;
      this.el.nativeElement.classList.add('side-panel');
      document.body.style.cursor = 'e-resize';
      this.x = event.clientX;
      this.y = event.clientY;
      this.leftWidth = this.leftElement.getBoundingClientRect().width;
      this.rightWidth = this.rightElement.getBoundingClientRect().width;
    }

  }

  @HostListener('window:mouseup') onMouseUp() {
    this.grabber = false;
    this.el.nativeElement.classList.remove('side-panel');
    document.body.style.cursor = 'default';
  }

  @HostListener('window:mousemove', ['$event']) onMouseMove(event: MouseEvent) {
    if (this.grabber) {
      event.preventDefault();
      const dx = event.clientX - this.x;
      const dy = event.clientY - this.y;

      if (this.resizeLeft) {
        const newLeftWidth = ((this.leftWidth + dx) * 100) / (this.el.nativeElement.parentNode as HTMLElement).getBoundingClientRect().width;
        this.leftElement.style.width = `${newLeftWidth}%`;
        this.leftElement.style.flex = '';
        this.rightElement.style.flex = '1 1 0%';
        this.rightElement.style.width = '';
        console.log(newLeftWidth)
      }
      else {
        const newRightWidth = ((this.rightWidth - dx) * 100) / (this.el.nativeElement.parentNode as HTMLElement).getBoundingClientRect().width;
        this.rightElement.style.width = `${newRightWidth}%`;
        this.rightElement.style.flex = '';
        this.leftElement.style.flex = '1 1 0%';
        this.leftElement.style.width = '';
      }

      // if (event.movementX > 0) {
      //   this.rightElement.style.flex = `0 5 ${(this.width || window.screen.availWidth) - event.clientX + 100}px`;
      //   this.leftElement.style.flex = `1 5 ${event.clientX - 16}px`;
      // } else {
      //   this.leftElement.style.flex = `0 5 ${event.clientX - 16}px`;
      //   this.rightElement.style.flex = `1 5 ${(this.width || window.screen.availWidth) - event.clientX + 100}px`;
      // }
    }
  }
}