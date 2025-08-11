"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/supabase/client";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Sync session cookies to the server so middleware sees the auth state
        const sessionRes = await supabase.auth.getSession();
        const at = sessionRes.data.session?.access_token;
        const rt = sessionRes.data.session?.refresh_token;
        if (at && rt) {
          await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: at, refreshToken: rt }),
          }).catch(() => {});
        }
        setSuccess(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Ocorreu um erro inesperado. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold">PokerPro</span>
          </div>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <Card className="bg-slate-800 border-slate-700 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Entrar na Conta
              </CardTitle>
              <CardDescription className="text-slate-300">
                Acesse sua conta para jogar poker profissional
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200 font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-slate-200 font-medium"
                  >
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) =>
                        setRememberMe(checked as boolean)
                      }
                      className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm text-slate-300 cursor-pointer"
                    >
                      Lembrar de mim
                    </Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>

                {/* Error and Success Messages */}
                {error && (
                  <div className="bg-red-900/20 border border-red-700/50 p-4 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-900/20 border border-green-700/50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <p className="text-green-400 text-sm">
                        Login realizado com sucesso! Redirecionando...
                      </p>
                    </div>
                  </div>
                )}

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Entrando...</span>
                    </div>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-slate-400">ou</span>
                </div>
              </div>

              {/* Sign Up Link */}
              <div className="text-center">
                <p className="text-slate-300">
                  Não tem uma conta?{" "}
                  <Link
                    href="/register"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    Criar conta grátis
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 text-sm text-slate-400">
              <Shield className="h-4 w-4" />
              <span>Conexão segura com criptografia SSL</span>
            </div>
          </div>

          {/* Support Links */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-slate-400 text-sm">Precisa de ajuda?</p>
            <div className="flex justify-center space-x-4 text-sm">
              <Link
                href="/support"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Suporte 24/7
              </Link>
              <span className="text-slate-600">•</span>
              <Link
                href="/help"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Central de Ajuda
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-400">
          <p>
            &copy; 2024 PokerPro. Todos os direitos reservados. Jogue com
            responsabilidade. +18 anos.
          </p>
        </div>
      </footer>
    </div>
  );
}
