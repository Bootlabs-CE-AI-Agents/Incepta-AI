"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const errorParam = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else if (result?.ok) {
        router.push("/dashboard");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="glass-card p-8">
          <h2 className="text-center text-h2 font-bold text-text-primary">
            AI Agents Platform
          </h2>
          <p className="mt-2 text-center text-caption text-text-secondary">
            Sign in to your account
          </p>

          {errorParam === "Configuration" && (
            <div className="mt-4 rounded-md bg-accent-orange/10 p-4 border border-accent-orange/30">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-accent-orange">
                    Configuration Error
                  </h3>
                  <div className="mt-2 text-sm text-accent-orange/80">
                    <p>NextAuth is not properly configured. Please contact your administrator.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md bg-red-500/10 p-4 border border-red-500/30">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-500">
                    Authentication Error
                  </h3>
                  <div className="mt-2 text-sm text-red-500/80">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-4 py-3 border border-white/50 placeholder-text-secondary text-text-primary rounded-t-md focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue focus:z-10 text-body bg-white/50 backdrop-blur-glass"
                  placeholder="Username"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-4 py-3 border border-white/50 placeholder-text-secondary text-text-primary rounded-b-md focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue focus:z-10 text-body bg-white/50 backdrop-blur-glass"
                  placeholder="Password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-body font-medium rounded-md text-white bg-accent-blue hover:bg-accent-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-fast shadow-sm hover:shadow-md"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <div className="text-center mt-6">
            <p className="text-caption text-text-secondary">
              Default credentials: admin@example.com / adminadminadmin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
