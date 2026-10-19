import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: `<h1>Hello, {{ name }}!</h1>`,
})
export class GreetingComponent {
  @Input() name = 'world';
}
