import { render, screen } from '@/test/utils/render';
import {
  categoryColor,
  CATEGORY_COLORS,
  formatCurrency,
  getCSSVar,
} from '@/components/charts/chart-theme';
import { ChartWrapper } from '@/components/charts/ChartWrapper';
import { ChartLegend } from '@/components/charts/ChartLegend';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { CategoryDoughnut } from '@/components/charts/CategoryDoughnut';
import { BarChart } from '@/components/charts/BarChart';
import { SparklineChart } from '@/components/charts/SparklineChart';

// Mock react-chartjs-2 to avoid Chart.js DOM API failures in jsdom
// (Chart.js calls getComputedStyle on canvas.parentNode which is null in jsdom)
vi.mock('react-chartjs-2', () => ({
  Line:   ({ 'aria-label': label }: { 'aria-label'?: string }) => <canvas aria-label={label} />,
  Doughnut: ({ 'aria-label': label }: { 'aria-label'?: string }) => <canvas aria-label={label} />,
  Bar:    ({ 'aria-label': label }: { 'aria-label'?: string }) => <canvas aria-label={label} />,
}));

// ─── chart-theme utilities ────────────────────────────────────────────────────

describe('chart-theme', () => {
  it('categoryColor wraps around palette length', () => {
    expect(categoryColor(0)).toBe(CATEGORY_COLORS[0]);
    expect(categoryColor(20)).toBe(CATEGORY_COLORS[0]); // wraps
    expect(categoryColor(3)).toBe(CATEGORY_COLORS[3]);
  });

  it('formatCurrency formats Indian locale', () => {
    expect(formatCurrency(1000)).toBe('₹1,000');
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('getCSSVar returns fallback when window has no matching var', () => {
    expect(getCSSVar('--nonexistent', '#fff')).toBe('#fff');
  });
});

// ─── ChartWrapper ─────────────────────────────────────────────────────────────

describe('ChartWrapper', () => {
  it('renders loading state', () => {
    const { container } = render(<ChartWrapper loading>chart</ChartWrapper>);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    // children should not render
    expect(screen.queryByText('chart')).not.toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<ChartWrapper empty emptyMessage="Nothing here" emptyEmoji="🔍">chart</ChartWrapper>);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.queryByText('chart')).not.toBeInTheDocument();
  });

  it('renders children when not loading or empty', () => {
    render(<ChartWrapper><span>canvas</span></ChartWrapper>);
    expect(screen.getByText('canvas')).toBeInTheDocument();
  });

  it('applies aria-label', () => {
    render(<ChartWrapper aria-label="Trend chart"><span>c</span></ChartWrapper>);
    expect(screen.getByRole('img', { name: 'Trend chart' })).toBeInTheDocument();
  });
});

// ─── ChartLegend ──────────────────────────────────────────────────────────────

describe('ChartLegend', () => {
  it('renders legend items', () => {
    const items = [
      { label: 'Food', color: '#ff0000', value: '₹3,000' },
      { label: 'Transport', color: '#00ff00' },
    ];
    render(<ChartLegend items={items} />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('₹3,000')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('renders nothing when items empty', () => {
    const { container } = render(<ChartLegend items={[]} />);
    // ChartLegend returns null; only the wrapper providers render
    expect(container.querySelector('.grid')).not.toBeInTheDocument();
  });
});

// ─── TrendLineChart ───────────────────────────────────────────────────────────

describe('TrendLineChart', () => {
  it('renders empty state when all data is zero', () => {
    render(
      <TrendLineChart
        labels={['Jan', 'Feb', 'Mar']}
        datasets={[{ label: 'Expense', data: [0, 0, 0] }]}
      />
    );
    expect(screen.getByText('No trend data yet')).toBeInTheDocument();
  });

  it('renders canvas when data is present', () => {
    const { container } = render(
      <TrendLineChart
        labels={['Jan', 'Feb', 'Mar']}
        datasets={[{ label: 'Expense', data: [1000, 2000, 1500] }]}
      />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <TrendLineChart
        labels={['Jan']}
        datasets={[{ label: 'X', data: [100] }]}
        loading
      />
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

// ─── CategoryDoughnut ─────────────────────────────────────────────────────────

describe('CategoryDoughnut', () => {
  it('renders empty state when no segments', () => {
    render(<CategoryDoughnut segments={[]} />);
    expect(screen.getByText('No category data')).toBeInTheDocument();
  });

  it('renders canvas with segments', () => {
    const { container } = render(
      <CategoryDoughnut
        segments={[
          { label: 'Food', value: 3000 },
          { label: 'Transport', value: 1500 },
        ]}
      />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders center label', () => {
    render(
      <CategoryDoughnut
        segments={[{ label: 'Food', value: 3000 }]}
        centerLabel="Total"
        centerValue="₹3,000"
      />
    );
    expect(screen.getByText('₹3,000')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });
});

// ─── BarChart ─────────────────────────────────────────────────────────────────

describe('BarChart', () => {
  it('renders empty state when all data is zero', () => {
    render(
      <BarChart
        labels={['Jan', 'Feb']}
        datasets={[{ label: 'Income', data: [0, 0] }]}
      />
    );
    expect(screen.getByText('No data to compare')).toBeInTheDocument();
  });

  it('renders canvas with data', () => {
    const { container } = render(
      <BarChart
        labels={['Jan', 'Feb']}
        datasets={[
          { label: 'Income', data: [50000, 60000] },
          { label: 'Expense', data: [30000, 35000] },
        ]}
      />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});

// ─── SparklineChart ───────────────────────────────────────────────────────────

describe('SparklineChart', () => {
  it('renders nothing with less than 2 data points', () => {
    const { container } = render(<SparklineChart data={[100]} />);
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });

  it('renders canvas with sufficient data', () => {
    const { container } = render(<SparklineChart data={[100, 200, 150, 300]} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
