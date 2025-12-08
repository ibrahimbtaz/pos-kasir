"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Camera, QrCode, Package, CheckCircle, XCircle, AlertTriangle, Upload, Image } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface ScanResult {
  success: boolean;
  product?: {
    id: number;
    name: string;
    sku: string;
    stock: number;
    price: number;
  };
  message: string;
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [isHttps, setIsHttps] = useState(true);
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we're on HTTPS or localhost
    if (typeof window !== 'undefined') {
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
      setIsHttps(isSecure);
      
      // If not secure, default to upload mode
      if (!isSecure) {
        setScanMode('upload');
      }
    }

    // Get available cameras on mount
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera on mobile
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
          setCameraError(null);
        } else {
          setCameraError("Tidak ada kamera yang terdeteksi");
        }
      })
      .catch((err) => {
        console.error("Error getting cameras:", err);
        if (!isHttps) {
          setCameraError("Kamera membutuhkan HTTPS. Gunakan mode Upload Gambar QR.");
        } else {
          setCameraError("Tidak dapat mengakses kamera. Pastikan Anda mengizinkan akses kamera di browser.");
        }
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    setCameraError(null);
    
    if (!selectedCamera) {
      setCameraError("Pilih kamera terlebih dahulu");
      return;
    }

    try {
      const scanner = new Html5Qrcode("qr-reader", {
        verbose: false,
        formatsToSupport: undefined,
      });
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        async (decodedText) => {
          await handleScan(decodedText);
          // Pause briefly to avoid multiple scans
          await scanner.pause();
          setTimeout(() => {
            if (scannerRef.current) {
              scanner.resume();
            }
          }, 2000);
        },
        (errorMessage) => {
          // Ignore scan frame errors (these are normal when no QR is in view)
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setCameraError(
        err.message || "Tidak dapat memulai scanner. Pastikan kamera tidak digunakan aplikasi lain."
      );
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Handle file upload for QR scanning
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode("qr-reader-upload");
      const result = await scanner.scanFile(file, true);
      await handleScan(result);
      scanner.clear();
    } catch (err: any) {
      console.error("Error scanning file:", err);
      toast({
        variant: "destructive",
        title: "Gagal Scan",
        description: "Tidak dapat membaca QR Code dari gambar. Pastikan gambar berisi QR Code yang jelas.",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScan = async (qrCode: string) => {
    try {
      const response = await api.scanQR(qrCode);
      
      const result: ScanResult = {
        success: response.success,
        product: response.data?.product,
        message: response.message || "Unknown error",
      };

      setLastResult(result);
      setScanHistory((prev) => [result, ...prev].slice(0, 10));

      if (response.success) {
        toast({
          title: "Scan Berhasil",
          description: response.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Scan Gagal",
          description: response.message,
        });
      }
    } catch (error) {
      const result: ScanResult = {
        success: false,
        message: "Terjadi kesalahan saat scan",
      };
      setLastResult(result);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat scan",
      });
    }
  };

  const handleManualScan = async () => {
    if (!manualCode.trim()) return;
    await handleScan(manualCode.trim());
    setManualCode("");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scan QR Code</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner
            </CardTitle>
            <CardDescription>
              Scan QR code produk untuk mengurangi stok
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* HTTPS Warning for Mobile */}
            {!isHttps && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium">Mode HTTP Terdeteksi</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Kamera membutuhkan HTTPS. Gunakan <strong>Upload Gambar QR</strong> atau <strong>Input Manual SKU</strong> sebagai alternatif.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scan Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={scanMode === 'camera' ? 'default' : 'outline'}
                onClick={() => setScanMode('camera')}
                className="flex-1"
                disabled={!isHttps && cameras.length === 0}
              >
                <Camera className="h-4 w-4 mr-2" />
                Kamera
              </Button>
              <Button
                variant={scanMode === 'upload' ? 'default' : 'outline'}
                onClick={() => setScanMode('upload')}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Gambar
              </Button>
            </div>

            {/* Camera Mode */}
            {scanMode === 'camera' && (
              <>
                {/* Camera Error */}
                {cameraError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-medium">Kesalahan Kamera</p>
                      <p className="text-red-600 text-sm">{cameraError}</p>
                    </div>
                  </div>
                )}

                {/* Camera Selection */}
                {cameras.length > 0 && !scanning && (
                  <div>
                    <Label>Pilih Kamera</Label>
                    <select
                      className="w-full mt-2 p-2 border rounded-md"
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                    >
                      {cameras.map((camera) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.label || `Camera ${camera.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* QR Reader Container */}
                <div 
                  id="qr-reader" 
                  className={`w-full bg-black rounded-lg overflow-hidden ${scanning ? 'block' : 'hidden'}`}
                  style={{ minHeight: '350px' }}
                ></div>

                {!scanning ? (
                  <Button 
                    onClick={startScanning} 
                    className="w-full"
                    disabled={cameras.length === 0}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {cameras.length === 0 ? 'Kamera tidak tersedia' : 'Mulai Scan'}
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={stopScanning} className="w-full">
                    Berhenti Scan
                  </Button>
                )}
              </>
            )}

            {/* Upload Mode */}
            {scanMode === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Upload gambar QR Code dari galeri
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="qr-upload"
                  />
                  <label htmlFor="qr-upload">
                    <Button asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Pilih Gambar
                      </span>
                    </Button>
                  </label>
                  {/* Hidden element for file scanning */}
                  <div id="qr-reader-upload" className="hidden"></div>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Foto QR code produk, lalu upload gambarnya di sini
                </p>
              </div>
            )}

            {/* Manual Input */}
            <div className="pt-4 border-t">
              <Label>Input Manual (SKU)</Label>
              <p className="text-sm text-gray-500 mb-2">
                Masukkan kode SKU produk langsung
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: PRD001"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
                />
                <Button onClick={handleManualScan}>Cari</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Section */}
        <div className="space-y-4">
          {/* Last Scan Result */}
          {lastResult && (
            <Card className={lastResult.success ? "border-green-500" : "border-red-500"}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  {lastResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Hasil Scan Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastResult.success && lastResult.product ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Produk</span>
                      <span className="font-semibold">{lastResult.product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SKU</span>
                      <span>{lastResult.product.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Harga</span>
                      <span>{formatPrice(Number(lastResult.product.price))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stok Tersisa</span>
                      <span className={`font-bold ${lastResult.product.stock <= 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {lastResult.product.stock}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">{lastResult.message}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scan History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Riwayat Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Belum ada riwayat scan</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {scanHistory.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded ${
                        item.success ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {item.product?.name || item.message}
                        </span>
                      </div>
                      {item.product && (
                        <span className="text-sm text-gray-500">
                          Stok: {item.product.stock}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
