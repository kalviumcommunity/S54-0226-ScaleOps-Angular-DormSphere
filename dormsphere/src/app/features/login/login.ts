import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, switchMap, throwError, timer } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {
  private static readonly API_LOGIN_PATH = '/api/login';
  private static readonly API_LOGIN_FALLBACK_URL = 'http://localhost:8001/api/login';

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

    timer(550)
      .pipe(
        switchMap(() =>
          this.http.post(Login.API_LOGIN_PATH, payload).pipe(
            catchError((error: { status?: number }) => {
              if (error?.status !== 404) {
                return throwError(() => error);
              }

              return this.http.post(Login.API_LOGIN_FALLBACK_URL, payload);
            }),
          ),
        ),
        finalize(() => {
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