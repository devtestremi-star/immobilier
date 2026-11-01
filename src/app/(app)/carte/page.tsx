import { Suspense } from "react";
import { OffersView } from "@/components/OffersView";

export const metadata = { title: "Carte – Maison" };

export default function CartePage() {
  return (
    <Suspense>
      <OffersView mode="map" />
    </Suspense>
  );
}
