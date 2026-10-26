"use client";

import { useTransition } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enterSampleFamily } from "../_components/child-actions";

export function SampleFamilyButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="lg" className="h-12 rounded-full bg-white text-base" disabled={pending} onClick={() => start(() => enterSampleFamily())}>
      <Eye /> {pending ? "Opening…" : "Look around a sample family first"}
    </Button>
  );
}
