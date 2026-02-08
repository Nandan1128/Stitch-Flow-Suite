
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Scissors, CheckCircle, Clock, Package, Hash, FileText, Pipette } from "lucide-react";
import { Production } from '@/types/production';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';

interface ProductionTableProps {
  productions: Production[];
  onEditProduction: (id: string) => void;
  onViewOperations: (production: Production) => void;
  activeTab: 'active' | 'completed';
}

export const ProductionTable: React.FC<ProductionTableProps> = ({
  productions,
  onEditProduction,
  onViewOperations,
  activeTab
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {productions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
            No {activeTab} production records found
          </div>
        ) : (
          productions.map((production) => (
            <Card key={production.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{production.productName}</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Hash className="w-3 h-3 mr-1" />
                      {production.production_code}
                    </div>
                  </div>
                  {production.status === 'completed' ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" /> Done
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                      <Clock className="w-3 h-3 mr-1" /> Active
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1">PO:</span>
                    <span className="font-medium">{production.po_number}</span>
                  </div>
                  <div className="flex items-center">
                    <Pipette className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1">Color:</span>
                    <span className="font-medium">{production.color}</span>
                  </div>
                  <div className="flex items-center">
                    <Package className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1">Qty:</span>
                    <span className="font-medium">{production.total_quantity} pcs</span>
                  </div>
                  <div className="flex items-center">
                    <Scissors className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1">Ops:</span>
                    <span className="font-medium">{production.operationsCount ?? 0}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onViewOperations(production)}
                  >
                    <Scissors className="h-4 w-4 mr-2" />
                    Operations
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={() => onEditProduction(production.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Production Name</TableHead>
          <TableHead>Production ID</TableHead>
          <TableHead>P.O Number</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Total Fabric (mtr.)</TableHead>
          <TableHead>Average (P.O)</TableHead>
          <TableHead>Total Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Operations</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
              No {activeTab} production records found
            </TableCell>
          </TableRow>
        ) : (
          productions.map((production) => (
            <TableRow key={production.id}>
              <TableCell>{production.productName}</TableCell>
              <TableCell>{production.production_code}</TableCell>
              <TableCell>{production.po_number}</TableCell>
              <TableCell>{production.color}</TableCell>
              <TableCell>{production.total_fabric} mtr.</TableCell>
              <TableCell>{production.average}</TableCell>
              <TableCell>{production.total_quantity} pcs</TableCell>
              <TableCell>
                {production.status === 'completed' ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" /> Completed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                    <Clock className="w-3 h-3 mr-1" /> Active
                  </Badge>
                )}
              </TableCell>
              <TableCell> {production.operationsCount ?? 0}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewOperations(production)}
                >
                  <Scissors className="h-4 w-4 mr-1" />
                  Operations
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditProduction(production.id)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
