import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Edit, Lock, MoreVertical, Trash2 } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupervisorEditDialog } from './SupervisorEditDialog';
import { deleteSupervisor } from '@/Services/supervisorService';

interface Supervisor {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

interface SupervisorTableProps {
  supervisors: Supervisor[];
  onToggleStatus: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const SupervisorTable: React.FC<SupervisorTableProps> = ({ 
  supervisors,
  onToggleStatus,
  onDelete
}) => {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);

  const handleDelete = () => {
    if (!selectedSupervisor) return;
    
    (async () => {
      const res = await deleteSupervisor(selectedSupervisor.id);
      if (res.error) {
        toast({
          title: "Failed to delete supervisor",
          description: res.error?.message ?? "An error occurred",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Supervisor deleted",
        description: `${selectedSupervisor.name} has been removed.`,
      });

      onDelete?.(selectedSupervisor.id);
    })();
    
    setIsDeleteDialogOpen(false);
    setSelectedSupervisor(null);
  };

  const handleResetPassword = () => {
    if (!selectedSupervisor) return;
    
    // In a real app, this would call an API to reset the password
    toast({
      title: "Password reset",
      description: `A password reset email has been sent to ${selectedSupervisor.email}.`,
    });
    
    setIsResetPasswordDialogOpen(false);
    setSelectedSupervisor(null);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Added On</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {supervisors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No supervisors found
              </TableCell>
            </TableRow>
          ) : (
            supervisors.map((supervisor) => (
              <TableRow key={supervisor.id}>
                <TableCell className="font-medium">{supervisor.name}</TableCell>
                <TableCell>{supervisor.email}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={supervisor.isActive}
                      onCheckedChange={() => onToggleStatus(supervisor.id)}
                    />
                    <Badge variant={supervisor.isActive ? "default" : "outline"}>
                      {supervisor.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{format(supervisor.createdAt, 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedSupervisor(supervisor);
                        setIsEditDialogOpen(true);
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedSupervisor(supervisor);
                        setIsResetPasswordDialogOpen(true);
                      }}>
                        <Lock className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setSelectedSupervisor(supervisor);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedSupervisor?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              This will send a password reset email to {selectedSupervisor?.email}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>
              Send Reset Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Supervisor Dialog */}
      {selectedSupervisor && (
        <SupervisorEditDialog
          supervisor={selectedSupervisor}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </>
  );
};
