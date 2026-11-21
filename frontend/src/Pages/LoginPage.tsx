import React, { useState } from 'react';
import { login } from '@/api/client';
import { Button, Card, CardHeader, TextInput, ThemeToggle } from '@/components/ui';

export interface LoginPageProps {
  onAuthenticated: (token: string, developmentMode: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [developmentMode, setDevelopmentMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await login({
        email: email.trim(),
        password,
        device_name: 'erp-web',
      });
      onAuthenticated(response.data.token, developmentMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle showLabel />
      </div>
      <Card className="w-full max-w-md" aria-label="Login ERP FoodLab">
        <CardHeader
          eyebrow="ENTERPRISE RESOURCE PLANNING"
          title="Masuk ke ERP FoodLab"
          subtitle="Gunakan akun ERP untuk mengakses data perusahaan."
        />

        <form
          className="flex flex-col gap-4 px-6 pb-6"
          onSubmit={handleSubmit}
          data-testid="login-form"
        >
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <TextInput
            id="login-email"
            label="Email"
            type="email"
            autoComplete="username"
            placeholder="admin@foodlab.test"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <TextInput
            id="login-password"
            label="Kata Sandi"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <label
            htmlFor="login-development-mode"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 p-3"
          >
            <input
              id="login-development-mode"
              type="checkbox"
              checked={developmentMode}
              onChange={(event) => setDevelopmentMode(event.target.checked)}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Mode pengembangan
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Buka simulator alur sistem setelah login.
              </span>
            </span>
          </label>

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
