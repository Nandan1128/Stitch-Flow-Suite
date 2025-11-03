
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Clipboard, Edit, MoreVertical, Eye } from "lucide-react";
import { WorkerDetailsSheet } from './WorkerDetailsSheet';
import { WorkerOperationsDialog } from './WorkerOperationsDialog';
import { EditWorkerDialog } from './EditWorkerDialog';
import { Worker } from '@/types/worker';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface WorkerTableProps {
  workers: Worker[];
  onUpdateWorker: (id: string, updatedWorker: Partial<Worker>) => void;
}

export const WorkerTable: React.FC<WorkerTableProps> = ({ 
  workers,
  onUpdateWorker
}) => {
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleOpenDetails = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsDetailsOpen(true);
  };

  const handleOpenOperations = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsOperationsOpen(true);
  };

  const handleOpenEdit = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsEditOpen(true);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker Name</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                No workers found
              </TableCell>
            </TableRow>
          ) : (
            workers.map((worker) => (
              <TableRow key={worker.id}>
                <TableCell className="font-medium">{worker.name}</TableCell>
                <TableCell>{worker.workerId}</TableCell>
                <TableCell>{worker.mobileNumber}</TableCell>
                <TableCell className="truncate max-w-[200px]">{worker.address}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {worker.createdBy}
                  </Badge>
                </TableCell>
                <TableCell>{format(worker.createdAt, 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDetails(worker)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenOperations(worker)}>
                        <Clipboard className="mr-2 h-4 w-4" />
                        View Operations
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(worker)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Worker
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {selectedWorker && (
        <>
          <WorkerDetailsSheet 
            worker={selectedWorker}
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
          />
          <WorkerOperationsDialog
            workerId={selectedWorker.id}
            workerName={selectedWorker.name}
            open={isOperationsOpen}
            onOpenChange={setIsOperationsOpen}
          />
          <EditWorkerDialog
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            worker={selectedWorker}
            onUpdate={onUpdateWorker}
          />
        </>
      )}
    </>
  );
};
