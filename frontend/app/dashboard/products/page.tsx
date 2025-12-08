"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Search, QrCode, Package as PackageIcon } from "lucide-react";
import QRCode from "qrcode";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  qrCode: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState("");
  const [stockAction, setStockAction] = useState<"in" | "out">("in");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockNote, setStockNote] = useState("");
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: 0,
    stock: 0,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.getProducts({ search, limit: 100 });
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data produk",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadProducts();
  };

  const handleAddProduct = async () => {
    try {
      const response = await api.createProduct(formData);
      if (response.success) {
        toast({ title: "Sukses", description: "Produk berhasil ditambahkan" });
        setShowAddDialog(false);
        resetForm();
        loadProducts();
      } else {
        toast({ variant: "destructive", title: "Error", description: response.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal menambahkan produk" });
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;
    try {
      const response = await api.updateProduct(selectedProduct.id, {
        name: formData.name,
        sku: formData.sku,
        price: formData.price,
      });
      if (response.success) {
        toast({ title: "Sukses", description: "Produk berhasil diupdate" });
        setShowEditDialog(false);
        resetForm();
        loadProducts();
      } else {
        toast({ variant: "destructive", title: "Error", description: response.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal mengupdate produk" });
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      const response = await api.deleteProduct(selectedProduct.id);
      if (response.success) {
        toast({ title: "Sukses", description: "Produk berhasil dihapus" });
        setShowDeleteDialog(false);
        setSelectedProduct(null);
        loadProducts();
      } else {
        toast({ variant: "destructive", title: "Error", description: response.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal menghapus produk" });
    }
  };

  const handleStockAction = async () => {
    if (!selectedProduct) return;
    try {
      const response = stockAction === "in" 
        ? await api.addStock(selectedProduct.id, stockQuantity, stockNote)
        : await api.reduceStock(selectedProduct.id, stockQuantity, stockNote);
      
      if (response.success) {
        toast({ title: "Sukses", description: response.message });
        setShowStockDialog(false);
        setStockQuantity(1);
        setStockNote("");
        loadProducts();
      } else {
        toast({ variant: "destructive", title: "Error", description: response.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal mengupdate stok" });
    }
  };

  const showQR = async (product: Product) => {
    setSelectedProduct(product);
    try {
      const qrImage = await QRCode.toDataURL(product.qrCode, { width: 200 });
      setQrCodeImage(qrImage);
      setShowQRDialog(true);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal generate QR Code" });
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      stock: product.stock,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const openStockDialog = (product: Product, action: "in" | "out") => {
    setSelectedProduct(product);
    setStockAction(action);
    setStockQuantity(1);
    setStockNote("");
    setShowStockDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: "", sku: "", price: 0, stock: 0 });
    setSelectedProduct(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
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
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold">Manajemen Produk</h1>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => showQR(product)}>
                  <QrCode className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Harga</span>
                  <span className="font-semibold">{formatPrice(Number(product.price))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Stok</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openStockDialog(product, "out")}
                      disabled={product.stock === 0}
                    >
                      -
                    </Button>
                    <span className={`font-semibold px-2 ${product.stock <= 10 ? 'text-red-600' : ''}`}>
                      {product.stock}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openStockDialog(product, "in")}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openEditDialog(product)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openDeleteDialog(product)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Hapus
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <PackageIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Belum ada produk</h3>
          <p className="text-gray-500">Tambahkan produk pertama Anda</p>
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Produk Baru</DialogTitle>
            <DialogDescription>Masukkan detail produk</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nama Produk</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="price">Harga</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="stock">Stok Awal</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddProduct}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Produk</DialogTitle>
            <DialogDescription>Ubah detail produk</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nama Produk</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-sku">SKU</Label>
              <Input
                id="edit-sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Harga</Label>
              <Input
                id="edit-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleEditProduct}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Produk</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus produk &quot;{selectedProduct?.name}&quot;? 
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>{selectedProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeImage && (
              <img src={qrCodeImage} alt="QR Code" className="w-48 h-48" />
            )}
            <p className="text-sm text-gray-500">{selectedProduct?.qrCode}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQRDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Action Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockAction === "in" ? "Tambah Stok" : "Kurangi Stok"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Stok saat ini: {selectedProduct?.stock}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Jumlah</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="note">Catatan (opsional)</Label>
              <Input
                id="note"
                value={stockNote}
                onChange={(e) => setStockNote(e.target.value)}
                placeholder="Contoh: Restok dari supplier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockDialog(false)}>Batal</Button>
            <Button onClick={handleStockAction}>
              {stockAction === "in" ? "Tambah" : "Kurangi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
