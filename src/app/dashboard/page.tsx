"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  Gift,
  LogOut,
  Plus,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  User,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function DashboardPage() {
  const [selectedStake, setSelectedStake] = useState("all");

  // Mock user data
  const user = {
    name: "João Silva",
    username: "joaopoker",
    avatar: "/placeholder.svg?height=40&width=40&text=JS",
    balance: 2450.75,
    level: 12,
    xp: 2340,
    xpToNext: 3000,
    totalWinnings: 15420.5,
    gamesPlayed: 1247,
    winRate: 68.5,
  };

  // Mock cash game tables
  const cashTables = [
    {
      id: 1,
      name: "Mesa Diamante",
      stakes: "R$ 1/2",
      players: 6,
      maxPlayers: 9,
      avgPot: "R$ 45",
      handsPerHour: 85,
      waitingList: 0,
    },
    {
      id: 2,
      name: "Mesa Esmeralda",
      stakes: "R$ 2/5",
      players: 8,
      maxPlayers: 9,
      avgPot: "R$ 120",
      handsPerHour: 78,
      waitingList: 2,
    },
    {
      id: 3,
      name: "Mesa Rubi",
      stakes: "R$ 5/10",
      players: 5,
      maxPlayers: 9,
      avgPot: "R$ 280",
      handsPerHour: 72,
      waitingList: 0,
    },
    {
      id: 4,
      name: "Mesa Safira",
      stakes: "R$ 0.25/0.50",
      players: 9,
      maxPlayers: 9,
      avgPot: "R$ 12",
      handsPerHour: 92,
      waitingList: 5,
    },
  ];

  // Mock tournaments
  const tournaments = [
    {
      id: 1,
      name: "Daily Turbo",
      buyIn: "R$ 55",
      prize: "R$ 2.500",
      startTime: "20:00",
      players: 45,
      maxPlayers: 180,
      status: "registering",
    },
    {
      id: 2,
      name: "Sunday Major",
      buyIn: "R$ 215",
      prize: "R$ 25.000",
      startTime: "21:00",
      players: 128,
      maxPlayers: 500,
      status: "registering",
    },
    {
      id: 3,
      name: "Micro Madness",
      buyIn: "R$ 11",
      prize: "R$ 800",
      startTime: "19:30",
      players: 67,
      maxPlayers: 200,
      status: "late_reg",
    },
  ];

  // Mock recent activity
  const recentActivity = [
    {
      id: 1,
      type: "tournament",
      description: "3º lugar no Daily Turbo",
      amount: "+R$ 245.00",
      time: "2 horas atrás",
      positive: true,
    },
    {
      id: 2,
      type: "cashgame",
      description: "Sessão Mesa Diamante",
      amount: "+R$ 127.50",
      time: "5 horas atrás",
      positive: true,
    },
    {
      id: 3,
      type: "tournament",
      description: "Eliminado no Sunday Major",
      amount: "-R$ 215.00",
      time: "1 dia atrás",
      positive: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold">PokerPro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/dashboard" className="text-emerald-400 font-medium">
                Dashboard
              </Link>
              <Link
                href="/tables"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Mesas
              </Link>
              <Link
                href="/tournaments"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Torneios
              </Link>
              <Link
                href="/history"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Histórico
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Balance */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800 px-3 py-2 rounded-lg">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold">
                R$ {user.balance.toFixed(2)}
              </span>
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={user.avatar || "/placeholder.svg"}
                      alt={user.name}
                    />
                    <AvatarFallback className="bg-emerald-600">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-slate-800 border-slate-700"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-slate-400">
                      @{user.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-slate-300 hover:bg-slate-700 hover:text-white">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-300 hover:bg-slate-700 hover:text-white">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-slate-300 hover:bg-slate-700 hover:text-white">
                  <LogOut className="mr-2 h-4 w-4" />
                  <Link href="/login">Sair</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Bem-vindo, {user.name.split(" ")[0]}!
              </h1>
              <p className="text-slate-300">
                Pronto para dominar as mesas hoje?
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                Depositar
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                <Gift className="mr-2 h-4 w-4" />
                Bônus
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Saldo</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      R$ {user.balance.toFixed(2)}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Ganhos Totais</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      R$ {user.totalWinnings.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Taxa de Vitória</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {user.winRate}%
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Jogos</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {user.gamesPlayed}
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tables" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger
              value="tables"
              className="data-[state=active]:bg-emerald-600"
            >
              Mesas de Cash
            </TabsTrigger>
            <TabsTrigger
              value="tournaments"
              className="data-[state=active]:bg-emerald-600"
            >
              Torneios
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-emerald-600"
            >
              Atividade
            </TabsTrigger>
          </TabsList>

          {/* Cash Tables */}
          <TabsContent value="tables" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Mesas de Cash Game</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">
                  Filtrar por stake:
                </span>
                <select
                  value={selectedStake}
                  onChange={(e) => setSelectedStake(e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="micro">Micro (≤R$ 0.50)</option>
                  <option value="low">Low (R$ 1-5)</option>
                  <option value="mid">Mid (R$ 10+)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4">
              {cashTables.map((table) => (
                <Card
                  key={table.id}
                  className="bg-slate-800 border-slate-700 hover:border-emerald-600/50 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {table.name}
                          </h3>
                          <p className="text-slate-400">
                            {table.stakes} • {table.avgPot} pot médio
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-slate-700 text-slate-300"
                        >
                          {table.handsPerHour} mãos/h
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="flex items-center space-x-1 text-sm text-slate-400">
                            <Users className="h-4 w-4" />
                            <span>
                              {table.players}/{table.maxPlayers}
                            </span>
                          </div>
                          {table.waitingList > 0 && (
                            <p className="text-xs text-yellow-400">
                              {table.waitingList} na fila
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Observar
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Sentar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tournaments */}
          <TabsContent value="tournaments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Torneios Disponíveis</h2>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Calendar className="mr-2 h-4 w-4" />
                Ver Cronograma
              </Button>
            </div>

            <div className="grid gap-4">
              {tournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  className="bg-slate-800 border-slate-700 hover:border-emerald-600/50 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {tournament.name}
                          </h3>
                          <p className="text-slate-400">
                            Buy-in: {tournament.buyIn} • Prêmio:{" "}
                            {tournament.prize}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {tournament.status === "registering" && (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                              Inscrições Abertas
                            </Badge>
                          )}
                          {tournament.status === "late_reg" && (
                            <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                              Late Registration
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="flex items-center space-x-1 text-sm text-slate-400">
                            <Clock className="h-4 w-4" />
                            <span>{tournament.startTime}</span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {tournament.players}/{tournament.maxPlayers}{" "}
                            jogadores
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                          >
                            Detalhes
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Inscrever
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Recent Activity */}
          <TabsContent value="activity" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Games */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">
                    Atividade Recente
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Seus últimos jogos e resultados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            activity.positive ? "bg-green-400" : "bg-red-400"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {activity.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-semibold ${
                          activity.positive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {activity.amount}
                      </span>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    Ver Histórico Completo
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Player Level */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Star className="mr-2 h-5 w-5 text-yellow-400" />
                    Nível do Jogador
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Seu progresso e conquistas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-400 mb-2">
                      Nível {user.level}
                    </div>
                    <p className="text-slate-400 text-sm">Jogador Experiente</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        XP para próximo nível
                      </span>
                      <span className="text-white">
                        {user.xp}/{user.xpToNext}
                      </span>
                    </div>
                    <Progress
                      value={(user.xp / user.xpToNext) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-lg font-bold text-white">
                        {user.gamesPlayed}
                      </div>
                      <div className="text-xs text-slate-400">Jogos</div>
                    </div>
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-lg font-bold text-emerald-400">
                        {user.winRate}%
                      </div>
                      <div className="text-xs text-slate-400">Win Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
