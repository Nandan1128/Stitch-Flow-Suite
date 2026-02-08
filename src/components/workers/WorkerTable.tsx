// src/components/workers/WorkerTable.tsx
import React, { useState } from "react";
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
import { Clipboard, Edit, MoreVertical, Eye, User, Phone, MapPin, Hash, Calendar } from "lucide-react";
import { Worker } from "@/types/worker";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { WorkerDetailsSheet } from "./WorkerDetailsSheet";
import { WorkerOperationsDialog } from "./WorkerOperationsDialog";
import { EditWorkerDialog } from "./EditWorkerDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";

interface WorkerTableProps {
  workers: Worker[];
  onUpdateWorker: (id: string, updatedWorker: Partial<Worker>) => void;
}

export const WorkerTable: React.FC<WorkerTableProps> = ({ workers, onUpdateWorker }) => {
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleOpenDetails = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsDetailsOpen(true);
    console.log("WORKER DETAILS OBJECT:", worker);
  };

  const handleOpenOperations = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsOperationsOpen(true);
  };

  const handleOpenEdit = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsEditOpen(true);
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {workers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
            No workers found
          </div>
        ) : (
          workers.map((worker) => {
            const createdAt = worker.createdAt ? new Date(worker.createdAt) : null;
            const createdLabel = createdAt && !isNaN(createdAt.getTime())
              ? format(createdAt, "dd/MM/yyyy")
              : "—";

            return (
              <Card key={worker.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none">{worker.name}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Hash className="w-3 h-3 mr-1" />
                          {worker.workerId}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2 -mt-2">
                          <MoreVertical className="h-4 w-4" />
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
                  </div>

                  <div className="grid grid-cols-1 gap-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="w-4 h-4 mr-2" />
                      {worker.mobileNumber || "No mobile"}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{worker.currentAddress || "No address"}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground border-t pt-2 mt-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-xs">Joined: {createdLabel}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => handleOpenOperations(worker)}
                    >
                      <Clipboard className="h-3 w-3 mr-1.5" />
                      Operations
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => handleOpenDetails(worker)}
                    >
                      <Eye className="h-3 w-3 mr-1.5" />
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        {selectedWorker && (
          <>
            <WorkerDetailsSheet worker={selectedWorker} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
            <WorkerOperationsDialog
              workerId={selectedWorker.id}
              workerName={selectedWorker.name}
              open={isOperationsOpen}
              onOpenChange={setIsOperationsOpen}
            />
            <EditWorkerDialog open={isEditOpen} onOpenChange={setIsEditOpen} worker={selectedWorker} onUpdate={onUpdateWorker} />
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker Name</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Current Address</TableHead>
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
            workers.map((worker) => {
              const createdAt = worker.createdAt ? new Date(worker.createdAt) : null;
              const createdLabel = createdAt && !isNaN(createdAt.getTime())
                ? format(createdAt, "dd/MM/yyyy")
                : "—";

              return (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">{worker.name}</TableCell>
                  <TableCell>{worker.workerId}</TableCell>
                  <TableCell>{worker.mobileNumber}</TableCell>
                  <TableCell className="truncate max-w-[200px]">{worker.currentAddress}</TableCell>
                  <TableCell>{createdLabel}</TableCell>
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
              );
            })
          )}
        </TableBody>
      </Table>

      {selectedWorker && (
        <>
          <WorkerDetailsSheet worker={selectedWorker} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
          <WorkerOperationsDialog
            workerId={selectedWorker.id}
            workerName={selectedWorker.name}
            open={isOperationsOpen}
            onOpenChange={setIsOperationsOpen}
          />
          <EditWorkerDialog open={isEditOpen} onOpenChange={setIsEditOpen} worker={selectedWorker} onUpdate={onUpdateWorker} />
        </>
      )}
    </>
  );
};
