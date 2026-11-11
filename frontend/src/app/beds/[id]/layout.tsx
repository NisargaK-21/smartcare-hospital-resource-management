import { Suspense } from "react";

export default function BedDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}
    >
      {children}
    </Suspense>
  );
}
