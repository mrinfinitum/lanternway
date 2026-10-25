import Image from "next/image";

/** Photo, or the first initial on amber. Decorative: the name is always shown next to it. */
export function ChildAvatar({ child, size = 40 }: { child: { firstName: string; photoUrl?: string }; size?: number }) {
  if (child.photoUrl) {
    return <Image src={child.photoUrl} alt="" width={size} height={size} className="rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-amber font-extrabold text-teal ring-2 ring-background"
    >
      {child.firstName[0]}
    </span>
  );
}
