import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Agency Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Agency configuration will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
