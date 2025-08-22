import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

export const MATERIAL_IMPORTS = [
  FormsModule,
  MatFormFieldModule,
  MatInputModule,
  MatIconModule,
  MatButtonModule,
] as const;