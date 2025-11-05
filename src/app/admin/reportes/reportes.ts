import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']   // ← OJO: era "styleUrls" (en plural)
})
export class Reportes {
  hoy = new Date();  // ← propiedad usada en el HTML
}
