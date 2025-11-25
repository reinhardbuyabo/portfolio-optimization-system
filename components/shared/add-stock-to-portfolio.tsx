"use client";

import { useState, useEffect } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { addStockToPortfolio } from "@/lib/actions/portfolios.actions";

export function AddStockToPortfolio({ portfolioId }: { portfolioId: string }) {
  const [assets, setAssets] = useState<{ value: string; label: string }[]>([]);
  const [selectedAsset, setSelectedAsset] = useState("");

  useEffect(() => {
    async function fetchAssets() {
      const response = await fetch("/api/assets");
      const data = await response.json();
      setAssets(
        data.map((asset: { id: string; ticker: string; name: string; sector?: string }) => ({
          value: asset.id,
          label: `${asset.ticker} - ${asset.name}${asset.sector ? ` (${asset.sector})` : ""}`,
        }))
      );
    }
    fetchAssets();
  }, []);

  const handleAddStock = async () => {
    if (selectedAsset) {
      await addStockToPortfolio(portfolioId, selectedAsset);
      // TODO: Refresh the page or update the state to show the new stock
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Combobox
        options={assets}
        value={selectedAsset}
        onChange={setSelectedAsset}
        placeholder="Select a stock..."
      />
      <Button onClick={handleAddStock}>Add Stock</Button>
    </div>
  );
}
