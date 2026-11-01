import { Suspense } from "react";
import { DataProvider } from "@/components/DataProvider";
import { NamePrompt } from "@/components/NamePrompt";
import { PendingSheet } from "@/components/PendingSheet";
import { Shell } from "@/components/Shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <DataProvider>
      <Suspense>
        <Shell>{children}</Shell>
        <PendingSheet />
      </Suspense>
      <NamePrompt />
    </DataProvider>
  );
}
