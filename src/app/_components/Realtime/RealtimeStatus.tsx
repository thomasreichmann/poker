"use client";

import { Chip, Tooltip } from "@mui/material";
import { usePokerRealtime } from "./usePokerRealtime";

interface RealtimeStatusProps {
  showDetails?: boolean;
}

export function RealtimeStatus({ showDetails = false }: RealtimeStatusProps) {
  const status = usePokerRealtime();

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