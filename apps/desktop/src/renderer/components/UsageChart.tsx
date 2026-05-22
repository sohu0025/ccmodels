import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DailyUsage, ProviderUsageSummary } from '@ccmodels/shared';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export function DailyCostChart({ data }: { data: DailyUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' } } />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' } } />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Bar dataKey="cost" fill="var(--color-accent)" radius={[6, 6, 0, 0]} name="Cost ($)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TokenChart({ data }: { data: DailyUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' } } />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' } } />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Line type="monotone" dataKey="promptTokens" stroke="#6366f1" name="Prompt" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="completionTokens" stroke="#22c55e" name="Completion" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
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
          outerRadius={90}
          innerRadius={50}
          label={({ providerName, percent }) => `${providerName} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
