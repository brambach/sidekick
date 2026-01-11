import { UserButton } from "@clerk/nextjs";
import { getUserWithProfile } from "@/lib/auth";

export async function Header() {
  const user = await getUserWithProfile();

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0] || "User"}
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
