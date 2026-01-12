import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClientProjectsPage() {
  await requireAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Projects</h1>

      <Card>
        <CardHeader>
          <CardTitle>Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            No projects assigned yet. Your Digital Directions consultant will set up projects for you.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
