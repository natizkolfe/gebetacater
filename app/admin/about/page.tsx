"use client";

import { AboutAdmin } from "@/components/about-admin";
import { useAuth } from "@/components/providers";

export default function AdminAboutPage() {
  const { staff } = useAuth();
  if (!staff) return null;
  return <AboutAdmin />;
}
