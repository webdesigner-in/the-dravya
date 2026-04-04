import { Suspense } from "react";
import OrdersPageClient from "./OrdersPageClient";

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          Loading orders…
        </div>
      }
    >
      <OrdersPageClient />
    </Suspense>
  );
}
