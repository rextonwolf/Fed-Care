"use client";

import Layout from "../components/Layout";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const predictionData = [
  { name: "Low Risk", patients: 4200 },
  { name: "Medium Risk", patients: 3100 },
  { name: "High Risk", patients: 2700 }
];

const federatedData = [
  { hospital: "Hospital A", rounds: 12 },
  { hospital: "Hospital B", rounds: 10 },
  { hospital: "Hospital C", rounds: 14 }
];

const COLORS = [
  "#22c55e",
  "#facc15",
  "#ef4444"
];

export default function DashboardPage() {

  return (

    <Layout>

      <div className="p-8 bg-gray-100 min-h-screen">

        <h1 className="text-4xl font-bold text-black mb-8">
          Healthcare AI Dashboard
        </h1>

        {/* KPI Cards */}

        <div className="grid grid-cols-4 gap-6 mb-10">

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <p className="text-gray-500">
              Total Predictions
            </p>

            <h2 className="text-4xl font-bold text-black mt-2">
              14,000
            </h2>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <p className="text-gray-500">
              ROC-AUC
            </p>

            <h2 className="text-4xl font-bold text-black mt-2">
              0.792
            </h2>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <p className="text-gray-500">
              Federated Clients
            </p>

            <h2 className="text-4xl font-bold text-black mt-2">
              3
            </h2>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <p className="text-gray-500">
              Model Version
            </p>

            <h2 className="text-2xl font-bold text-black mt-2">
              FTTransformer v1
            </h2>
          </div>

        </div>


        {/* Charts */}

        <div className="grid grid-cols-2 gap-8">

          {/* Risk Distribution */}

          <div className="bg-white p-6 rounded-2xl shadow-md">

            <h2 className="text-2xl font-bold text-black mb-6">
              Risk Distribution
            </h2>

            <ResponsiveContainer width="100%" height={300}>

              <PieChart>

                <Pie
                  data={predictionData}
                  dataKey="patients"
                  outerRadius={110}
                  label
                >

                  {predictionData.map((entry, index) => (

                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />

                  ))}

                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>

          </div>


          {/* Federated Clients */}

          <div className="bg-white p-6 rounded-2xl shadow-md">

            <h2 className="text-2xl font-bold text-black mb-6">
              Federated Training Rounds
            </h2>

            <ResponsiveContainer width="100%" height={300}>

              <BarChart data={federatedData}>

                <XAxis dataKey="hospital" />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="rounds"
                  fill="#000000"
                  radius={[8, 8, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>

    </Layout>
  );
}