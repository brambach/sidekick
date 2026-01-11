import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Projects</h1>

      <Card>
        <CardHeader>
          <CardTitle>Project List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            No projects yet. Run <code className="bg-gray-100 px-2 py-1 rounded">npm run db:seed</code> to populate demo data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
