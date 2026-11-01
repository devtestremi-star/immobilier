import { Suspense } from "react";
import { ListingDetail } from "@/components/ListingDetail";

export default function OffrePage() {
  return (
    <Suspense>
      <ListingDetail />
    </Suspense>
  );
}
