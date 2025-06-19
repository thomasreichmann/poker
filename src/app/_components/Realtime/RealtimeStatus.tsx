"use client";

import { Chip, Tooltip } from "@mui/material";

interface PokerRealtimeStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionErrors: number;
}

interface RealtimeStatusProps {
  showDetails?: boolean;
  status: PokerRealtimeStatus;
}

export function RealtimeStatus({ showDetails = false, status }: RealtimeStatusProps) {
  const getStatusColor = () => {
    if (!status.isConnected) return "error";
    if (status.connectionErrors > 0) return "warning";
    return "success";
  };

  const getStatusText = () => {
    if (!status.isConnected) return "Disconnected";
    if (status.connectionErrors > 0) return "Issues";
    return "Connected";
  };

  const getTooltipText = () => {
    const parts = [
      `Status: ${status.isConnected ? "Connected" : "Disconnected"}`,
      `Errors: ${status.connectionErrors}`,
    ];
    
    if (status.lastUpdate) {
      parts.push(`Last update: ${status.lastUpdate.toLocaleTimeString()}`);
    }
    
    return parts.join("\n");
  };

  if (!showDetails && status.isConnected && status.connectionErrors === 0) {
    // Don't show anything when everything is working normally and details aren't requested
    return null;
  }

  return (
    <Tooltip title={getTooltipText()} arrow>
      <Chip
        label={`Realtime: ${getStatusText()}`}
        color={getStatusColor()}
        size="small"
        variant={status.isConnected ? "filled" : "outlined"}
      />
    </Tooltip>
  );
}