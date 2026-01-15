"use client";

import { useEffect, useState } from "react";
import { IntegrationStatusBadge } from "./integration-status-badge";
import { Clock, Activity, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Integration {
  id: string;
  serviceName: string;
  serviceType: string;
  currentStatus: "healthy" | "degraded" | "down" | "unknown";
  lastCheckedAt: string | null;
  lastErrorMessage: string | null;
}

interface IntegrationHealthCardProps {
  integration: Integration;
}

export function IntegrationHealthCard({
  integration,
}: IntegrationHealthCardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration.id]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/integrations/${integration.id}/metrics?timeRange=24h`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching integration metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    // You can customize these icons based on service type
    return <Activity className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              integration.currentStatus === "healthy"
                ? "bg-emerald-50 text-emerald-600"
                : integration.currentStatus === "degraded"
                ? "bg-orange-50 text-orange-600"
                : integration.currentStatus === "down"
                ? "bg-red-50 text-red-600"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            {getServiceIcon(integration.serviceType)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {integration.serviceName}
            </h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {integration.serviceType}
            </p>
          </div>
        </div>
        <IntegrationStatusBadge status={integration.currentStatus} size="sm" />
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
        </div>
      ) : metrics ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp className="w-4 h-4" />
              <span>Uptime (24h)</span>
            </div>
            <span
              className={`font-semibold ${
                metrics.uptimePercentage >= 99.5
                  ? "text-emerald-600"
                  : metrics.uptimePercentage >= 95
                  ? "text-orange-600"
                  : "text-red-600"
              }`}
            >
              {metrics.uptimePercentage.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4" />
              <span>Avg Response</span>
            </div>
            <span className="font-semibold text-slate-900">
              {metrics.avgResponseTime}ms
            </span>
          </div>

          {integration.lastCheckedAt && (
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              Last checked{" "}
              {formatDistanceToNow(new Date(integration.lastCheckedAt), {
                addSuffix: true,
              })}
            </div>
          )}

          {integration.lastErrorMessage && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 mt-2">
              {integration.lastErrorMessage}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No metrics available</p>
      )}
    </div>
  );
}
