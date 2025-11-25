"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Asset {
  id: string;
  ticker: string;
  name: string;
  sector?: string;
}

interface AddStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  existingAssetIds?: string[];
  onSuccess?: () => void;
}

export function AddStockModal({
  open,
  onOpenChange,
  portfolioId,
  existingAssetIds = [],
  onSuccess,
}: AddStockModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/assets");
      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }
      const data = await response.json();
      // Filter out assets already in portfolio
      const availableAssets = data.filter(
        (asset: Asset) => !existingAssetIds.includes(asset.id)
      );
      setAssets(availableAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Failed to load available stocks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!selectedAsset) {
      toast.error("Please select a stock");
      return;
    }

    try {
      setAdding(true);
      const response = await fetch(`/api/portfolios/${portfolioId}/add-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: selectedAsset.ticker,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add stock");
      }

      toast.success("Stock added and portfolio rebalanced equally");
      setSelectedAsset(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add stock"
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Stock to Portfolio</DialogTitle>
          <DialogDescription>
            Select a stock to add. All holdings will be automatically rebalanced
            to equal weights (100% total).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full justify-between"
                disabled={loading}
              >
                {selectedAsset
                  ? `${selectedAsset.ticker} — ${selectedAsset.name}`
                  : "Select stock..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Search stocks by ticker or name..." />
                <CommandList>
                  <CommandEmpty>
                    {loading ? "Loading stocks..." : "No stock found."}
                  </CommandEmpty>
                  <CommandGroup heading="Available Stocks">
                    {assets.map((asset) => (
                      <CommandItem
                        key={asset.id}
                        value={`${asset.ticker} ${asset.name} ${asset.sector || ""}`}
                        onSelect={() => {
                          setSelectedAsset(asset);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedAsset?.id === asset.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{asset.ticker}</span>
                          <span className="text-sm text-muted-foreground">
                            {asset.name}
                            {asset.sector && ` • ${asset.sector}`}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddStock} disabled={!selectedAsset || adding}>
            {adding ? "Adding..." : "Add Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

