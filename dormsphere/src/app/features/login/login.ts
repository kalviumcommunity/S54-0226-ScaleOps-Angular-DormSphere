import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, switchMap, timer } from 'rxjs';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loginForm = this.fb.group({
    username: ['admin@university.edu', [Validators.required]],
    password: ['admin@university.edu', [Validators.required]],
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

    timer(550)
      .pipe(
        switchMap(() => this.http.post('/api/login', this.loginForm.getRawValue())),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.toast.success('Welcome Back', 'Login successful. Redirecting to dashboard...');
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 450);
        },
        error: () => {
          // Error toast is handled globally by toast interceptor.
        },
      });
  }
}