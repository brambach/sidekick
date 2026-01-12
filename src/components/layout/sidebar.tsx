import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, FolderKanban, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

const adminNavItems = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/clients", label: "Clients", icon: Users },
  { href: "/dashboard/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/admin/tickets", label: "Tickets", icon: Ticket },
];

const clientNavItems = [
  { href: "/dashboard/client", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/client/projects", label: "My Projects", icon: FolderKanban },
  { href: "/dashboard/client/tickets", label: "Support", icon: Ticket },
];

export async function Sidebar() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? adminNavItems : clientNavItems;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <div className="mb-3">
          <Image
            src="/images/dd-logo.png"
            alt="Digital Directions"
            width={160}
            height={40}
            className="w-full h-auto"
          />
        </div>
        <p className="text-sm text-gray-500">
          {isAdmin ? "Consultant Dashboard" : "Implementation Portal"}
        </p>
      </div>
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-gray-700",
                  "hover:bg-gray-100 transition-colors"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
