// src/components/products/ProductTable.tsx
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Edit, Package, Hash, Layers, Pipette, DollarSign, ListChecks } from 'lucide-react';
import { EditProductSheet } from './EditProductSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';

interface ProductTableProps {
  products: Product[];
  onUpdateProduct: (id: string, product: Partial<Product>, operations: any[]) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ products, onUpdateProduct }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditSheetOpen(true);
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
            No products found
          </div>
        ) : (
          products.map((product) => {
            const totalCost = Number(product.material_cost || 0) + Number(product.thread_cost || 0) + Number(product.other_costs || 0);
            return (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none">{product.name}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Hash className="w-3 h-3 mr-1" />
                          {product.product_code}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="-mr-2 -mt-2" onClick={() => handleEditClick(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Layers className="w-4 h-4 mr-2" />
                      <span className="truncate">{product.design_no}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Pipette className="w-4 h-4 mr-2" />
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: product.color.toLowerCase() }} />
                        <span>{product.color}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      ₹{totalCost.toFixed(2)}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <ListChecks className="w-4 h-4 mr-2" />
                      {product.operations?.length || 0} Ops
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => handleEditClick(product)}
                    >
                      <Edit className="h-3 w-3 mr-1.5" />
                      Edit Product
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        <EditProductSheet
          open={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          product={selectedProduct}
          onUpdateProduct={onUpdateProduct}
        />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Product Code</TableHead>
              <TableHead>Design No.</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Operations</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">No products found.</TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const totalCost = Number(product.material_cost || 0) + Number(product.thread_cost || 0) + Number(product.other_costs || 0);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.product_code}</TableCell>
                    <TableCell>{product.design_no}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: product.color.toLowerCase() }} />
                        {product.color}
                      </div>
                    </TableCell>
                    <TableCell>₹{totalCost.toFixed(2)}</TableCell>
                    <TableCell>{product.operations?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(product)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <EditProductSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        product={selectedProduct}
        onUpdateProduct={onUpdateProduct}
      />
    </>
  );
};
