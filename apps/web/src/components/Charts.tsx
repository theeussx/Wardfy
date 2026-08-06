import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function ListeningChart({ data }: { data: Array<{ day: string; minutes: number }> }) {
  return (
    <div className="chart chart--listening">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="listening-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a681ff" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#a681ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#ffffff"
            strokeDasharray="2 7"
            strokeOpacity={0.06}
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="day"
            fontSize={11}
            tick={{ fill: '#797986' }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={10}
            tick={{ fill: '#6a6a75' }}
            tickLine={false}
            width={30}
          />
          <Tooltip
            cursor={{ stroke: '#a681ff', strokeWidth: 1, strokeOpacity: 0.45 }}
            contentStyle={{
              background: '#1a1a22',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} min`, 'Escuta']}
          />
          <Area
            dataKey="minutes"
            stroke="#b190ff"
            strokeWidth={2.2}
            fill="url(#listening-gradient)"
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DnaRadar({
  data,
  compact = false,
}: {
  data: Array<{ genre: string; value: number }>;
  compact?: boolean;
}) {
  return (
    <div className={`dna-radar ${compact ? 'dna-radar--compact' : ''}`}>
      <ResponsiveContainer height="100%" width="100%">
        <RadarChart cx="50%" cy="50%" data={data} outerRadius={compact ? '68%' : '76%'}>
          <PolarGrid gridType="polygon" stroke="#ffffff" strokeOpacity={0.14} />
          <PolarAngleAxis dataKey="genre" tick={{ fill: '#a9a9b5', fontSize: compact ? 9 : 11 }} />
          <Radar
            dataKey="value"
            fill="#9c74ff"
            fillOpacity={0.38}
            stroke="#c6adff"
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TimelineChart({
  data,
}: {
  data: Array<{ month: string; minutes: number; discoveries: number }>;
}) {
  return (
    <div className="chart chart--timeline">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
          barCategoryGap="30%"
        >
          <defs>
            <linearGradient id="bar-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c5ff48" />
              <stop offset="100%" stopColor="#83c432" />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#ffffff"
            strokeDasharray="2 7"
            strokeOpacity={0.06}
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="month"
            fontSize={11}
            tick={{ fill: '#777782' }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={10}
            tick={{ fill: '#6a6a75' }}
            tickLine={false}
            width={34}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,.035)' }}
            contentStyle={{
              background: '#1a1a22',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value.toLocaleString('pt-BR')} min`, 'Minutos']}
          />
          <Bar dataKey="minutes" fill="url(#bar-gradient)" radius={[6, 6, 1, 1]} maxBarSize={32}>
            {data.map((entry) => (
              <Cell
                fill={entry.month === 'Ago' ? '#c5ff48' : '#8763dc'}
                key={`cell-${entry.month}`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
