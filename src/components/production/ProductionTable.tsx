
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
import { Edit, Scissors, CheckCircle, Clock } from "lucide-react";
import { Production } from '@/types/production';

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
