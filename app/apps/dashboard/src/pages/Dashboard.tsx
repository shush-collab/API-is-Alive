import { Activity, Ban, Clock, Gauge, ShieldCheck, TimerReset } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ChartContainer } from "../components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const stats = [
  { label: "Total requests", value: "1,240", icon: Activity },
  { label: "Allowed requests", value: "980", icon: ShieldCheck },
  { label: "Rate-limited", value: "180", icon: TimerReset },
  { label: "Blocked", value: "80", icon: Ban },
  { label: "Average latency", value: "42 ms", icon: Clock },
  { label: "Queue lag", value: "3", icon: Gauge },
];

const chartData = [
  { minute: "10:00", requests: 44, allow: 39, rateLimit: 4, block: 1, risk: 12 },
  { minute: "10:01", requests: 58, allow: 50, rateLimit: 6, block: 2, risk: 18 },
  { minute: "10:02", requests: 140, allow: 82, rateLimit: 40, block: 18, risk: 66 },
  { minute: "10:03", requests: 96, allow: 71, rateLimit: 16, block: 9, risk: 48 },
  { minute: "10:04", requests: 74, allow: 64, rateLimit: 7, block: 3, risk: 30 },
];

const recentRequests = [
  { id: "req_7f4", subject: "198.51.100.5", path: "POST /login", decision: "TEMP_BLOCK", latency: "4 ms" },
  { id: "req_31a", subject: "198.51.100.2", path: "GET /search", decision: "RATE_LIMIT", latency: "3 ms" },
  { id: "req_9cb", subject: "demo-key", path: "POST /checkout", decision: "ALLOW", latency: "12 ms" },
];

const riskySubjects = [
  { subject: "198.51.100.5", type: "IP", risk: 100 },
  { subject: "manual-stuffing", type: "API key", risk: 100 },
  { subject: "manual-checkout", type: "API key", risk: 70 },
];

const decisionVariant = (decision: string) => {
  if (decision === "TEMP_BLOCK") return "destructive";
  if (decision === "RATE_LIMIT" || decision === "REQUIRE_STEP_UP") return "secondary";
  return "outline";
};

export const Dashboard = () => (
  <main className="min-h-screen bg-background p-6 text-foreground md:p-8">
    <Card className="mb-6">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Sentinel Gateway</CardTitle>
          <CardDescription>Request decisions, risk profiles, and queue health.</CardDescription>
        </div>
        <Button variant="outline" size="sm">Refresh</Button>
      </CardHeader>
    </Card>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardContent>
          </Card>
        );
      })}
    </div>

    <Tabs className="mt-6">
      <TabsList>
        <TabsTrigger active>Overview</TabsTrigger>
        <TabsTrigger>Risk</TabsTrigger>
        <TabsTrigger>Queue</TabsTrigger>
      </TabsList>
      <TabsContent>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requests per minute</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="minute" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Decisions over time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="minute" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="allow" stackId="a" fill="#16a34a" />
                    <Bar dataKey="rateLimit" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="block" stackId="a" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk score over time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="minute" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="risk" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>

    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.path}</TableCell>
                  <TableCell>{request.subject}</TableCell>
                  <TableCell><Badge variant={decisionVariant(request.decision)}>{request.decision}</Badge></TableCell>
                  <TableCell>{request.latency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top risky subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskySubjects.map((subject) => (
                <TableRow key={subject.subject}>
                  <TableCell>{subject.subject}</TableCell>
                  <TableCell><Badge variant="outline">{subject.type}</Badge></TableCell>
                  <TableCell>{subject.risk}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </main>
);
