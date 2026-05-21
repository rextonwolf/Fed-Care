"use client";

import Link from "next/link";

export default function Sidebar() {

  return (

    <div className="w-64 h-screen bg-black text-white p-6">

      <h1 className="text-2xl font-bold mb-10">
        Federated AI
      </h1>

      <div className="flex flex-col gap-5">

        <Link href="/dashboard">
          Dashboard
        </Link>

        <Link href="/prediction">
          Prediction
        </Link>

        <Link href="/explainability">
          Explainability
        </Link>

        <Link href="/fairness">
          Fairness
        </Link>

        <Link href="/federated">
          Federated
        </Link>

        <Link href="/audit">
          Audit Logs
        </Link>

      </div>

    </div>
  );
}