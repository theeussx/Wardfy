interface HeatmapProps {
  data: Array<{ day: string; hour: number; value: number }>;
  compact?: boolean;
}

const labels = ['00', '04', '08', '12', '16', '20'];

export function Heatmap({ data, compact = false }: HeatmapProps) {
  const days = [...new Set(data.map((item) => item.day))];
  return (
    <div className={`heatmap ${compact ? 'heatmap--compact' : ''}`}>
      <div className="heatmap__hours">
        <span />
        {labels.map((hour) => (
          <span key={hour}>{hour}h</span>
        ))}
      </div>
      <div className="heatmap__body">
        {days.map((day) => (
          <div className="heatmap__row" key={day}>
            <span className="heatmap__day">{day}</span>
            <div className="heatmap__cells">
              {data
                .filter((item) => item.day === day)
                .map((item) => (
                  <i
                    aria-label={`${day}, ${String(item.hour).padStart(2, '0')}h: intensidade ${item.value}`}
                    className={`heatmap__cell heatmap__cell--${item.value}`}
                    key={`${item.day}-${item.hour}`}
                    title={`${day}, ${String(item.hour).padStart(2, '0')}h`}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="heatmap__legend">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((value) => (
          <i className={`heatmap__cell heatmap__cell--${value}`} key={value} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
