"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ConfigureIntegrationDialogProps {
  clientId: string;
  integration?: any; // If editing existing integration
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConfigureIntegrationDialog({
  clientId,
  integration,
  open,
  onOpenChange,
  onSuccess,
}: ConfigureIntegrationDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [serviceType, setServiceType] = useState(
    integration?.serviceType || "hibob"
  );
  const [serviceName, setServiceName] = useState(
    integration?.serviceName || ""
  );
  const [apiEndpoint, setApiEndpoint] = useState(
    integration?.apiEndpoint || ""
  );
  const [credentials, setCredentials] = useState(
    integration?.credentials ? JSON.stringify(integration.credentials, null, 2) : ""
  );
  const [workatoRecipeIds, setWorkatoRecipeIds] = useState(
    integration?.workatoRecipeIds ? integration.workatoRecipeIds.join(", ") : ""
  );
  const [isEnabled, setIsEnabled] = useState(
    integration?.isEnabled !== false
  );
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(
    integration?.checkIntervalMinutes?.toString() || "5"
  );

  useEffect(() => {
    if (integration) {
      setServiceType(integration.serviceType || "hibob");
      setServiceName(integration.serviceName || "");
      setApiEndpoint(integration.apiEndpoint || "");
      setCredentials(
        integration.credentials ? JSON.stringify(integration.credentials, null, 2) : ""
      );
      setWorkatoRecipeIds(
        integration.workatoRecipeIds ? integration.workatoRecipeIds.join(", ") : ""
      );
      setIsEnabled(integration.isEnabled !== false);
      setCheckIntervalMinutes(integration.checkIntervalMinutes?.toString() || "5");
    }
  }, [integration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate credentials JSON
      let credentialsObj = null;
      if (credentials.trim()) {
        try {
          credentialsObj = JSON.parse(credentials);
        } catch (err) {
          toast.error("Invalid JSON in credentials field");
          setLoading(false);
          return;
        }
      }

      // Parse Workato recipe IDs
      let recipeIdsArray = null;
      if (workatoRecipeIds.trim()) {
        recipeIdsArray = workatoRecipeIds
          .split(",")
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0);
      }

      const body = {
        clientId,
        serviceType,
        serviceName: serviceName.trim(),
        apiEndpoint: apiEndpoint.trim() || null,
        credentials: credentialsObj,
        workatoRecipeIds: recipeIdsArray,
        isEnabled,
        checkIntervalMinutes: parseInt(checkIntervalMinutes) || 5,
      };

      const url = integration
        ? `/api/integrations/${integration.id}`
        : "/api/integrations";
      const method = integration ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save integration");
      }

      toast.success(
        integration
          ? "Integration updated successfully"
          : "Integration created successfully"
      );

      router.refresh();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving integration:", error);
      toast.error(error.message || "Failed to save integration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {integration ? "Edit Integration" : "Add Integration"}
          </DialogTitle>
          <DialogDescription>
            Configure integration monitoring for this client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger id="serviceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hibob">HiBob</SelectItem>
                <SelectItem value="keypay">KeyPay</SelectItem>
                <SelectItem value="workato">Workato</SelectItem>
                <SelectItem value="adp">ADP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="serviceName">Service Name</Label>
            <Input
              id="serviceName"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g., HiBob Production"
              required
            />
          </div>

          {/* API Endpoint */}
          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint (Optional)</Label>
            <Input
              id="apiEndpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="e.g., https://api.hibob.com/v1/company"
            />
            <p className="text-xs text-slate-500">
              Leave empty to use default endpoint for this service type
            </p>
          </div>

          {/* Credentials */}
          <div className="space-y-2">
            <Label htmlFor="credentials">Credentials (JSON)</Label>
            <Textarea
              id="credentials"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder={`{\n  "apiToken": "your-token-here"\n}`}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Enter credentials as JSON. For HiBob: {`{"apiToken": "..."}`}. For
              KeyPay: {`{"apiKey": "..."}`}. For Workato: {`{"apiToken": "..."}`}.
            </p>
          </div>

          {/* Workato Recipe IDs (only for Workato) */}
          {serviceType === "workato" && (
            <div className="space-y-2">
              <Label htmlFor="workatoRecipeIds">
                Workato Recipe IDs (Optional)
              </Label>
              <Input
                id="workatoRecipeIds"
                value={workatoRecipeIds}
                onChange={(e) => setWorkatoRecipeIds(e.target.value)}
                placeholder="12345, 67890, 11111"
              />
              <p className="text-xs text-slate-500">
                Comma-separated list of recipe IDs to monitor
              </p>
            </div>
          )}

          {/* Check Interval */}
          <div className="space-y-2">
            <Label htmlFor="checkInterval">Check Interval (Minutes)</Label>
            <Input
              id="checkInterval"
              type="number"
              min="1"
              max="1440"
              value={checkIntervalMinutes}
              onChange={(e) => setCheckIntervalMinutes(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              How often to check this integration (1-1440 minutes)
            </p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isEnabled"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <Label htmlFor="isEnabled" className="cursor-pointer">
              Enable monitoring for this integration
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : integration ? (
                "Update Integration"
              ) : (
                "Add Integration"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
