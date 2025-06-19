"use client";

import { Button, Paper, Typography, Box } from "@mui/material";
import { useState } from "react";
import { api } from "~/trpc/react";

interface PokerRealtimeStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionErrors: number;
}

interface RealtimeTestProps {
  status?: PokerRealtimeStatus;
}

/**
 * Test component to verify realtime functionality
 * This should only be used in development for testing
 */
export function RealtimeTest({ status }: RealtimeTestProps) {
  const [games] = api.player.getAllGames.useSuspenseQuery();
  const createGameMutation = api.game.create.useMutation();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleCreateGame = async () => {
    try {
      addLog("Creating new game...");
      await createGameMutation.mutateAsync();
      addLog("Game created successfully!");
    } catch (error) {
      addLog(`Error creating game: ${error}`);
    }
  };

  return (
    <Paper elevation={2} className="p-4 max-w-2xl">
      <Typography variant="h6" gutterBottom>
        Realtime Functionality Test
      </Typography>
      
      {status && (
        <Box className="mb-4">
          <Typography variant="body2" color="text.secondary">
            Connection Status: {status.isConnected ? "Connected" : "Disconnected"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Errors: {status.connectionErrors}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last Update: {status.lastUpdate?.toLocaleTimeString() || "None"}
          </Typography>
        </Box>
      )}

      <Box className="mb-4">
        <Button 
          variant="contained" 
          onClick={handleCreateGame}
          disabled={createGameMutation.isPending}
        >
          {createGameMutation.isPending ? "Creating..." : "Create Test Game"}
        </Button>
        <Typography variant="body2" color="text.secondary" className="mt-2">
          Create a game to test if realtime updates work. Check the console for realtime logs.
        </Typography>
      </Box>

      <Box className="mb-4">
        <Typography variant="subtitle2">
          Current Games: {games.length}
        </Typography>
        {games.slice(0, 3).map(game => (
          <Typography key={game.id} variant="body2" color="text.secondary">
            {game.id} - Status: {game.status} - Pot: ${game.pot}
          </Typography>
        ))}
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Activity Log:
        </Typography>
        <Box className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No activity yet...
            </Typography>
          ) : (
            logs.map((log, index) => (
              <Typography key={index} variant="body2" className="font-mono text-xs">
                {log}
              </Typography>
            ))
          )}
        </Box>
      </Box>
    </Paper>
  );
}