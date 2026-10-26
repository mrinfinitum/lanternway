/** Confirmation on the welcome page after someone deletes their account. */
export async function DeletedNotice({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { deleted } = await searchParams;
  if (deleted !== "1") return null;
  return (
    <p role="status" className="mb-6 w-full rounded-2xl bg-amber/25 p-3 text-sm font-semibold ring-1 ring-amber/50">
      Your account and your family&apos;s information were deleted. Thank you for trying Lanternway.
    </p>
  );
}
