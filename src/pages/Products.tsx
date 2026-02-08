// src/pages/Products.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductTable } from "@/components/products/ProductTable";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { Product } from '@/types/product';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts, updateProduct } from "@/Services/productService";
import { useToast } from "@/hooks/use-toast";

const Products: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const handleAddProduct = async () => {
    await queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  // NOTE: expecting operations array as third argument
  const handleUpdateProduct = async (id: string, updatedProduct: Partial<Product>, operations: any[] = []) => {
    try {
      await updateProduct(id, updatedProduct, operations);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      console.error("handleUpdateProduct error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to save product changes",
        variant: "destructive",
      });
      throw err; // Re-throw so the sheet knows it failed
    }
  };

  const filteredProducts = (products as Product[]).filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.product_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.design_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.color || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Management</CardTitle>
          <CardDescription>View, add, and manage all your production products here.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products by name, code, design no, or color..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {isLoading && <p>Loading products…</p>}
          {error && <p>Error loading products.</p>}

          {!isLoading && !error && (
            <ProductTable products={filteredProducts} onUpdateProduct={handleUpdateProduct} />
          )}
        </CardContent>
      </Card>

      <AddProductDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddProduct={handleAddProduct} />
    </div>
  );
};

export default Products;
