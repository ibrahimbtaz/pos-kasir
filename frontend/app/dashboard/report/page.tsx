"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  stock: number;
  _count: {
    stockLogs: number;
  };
}

interface StockLog {
  id: number;
  type: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  product: {
    name: string;
    sku: string;
  };
  user: {
    name: string;
    username: string;
  };
}

interface StockReport {
  summary: {
    totalProducts: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  products: Product[];
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
}

export default function ReportPage() {
  const [report, setReport] = useState<StockReport | null>(null);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "low" | "out" | "logs">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportRes, logsRes] = await Promise.all([
        api.getStockReport(),
        api.getStockLogs({ limit: 50 }),
      ]);

      if (reportRes.success && reportRes.data) {
        setReport(reportRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Laporan Stok</h1>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${activeTab === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.summary.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total stok: {report?.summary.totalStock || 0} unit
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${activeTab === "low" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => setActiveTab("low")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {report?.summary.lowStockCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Stok ≤ 10 unit</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${activeTab === "out" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setActiveTab("out")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stok Habis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {report?.summary.outOfStockCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Perlu restok</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${activeTab === "logs" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Riwayat Stok</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Aktivitas terbaru</p>
          </CardContent>
        </Card>
      </div>

      {/* Content based on active tab */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "all" && "Semua Produk"}
            {activeTab === "low" && "Produk Stok Menipis"}
            {activeTab === "out" && "Produk Stok Habis"}
            {activeTab === "logs" && "Riwayat Perubahan Stok"}
          </CardTitle>
          <CardDescription>
            {activeTab === "all" && "Daftar semua produk dengan informasi stok"}
            {activeTab === "low" && "Produk dengan stok ≤ 10 unit"}
            {activeTab === "out" && "Produk dengan stok 0"}
            {activeTab === "logs" && "50 aktivitas perubahan stok terbaru"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* All Products Table */}
          {activeTab === "all" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Produk</th>
                    <th className="text-left py-2 px-2">SKU</th>
                    <th className="text-right py-2 px-2">Stok</th>
                    <th className="text-right py-2 px-2">Transaksi</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.products.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="py-2 px-2">{product.name}</td>
                      <td className="py-2 px-2 text-gray-500">{product.sku}</td>
                      <td className={`py-2 px-2 text-right font-semibold ${
                        product.stock === 0 ? "text-red-600" : 
                        product.stock <= 10 ? "text-yellow-600" : ""
                      }`}>
                        {product.stock}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-500">
                        {product._count.stockLogs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Low Stock Products */}
          {activeTab === "low" && (
            <div className="space-y-2">
              {report?.lowStockProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Tidak ada produk dengan stok menipis</p>
              ) : (
                report?.lowStockProducts.map((product) => (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${product.stock === 0 ? "text-red-600" : "text-yellow-600"}`}>
                        {product.stock} unit
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Out of Stock Products */}
          {activeTab === "out" && (
            <div className="space-y-2">
              {report?.outOfStockProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Tidak ada produk yang stoknya habis</p>
              ) : (
                report?.outOfStockProducts.map((product) => (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Stok Habis
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Stock Logs */}
          {activeTab === "logs" && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Belum ada riwayat perubahan stok</p>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      log.type === "in" ? "bg-green-50" : "bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {log.type === "in" ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">{log.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {log.note || (log.type === "in" ? "Tambah stok" : "Kurang stok")} 
                          {" • "}{log.user.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${log.type === "in" ? "text-green-600" : "text-blue-600"}`}>
                        {log.type === "in" ? "+" : "-"}{log.quantity}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(log.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
