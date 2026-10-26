/** Shown while a screen loads during navigation (pages read the signed-in family, so they stream in). */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <div className="h-8 w-48 rounded-full bg-card" />
      <div className="h-40 rounded-2xl bg-card" />
      <div className="h-40 rounded-2xl bg-card" />
    </div>
  );
}
