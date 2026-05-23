"use client";

import Sidebar from "./Sidebar";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Sidebar />
      <main className="app-shell-bg ml-64 h-dvh overflow-y-auto overflow-x-hidden p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
