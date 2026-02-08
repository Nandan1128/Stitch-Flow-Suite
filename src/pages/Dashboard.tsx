import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Scissors,
  Clock,
  BarChart,
  TrendingUp,
  Calendar,
  Clipboard,
} from "lucide-react";

import {
  getDashboardData,
  ProductionProgressItem,
  RecentOperationItem,
} from "@/Services/dashboardService";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // ----------------------------
  // STATES
  // ----------------------------
  const [loading, setLoading] = useState(true);

  const [totalWorkers, setTotalWorkers] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(0);

  const [activeProducts, setActiveProducts] = useState(0);
  const [todaysProduction, setTodaysProduction] = useState(0);

  const [pendingPayments, setPendingPayments] = useState(0);
  const [workersOpsToday, setWorkersOpsToday] = useState(0);

  const [productionStats, setProductionStats] = useState<ProductionProgressItem[]>([]);
  const [recentWorkerOperations, setRecentWorkerOperations] = useState<RecentOperationItem[]>([]);


  // ----------------------------
  // FETCH DASHBOARD DATA
  // ----------------------------
  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.id) return;

        const data = await getDashboardData(user.id, isAdmin);

        setTotalWorkers(data.workers.total);
        setActiveWorkers(data.workers.active);

        setActiveProducts(data.activeProducts);
        setTodaysProduction(data.todaysProduction);

        setPendingPayments(data.pendingPayments);
        setWorkersOpsToday(data.workersOpsToday);

        setProductionStats(data.productionProgress);
        setRecentWorkerOperations(data.recentWorkerOps);

      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // ----------------------------
  // LOADING STATE
  // ----------------------------
  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 rounded-xl mb-2 sm:mb-6 border border-primary/10">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {user?.name}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-balance">
          Here's an overview of your production and operations today.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">



        {/* WORKERS CARD */}
        <Card className="dashboard-card border-t-4 border-t-primary shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin ? "Total Workers" : "Active Workers"}
            </CardTitle>
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <Users size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isAdmin ? totalWorkers : activeWorkers}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +3 in the last month
            </p>
          </CardContent>
        </Card>

        {/* ACTIVE PRODUCTS */}
        <Card className="dashboard-card border-t-4 border-t-secondary shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <div className="bg-secondary/10 p-2 rounded-full text-secondary">
              <Scissors size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
            <p className="text-xs text-muted-foreground">3 pending completion</p>
          </CardContent>
        </Card>

        {/* TODAY’S PRODUCTION */}
        <Card className="dashboard-card border-t-4 border-t-accent shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Production</CardTitle>
            <div className="bg-accent/10 p-2 rounded-full text-accent">
              <Clock size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysProduction} pcs</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Based on worker operations
            </p>
          </CardContent>
        </Card>

        {/* PAYMENTS (Admin) / TODAY’S OPERATIONS (Others) */}
        <Card className={`dashboard-card border-t-4 shadow-md hover:shadow-lg transition-all 
          ${isAdmin ? "border-t-red-500" : "border-t-purple-500"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin ? "Payments Pending" : "Today's Operations"}
            </CardTitle>
            <div className={`p-2 rounded-full ${isAdmin ? "bg-red-100 text-red-500" : "bg-purple-100 text-purple-500"}`}>
              <BarChart size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isAdmin ? `₹${pendingPayments}` : workersOpsToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Pending salary payments" : "Across all tasks today"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PRODUCTION PROGRESS WITH PO NUMBER+ RECENT OPS */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* PRODUCTION PROGRESS */}
        <Card className="col-span-1 dashboard-card shadow-md hover:shadow-lg transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle>Production Progress</CardTitle>
            <CardDescription>Current status of active production orders</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-6">
              {productionStats.length === 0 && (
                <p className="text-sm text-muted-foreground">No productions found.</p>
              )}

              {productionStats.map((product) => (
                <div key={product.id} className="space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <span className="text-sm font-medium">{product.productName}</span>
                      <span className="text-xs text-muted-foreground ml-2">PO: {product.po_number}</span>
                    </div>
                    <span className="text-sm text-gray-500">{product.progress}%</span>
                  </div>

                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      style={{
                        width: `${product.progress}%`,
                        transition: "width 1s ease-in-out",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RECENT WORKER OPERATIONS */}
        <Card className="col-span-1 dashboard-card shadow-md hover:shadow-lg transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle>Recent Worker Operations</CardTitle>
            <CardDescription>
              Recent work completed by workers and their earnings
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-4">
              {recentWorkerOperations.slice(0, 6).length === 0 && (
                <p className="text-sm text-muted-foreground">No worker activity found.</p>
              )}

              {recentWorkerOperations.slice(0, 6).map((op) => (
                <div
                  key={op.id}
                  className="flex items-center p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mr-3">
                    <Clipboard size={16} className="text-primary" />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{op.workerName}</p>
                      <p className="text-xs font-semibold text-primary">₹{op.earnings}</p>
                    </div>

                    <div className="flex justify-between">
                      <p className="text-xs text-gray-500">
                        {op.operationName} - {op.productName} ({op.pieces} pcs)
                      </p>

                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {op.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
