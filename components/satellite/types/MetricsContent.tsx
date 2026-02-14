'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Star, Plus, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricDataPoint {
  value: number;
  date: string;
}

interface Metric {
  id: string;
  label: string;
  value: number;
  unit: string;
  target: number | null;
  type: 'number';
  history: MetricDataPoint[];
}

interface MetricsContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
}

function getMetrics(data: Record<string, unknown>): Metric[] {
  const raw = data.metrics;
  if (!Array.isArray(raw)) return [];
  return raw.map((m: any) => ({
    id: m.id || crypto.randomUUID(),
    label: m.label || 'Metric',
    value: Number(m.value) ?? 0,
    unit: m.unit || '',
    target: m.target != null ? Number(m.target) : null,
    type: 'number' as const,
    history: Array.isArray(m.history)
      ? m.history.map((h: any) => ({
          value: Number(h.value) ?? 0,
          date: h.date || new Date().toISOString().slice(0, 10),
        }))
      : [],
  }));
}

function formatDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
}

export function MetricsContent({ subtaskId, satelliteData }: MetricsContentProps) {
  const [metrics, setMetrics] = useState<Metric[]>(() => getMetrics(satelliteData));
  const [primaryMetricId, setPrimaryMetricId] = useState<string | null>(
    (satelliteData.primary_metric_id as string) ?? null
  );
  const [chartType, setChartType] = useState<'line' | 'bar' | 'none'>(
    (satelliteData.chart_type as 'line' | 'bar' | 'none') ?? 'line'
  );
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addUnit, setAddUnit] = useState('');
  const [addTarget, setAddTarget] = useState('');
  const [addDataPointFor, setAddDataPointFor] = useState<string | null>(null);
  const [addDataValue, setAddDataValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMetrics(getMetrics(satelliteData));
    setPrimaryMetricId((satelliteData.primary_metric_id as string) ?? null);
  }, [subtaskId]);

  const save = async (nextMetrics: Metric[], nextPrimary?: string | null, nextChart?: string) => {
    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      metrics: nextMetrics,
      primary_metric_id: nextPrimary ?? primaryMetricId,
      chart_type: nextChart ?? chartType,
    };
    await supabase
      .from('subtasks')
      .update({
        satellite_data: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId);
    setSaving(false);
    setMetrics(nextMetrics);
    if (nextPrimary !== undefined) setPrimaryMetricId(nextPrimary);
    if (nextChart !== undefined) setChartType(nextChart as 'line' | 'bar' | 'none');
  };

  const addMetric = () => {
    const value = parseFloat(addValue) || 0;
    const target = addTarget.trim() ? parseFloat(addTarget) : null;
    const m: Metric = {
      id: crypto.randomUUID(),
      label: addLabel.trim() || 'New Metric',
      value,
      unit: addUnit.trim(),
      target,
      type: 'number',
      history: [{ value, date: new Date().toISOString().slice(0, 10) }],
    };
    const next = [...metrics, m];
    save(next);
    setAddLabel('');
    setAddValue('');
    setAddUnit('');
    setAddTarget('');
    setShowAddMetric(false);
  };

  const addDataPoint = (metricId: string) => {
    const val = parseFloat(addDataValue);
    if (Number.isNaN(val)) return;
    const metric = metrics.find((m) => m.id === metricId);
    if (!metric) return;
    const today = new Date().toISOString().slice(0, 10);
    const history = [...metric.history, { value: val, date: today }].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const next = metrics.map((m) =>
      m.id === metricId ? { ...m, value: val, history } : m
    );
    save(next);
    setAddDataPointFor(null);
    setAddDataValue('');
  };

  const primaryMetric = metrics.find((m) => m.id === primaryMetricId);
  const chartData = primaryMetric?.history ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {chartType !== 'none' && chartData.length > 0 && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            height: 220,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={11}
                />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => formatDate(String(label ?? ''))}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ fill: '#fbbf24', r: 4 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={11}
                />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => formatDate(String(label ?? ''))}
                />
                <Bar dataKey="value" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Chart:</span>
        {(['line', 'bar', 'none'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => save(metrics, undefined, t)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              background: chartType === t ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${chartType === t ? '#fbbf24' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '6px',
              color: chartType === t ? '#fbbf24' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            {t === 'line' ? 'Line' : t === 'bar' ? 'Bar' : 'None'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {metrics.map((m) => {
          const pctTarget =
            m.target != null && m.target !== 0
              ? Math.round((m.value / m.target) * 100)
              : null;
          const prevVal = m.history.length >= 2 ? m.history[m.history.length - 2]?.value : null;
          const localTrend = prevVal != null ? m.value - prevVal : null;

          return (
            <div
              key={m.id}
              style={{
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(251, 191, 36, 0.15)',
                borderRadius: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                    {m.label}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      save(metrics, primaryMetricId === m.id ? null : m.id)
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: primaryMetricId === m.id ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                    }}
                    title={primaryMetricId === m.id ? 'Primary metric (shown on chart)' : 'Set as primary'}
                  >
                    <Star size={16} fill={primaryMetricId === m.id ? '#fbbf24' : 'none'} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24' }}>
                    {m.value}
                    {m.unit}
                  </span>
                  {m.target != null && (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      / {m.target}{m.unit}
                      {pctTarget != null && ` (${pctTarget}%)`}
                    </span>
                  )}
                  {localTrend != null && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: localTrend >= 0 ? '#22c55e' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      {localTrend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {localTrend >= 0 ? '+' : ''}
                      {localTrend}
                    </span>
                  )}
                </div>
              </div>

              {addDataPointFor === m.id ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                  <input
                    type="number"
                    value={addDataValue}
                    onChange={(e) => setAddDataValue(e.target.value)}
                    placeholder="New value"
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addDataPoint(m.id)}
                    disabled={saving || !addDataValue.trim()}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(251, 191, 36, 0.2)',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                      borderRadius: '6px',
                      color: '#fbbf24',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: saving || !addDataValue.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddDataPointFor(null);
                      setAddDataValue('');
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddDataPointFor(m.id)}
                  style={{
                    marginTop: '6px',
                    padding: '6px 10px',
                    background: 'rgba(251, 191, 36, 0.15)',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                    borderRadius: '6px',
                    color: '#fbbf24',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  Add data point
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showAddMetric ? (
        <div
          style={{
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            borderRadius: '12px',
          }}
        >
          <input
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="Metric label"
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: '8px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="number"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              placeholder="Initial value"
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <input
              type="text"
              value={addUnit}
              onChange={(e) => setAddUnit(e.target.value)}
              placeholder="Unit (%)"
              style={{
                width: '80px',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <input
              type="number"
              value={addTarget}
              onChange={(e) => setAddTarget(e.target.value)}
              placeholder="Target (opt)"
              style={{
                width: '100px',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={addMetric}
              disabled={saving}
              style={{
                padding: '10px 16px',
                background: 'rgba(251, 191, 36, 0.2)',
                border: '1px solid rgba(251, 191, 36, 0.5)',
                borderRadius: '8px',
                color: '#fbbf24',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Add Metric
            </button>
            <button
              type="button"
              onClick={() => setShowAddMetric(false)}
              style={{
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddMetric(true)}
          style={{
            padding: '12px 16px',
            background: 'rgba(251, 191, 36, 0.15)',
            border: '1px dashed rgba(251, 191, 36, 0.4)',
            borderRadius: '10px',
            color: '#fbbf24',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          Add Metric
        </button>
      )}

      {metrics.length === 0 && !showAddMetric && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '14px',
          }}
        >
          No metrics yet. Add a metric to track KPIs.
        </div>
      )}
    </div>
  );
}
