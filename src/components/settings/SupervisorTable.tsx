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
import { Edit, Lock, MoreVertical, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupervisorEditDialog } from './SupervisorEditDialog';
import { deleteSupervisor, updateSupervisorPassword } from '@/Services/supervisorService';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  // Reuse this dialog state for "See/Change Password"
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleUpdatePassword = async () => {
    if (!selectedSupervisor) return;
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Password cannot be empty",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    const res = await updateSupervisorPassword(selectedSupervisor.id, newPassword);

    if (res.error) {
      toast({
        title: "Update Failed",
        description: res.error?.message ?? "Failed to update password",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Password updated successfully.",
    });

    setIsPasswordDialogOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSelectedSupervisor(null);
  };

  const openPasswordDialog = (supervisor: Supervisor) => {
    setSelectedSupervisor(supervisor);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordDialogOpen(true);
  }

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
                      <DropdownMenuItem onClick={() => openPasswordDialog(supervisor)}>
                        <Eye className="mr-2 h-4 w-4" />
                        See Password
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

      {/* View/Update Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Details</DialogTitle>
            <DialogDescription>
              Update password for {selectedSupervisor?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                value="●●●●●●●●"
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Existing password is encrypted and cannot be displayed.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-[0.8rem] text-muted-foreground">
                Enter a new password directly to change it.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePassword}>
              Save New Password
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
