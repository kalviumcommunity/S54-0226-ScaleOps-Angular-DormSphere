import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, switchMap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {
  private static readonly API_LOGIN_PATH = `${environment.apiUrl}/api/login`;

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  showPassword = false;
  loading = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.loading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.loginForm.getRawValue();

    timer(550) // Artificial delay to prevent loading state flickering on fast requests.
      .pipe(
        switchMap(() => this.http.post(Login.API_LOGIN_PATH, payload)),
        finalize(() => {
          // Push the loading reset to the next tick to avoid NG0100 in dev mode
          // when finalize runs during the same change-detection turn.
          setTimeout(() => {
            this.loading = false;
          });
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          // Error toast is handled globally by toast interceptor.
        },
      });
  }
}