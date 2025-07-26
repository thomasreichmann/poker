import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Test } from "@/components/ui/test";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import {
  CheckCircle,
  Lock,
  Play,
  Shield,
  Star,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

export default async function PokerLandingPage() {
  await prefetch(
    trpc.hello.queryOptions({
      text: "world thomas (now with helpers!)",
    })
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <HydrateClient>
        <Test />
      </HydrateClient>
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold">PokerPro</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-slate-800 hover:text-white"
              asChild
            >
              <Link href="/login">Entrar</Link>
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              asChild
            >
              <Link href="/register">Registrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
              Plataforma Premium para Profissionais
            </Badge>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Poker Profissional
              <span className="block text-emerald-400">Dinheiro Real</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              A plataforma de poker online mais confiável do Brasil. Cash games
              e torneios de alto nível para jogadores sérios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-3"
                asChild
              >
                <Link href="/register">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Criar Conta Grátis
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 text-lg px-8 py-3 bg-transparent"
                asChild
              >
                <Link href="/login">
                  <Play className="mr-2 h-5 w-5" />
                  Jogar Agora
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Game Offerings */}
      <section className="py-16 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Modalidades de Jogo
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Escolha entre cash games de diferentes stakes ou participe de
              torneios com premiações garantidas
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Cash Games */}
            <Card className="bg-slate-800 border-slate-700 hover:border-emerald-600/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl text-white flex items-center">
                    <Users className="mr-3 h-6 w-6 text-emerald-400" />
                    Cash Games
                  </CardTitle>
                  <Badge className="bg-emerald-600/20 text-emerald-400">
                    Principal
                  </Badge>
                </div>
                <CardDescription className="text-slate-300">
                  Mesas de dinheiro real com diferentes níveis de stake
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Micro Stakes</span>
                    <span className="text-emerald-400 font-semibold">
                      R$ 0,05/0,10
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Low Stakes</span>
                    <span className="text-emerald-400 font-semibold">
                      R$ 0,25/0,50
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Mid Stakes</span>
                    <span className="text-emerald-400 font-semibold">
                      R$ 1/2 - R$ 5/10
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">High Stakes</span>
                    <span className="text-emerald-400 font-semibold">
                      R$ 25/50+
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  asChild
                >
                  <Link href="/login">Entrar nas Mesas</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Tournaments */}
            <Card className="bg-slate-800 border-slate-700 hover:border-emerald-600/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Trophy className="mr-3 h-6 w-6 text-yellow-400" />
                  Torneios
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Competições com premiações garantidas e estruturas
                  profissionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Daily Tournaments</span>
                    <span className="text-yellow-400 font-semibold">
                      R$ 10 - R$ 100
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Weekly Series</span>
                    <span className="text-yellow-400 font-semibold">
                      R$ 250 - R$ 1.000
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Monthly Major</span>
                    <span className="text-yellow-400 font-semibold">
                      R$ 2.500+
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Sit & Go</span>
                    <span className="text-yellow-400 font-semibold">
                      R$ 5 - R$ 500
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  asChild
                >
                  <Link href="/login">Ver Cronograma</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Segurança e Confiança
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Sua segurança e a integridade dos jogos são nossas prioridades
              máximas
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-800 border-slate-700 text-center">
              <CardContent className="pt-6">
                <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  Criptografia SSL
                </h3>
                <p className="text-slate-300 text-sm">
                  Proteção de dados com criptografia de nível bancário
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 text-center">
              <CardContent className="pt-6">
                <Lock className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  Fundos Segregados
                </h3>
                <p className="text-slate-300 text-sm">
                  Seu dinheiro protegido em contas separadas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 text-center">
              <CardContent className="pt-6">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  Jogo Justo
                </h3>
                <p className="text-slate-300 text-sm">
                  RNG certificado e auditoria independente
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 text-center">
              <CardContent className="pt-6">
                <Star className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  Licenciado
                </h3>
                <p className="text-slate-300 text-sm">
                  Operação totalmente licenciada e regulamentada
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
                50K+
              </div>
              <div className="text-slate-300">Jogadores Ativos</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
                R$ 2M+
              </div>
              <div className="text-slate-300">Premiações Pagas</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
                24/7
              </div>
              <div className="text-slate-300">Mesas Disponíveis</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
                99.9%
              </div>
              <div className="text-slate-300">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para Jogar Poker Profissional?
            </h2>
            <p className="text-slate-300 text-lg mb-8">
              Junte-se a milhares de jogadores profissionais que já escolheram
              nossa plataforma. Cadastro gratuito e bônus de boas-vindas para
              novos jogadores.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-3"
                asChild
              >
                <Link href="/register">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Criar Conta Grátis
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 text-lg px-8 py-3 bg-transparent"
              >
                Baixar App Mobile
              </Button>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              Cadastro em menos de 2 minutos • Depósito mínimo R$ 20 • Saque
              rápido e seguro
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="text-xl font-bold">PokerPro</span>
              </div>
              <p className="text-slate-400 text-sm">
                A plataforma de poker online mais confiável do Brasil para
                jogadores profissionais.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Jogos</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Cash Games
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Torneios
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Sit & Go
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Cronograma
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Suporte</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Central de Ajuda
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Chat 24/7
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Regras do Jogo
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Jogo Responsável
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Política de Privacidade
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Licenças
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-emerald-400">
                    Contato
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>
              &copy; 2024 PokerPro. Todos os direitos reservados. Jogue com
              responsabilidade. +18 anos.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
