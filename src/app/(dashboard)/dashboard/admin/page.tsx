import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, tickets, users, ticketTimeEntries } from "@/lib/db/schema";
import { isNull, eq, and, sql, desc, or, count, gte, lte } from "drizzle-orm";
import {
  Users,
  Ticket,
  Clock,
  Briefcase,
  CheckCircle,
  Calendar,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import dynamicImport from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn, formatMinutesToHours } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";

const InviteTeamMemberDialog = dynamicImport(
  () => import("@/components/invite-team-member-dialog").then((mod) => ({ default: mod.InviteTeamMemberDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  const [clientStats, projectStats, ticketStats, userStats] = await Promise.all([
    db.select({ total: count(), active: sql<number>`count(*) filter (where ${clients.status} = 'active')` }).from(clients).where(isNull(clients.deletedAt)).then(r => r[0]),
    db.select({ total: count(), active: sql<number>`count(*) filter (where ${projects.status} in ('in_progress', 'planning', 'review'))`, overdue: sql<number>`count(*) filter (where ${projects.dueDate} < now() and ${projects.status} != 'completed')` }).from(projects).where(isNull(projects.deletedAt)).then(r => r[0]),
    db.select({ total: count(), open: sql<number>`count(*) filter (where ${tickets.status} = 'open')`, urgent: sql<number>`count(*) filter (where ${tickets.priority} = 'urgent' and ${tickets.status} in ('open', 'in_progress'))` }).from(tickets).where(isNull(tickets.deletedAt)).then(r => r[0]),
    db.select({ total: count(), admins: sql<number>`count(*) filter (where ${users.role} = 'admin')`, clients: sql<number>`count(*) filter (where ${users.role} = 'client')` }).from(users).where(isNull(users.deletedAt)).then(r => r[0]),
  ]);

  const [recentTickets, activeProjects] = await Promise.all([
    db.select({ id: tickets.id, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt, clientName: clients.companyName }).from(tickets).leftJoin(clients, eq(tickets.clientId, clients.id)).where(isNull(tickets.deletedAt)).orderBy(desc(tickets.createdAt)).limit(5),
    db.select({ id: projects.id, name: projects.name, status: projects.status, dueDate: projects.dueDate, clientName: clients.companyName }).from(projects).leftJoin(clients, eq(projects.clientId, clients.id)).where(and(isNull(projects.deletedAt), or(eq(projects.status, "in_progress"), eq(projects.status, "review")))).orderBy(desc(projects.createdAt)).limit(5),
  ]);

  // Calculate date ranges for time tracking
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Query time entries for billable calculations
  const billableTimeEntries = await db
    .select({
      totalMinutes: sql<number>`COALESCE(SUM(${ticketTimeEntries.minutes}), 0)`
    })
    .from(ticketTimeEntries)
    .where(
      and(
        eq(ticketTimeEntries.countTowardsSupportHours, true),
        isNull(ticketTimeEntries.deletedAt),
        gte(ticketTimeEntries.loggedAt, threeMonthsAgo)
      )
    );

  const totalBillableMinutes = Number(billableTimeEntries[0]?.totalMinutes || 0);
  const hourlyRate = 150; // Standard billable rate
  const billableAmount = (totalBillableMinutes / 60) * hourlyRate;

  // Query time entries by month for Work Time Analysis chart
  const monthlyTimeEntries = await db
    .select({
      month: sql<string>`TO_CHAR(${ticketTimeEntries.loggedAt}, 'Mon')`,
      monthNum: sql<number>`EXTRACT(MONTH FROM ${ticketTimeEntries.loggedAt})`,
      totalMinutes: sql<number>`COALESCE(SUM(${ticketTimeEntries.minutes}), 0)`,
    })
    .from(ticketTimeEntries)
    .where(
      and(
        isNull(ticketTimeEntries.deletedAt),
        gte(ticketTimeEntries.loggedAt, threeMonthsAgo)
      )
    )
    .groupBy(sql`TO_CHAR(${ticketTimeEntries.loggedAt}, 'Mon')`, sql`EXTRACT(MONTH FROM ${ticketTimeEntries.loggedAt})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${ticketTimeEntries.loggedAt})`);

  // Calculate dynamic month names for last 3 months
  const getRecentMonths = (count: number = 3): string[] => {
    const months = [];
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleString('default', { month: 'short' }));
    }
    return months;
  };
  const monthNames = getRecentMonths(3);
  const currentMonth = now.getMonth(); // 0-11
  const monthlyData = monthNames.map((monthName, index) => {
    const targetMonth = currentMonth - 2 + index; // -2, -1, 0 (current)
    const normalizedMonth = ((targetMonth % 12) + 12) % 12 + 1; // Convert to 1-12

    const existing = monthlyTimeEntries.find(m => Number(m.monthNum) === normalizedMonth);
    const minutes = existing ? Number(existing.totalMinutes) : 0;
    const hours = Math.round(minutes / 60);
    const amount = (minutes / 60) * hourlyRate;

    return {
      label: monthName,
      value: hours,
      amount: amount,
      isActive: index === 2, // Current month is active
    };
  });

  // Time Tracker: This month vs last month
  const thisMonthTime = await db
    .select({
      totalMinutes: sql<number>`COALESCE(SUM(${ticketTimeEntries.minutes}), 0)`
    })
    .from(ticketTimeEntries)
    .where(
      and(
        isNull(ticketTimeEntries.deletedAt),
        gte(ticketTimeEntries.loggedAt, currentMonthStart)
      )
    );

  const lastMonthTime = await db
    .select({
      totalMinutes: sql<number>`COALESCE(SUM(${ticketTimeEntries.minutes}), 0)`
    })
    .from(ticketTimeEntries)
    .where(
      and(
        isNull(ticketTimeEntries.deletedAt),
        gte(ticketTimeEntries.loggedAt, lastMonthStart),
        lte(ticketTimeEntries.loggedAt, lastMonthEnd)
      )
    );

  const thisMonthMinutes = Number(thisMonthTime[0]?.totalMinutes || 0);
  const lastMonthMinutes = Number(lastMonthTime[0]?.totalMinutes || 0);
  const percentageChange = lastMonthMinutes > 0
    ? ((thisMonthMinutes - lastMonthMinutes) / lastMonthMinutes * 100)
    : 0;

  // Client Distribution by support hours usage
  const topClientsByHours = await db
    .select({
      companyName: clients.companyName,
      hoursUsed: clients.hoursUsedThisMonth,
    })
    .from(clients)
    .where(and(isNull(clients.deletedAt), eq(clients.status, "active")))
    .orderBy(desc(clients.hoursUsedThisMonth))
    .limit(3);

  const totalUsedMinutes = topClientsByHours.reduce((sum, c) => sum + (c.hoursUsed || 0), 0);
  const clientDistribution = topClientsByHours.map((client, index) => {
    const percentage = totalUsedMinutes > 0 ? ((client.hoursUsed || 0) / totalUsedMinutes * 100) : 0;
    const colors = ['indigo', 'cyan', 'gray'];
    const labels = index === 0 ? 'Top Client' : index === 1 ? 'Second' : 'Third';

    return {
      name: client.companyName,
      hoursUsed: client.hoursUsed || 0,
      percentage,
      color: colors[index],
      label: labels,
    };
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 space-y-8 no-scrollbar relative font-geist">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 font-medium text-xs">
            <Calendar className="w-3.5 h-3.5" />
            Last 3 Months
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 pb-8">
        {/* Metric Cards */}
        <div className="col-span-12 lg:col-span-4 animate-enter delay-200">
          <StatCard
            label="Total Clients"
            value={clientStats.total.toLocaleString()}
            icon={<Users className="w-4 h-4 text-[#06B6D4]" />}
            variant="cyan"
          />
        </div>
        <div className="col-span-12 lg:col-span-4 animate-enter delay-200 stagger-1">
          <StatCard
            label="Active Projects"
            value={Number(projectStats.active)}
            icon={<Briefcase className="w-4 h-4 text-[#6366F1]" />}
            variant="indigo"
          />
        </div>
        <div className="col-span-12 lg:col-span-4 animate-enter delay-200 stagger-2">
          <StatCard
            label="Open Tickets"
            value={Number(ticketStats.open)}
            icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
            period={`${Number(ticketStats.urgent)} urgent`}
            variant="white"
          />
        </div>

        {/* Work Time Analysis Chart */}
        <div className="col-span-12 lg:col-span-8 animate-enter delay-300">
          <Card className="p-6 h-full flex flex-col border-gray-100 shadow-sm rounded-xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5" />
                  Work Time Analysis
                </div>
                <div className="text-3xl font-bold text-gray-900 tracking-tight">${billableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-gray-400 ml-1">Billable Amount</span></div>
              </div>
            </div>

            <div className="flex-1 flex items-end justify-between px-4 pb-4">
              {monthlyData.map((month, index) => {
                const maxHours = Math.max(...monthlyData.map(m => m.value), 1);
                const heightPercentage = Math.max((month.value / maxHours) * 100, 10);

                const colors = index === 0 ? ['bg-indigo-300', 'bg-indigo-400', 'bg-indigo-200'] :
                               index === 1 ? ['bg-cyan-300', 'bg-cyan-400', 'bg-cyan-200'] :
                               ['bg-indigo-400', 'bg-indigo-500', 'bg-indigo-300'];

                return (
                  <WorkBar
                    key={month.label}
                    label={month.label}
                    value={month.value}
                    colors={colors}
                    heightPercent={heightPercentage}
                    active={month.isActive}
                    valueLabel={month.isActive ? `$${month.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : undefined}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-50">
              <LegendItem color="bg-indigo-500" label="Billable Hours" />
            </div>
          </Card>
        </div>

        {/* Time Tracker Chart */}
        <div className="col-span-12 lg:col-span-4 animate-enter delay-300 stagger-1">
          <Card className="p-6 h-full border-gray-100 shadow-sm rounded-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Time Tracker
                </div>
                <div className="text-2xl font-bold text-gray-900 tracking-tight">{formatMinutesToHours(thisMonthMinutes)}</div>
                <div className={cn("text-[10px] font-bold mt-1 uppercase tracking-widest flex items-center gap-1", percentageChange >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}% <span className="text-gray-400">vs last month</span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center text-center py-8">
              <div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{formatMinutesToHours(thisMonthMinutes)}</div>
                <p className="text-xs text-gray-500">logged this month</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Client Distribution */}
        <div className="col-span-12 lg:col-span-4 animate-enter delay-400">
          <Card className="p-6 border-gray-100 shadow-sm rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                Client Distribution
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                {clientDistribution.length > 0 ? clientDistribution.map((client, index) => (
                  <div key={index} className={index === 1 ? 'text-center' : index === 2 ? 'text-right' : ''}>
                    <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1",
                      client.color === 'indigo' ? 'text-indigo-500' :
                      client.color === 'cyan' ? 'text-cyan-500' : 'text-gray-400'
                    )}>
                      {client.name.length > 15 ? client.name.substring(0, 15) + '...' : client.name}
                    </div>
                    <div className="text-xl font-bold text-gray-900">{formatMinutesToHours(client.hoursUsed)}</div>
                  </div>
                )) : (
                  <div className="text-gray-400 text-sm">No client data available</div>
                )}
              </div>
              {/* Mini progress bars */}
              {clientDistribution.length > 0 && (
                <div className="h-1.5 w-full bg-gray-50 rounded-full flex overflow-hidden">
                  {clientDistribution.map((client, index) => (
                    <div
                      key={index}
                      className={cn("h-full",
                        client.color === 'indigo' ? 'bg-indigo-500' :
                        client.color === 'cyan' ? 'bg-cyan-400' : 'bg-gray-200'
                      )}
                      style={{ width: `${client.percentage}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Priority Tickets */}
        <div className="col-span-12 lg:col-span-8 animate-enter delay-400 stagger-1">
          <Card className="border-gray-100 shadow-sm rounded-xl">
            <div className="p-6 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <Ticket className="w-3.5 h-3.5" />
                Priority Tickets
              </div>
              <Link href="/dashboard/admin/tickets" className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">See All</Link>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-50">
                    <th className="w-10 px-6 py-4"></th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ticket</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentTickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        No recent tickets
                      </td>
                    </tr>
                  ) : (
                    recentTickets.map((ticket) => (
                      <tr key={ticket.id} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0">
                        <td className="px-6 py-4">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2",
                            ticket.status === 'resolved' || ticket.status === 'closed' ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                          )} />
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="flex items-center gap-3 hover:text-indigo-600 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                              <Ticket className="w-4 h-4" />
                            </div>
                            <span className="truncate max-w-[200px]">{ticket.title}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase",
                            ticket.priority === 'urgent' ? "bg-red-50 text-red-600" :
                            ticket.priority === 'high' ? "bg-orange-50 text-orange-600" :
                            ticket.priority === 'medium' ? "bg-blue-50 text-blue-600" :
                            "bg-gray-50 text-gray-500"
                          )}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {ticket.clientName || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs text-right">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface WorkBarProps {
  label: string;
  value: number;
  colors: string[];
  heightPercent: number;
  active: boolean;
  valueLabel?: string;
}

function WorkBar({ label, colors, heightPercent, valueLabel, active }: WorkBarProps) {
  return (
    <div className="flex flex-col items-center gap-4 group/bar">
      <div className="relative h-64 w-12 flex flex-col-reverse items-center">
        {active && valueLabel && (
          <div className="absolute -top-10 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded shadow-lg z-10 animate-enter whitespace-nowrap">
            {valueLabel}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
        <div className="w-8 h-full bg-gray-50/50 rounded-full border border-gray-50 flex flex-col-reverse overflow-hidden group-hover/bar:border-gray-100 transition-colors">
          <div
            className="w-full flex flex-col-reverse transition-all duration-500"
            style={{ height: `${heightPercent}%` }}
          >
            {colors.map((color, idx) => (
              <div key={idx} className={cn(color, "w-full flex-1 animate-bar")} style={{ animationDelay: `${idx * 0.1}s` }}></div>
            ))}
          </div>
        </div>
      </div>
      <span className={cn("text-xs font-bold uppercase tracking-widest", active ? "text-gray-900" : "text-gray-400")}>{label}</span>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", color)}></div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}
