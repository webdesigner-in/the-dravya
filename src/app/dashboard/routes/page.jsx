"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function RoutesPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      toast.error("Access denied. Routes management is only accessible to administrators.");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Routes</h1>
      <p className="text-muted-foreground mt-2">Plan and optimize delivery routes</p>
    </div>
  );
}
