"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, AlertTriangle } from "lucide-react";

interface StockReport {
  summary: {
    totalProducts: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  lowStockProducts: any[];
  outOfStockProducts: any[];
}

export default function DashboardPage() {
  const [report, setReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const response = await api.getStockReport();
      if (response.success && response.data) {
        setReport(response.data);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
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
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.summary.totalProducts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.summary.totalStock || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{report?.summary.lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">Stok ≤ 10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stok Habis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{report?.summary.outOfStockCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {report?.lowStockProducts && report.lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Produk Stok Menipis</CardTitle>
            <CardDescription>Produk dengan stok ≤ 10</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.lowStockProducts.map((product: any) => (
                <div 
                  key={product.id} 
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${product.stock === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {product.stock} unit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
