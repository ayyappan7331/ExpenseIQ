import { render, screen, fireEvent, waitFor } from '@/test/utils/render';
import userEvent from '@testing-library/user-event';
import {
  Button,
  Card,
  Modal,
  Drawer,
  Input,
  Select,
  Tabs,
  Badge,
  StatCard,
  SectionCard,
  ProgressRow,
  EmptyState,
  Skeleton,
  SkeletonCard,
  LoadingSpinner,
  ConfirmDialog,
  FilterChip,
  CategoryBadge,
  TypeToggle,
  DataTable,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

// ─── Button ───────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('renders icon', () => {
    render(<Button icon={<span data-testid="icon">★</span>}>Star</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

// ─── Card ─────────────────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders children with padding', () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-5');
  });

  it('renders without padding', () => {
    render(<Card padding={false} data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).not.toHaveClass('p-5');
  });
});

// ─── Modal ────────────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}}>Body</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    render(<Modal open={true} onClose={() => {}} title="Test">Body</Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="X">Body</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on close button click', async () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="X">Body</Modal>);
    await userEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── Drawer ───────────────────────────────────────────────────────────────────

describe('Drawer', () => {
  it('renders nothing when closed', () => {
    render(<Drawer open={false} onClose={() => {}}>Body</Drawer>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(<Drawer open={true} onClose={() => {}} title="Drawer">Content</Drawer>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

// ─── Input ────────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Amount" />);
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Amount" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

// ─── Select ───────────────────────────────────────────────────────────────────

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  it('renders options', () => {
    render(<Select label="Pick" options={options} />);
    expect(screen.getByLabelText('Pick')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders placeholder', () => {
    render(<Select options={options} placeholder="Choose..." defaultValue="" />);
    expect(screen.getByText('Choose...')).toBeInTheDocument();
  });
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────

describe('Tabs', () => {
  const tabs = [
    { id: 'a', label: 'Tab A' },
    { id: 'b', label: 'Tab B' },
  ];

  it('renders tabs with active state', () => {
    render(<Tabs tabs={tabs} active="a" onChange={() => {}} />);
    const tabA = screen.getByRole('tab', { name: 'Tab A' });
    expect(tabA).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onChange on click', async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="a" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

// ─── Badge ────────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders with variant', () => {
    render(<Badge variant="income">+₹500</Badge>);
    const badge = screen.getByText('+₹500');
    expect(badge).toHaveClass('text-income');
  });
});

// ─── StatCard ─────────────────────────────────────────────────────────────────

describe('StatCard', () => {
  it('renders icon, label, value, sub', () => {
    render(<StatCard icon={<span>💰</span>} label="Income" value="₹50,000" sub="+12%" trend="up" />);
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toHaveClass('text-income');
  });
});

// ─── SectionCard ──────────────────────────────────────────────────────────────

describe('SectionCard', () => {
  it('renders title and children', () => {
    render(<SectionCard title="Recent">Items here</SectionCard>);
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Items here')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(<SectionCard title="T" actions={<button>Add</button>}>Body</SectionCard>);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

// ─── ProgressRow ──────────────────────────────────────────────────────────────

describe('ProgressRow', () => {
  it('renders label and values', () => {
    render(<ProgressRow label="Food" value={3000} max={5000} />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('3000 / 5000')).toBeInTheDocument();
  });

  it('shows expense color when over budget', () => {
    render(<ProgressRow label="Food" value={6000} max={5000} />);
    expect(screen.getByText('6000 / 5000')).toHaveClass('text-expense');
  });
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders emoji and message', () => {
    render(<EmptyState emoji="🔍" message="Nothing found" />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('Nothing found')).toBeInTheDocument();
  });

  it('renders action', () => {
    render(<EmptyState message="Empty" action={<button>Add</button>} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

describe('Skeleton', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<Skeleton width="100px" height="20px" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('SkeletonCard renders', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(1);
  });
});

// ─── LoadingSpinner ───────────────────────────────────────────────────────────

describe('LoadingSpinner', () => {
  it('renders with role status', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

describe('ConfirmDialog', () => {
  it('renders message and buttons when open', () => {
    render(
      <ConfirmDialog open={true} onClose={() => {}} onConfirm={() => {}} message="Delete this?" />
    );
    expect(screen.getByText('Delete this?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onConfirm', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open={true} onClose={() => {}} onConfirm={onConfirm} message="Sure?" />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

// ─── FilterChip ───────────────────────────────────────────────────────────────

describe('FilterChip', () => {
  it('renders with active state', () => {
    render(<FilterChip label="All" active onClick={() => {}} />);
    const chip = screen.getByRole('button', { name: 'All' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveClass('text-accent');
  });

  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<FilterChip label="Food" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Food' }));
    expect(onClick).toHaveBeenCalled();
  });
});

// ─── CategoryBadge ────────────────────────────────────────────────────────────

describe('CategoryBadge', () => {
  it('renders label with custom color', () => {
    render(<CategoryBadge label="Food" color="#34d399" />);
    const badge = screen.getByText('Food');
    expect(badge).toHaveStyle({ color: '#34d399' });
  });
});

// ─── TypeToggle ───────────────────────────────────────────────────────────────

describe('TypeToggle', () => {
  it('renders expense/income buttons', () => {
    render(<TypeToggle value="expense" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Expense' })).toHaveClass('bg-expense');
    expect(screen.getByRole('button', { name: 'Income' })).not.toHaveClass('bg-income');
  });

  it('calls onChange', async () => {
    const onChange = vi.fn();
    render(<TypeToggle value="expense" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Income' }));
    expect(onChange).toHaveBeenCalledWith('income');
  });
});

// ─── DataTable ────────────────────────────────────────────────────────────────

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Name', sortable: true, render: (r: { id: string; name: string }) => r.name },
    { key: 'amount', header: 'Amount', render: (r: { id: string; name: string; amount: number }) => `₹${r.amount}` },
  ];
  const data = [
    { id: '1', name: 'Groceries', amount: 500 },
    { id: '2', name: 'Rent', amount: 15000 },
  ];

  it('renders rows', () => {
    render(<DataTable columns={columns} data={data} keyExtractor={(r) => r.id} />);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('₹15000')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} keyExtractor={(r) => r.id} emptyMessage="No transactions" />);
    expect(screen.getByText('No transactions')).toBeInTheDocument();
  });

  it('calls onSort', async () => {
    const onSort = vi.fn();
    render(<DataTable columns={columns} data={data} keyExtractor={(r) => r.id} onSort={onSort} sort={{ key: 'name', dir: 'asc' }} />);
    await userEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('renders checkboxes when onSelectRow provided', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        selectedKeys={new Set(['1'])}
        onSelectRow={() => {}}
        onSelectAll={() => {}}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3); // 1 header + 2 rows
  });
});

// ─── Toast (useToast) ─────────────────────────────────────────────────────────

describe('useToast', () => {
  function ToastTrigger() {
    const { toast } = useToast();
    return <button onClick={() => toast('Saved!', 'success')}>Fire</button>;
  }

  it('shows toast on trigger', async () => {
    render(<ToastTrigger />);
    await userEvent.click(screen.getByRole('button', { name: 'Fire' }));
    await waitFor(() => {
      expect(screen.getByText('Saved!')).toBeInTheDocument();
    });
  });
});
