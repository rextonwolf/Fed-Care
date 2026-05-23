"use client";

import AuthGuard from "./AuthGuard";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
