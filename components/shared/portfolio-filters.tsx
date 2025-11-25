"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function PortfolioFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const params = new URLSearchParams(searchParams);
    params.set(e.target.name, e.target.value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sortBy", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <form className="flex items-center space-x-4">
      <div>
        <Label htmlFor="investor">Investor</Label>
        <Input
          id="investor"
          name="investor"
          defaultValue={searchParams.get("investor") ?? ""}
          onChange={handleFilterChange}
        />
      </div>
      <div>
        <Label>Sort By</Label>
        <RadioGroup
          defaultValue={searchParams.get("sortBy") ?? "createdAt"}
          onValueChange={handleSortChange}
          className="flex items-center space-x-2"
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="createdAt" id="createdAt" />
            <Label htmlFor="createdAt">Date</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="name" id="name" />
            <Label htmlFor="name">Name</Label>
          </div>
        </RadioGroup>
      </div>
    </form>
  );
}
