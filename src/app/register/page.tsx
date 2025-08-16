"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();
  const router = useRouter();

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",

    // Step 2: Account Security
    password: "",
    confirmPassword: "",

    // Step 3: Address & Verification
    address: "",
    city: "",
    state: "",
    zipCode: "",

    // Step 4: Agreements
    agreeTerms: false,
    agreePrivacy: false,
    agreeAge: false,
    agreeResponsible: false,
    marketingEmails: false,
  });

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If not on the final step, go to next step instead of submitting
    if (currentStep < 4) {
      if (isStepValid(currentStep)) {
        handleNext();
      }
      return;
    }

    // Only run registration logic on the final step
    setIsLoading(true);
    setError(null);

    try {
      // Create user metadata from form data
      const metadata = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        marketingEmails: formData.marketingEmails,
      };

      const { user, error: authError } = await signUp(
        formData.email,
        formData.password,
        metadata
      );

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (user) {
        setSuccess(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Ocorreu um erro inesperado. Tente novamente.");
      setIsLoading(false);
    }
  };

  const brazilianStates = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ];

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return (
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.phone &&
          formData.dateOfBirth
        );
      case 2:
        return (
          formData.password &&
          formData.confirmPassword &&
          formData.password === formData.confirmPassword
        );
      case 3:
        return (
          formData.address &&
          formData.city &&
          formData.state &&
          formData.zipCode
        );
      case 4:
        return (
          formData.agreeTerms &&
          formData.agreePrivacy &&
          formData.agreeAge &&
          formData.agreeResponsible
        );
      default:
        return false;
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
            <Image
              src="/all-in.svg"
              alt="ALL IN"
              width={114}
              height={32}
              priority
            />
          </div>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step <= currentStep
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {step < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step
                    )}
                  </div>
                  {step < 4 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        step < currentStep ? "bg-emerald-600" : "bg-slate-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center text-sm text-slate-400">
              Passo {currentStep} de 4
            </div>
          </div>

          {/* Registration Card */}
          <Card className="bg-slate-800 border-slate-700 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-white">
                {currentStep === 1 && "Informações Pessoais"}
                {currentStep === 2 && "Segurança da Conta"}
                {currentStep === 3 && "Endereço e Verificação"}
                {currentStep === 4 && "Termos e Condições"}
              </CardTitle>
              <CardDescription className="text-slate-300">
                {currentStep === 1 && "Preencha seus dados básicos"}
                {currentStep === 2 && "Crie uma senha segura"}
                {currentStep === 3 && "Confirme seu endereço"}
                {currentStep === 4 && "Aceite os termos para finalizar"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="firstName"
                          className="text-slate-200 font-medium"
                        >
                          Nome *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="Seu nome"
                            value={formData.firstName}
                            onChange={(e) =>
                              updateFormData("firstName", e.target.value)
                            }
                            className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="lastName"
                          className="text-slate-200 font-medium"
                        >
                          Sobrenome *
                        </Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Seu sobrenome"
                          value={formData.lastName}
                          onChange={(e) =>
                            updateFormData("lastName", e.target.value)
                          }
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-slate-200 font-medium"
                      >
                        Email *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) =>
                            updateFormData("email", e.target.value)
                          }
                          className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-slate-200 font-medium"
                      >
                        Telefone *
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={formData.phone}
                          onChange={(e) =>
                            updateFormData("phone", e.target.value)
                          }
                          className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="dateOfBirth"
                        className="text-slate-200 font-medium"
                      >
                        Data de Nascimento *
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) =>
                            updateFormData("dateOfBirth", e.target.value)
                          }
                          className="pl-10 bg-slate-700 border-slate-600 text-white focus:border-emerald-500 focus:ring-emerald-500 hide-date-icon"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Account Security */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className="text-slate-200 font-medium"
                      >
                        Senha *
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Crie uma senha segura"
                          value={formData.password}
                          onChange={(e) =>
                            updateFormData("password", e.target.value)
                          }
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
                      <div className="text-xs text-slate-400 mt-1">
                        Mínimo 8 caracteres, incluindo letras, números e
                        símbolos
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmPassword"
                        className="text-slate-200 font-medium"
                      >
                        Confirmar Senha *
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirme sua senha"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            updateFormData("confirmPassword", e.target.value)
                          }
                          className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {formData.password &&
                        formData.confirmPassword &&
                        formData.password !== formData.confirmPassword && (
                          <div className="text-xs text-red-400 mt-1">
                            As senhas não coincidem
                          </div>
                        )}
                    </div>

                    <div className="bg-slate-700/50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-white mb-2">
                        Requisitos de Segurança:
                      </h4>
                      <ul className="text-xs text-slate-300 space-y-1">
                        <li>• Mínimo de 8 caracteres</li>
                        <li>• Pelo menos uma letra maiúscula</li>
                        <li>• Pelo menos um número</li>
                        <li>• Pelo menos um símbolo especial</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Step 3: Address & Verification */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="address"
                        className="text-slate-200 font-medium"
                      >
                        Endereço Completo *
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="address"
                          type="text"
                          placeholder="Rua, número, complemento"
                          value={formData.address}
                          onChange={(e) =>
                            updateFormData("address", e.target.value)
                          }
                          className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="city"
                          className="text-slate-200 font-medium"
                        >
                          Cidade *
                        </Label>
                        <Input
                          id="city"
                          type="text"
                          placeholder="Sua cidade"
                          value={formData.city}
                          onChange={(e) =>
                            updateFormData("city", e.target.value)
                          }
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="state"
                          className="text-slate-200 font-medium"
                        >
                          Estado *
                        </Label>
                        <Select
                          value={formData.state}
                          onValueChange={(value) =>
                            updateFormData("state", value)
                          }
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            {brazilianStates.map((state) => (
                              <SelectItem
                                key={state}
                                value={state}
                                className="text-white hover:bg-slate-600"
                              >
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="zipCode"
                        className="text-slate-200 font-medium"
                      >
                        CEP *
                      </Label>
                      <Input
                        id="zipCode"
                        type="text"
                        placeholder="00000-000"
                        value={formData.zipCode}
                        onChange={(e) =>
                          updateFormData("zipCode", e.target.value)
                        }
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div className="bg-blue-900/20 border border-blue-700/50 p-4 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-blue-400 mb-1">
                            Verificação de Identidade
                          </h4>
                          <p className="text-xs text-slate-300">
                            Após o cadastro, você precisará enviar documentos
                            para verificação da conta conforme exigências
                            regulamentares.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Terms and Conditions */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="agreeTerms"
                          checked={formData.agreeTerms}
                          onCheckedChange={(checked) =>
                            updateFormData("agreeTerms", checked as boolean)
                          }
                          className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 mt-1"
                        />
                        <Label
                          htmlFor="agreeTerms"
                          className="text-sm text-slate-300 cursor-pointer leading-relaxed"
                        >
                          Eu li e aceito os{" "}
                          <Link
                            href="/terms"
                            className="text-emerald-400 hover:text-emerald-300 underline"
                          >
                            Termos de Uso
                          </Link>{" "}
                          da plataforma *
                        </Label>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="agreePrivacy"
                          checked={formData.agreePrivacy}
                          onCheckedChange={(checked) =>
                            updateFormData("agreePrivacy", checked as boolean)
                          }
                          className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 mt-1"
                        />
                        <Label
                          htmlFor="agreePrivacy"
                          className="text-sm text-slate-300 cursor-pointer leading-relaxed"
                        >
                          Eu aceito a{" "}
                          <Link
                            href="/privacy"
                            className="text-emerald-400 hover:text-emerald-300 underline"
                          >
                            Política de Privacidade
                          </Link>{" "}
                          *
                        </Label>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="agreeAge"
                          checked={formData.agreeAge}
                          onCheckedChange={(checked) =>
                            updateFormData("agreeAge", checked as boolean)
                          }
                          className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 mt-1"
                        />
                        <Label
                          htmlFor="agreeAge"
                          className="text-sm text-slate-300 cursor-pointer leading-relaxed"
                        >
                          Confirmo que tenho mais de 18 anos e sou legalmente
                          capaz de participar de jogos de poker *
                        </Label>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="agreeResponsible"
                          checked={formData.agreeResponsible}
                          onCheckedChange={(checked) =>
                            updateFormData(
                              "agreeResponsible",
                              checked as boolean
                            )
                          }
                          className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 mt-1"
                        />
                        <Label
                          htmlFor="agreeResponsible"
                          className="text-sm text-slate-300 cursor-pointer leading-relaxed"
                        >
                          Comprometo-me a jogar de forma responsável e dentro
                          dos meus limites financeiros *
                        </Label>
                      </div>

                      <div className="border-t border-slate-600 pt-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="marketingEmails"
                            checked={formData.marketingEmails}
                            onCheckedChange={(checked) =>
                              updateFormData(
                                "marketingEmails",
                                checked as boolean
                              )
                            }
                            className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 mt-1"
                          />
                          <Label
                            htmlFor="marketingEmails"
                            className="text-sm text-slate-300 cursor-pointer leading-relaxed"
                          >
                            Desejo receber emails sobre promoções, torneios e
                            novidades da plataforma (opcional)
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                        Conta criada com sucesso! Redirecionando para o
                        dashboard...
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                    >
                      Anterior
                    </Button>
                  )}

                  {currentStep < 4 ? (
                    <Button
                      type="submit"
                      disabled={!isStepValid(currentStep)}
                      className="bg-emerald-600 hover:bg-emerald-700 ml-auto"
                    >
                      Próximo
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!isStepValid(currentStep) || isLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 ml-auto"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Criando conta...</span>
                        </div>
                      ) : (
                        "Criar Conta"
                      )}
                    </Button>
                  )}
                </div>
              </form>

              {/* Login Link */}
              <div className="text-center mt-6 pt-6 border-t border-slate-600">
                <p className="text-slate-300">
                  Já tem uma conta?{" "}
                  <Link
                    href="/login"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    Fazer login
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 text-sm text-slate-400">
              <Shield className="h-4 w-4" />
              <span>Seus dados estão protegidos com criptografia SSL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-400">
          <p>
            &copy; 2024 ALL IN. Todos os direitos reservados. Jogue com
            responsabilidade. +18 anos.
          </p>
        </div>
      </footer>
    </div>
  );
}
