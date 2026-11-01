import { Suspense } from "react";
import { OffersView } from "@/components/OffersView";

export default function Home() {
  return (
    <Suspense>
      <OffersView mode="list" />
    </Suspense>
  );
}
