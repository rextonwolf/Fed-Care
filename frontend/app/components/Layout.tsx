"use client";

import { motion } from "framer-motion";
import Sidebar from "./Sidebar";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Sidebar />
      <main className="app-shell-bg relative ml-64 h-dvh overflow-y-auto overflow-x-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            aria-hidden="true"
            className="absolute -top-24 right-8 h-72 w-72 rounded-full bg-cyan-300/10 blur-2xl"
            animate={{ x: [0, 18, 0], y: [0, 10, 0], opacity: [0.45, 0.65, 0.45] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute bottom-[-6rem] left-[-4rem] h-80 w-80 rounded-full bg-sky-300/10 blur-2xl"
            animate={{ x: [0, -14, 0], y: [0, -8, 0], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/35 to-transparent" />
        </div>

        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
