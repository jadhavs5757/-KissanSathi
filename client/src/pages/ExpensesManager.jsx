import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { expenseService } from '../services/expenseService';
import { farmService } from '../services/farmService';
import { cropService } from '../services/cropService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingScreen from '../components/ui/LoadingScreen';
import EmptyState from '../components/ui/EmptyState';
import {
  Receipt,
  Plus,
  IndianRupee,
  Calendar,
  Filter,
  Trash2,
  Edit,
  TrendingDown,
  Search
} from 'lucide-react';

const CATEGORIES = [
  'SEEDS',
  'FERTILIZER',
  'LABOUR',
  'IRRIGATION',
  'PEST_MANAGEMENT',
  'MACHINERY',
  'TRANSPORT',
  'OTHER'
];

export default function ExpensesManager() {
  const { farmId } = useParams();

  const [farm, setFarm] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [formCategory, setFormCategory] = useState('FERTILIZER');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDesc, setFormDesc] = useState('');
  const [formCycleId, setFormCycleId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExpensesData = async () => {
    try {
      const [farmData, cycleList, expData] = await Promise.all([
        farmService.getFarm(farmId),
        cropService.getCropCycles(farmId),
        expenseService.getExpenses(farmId, {
          category: selectedCategory || undefined,
          search: searchQuery || undefined
        })
      ]);

      setFarm(farmData);
      setCycles(cycleList);
      setExpenses(expData.expenses || []);
      setCategoryTotals(expData.categoryTotals || {});
      setTotalAmount(expData.totalAmount || 0);

      if (cycleList.length > 0 && !formCycleId) {
        setFormCycleId(cycleList[0].id);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesData();
  }, [farmId, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchExpensesData();
  };

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setFormCategory('FERTILIZER');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDesc('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (expense) => {
    setEditingExpenseId(expense.id);
    setFormCategory(expense.category);
    setFormAmount(expense.amount);
    setFormDate(expense.expense_date);
    setFormDesc(expense.description || '');
    setFormCycleId(expense.crop_cycle_id || '');
    setModalOpen(true);
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: formCategory,
        amount: Number(formAmount),
        expenseDate: formDate,
        description: formDesc || null,
        cropCycleId: formCycleId || null
      };

      if (editingExpenseId) {
        await expenseService.updateExpense(farmId, editingExpenseId, payload);
      } else {
        await expenseService.createExpense(farmId, payload);
      }

      setModalOpen(false);
      fetchExpensesData();
    } catch (err) {
      alert(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Delete this expense entry?')) {
      try {
        await expenseService.deleteExpense(farmId, expenseId);
        fetchExpensesData();
      } catch (err) {
        alert(err.message || 'Could not delete expense');
      }
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading farm expenses ledger..." />;
  }

  const budget = Number(farm?.capital_budget) || 0;
  const budgetUtilization = budget > 0 ? Math.min(100, Math.round((totalAmount / budget) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Expense Tracker: {farm?.name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain itemized input costs, labor payments, and track capital utilization
          </p>
        </div>
        <Button onClick={handleOpenAddModal} size="sm" icon={Plus}>
          Log Expense
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card hover>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Total Spent
          </span>
          <span className="text-2xl font-extrabold text-white font-display">
            ₹{totalAmount.toLocaleString('en-IN')}
          </span>
          <p className="text-xs text-slate-400 mt-1">{expenses.length} recorded line items</p>
        </Card>

        <Card hover>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Capital Budget
          </span>
          <span className="text-2xl font-extrabold text-emerald-400 font-display">
            ₹{budget.toLocaleString('en-IN')}
          </span>
          <p className="text-xs text-slate-400 mt-1">Planned allocation for this farm</p>
        </Card>

        <Card hover>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Budget Utilization
          </span>
          <span className="text-2xl font-extrabold text-amber-400 font-display">
            {budgetUtilization}%
          </span>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${
                budgetUtilization > 90 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${budgetUtilization}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Category Breakdown Badges */}
      <Card className="p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Spending by Input Category
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CATEGORIES.map((cat) => {
            const sum = categoryTotals[cat] || 0;
            return (
              <div
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-forest-600/30 border-forest-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">{cat.replace('_', ' ')}</span>
                  {selectedCategory === cat && <span className="text-[9px] text-emerald-400">Filtered</span>}
                </div>
                <span className="text-xs font-bold mt-1 block">₹{sum.toLocaleString('en-IN')}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <Input
            placeholder="Search expense description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" size="sm" icon={Search}>
            Search
          </Button>
        </form>

        {selectedCategory && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Filter:</span>
            <Badge variant="info">{selectedCategory}</Badge>
            <button
              onClick={() => setSelectedCategory('')}
              className="text-xs text-rose-400 hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <Card className="p-0 overflow-hidden">
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Crop Cycle</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400">{exp.expense_date}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="neutral">{exp.category.replace('_', ' ')}</Badge>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">{exp.description || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{exp.crop_name || 'General Farm'}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white font-mono">
                      ₹{Number(exp.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No expenses found"
            description="Log your seed purchases, fertilizer bags, labor payments, and tractor diesel costs to keep audited records."
            actionText="Log First Expense"
            onAction={handleOpenAddModal}
          />
        )}
      </Card>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpenseId ? 'Edit Farm Expense' : 'Log Farm Expense'}
        subtitle="Maintain accurate records for input accounting"
      >
        <form onSubmit={handleSubmitExpense} className="space-y-4">
          <Select
            label="Expense Category"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            options={CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') }))}
            required
          />

          <Input
            label="Amount (₹ INR)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 4500"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            required
          />

          <Input
            label="Expense Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            required
          />

          {cycles.length > 0 && (
            <Select
              label="Attribute to Crop Cycle (Optional)"
              value={formCycleId}
              onChange={(e) => setFormCycleId(e.target.value)}
              options={[
                { value: '', label: 'General Farm Expense' },
                ...cycles.map((c) => ({ value: c.id, label: `${c.crop_name} (${c.current_stage})` }))
              ]}
            />
          )}

          <Input
            label="Description & Notes"
            placeholder="e.g. 2 bags of DAP + 1 bag potash from Krishi Kendra"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              {editingExpenseId ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
