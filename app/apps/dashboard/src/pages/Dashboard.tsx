import { useEffect, useMemo, useState } from "react";
import { Activity, Ban, Clock, Gauge, Loader2, RefreshCw, ShieldCheck, TimerReset, TriangleAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ChartContainer } from "../components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { api } from "../lib/api";
import type { AdminStats, QueueStats, RequestEvent, RiskProfile } from "../types";

const decisionVariant = (decision: string) => {
  if (decision === "TEMP_BLOCK") return "destructive" as const;
  if (decision === "RATE_LIMIT" || decision === "REQUIRE_STEP_UP" || decision.startsWith("AUTH_")) {
    return "secondary" as const;
  }
  return "outline" as const;
};

export const Dashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [queue, setQueue] = useState<QueueStats | null>(null);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "risk" | "queue">("overview");

  const refresh = async () => {
    try {
      setError(null);

      const [nextStats, nextQueue, nextEvents, nextRiskProfiles] = await Promise.all([
        api.stats(),
        api.queue(),
        api.events(50),
        api.riskProfiles(),
      ]);

      setStats(nextStats);
      setQueue(nextQueue);
      setEvents(nextEvents);
      setRiskProfiles(nextRiskProfiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown dashboard error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    const buckets = new Map<
      string,
      {
        minute: string;
        requests: number;
        allow: number;
        rateLimit: number;
        block: number;
        stepUp: number;
        risk: number;
      }
    >();

    for (const event of events) {
      const date = new Date(event.createdAt);
      const minute = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const existing =
        buckets.get(minute) ??
        {
          minute,
          requests: 0,
          allow: 0,
          rateLimit: 0,
          block: 0,
          stepUp: 0,
          risk: 0,
        };

      existing.requests += 1;

      if (event.decision === "ALLOW" || event.decision === "ALLOW_BUT_LOG") {
        existing.allow += 1;
      }

      if (event.decision === "RATE_LIMIT") {
        existing.rateLimit += 1;
      }

      if (event.decision === "TEMP_BLOCK") {
        existing.block += 1;
      }

      if (event.decision === "REQUIRE_STEP_UP") {
        existing.stepUp += 1;
      }

      existing.risk = Math.max(existing.risk, event.riskScoreAfterWorker ?? event.riskScoreAtDecision);

      buckets.set(minute, existing);
    }

    return [...buckets.values()].slice(-10);
  }, [events]);

  const statCards = [
    {
      label: "Total requests",
      value: stats?.totalRequests ?? 0,
      icon: Activity,
    },
    {
      label: "Allowed requests",
      value: stats?.allowed ?? 0,
      icon: ShieldCheck,
    },
    {
      label: "Rate-limited",
      value: stats?.rateLimited ?? 0,
      icon: TimerReset,
    },
    {
      label: "Blocked",
      value: stats?.blocked ?? 0,
      icon: Ban,
    },
    {
      label: "Auth failures",
      value: stats?.authFailed ?? 0,
      icon: TriangleAlert,
    },
    {
      label: "Average latency",
      value: `${stats?.avgLatencyMs ?? 0} ms`,
      icon: Clock,
    },
    {
      label: "Queue lag",
      value: stats?.queueLag ?? 0,
      icon: Gauge,
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground md:p-8">
      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Sentinel Gateway</CardTitle>
            <CardDescription>Request decisions, risk profiles, and queue health.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
      </Card>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="flex items-center gap-3 pt-6 text-destructive">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map((stat) => {
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
          <TabsTrigger active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
            Overview
          </TabsTrigger>
          <TabsTrigger active={activeTab === "risk"} onClick={() => setActiveTab("risk")}>
            Risk
          </TabsTrigger>
          <TabsTrigger active={activeTab === "queue"} onClick={() => setActiveTab("queue")}>
            Queue
          </TabsTrigger>
        </TabsList>

        {activeTab === "overview" && (
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
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 20%)" />
                        <XAxis dataKey="minute" stroke="hsl(215 16% 47%)" fontSize={12} />
                        <YAxis stroke="hsl(215 16% 47%)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(222 47% 11%)",
                            border: "1px solid hsl(215 20% 20%)",
                            borderRadius: "0.5rem",
                            color: "hsl(210 40% 98%)",
                          }}
                        />
                        <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} dot={false} />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 20%)" />
                        <XAxis dataKey="minute" stroke="hsl(215 16% 47%)" fontSize={12} />
                        <YAxis stroke="hsl(215 16% 47%)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(222 47% 11%)",
                            border: "1px solid hsl(215 20% 20%)",
                            borderRadius: "0.5rem",
                            color: "hsl(210 40% 98%)",
                          }}
                        />
                        <Bar dataKey="allow" stackId="a" fill="#22c55e" />
                        <Bar dataKey="rateLimit" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="block" stackId="a" fill="#ef4444" />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 20%)" />
                        <XAxis dataKey="minute" stroke="hsl(215 16% 47%)" fontSize={12} />
                        <YAxis domain={[0, 100]} stroke="hsl(215 16% 47%)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(222 47% 11%)",
                            border: "1px solid hsl(215 20% 20%)",
                            borderRadius: "0.5rem",
                            color: "hsl(210 40% 98%)",
                          }}
                        />
                        <Line type="monotone" dataKey="risk" stroke="#a78bfa" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {activeTab === "risk" && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top risky subjects</CardTitle>
                <CardDescription>Subjects sorted by risk score (descending)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Reasons</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskProfiles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No risk profiles yet
                        </TableCell>
                      </TableRow>
                    )}
                    {riskProfiles.slice(0, 10).map((profile) => (
                      <TableRow key={`${profile.subjectType}:${profile.subject}`}>
                        <TableCell className="font-mono text-sm">{profile.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{profile.subjectType}</Badge>
                        </TableCell>
                        <TableCell>{profile.score}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {profile.reasons.join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === "queue" && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Queue health</CardTitle>
                <CardDescription>Kafka request-events consumer lag</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <div className="grid gap-2 md:grid-cols-4">
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <div className="text-muted-foreground">Backend</div>
                    <div className="font-mono font-semibold">{queue?.backend ?? "kafka"}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <div className="text-muted-foreground">Topic</div>
                    <div className="font-mono font-semibold">{queue?.topic ?? "request-events"}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <div className="text-muted-foreground">Consumer Group</div>
                    <div className="font-mono font-semibold">{queue?.groupId ?? "risk-worker"}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <div className="text-muted-foreground">Total Lag</div>
                    <div className="font-mono font-semibold">{queue?.totalLag ?? 0}</div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partition</TableHead>
                      <TableHead>High Watermark</TableHead>
                      <TableHead>Committed Offset</TableHead>
                      <TableHead>Lag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue?.partitions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          No partition offsets reported yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {queue?.partitions.map((partition) => (
                      <TableRow key={partition.partition}>
                        <TableCell className="font-mono">{partition.partition}</TableCell>
                        <TableCell className="font-mono">{partition.highWatermark}</TableCell>
                        <TableCell className="font-mono">{partition.committedOffset}</TableCell>
                        <TableCell className="font-mono">{partition.lag}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
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
                {events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No request events yet
                    </TableCell>
                  </TableRow>
                )}
                {events.slice(0, 10).map((event) => (
                  <TableRow key={event.requestId}>
                    <TableCell className="font-mono text-sm">
                      {event.method} {event.path}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{event.subject}</TableCell>
                    <TableCell>
                      <Badge variant={decisionVariant(event.decision)}>
                        {event.decision}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.latencyMs} ms</TableCell>
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
                {riskProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No risk profiles yet
                    </TableCell>
                  </TableRow>
                )}
                {riskProfiles.slice(0, 10).map((profile) => (
                  <TableRow key={`${profile.subjectType}:${profile.subject}`}>
                    <TableCell className="font-mono text-sm">{profile.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{profile.subjectType}</Badge>
                    </TableCell>
                    <TableCell>{profile.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};
