import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DailyUsage, ProviderUsageSummary } from '@ccswitch/shared';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export function DailyCostChart({ data }: { data: DailyUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        />
        <Bar dataKey="cost" fill="var(--color-accent)" radius={[4, 4, 0, 0]} name="Cost ($)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TokenChart({ data }: { data: DailyUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        />
        <Line type="monotone" dataKey="promptTokens" stroke="#6366f1" name="Prompt" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="completionTokens" stroke="#22c55e" name="Completion" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ProviderPieChart({ data }: { data: ProviderUsageSummary[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalCost"
          nameKey="providerName"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ providerName }) => providerName}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
