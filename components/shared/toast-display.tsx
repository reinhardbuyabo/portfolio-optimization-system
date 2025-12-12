"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";

export function ToastDisplay() {
  const searchParams = useSearchParams();
  const toastMessage = searchParams.get("toast");

  useEffect(() => {
    if (toastMessage) {
      toast.success(decodeURIComponent(toastMessage));
    }
  }, [toastMessage]);

  return null;
}
