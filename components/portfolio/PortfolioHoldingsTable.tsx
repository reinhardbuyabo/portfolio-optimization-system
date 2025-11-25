"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Allocation {
  id: string;
  weight: number;
  value: number;
  asset: {
    ticker: string;
    name: string;
    sector?: string;
  };
}

interface PortfolioHoldingsTableProps {
  allocations: Allocation[];
  onAddStock: () => void;
}

export function PortfolioHoldingsTable({
  allocations,
  onAddStock,
}: PortfolioHoldingsTableProps) {
  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Holdings</CardTitle>
          <Button onClick={onAddStock} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Stock
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">No holdings yet.</p>
            <Button onClick={onAddStock}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Stock
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Holdings</CardTitle>
        <Button onClick={onAddStock} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Stock
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Weight (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.id}>
                <TableCell className="font-medium">
                  {allocation.asset.ticker}
                </TableCell>
                <TableCell>{allocation.asset.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {allocation.asset.sector || "N/A"}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent(allocation.weight * 100)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

