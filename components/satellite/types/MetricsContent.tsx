'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveSatelliteData, useInvalidateSatelliteQueries } from '@/lib/satellite/save-satellite-data';
import { toast } from 'sonner';
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
import { Star, Plus, TrendingUp, TrendingDown, Trash2, Pencil } from 'lucide-react';

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
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
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
  const [addDataDate, setAddDataDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingValueFor, setEditingValueFor] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMetrics(getMetrics(satelliteData));
    setPrimaryMetricId((satelliteData.primary_metric_id as string) ?? null);
  }, [subtaskId, satelliteData]);

  const save = async (
    nextMetrics: Metric[],
    nextPrimary?: string | null,
    nextChart?: string,
    activityEntry?: { user_id: string; action: string; detail: string }
  ) => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      metrics: nextMetrics,
      primary_metric_id: nextPrimary ?? primaryMetricId,
      chart_type: nextChart ?? chartType,
    };
    const { error } = await saveSatelliteData(subtaskId, payload, {
      activityEntry,
      onSuccess: () => invalidate(subtaskId),
    });
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
      return;
    }
    setMetrics(nextMetrics);
    if (nextPrimary !== undefined) setPrimaryMetricId(nextPrimary);
    if (nextChart !== undefined) setChartType(nextChart as 'line' | 'bar' | 'none');
  };

  const addMetric = () => {
    const value = parseFloat(addValue) || 0;
    const target = addTarget.trim() ? parseFloat(addTarget) : null;
    const label = addLabel.trim() || 'New Metric';
    const m: Metric = {
      id: crypto.randomUUID(),
      label,
      value,
      unit: addUnit.trim(),
      target,
      type: 'number',
      history: [{ value, date: new Date().toISOString().slice(0, 10) }],
    };
    const next = [m, ...metrics];
    save(next, undefined, undefined, user ? { user_id: user.id, action: 'added_metric', detail: label, actor_name: user.full_name } : undefined);
    setAddLabel('');
    setAddValue('');
    setAddUnit('');
    setAddTarget('');
    setShowAddMetric(false);
  };

  const deleteMetric = (metricId: string) => {
    const m = metrics.find((x) => x.id === metricId);
    const next = metrics.filter((x) => x.id !== metricId);
    const newPrimary = primaryMetricId === metricId ? (next[0]?.id ?? null) : primaryMetricId;
    save(next, newPrimary, undefined, user ? { user_id: user.id, action: 'deleted_metric', detail: m?.label ?? '' } : undefined);
  };

  const addDataPoint = (metricId: string) => {
    const val = parseFloat(addDataValue);
    if (Number.isNaN(val)) return;
    const metric = metrics.find((m) => m.id === metricId);
    if (!metric) return;
    const dateStr = addDataDate || new Date().toISOString().slice(0, 10);
    const history = [...metric.history, { value: val, date: dateStr }].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const next = metrics.map((m) =>
      m.id === metricId ? { ...m, value: val, history } : m
    );
    save(next, undefined, undefined, user ? { user_id: user.id, action: 'added_data_point', detail: `${metric.label}: ${val}`, actor_name: user.full_name } : undefined);
    setAddDataPointFor(null);
    setAddDataValue('');
    setAddDataDate(new Date().toISOString().slice(0, 10));
  };

  const editMetricValue = (metricId: string, newValue: number) => {
    const metric = metrics.find((m) => m.id === metricId);
    if (!metric) return;
    const lastPoint = metric.history[metric.history.length - 1];
    const history = lastPoint
      ? [...metric.history.slice(0, -1), { ...lastPoint, value: newValue }]
      : [{ value: newValue, date: new Date().toISOString().slice(0, 10) }];
    const next = metrics.map((m) =>
      m.id === metricId ? { ...m, value: newValue, history } : m
    );
    save(next, undefined, undefined, user ? { user_id: user.id, action: 'edited_metric', detail: `${metric.label}: ${newValue}` } : undefined);
    setEditingValueFor(null);
    setEditValue('');
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
            onClick={() => save(metrics, undefined, t, undefined)}
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
                      save(metrics, primaryMetricId === m.id ? null : m.id, undefined, user ? { user_id: user.id, action: 'set_primary', detail: m.label, actor_name: user.full_name } : undefined)
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
                  <button
                    type="button"
                    onClick={() => deleteMetric(m.id)}
                    disabled={saving}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      color: 'rgba(239, 68, 68, 0.8)',
                    }}
                    title="Delete metric"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {editingValueFor === m.id ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (() => { const v = parseFloat(editValue); if (!Number.isNaN(v)) editMetricValue(m.id, v); })()}
                        autoFocus
                        style={{
                          width: '80px',
                          padding: '4px 8px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(251,191,36,0.5)',
                          borderRadius: '6px',
                          color: '#fbbf24',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => { const v = parseFloat(editValue); if (!Number.isNaN(v)) editMetricValue(m.id, v); }}
                        disabled={saving || editValue === ''}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(251, 191, 36, 0.2)',
                          border: '1px solid rgba(251, 191, 36, 0.4)',
                          borderRadius: '6px',
                          color: '#fbbf24',
                          fontSize: '12px',
                          cursor: saving || editValue === '' ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingValueFor(null); setEditValue(''); }}
                        style={{
                          padding: '4px 8px',
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
                    <>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24' }}>
                        {m.value}
                        {m.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setEditingValueFor(m.id); setEditValue(String(m.value)); }}
                        disabled={saving}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                        title="Edit value"
                      >
                        <Pencil size={14} />
                      </button>
                    </>
                  )}
                  {editingValueFor !== m.id && (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              {addDataPointFor === m.id ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
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
                  <input
                    type="date"
                    value={addDataDate}
                    onChange={(e) => setAddDataDate(e.target.value)}
                    style={{
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
