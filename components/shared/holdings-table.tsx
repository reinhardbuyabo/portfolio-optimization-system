"use client";

import { useState } from "react";
import { getPortfolioByIdWithRelations, updatePortfolioAllocations } from "@/lib/actions/portfolios.actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

type HoldingsTableProps = {
  portfolioId: string;
  allocations: NonNullable<Awaited<ReturnType<typeof getPortfolioByIdWithRelations>>>["allocations"];
};

export function HoldingsTable({ portfolioId, allocations: initialAllocations }: HoldingsTableProps) {
  const [allocations, setAllocations] = useState(initialAllocations.map(a => ({...a, weight: a.weight * 100})));
  const [isLoading, setIsLoading] = useState(false);


  const handleWeightChange = (assetId: string, newWeight: string) => {
    const weightValue = parseFloat(newWeight);
    const newAllocations = allocations.map((alloc) =>
      alloc.assetId === assetId ? { ...alloc, weight: isNaN(weightValue) ? 0 : weightValue } : alloc
    );
    setAllocations(newAllocations);
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    const totalWeight = allocations.reduce((sum, alloc) => sum + alloc.weight, 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error("The sum of all asset weights must be 100%.");
      setIsLoading(false);
      return;
    }

    const result = await updatePortfolioAllocations(
      portfolioId,
      allocations.map(a => ({assetId: a.assetId, weight: a.weight / 100}))
    );

    if (result.success) {
      toast.success("Portfolio allocations updated successfully.");
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Weight (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No holdings in this portfolio yet.
                </TableCell>
              </TableRow>
            ) : (
              allocations.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell>{allocation.asset.name}</TableCell>
                  <TableCell>{allocation.asset.ticker}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={allocation.weight}
                      onChange={(e) => handleWeightChange(allocation.assetId, e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {allocations.length > 0 && (
          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveChanges} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
