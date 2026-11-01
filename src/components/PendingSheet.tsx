"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useData } from "./DataProvider";
import { ListingFacts } from "./ListingCard";
import { OthersReviews, RatingForm } from "./RatingForm";
import { Sheet } from "./ui";
import { priceLabel } from "@/lib/format";

// quand on revient d'une annonce ouverte depuis l'app, on propose directement de la noter
export function PendingSheet() {
  const { pending, clearPending, byId, me, loading } = useData();
  const pathname = usePathname();
  const l = pending ? byId.get(pending) : undefined;
  if (loading || !l || pathname === `/offre/${l.id}`) return null;
  return (
    <Sheet
      open
      onClose={clearPending}
      title={
        <div className="min-w-0">
          <div className="text-xs font-normal text-slate-500">Alors, cette annonce ?</div>
          <div className="truncate">
            {priceLabel(l.price, l.transaction)} · {l.city}
          </div>
        </div>
      }
    >
      <div className="space-y-5 p-4">
        <div className="space-y-1">
          <ListingFacts l={l} />
          <Link href={`/offre/${l.id}`} onClick={clearPending} className="text-sm text-indigo-600 hover:underline">
            Voir la fiche complète →
          </Link>
        </div>
        <RatingForm key={`${l.id}:${me}`} listingId={l.id} onSaved={() => setTimeout(clearPending, 700)} />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Avis des autres</h3>
          <OthersReviews listingId={l.id} />
        </div>
      </div>
    </Sheet>
  );
}
