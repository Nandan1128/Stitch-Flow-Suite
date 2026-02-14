import React, { useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, X, Download } from "lucide-react";
import { fetchOperationWiseReport } from "@/Services/reportService";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { ShoppingBag, Hash, Settings, User, Calendar, Box, DollarSign, Wallet } from 'lucide-react';

interface OperationReportData {
    id: string;
    productName: string;
    poNumber: string;
    operationName: string;
    workerName: string;
    date: Date | null;
    quantity: number;
    rate: number;
    total: number;
    productId: string | null;
    operationId: string | null;
    workerId: string | null;
}

const OperationReport: React.FC = () => {
    const { data: reportData, isLoading: loading, refetch } = useQuery({
        queryKey: ["operation-report"],
        queryFn: fetchOperationWiseReport,
    });

    const data = reportData || [];

    const isMobile = useIsMobile();

    // Filter states
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [poNumberFilter, setPoNumberFilter] = useState<string>("");
    const [selectedProduct, setSelectedProduct] = useState<string>("all");
    const [selectedOperation, setSelectedOperation] = useState<string>("all");
    const [selectedWorker, setSelectedWorker] = useState<string>("all");

    // Get unique values for filter dropdowns
    const { products, operations, workers } = useMemo(() => {
        const productSet = new Map<string, string>();
        const operationSet = new Map<string, string>();
        const workerSet = new Map<string, string>();

        data.forEach((item) => {
            if (item.productId && item.productName) {
                productSet.set(item.productId, item.productName);
            }
            if (item.operationId && item.operationName) {
                operationSet.set(item.operationId, item.operationName);
            }
            if (item.workerId && item.workerName) {
                workerSet.set(item.workerId, item.workerName);
            }
        });

        return {
            products: Array.from(productSet.entries()).map(([id, name]) => ({ id, name })),
            operations: Array.from(operationSet.entries()).map(([id, name]) => ({ id, name })),
            workers: Array.from(workerSet.entries()).map(([id, name]) => ({ id, name })),
        };
    }, [data]);

    // Filter data
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            // Date range filter
            if (startDate && item.date) {
                const itemDate = new Date(item.date);
                const start = new Date(startDate);
                if (itemDate < start) return false;
            }
            if (endDate && item.date) {
                const itemDate = new Date(item.date);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Include the entire end date
                if (itemDate > end) return false;
            }

            // PO Number filter
            if (poNumberFilter.trim() !== "") {
                const filterLower = poNumberFilter.toLowerCase();
                if (!item.poNumber.toLowerCase().includes(filterLower)) return false;
            }

            // Product filter
            if (selectedProduct !== "all" && item.productId !== selectedProduct) {
                return false;
            }

            // Operation filter
            if (selectedOperation !== "all" && item.operationId !== selectedOperation) {
                return false;
            }

            // Worker filter
            if (selectedWorker !== "all" && item.workerId !== selectedWorker) {
                return false;
            }

            return true;
        });
    }, [data, startDate, endDate, poNumberFilter, selectedProduct, selectedOperation, selectedWorker]);

    // Calculate summary statistics
    const summary = useMemo(() => {
        return {
            totalOperations: filteredData.length,
            totalQuantity: filteredData.reduce((sum, item) => sum + item.quantity, 0),
            totalAmount: filteredData.reduce((sum, item) => sum + item.total, 0),
        };
    }, [filteredData]);

    // Clear all filters
    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        setPoNumberFilter("");
        setSelectedProduct("all");
        setSelectedOperation("all");
        setSelectedWorker("all");
    };

    // Export to CSV
    const handleExport = () => {
        if (filteredData.length === 0) return;

        // CSV Headers
        const headers = ["Product Name", "PO Number", "Operation", "Worker", "Date", "Quantity", "Rate", "Total"];

        // CSV Rows
        const rows = filteredData.map(item => [
            `"${item.productName.replace(/"/g, '""')}"`,
            `"${item.poNumber.replace(/"/g, '""')}"`,
            `"${item.operationName.replace(/"/g, '""')}"`,
            `"${item.workerName.replace(/"/g, '""')}"`,
            item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '',
            item.quantity,
            item.rate,
            item.total
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `operation_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const hasActiveFilters = startDate || endDate || poNumberFilter ||
        selectedProduct !== "all" || selectedOperation !== "all" || selectedWorker !== "all";

    return (
        <div className="space-y-6">
            <div className={`flex ${isMobile ? "flex-col gap-4" : "items-center justify-between"}`}>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Operation Report</h1>
                    <p className="text-muted-foreground">
                        View detailed operation-wise production reports
                    </p>
                </div>
                <div className={`flex gap-2 ${isMobile ? "w-full" : ""}`}>
                    <Button onClick={handleExport} disabled={filteredData.length === 0} variant="outline" className={isMobile ? "flex-1" : ""}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    {!isMobile && <FileText className="h-8 w-8 text-muted-foreground" />}
                </div>
            </div>

            {/* Summary Cards */}
            <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "md:grid-cols-3"}`}>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Operations</CardDescription>
                        <CardTitle className="text-3xl">{summary.totalOperations}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Quantity</CardDescription>
                        <CardTitle className="text-3xl">{summary.totalQuantity} pcs</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Amount</CardDescription>
                        <CardTitle className="text-3xl">₹{summary.totalAmount.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Filters</CardTitle>
                        {hasActiveFilters && (
                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                <X className="h-4 w-4 mr-1" />
                                Clear All
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3"}`}>
                        {/* Date Range */}
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        {/* PO Number */}
                        <div className="space-y-2">
                            <Label>PO Number</Label>
                            <Input
                                placeholder="Search PO Number..."
                                value={poNumberFilter}
                                onChange={(e) => setPoNumberFilter(e.target.value)}
                            />
                        </div>

                        {/* Product */}
                        <div className="space-y-2">
                            <Label>Product</Label>
                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Products" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Products</SelectItem>
                                    {products.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Operation */}
                        <div className="space-y-2">
                            <Label>Operation</Label>
                            <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Operations" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Operations</SelectItem>
                                    {operations.map((operation) => (
                                        <SelectItem key={operation.id} value={operation.id}>
                                            {operation.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Worker */}
                        <div className="space-y-2">
                            <Label>Worker</Label>
                            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Workers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Workers</SelectItem>
                                    {workers.map((worker) => (
                                        <SelectItem key={worker.id} value={worker.id}>
                                            {worker.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table / Cards */}
            <Card>
                <CardHeader>
                    <CardTitle>Operation Details</CardTitle>
                    <CardDescription>
                        Showing {filteredData.length} of {data.length} operations
                    </CardDescription>
                </CardHeader>
                <CardContent className={isMobile ? "px-2" : ""}>
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : isMobile ? (
                        <div className="space-y-4">
                            {filteredData.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
                                    {data.length === 0 ? "No operation data available" : "No operations match the selected filters"}
                                </div>
                            ) : (
                                filteredData.map((item) => (
                                    <Card key={item.id} className="overflow-hidden border-muted">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Box className="w-4 h-4 text-primary" />
                                                    <h3 className="font-bold text-base leading-tight">{item.productName}</h3>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] h-5">
                                                    {item.poNumber}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                                <div className="flex items-center text-muted-foreground">
                                                    <Settings className="w-3.5 h-3.5 mr-2" />
                                                    <span className="truncate">{item.operationName}</span>
                                                </div>
                                                <div className="flex items-center text-muted-foreground">
                                                    <User className="w-3.5 h-3.5 mr-2" />
                                                    <span className="truncate">{item.workerName}</span>
                                                </div>
                                                <div className="flex items-center text-muted-foreground">
                                                    <Calendar className="w-3.5 h-3.5 mr-2" />
                                                    {item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}
                                                </div>
                                                <div className="flex items-center text-muted-foreground">
                                                    <ShoppingBag className="w-3.5 h-3.5 mr-2" />
                                                    {item.quantity} pcs
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center mt-4 pt-3 border-t">
                                                <div className="flex items-center text-xs text-muted-foreground">
                                                    <DollarSign className="w-3 h-3 mr-1" />
                                                    Rate: ₹{item.rate}
                                                </div>
                                                <div className="flex items-center font-bold text-primary">
                                                    <Wallet className="w-4 h-4 mr-1.5" />
                                                    ₹{item.total.toLocaleString()}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md border max-h-[600px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>PO Number</TableHead>
                                        <TableHead>Operation</TableHead>
                                        <TableHead>Worker</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                                                {data.length === 0 ? "No operation data available" : "No operations match the selected filters"}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredData.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.productName}</TableCell>
                                                <TableCell>{item.poNumber}</TableCell>
                                                <TableCell>{item.operationName}</TableCell>
                                                <TableCell>{item.workerName}</TableCell>
                                                <TableCell>
                                                    {item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">₹{item.rate}</TableCell>
                                                <TableCell className="text-right font-semibold">₹{item.total}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OperationReport;
