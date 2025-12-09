"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Camera, QrCode, Package, CheckCircle, XCircle, AlertTriangle, Upload, Image, Minus, Plus, ShoppingCart } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface ScannedProduct {
  id: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
}

interface TransactionItem {
  product: ScannedProduct;
  quantity: number;
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [isHttps, setIsHttps] = useState(true);
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [lastScannedSku, setLastScannedSku] = useState<string>("");
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

  // handleScan hanya mencari produk, TIDAK mengurangi stok
  const handleScan = async (qrCode: string) => {
    // Prevent duplicate scans of the same product
    if (qrCode === lastScannedSku && scannedProduct) {
      toast({
        title: "Produk Sudah Dipindai",
        description: `${scannedProduct.name} sudah ada. Atur jumlah lalu klik Tambah ke Keranjang.`,
      });
      return;
    }

    try {
      // Cari produk berdasarkan QR/SKU (tidak mengurangi stok)
      const response = await api.getProductByQR(qrCode);
      
      if (response.success && response.data) {
        const product = response.data;
        setScannedProduct(product);
        setLastScannedSku(qrCode);
        setQuantity(1);
        
        toast({
          title: "Produk Ditemukan",
          description: `${product.name} - Stok: ${product.stock}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Produk Tidak Ditemukan",
          description: response.message || "QR Code tidak terdaftar",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat mencari produk",
      });
    }
  };

  // Tambah ke keranjang (belum kurangi stok)
  const addToCart = () => {
    if (!scannedProduct) return;
    
    if (quantity > scannedProduct.stock) {
      toast({
        variant: "destructive",
        title: "Stok Tidak Cukup",
        description: `Stok tersedia: ${scannedProduct.stock}`,
      });
      return;
    }

    if (quantity < 1) {
      toast({
        variant: "destructive",
        title: "Jumlah Tidak Valid",
        description: "Jumlah minimal adalah 1",
      });
      return;
    }

    // Check if product already in cart
    const existingIndex = transactionItems.findIndex(
      item => item.product.id === scannedProduct.id
    );

    if (existingIndex >= 0) {
      // Update quantity
      const newItems = [...transactionItems];
      const newQty = newItems[existingIndex].quantity + quantity;
      
      if (newQty > scannedProduct.stock) {
        toast({
          variant: "destructive",
          title: "Stok Tidak Cukup",
          description: `Total di keranjang melebihi stok tersedia (${scannedProduct.stock})`,
        });
        return;
      }
      
      newItems[existingIndex].quantity = newQty;
      setTransactionItems(newItems);
    } else {
      // Add new item
      setTransactionItems([...transactionItems, { product: scannedProduct, quantity }]);
    }

    toast({
      title: "Ditambahkan ke Keranjang",
      description: `${scannedProduct.name} x${quantity}`,
    });

    // Reset for next scan
    setScannedProduct(null);
    setLastScannedSku("");
    setQuantity(1);
  };

  // Hapus item dari keranjang
  const removeFromCart = (index: number) => {
    setTransactionItems(transactionItems.filter((_, i) => i !== index));
  };

  // Proses transaksi - kurangi stok semua item
  const processTransaction = async () => {
    if (transactionItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Keranjang Kosong",
        description: "Tambahkan produk ke keranjang terlebih dahulu",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Proses setiap item
      for (const item of transactionItems) {
        await api.reduceStock(
          item.product.id, 
          item.quantity, 
          "Penjualan via scan QR"
        );
      }

      const totalItems = transactionItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = transactionItems.reduce(
        (sum, item) => sum + (Number(item.product.price) * item.quantity), 
        0
      );

      toast({
        title: "Transaksi Berhasil! ✓",
        description: `${totalItems} item - Total: ${formatPrice(totalPrice)}`,
      });

      // Reset semua
      setTransactionItems([]);
      setScannedProduct(null);
      setLastScannedSku("");
      setQuantity(1);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memproses transaksi",
      });
    } finally {
      setIsProcessing(false);
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
          {/* Scanned Product - Confirmation */}
          {scannedProduct && (
            <Card className="border-blue-500 border-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Produk Ditemukan
                </CardTitle>
                <CardDescription>
                  Atur jumlah lalu tambahkan ke keranjang
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nama</span>
                    <span className="font-semibold">{scannedProduct.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">SKU</span>
                    <span>{scannedProduct.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Harga</span>
                    <span className="font-semibold">{formatPrice(Number(scannedProduct.price))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stok Tersedia</span>
                    <span className={`font-bold ${scannedProduct.stock <= 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {scannedProduct.stock}
                    </span>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="pt-4 border-t">
                  <Label>Jumlah</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max={scannedProduct.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(Math.min(scannedProduct.stock, quantity + 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Subtotal: {formatPrice(Number(scannedProduct.price) * quantity)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setScannedProduct(null);
                      setLastScannedSku("");
                    }}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button onClick={addToCart} className="flex-1">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Tambah ke Keranjang
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shopping Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Keranjang ({transactionItems.length} item)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactionItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Keranjang kosong. Scan produk untuk menambahkan.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Cart Items */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transactionItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatPrice(Number(item.product.price))} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            {formatPrice(Number(item.product.price) * item.quantity)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total</span>
                      <span>
                        {formatPrice(
                          transactionItems.reduce(
                            (sum, item) => sum + Number(item.product.price) * item.quantity,
                            0
                          )
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {transactionItems.reduce((sum, item) => sum + item.quantity, 0)} item
                    </p>
                  </div>

                  {/* Process Button */}
                  <Button 
                    onClick={processTransaction} 
                    className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      "Memproses..."
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Proses Transaksi
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
