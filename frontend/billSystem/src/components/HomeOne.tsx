import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, startOfMonth, endOfMonth, endOfDay } from 'date-fns';
import { Pie, Bar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Menu, X, Download, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import axios, { AxiosResponse } from 'axios';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// Interfaces
interface FoodItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  openTime: string;
  closeTime: string;
}

interface FoodBill {
  _id: string;
  items: {
    itemName: string;
    category: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  grandTotal: number;
  date: string;
  paymentMethod: 'online' | 'cash';
  status: 'success' | 'failed';
}

// Base API URL
const API_URL = 'http://localhost:5001';

// Utility Functions
const filterBillsByDate = (bills: FoodBill[], startDate: Date, endDate: Date): FoodBill[] => {
  return bills.filter((bill) => {
    const billDate = new Date(bill.date);
    return billDate >= startOfDay(startDate) && billDate <= endOfDay(endDate);
  });
};

const getCategorySpending = (bills: FoodBill[]) => {
  const categories = Array.from(new Set(bills.flatMap((bill) => bill.items.map((item) => item.category))));
  return categories.map((category) => ({
    category,
    total: bills
      .flatMap((bill) => bill.items)
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + item.total, 0),
  }));
};

const exportToCSV = (bills: FoodBill[], filename: string) => {
  const headers = ['ID', 'Items', 'Grand Total', 'Date', 'Payment Method', 'Status'];
  const csvRows = [
    headers.join(','),
    ...bills.map((bill) =>
      [
        bill._id,
        `"${bill.items.map((item) => `${item.itemName} (Qty: ${item.quantity})`).join('; ')}"`,
        bill.grandTotal,
        format(new Date(bill.date), 'yyyy-MM-dd'),
        bill.paymentMethod,
        bill.status,
      ].join(',')
    ),
  ];
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

const HomeOne: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'transactions' | 'reports' | 'foodManagement'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [dashboardBills, setDashboardBills] = useState<FoodBill[]>([]);
  const [transactionBills, setTransactionBills] = useState<FoodBill[]>([]);
  const [reportBills, setReportBills] = useState<FoodBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch food items
  const fetchFoodItems = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get(`${API_URL}/dashboard/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFoodItems(response.data);
    } catch (error) {
      console.error('Error fetching food items:', error);
      setError('Failed to fetch food items. Please ensure you are logged in as admin.');
    }
  };

  // Fetch bills
  const fetchBills = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get(`${API_URL}/api/bill/bills`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardBills(response.data);
      setTransactionBills(response.data);
      setReportBills(response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
      setError('Failed to fetch bills. Please check your connection or login status.');
    } finally {
      setIsLoading(false);
    }
  };

  // Global refresh
  const handleGlobalRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchFoodItems(), fetchBills()]);
    setIsLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    fetchFoodItems();
    fetchBills();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  // Dashboard View
  const DashboardView: React.FC<{ bills: FoodBill[] }> = ({ bills }) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<'lastWeek' | 'last1Month' | 'lastYear' | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [totalAmountPeriod, setTotalAmountPeriod] = useState<
      'today' | 'yesterday' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'lastYear' | 'allTime'
    >('allTime');

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const lastWeek = subWeeks(today, 1);
    const thisMonthStart = startOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));
    const lastYear = subYears(today, 1);

    let totalAmount = 0;
    let totalAmountLabel = 'All Time';
    switch (totalAmountPeriod) {
      case 'today':
        totalAmount = filterBillsByDate(bills, today, today).reduce((sum, bill) => sum + bill.grandTotal, 0);
        totalAmountLabel = 'Today';
        break;
      case 'yesterday':
        totalAmount = filterBillsByDate(bills, yesterday, yesterday).reduce((sum, bill) => sum + bill.grandTotal, 0);
        totalAmountLabel = 'Yesterday';
        break;
      case 'lastWeek':
        totalAmount = filterBillsByDate(bills, lastWeek, today).reduce((sum, bill) => sum + bill.grandTotal, 0);
        totalAmountLabel = 'Last Week';
        break;
      case 'thisMonth':
        totalAmount = filterBillsByDate(bills, thisMonthStart, today).reduce((sum, bill) => sum + bill.grandTotal, 0);
        totalAmountLabel = 'This Month';
        break;
      case 'lastMonth':
        totalAmount = filterBillsByDate(bills, lastMonthStart, lastMonthEnd).reduce((sum, bill) => sum + bill.grandTotal, 0);
        totalAmountLabel = 'Last Month';
        break;
      case 'lastYear':
        totalAmount = filterBillsByDate(bills, lastYear, today).reduce((sum, bill) => sum + bill.grandTotal, 0);
        totalAmountLabel = 'Last Year';
        break;
      case 'allTime':
        totalAmount = bills.reduce((sum, bill) => sum + bill.grandTotal, 0);
        totalAmountLabel = 'All Time';
        break;
    }

    let filteredBills: FoodBill[] = bills;
    let tableHeader = 'Recent Bills';
    let chartFilterLabel = 'All Time';

    if (selectedDate) {
      filteredBills = bills.filter((bill) => format(new Date(bill.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
      tableHeader = `Bills for ${format(selectedDate, 'MMMM dd, yyyy')}`;
      chartFilterLabel = format(selectedDate, 'MMMM dd, yyyy');
    } else if (selectedPeriod) {
      switch (selectedPeriod) {
        case 'lastWeek':
          filteredBills = filterBillsByDate(bills, lastWeek, today);
          tableHeader = 'Bills for Last Week';
          chartFilterLabel = 'Last Week';
          break;
        case 'last1Month':
          filteredBills = filterBillsByDate(bills, subMonths(today, 1), today);
          tableHeader = 'Bills for Last 1 Month';
          chartFilterLabel = 'Last 1 Month';
          break;
        case 'lastYear':
          filteredBills = filterBillsByDate(bills, lastYear, today);
          tableHeader = 'Bills for Last Year';
          chartFilterLabel = 'Last Year';
          break;
      }
    }

    const categorySpending = getCategorySpending(filteredBills);
    const totalSpending = categorySpending.reduce((sum, item) => sum + item.total, 0);
    const pieData = {
      labels: categorySpending.map((item) => item.category),
      datasets: [
        {
          data: categorySpending.map((item) => item.total),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#8AC24A', '#607D8B', '#9C27B0', '#E91E63'
          ],
          borderColor: [
            '#FF2E63', '#1E90FF', '#FFB107', '#00CED1', '#6A5ACD',
            '#FF8F00', '#689F38', '#455A64', '#7B1FA2', '#C2185B'
          ],
          borderWidth: 1,
        },
      ],
    };

    const pieOptions = {
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'pie'>) => {
              const label = context.label || '';
              const value = context.raw as number || 0;
              const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(1) : 0;
              return `${label}: ₹${value} (${percentage}%)`;
            },
          },
        },
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 20,
            font: {
              size: 12
            }
          }
        },
      },
      maintainAspectRatio: false,
    };

    const onlineTransactions = filteredBills.filter((bill) => bill.paymentMethod === 'online' && bill.status === 'success').length;
    const cashTransactions = filteredBills.filter((bill) => bill.paymentMethod === 'cash' && bill.status === 'success').length;
    const failedTransactions = filteredBills.filter((bill) => bill.status === 'failed').length;

    const resetFilters = () => {
      setSelectedDate(null);
      setSelectedPeriod(null);
      setIsDropdownOpen(false);
    };

    const handleExportCSV = () => {
      const filename = selectedDate
        ? `bills_${format(selectedDate, 'yyyy-MM-dd')}.csv`
        : selectedPeriod
        ? `bills_${selectedPeriod}.csv`
        : 'bills_all.csv';
      exportToCSV(filteredBills, filename);
    };

    return (
      <div className="p-6">
        <h2 className="!text-2xl font-bold !text-gray-800 mb-6 opacity-100 visible">Dashboard Overview</h2>
        {error && <p className="!text-red-600 mb-4 opacity-100 visible">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex justify-between items-center mb-2">
              <h3 className="!text-lg font-semibold !text-gray-800 opacity-100 visible">Total Amount</h3>
              <select
                value={totalAmountPeriod}
                onChange={(e) =>
                  setTotalAmountPeriod(
                    e.target.value as 'today' | 'yesterday' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'lastYear' | 'allTime'
                  )
                }
                className="p-1 border rounded-md !text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="lastYear">Last Year</option>
                <option value="allTime">All Time</option>
              </select>
            </div>
            <p className="!text-2xl !text-indigo-600 opacity-100 visible">₹{totalAmount.toLocaleString()}</p>
            <p className="!text-sm !text-gray-600 opacity-100 visible">{totalAmountLabel}</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="!text-lg font-semibold !text-gray-800 opacity-100 visible">Online Transactions</h3>
            <p className="!text-2xl !text-indigo-600 opacity-100 visible">{onlineTransactions.toLocaleString()}</p>
            <p className="!text-sm !text-gray-600 opacity-100 visible">{bills.length > 0 ? (onlineTransactions / bills.length * 100).toFixed(1) : 0}% of total</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="!text-lg font-semibold !text-gray-800 opacity-100 visible">Cash Transactions</h3>
            <p className="!text-2xl !text-indigo-600 opacity-100 visible">{cashTransactions.toLocaleString()}</p>
            <p className="!text-sm !text-gray-600 opacity-100 visible">{bills.length > 0 ? (cashTransactions / bills.length * 100).toFixed(1) : 0}% of total</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="!text-lg font-semibold !text-gray-800 opacity-100 visible">Failed Transactions</h3>
            <p className="!text-2xl !text-indigo-600 opacity-100 visible">{failedTransactions.toLocaleString()}</p>
            <p className="!text-sm !text-gray-600 opacity-100 visible">{bills.length > 0 ? (failedTransactions / bills.length * 100).toFixed(1) : 0}% of total</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="!text-xl font-semibold !text-gray-800 opacity-100 visible">Date Filter</h2>
              <button
                onClick={resetFilters}
                className="p-2 !text-gray-600 hover:!text-indigo-600 opacity-100 visible"
                title="Reset filters"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <Calendar
              onChange={(value) => {
                if (Array.isArray(value)) {
                  setSelectedDate(value[0] || null); // If it's a date range, pick the first date
                } else {
                  setSelectedDate(value);
                }
              }}
              value={selectedDate}
              className="w-full border-none mb-4 bg-amber-400 text-black"
            />

            <div className="space-y-2">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 !text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
              >
                {isDropdownOpen ? 'Close Period Filter' : 'Select Period'}
              </button>

              {isDropdownOpen && (
                <div className="mt-2">
                  <select
                    value={selectedPeriod || ''}
                    onChange={(e) =>
                      setSelectedPeriod(
                        e.target.value as 'lastWeek' | 'last1Month' | 'lastYear' | null
                      )
                    }
                    className="p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 w-full opacity-100 visible"
                  >
                    <option value="">Select Period</option>
                    <option value="lastWeek">Last Week</option>
                    <option value="last1Month">Last 1 Month</option>
                    <option value="lastYear">Last Year</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center w-full px-4 py-2 bg-green-600 !text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 opacity-100 visible"
              >
                <Download size={18} className="mr-2" />
                Export to CSV
              </button>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
            <h2 className="!text-xl font-semibold !text-gray-800 mb-4 opacity-100 visible">Spending by Category ({chartFilterLabel})</h2>
            <div style={{ height: '300px' }}>
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
            <h2 className="!text-xl font-semibold !text-gray-800 mb-4 opacity-100 visible">Payment Method Distribution</h2>
            <div style={{ height: '300px' }}>
              <Bar
                data={{
                  labels: ['Online', 'Cash'],
                  datasets: [{
                    label: 'Transactions',
                    data: [onlineTransactions, cashTransactions],
                    backgroundColor: ['#36A2EB', '#FFCE56'],
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Payment Method Distribution',
                      font: { size: 16 }
                    },
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Number of Transactions' },
                    },
                    x: {
                      title: { display: true, text: 'Payment Method' },
                    },
                  },
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="!text-xl font-semibold !text-gray-800 opacity-100 visible">{tableHeader}</h2>
            <span className="!text-sm !text-gray-600 opacity-100 visible">Showing {filteredBills.length > 5 ? '5' : filteredBills.length} of {filteredBills.length} bills</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[200px] opacity-100 visible">Items</th>
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Grand Total</th>
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Date</th>
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Payment</th>
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length > 0 ? (
                  filteredBills.slice(0, 5).map((bill) => (
                    <tr key={bill._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 !text-gray-800 whitespace-normal opacity-100 visible">{bill.items.map((item) => `${item.itemName} (Qty: ${item.quantity})`).join(', ')}</td>
                      <td className="px-4 py-2 font-semibold !text-gray-800 opacity-100 visible">₹{bill.grandTotal.toLocaleString()}</td>
                      <td className="px-4 py-2 !text-gray-800 opacity-100 visible">{format(new Date(bill.date), 'yyyy-MM-dd')}</td>
                      <td className="px-4 py-2 opacity-100 visible">
                        <span className={`px-2 py-1 rounded ${
                          bill.paymentMethod === 'online' ? 'bg-blue-100 !text-blue-900' : 'bg-yellow-100 !text-yellow-900'
                        } opacity-100 visible`}>
                          {bill.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-2 opacity-100 visible">
                        <span className={`px-2 py-1 rounded ${
                          bill.status === 'success' ? 'bg-green-100 !text-green-900' : 'bg-red-100 !text-red-900'
                        } opacity-100 visible`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center !text-gray-600 opacity-100 visible">
                      No bills found for {tableHeader.toLowerCase()}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Transactions View
  const TransactionsView: React.FC<{ bills: FoodBill[] }> = ({ bills }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'online' | 'cash'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

    const filteredBills = bills.filter(bill => {
      const matchesSearch = bill.items.some(item => item.itemName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPayment = paymentFilter === 'all' || bill.paymentMethod === paymentFilter;
      const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
      const matchesDate = !dateRange || (
        new Date(bill.date) >= startOfDay(dateRange[0]) &&
        new Date(bill.date) <= endOfDay(dateRange[1])
      );

      return matchesSearch && matchesPayment && matchesStatus && matchesDate;
    });

    const totalAmount = filteredBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
    const onlineAmount = filteredBills
      .filter(bill => bill.paymentMethod === 'online')
      .reduce((sum, bill) => sum + bill.grandTotal, 0);
    const cashAmount = filteredBills
      .filter(bill => bill.paymentMethod === 'cash')
      .reduce((sum, bill) => sum + bill.grandTotal, 0);

    const paymentMethodData = {
      labels: ['Online', 'Cash'],
      datasets: [{
        data: [onlineAmount, cashAmount],
        backgroundColor: ['#36A2EB', '#FFCE56'],
      }]
    };

    const resetFilters = () => {
      setSearchQuery('');
      setPaymentFilter('all');
      setStatusFilter('all');
      setDateRange(null);
    };

    return (
      <div className="p-6">
        <h2 className="!text-2xl font-bold !text-gray-800 mb-6 opacity-100 visible">Transaction History</h2>
        {error && <p className="!text-red-600 mb-4 opacity-100 visible">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg shadow">
            <h3 className="!text-sm font-semibold !text-gray-800 opacity-100 visible">Total Transactions</h3>
            <p className="!text-2xl font-bold !text-indigo-600 opacity-100 visible">{filteredBills.length}</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow">
            <h3 className="!text-sm font-semibold !text-gray-800 opacity-100 visible">Total Amount</h3>
            <p className="!text-2xl font-bold !text-indigo-600 opacity-100 visible">₹{totalAmount.toLocaleString()}</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow">
            <h3 className="!text-sm font-semibold !text-gray-800 opacity-100 visible">Online Payments</h3>
            <p className="!text-2xl font-bold !text-indigo-600 opacity-100 visible">₹{onlineAmount.toLocaleString()}</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow">
            <h3 className="!text-sm font-semibold !text-gray-800 opacity-100 visible">Cash Payments</h3>
            <p className="!text-2xl font-bold !text-indigo-600 opacity-100 visible">₹{cashAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="!block !text-sm font-medium !text-gray-800 mb-1 opacity-100 visible">Search</label>
              <input
                type="text"
                placeholder="Search by item name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
              />
            </div>

            <div>
              <label className="!block !text-sm font-medium !text-gray-800 mb-1 opacity-100 visible">Payment Method</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'online' | 'cash')}
                className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
              >
                <option value="all">All Methods</option>
                <option value="online">Online</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="!block !text-sm font-medium !text-gray-800 mb-1 opacity-100 visible">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed')}
                className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="!block !text-sm font-medium !text-gray-800 mb-1 opacity-100 visible">Date Range</label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange?.[0] ? format(dateRange[0], 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const startDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
                  if (startDate && dateRange?.[1]) {
                    setDateRange([startDate, dateRange[1]]);
                  } else if (startDate) {
                    setDateRange([startDate, startDate]);
                  } else {
                    setDateRange(null);
                  }
                }}
                className="p-2 border border-gray-300 rounded !text-gray-800 opacity-100 visible"
              />
              <span className="!text-sm !text-gray-800 opacity-100 visible">to</span>
              <input
                type="date"
                value={dateRange?.[1] ? format(dateRange[1], 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const endDate = e.target.value ? new Date(e.target.value + 'T23:59:59') : null;
                  if (endDate && dateRange?.[0]) {
                    setDateRange([dateRange[0], endDate]);
                  } else if (endDate) {
                    setDateRange([endDate, endDate]);
                  } else {
                    setDateRange(null);
                  }
                }}
                className="p-2 border border-gray-300 rounded !text-gray-800 opacity-100 visible"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-600 !text-white rounded-md hover:bg-gray-700 opacity-100 visible"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg shadow-lg mb-6">
          <h3 className="!text-lg font-semibold !text-gray-800 mb-4 opacity-100 visible">Payment Method Distribution</h3>
          <div style={{ height: '200px' }}>
            <Pie data={paymentMethodData} options={{
              plugins: {
                legend: { position: 'bottom' as const },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label || '';
                      const value = context.raw || 0;
                      return `${label}: ₹${value.toLocaleString()}`;
                    },
                  },
                },
              },
              maintainAspectRatio: false,
            }} />
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="!text-lg font-semibold !text-gray-800 opacity-100 visible">Transaction List</h3>
            <button
              onClick={() => exportToCSV(filteredBills, `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="flex items-center px-4 py-2 bg-green-600 !text-white rounded-md hover:bg-green-700 opacity-100 visible"
            >
              <Download size={18} className="mr-2" />
              Export to CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[200px] opacity-100 visible">Items</th>
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Grand Total</th>
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Date</th>
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Payment</th>
                  <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length > 0 ? (
                  filteredBills.map((bill) => (
                    <tr key={bill._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 !text-gray-800 whitespace-normal opacity-100 visible">{bill.items.map((item) => `${item.itemName} (Qty: ${item.quantity})`).join(', ')}</td>
                      <td className="px-4 py-2 font-semibold !text-gray-800 opacity-100 visible">₹{bill.grandTotal.toLocaleString()}</td>
                      <td className="px-4 py-2 !text-gray-800 opacity-100 visible">{format(new Date(bill.date), 'yyyy-MM-dd')}</td>
                      <td className="px-4 py-2 opacity-100 visible">
                        <span className={`px-2 py-1 rounded ${
                          bill.paymentMethod === 'online' ? 'bg-blue-100 !text-blue-900' : 'bg-yellow-100 !text-yellow-900'
                        } opacity-100 visible`}>
                          {bill.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-2 opacity-100 visible">
                        <span className={`px-2 py-1 rounded ${
                          bill.status === 'success' ? 'bg-green-100 !text-green-900' : 'bg-red-100 !text-red-900'
                        } opacity-100 visible`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center !text-gray-800 opacity-100 visible">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Reports View
  const ReportsView: React.FC<{ bills: FoodBill[] }> = ({ bills }) => {
    const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

    const filteredBills = bills.filter(bill => {
      if (!dateRange) return true;
      const billDate = new Date(bill.date);
      return billDate >= startOfDay(dateRange[0]) && billDate <= endOfDay(dateRange[1]);
    });

    const totalAmount = filteredBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
    const onlineTransactions = filteredBills.filter(bill => bill.paymentMethod === 'online' && bill.status === 'success').length;
    const cashTransactions = filteredBills.filter(bill => bill.paymentMethod === 'cash' && bill.status === 'success').length;
    const successfulTransactions = filteredBills.filter(bill => bill.status === 'success').length;
    const failedTransactions = filteredBills.filter(bill => bill.status === 'failed').length;

    const categorySpending = getCategorySpending(filteredBills);
    const totalSpending = categorySpending.reduce((sum, item) => sum + item.total, 0);
    const pieData = {
      labels: categorySpending.map(item => item.category),
      datasets: [{
        data: categorySpending.map(item => item.total),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      }],
    };

    const pieOptions = {
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'pie'>) => {
              const label = context.label || '';
              const value = context.raw as number || 0;
              const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(1) : 0;
              return `${label}: ₹${value} (${percentage}%)`;
            },
          },
        },
      },
      maintainAspectRatio: false,
    };

    return (
      <div className="p-6">
        <h2 className="!text-2xl font-bold !text-gray-800 mb-6 opacity-100 visible">Reports</h2>
        {error && <p className="!text-red-600 mb-4 opacity-100 visible">{error}</p>}

        <div className="bg-gray-100 p-4 rounded-lg shadow-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setReportType('summary')}
                className={`px-4 py-2 rounded-md ${reportType === 'summary' ? 'bg-indigo-600 !text-white' : 'bg-gray-200 !text-gray-800'} opacity-100 visible`}
              >
                Summary
              </button>
              <button
                onClick={() => setReportType('detailed')}
                className={`px-4 py-2 rounded-md ${reportType === 'detailed' ? 'bg-indigo-600 !text-white' : 'bg-gray-200 !text-gray-800'} opacity-100 visible`}
              >
                Detailed
              </button>
            </div>
            <button
              onClick={() => exportToCSV(filteredBills, `report_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="flex items-center px-4 py-2 bg-green-600 !text-white rounded-md hover:bg-green-700 opacity-100 visible"
            >
              <Download size={18} className="mr-2" />
              Export Report
            </button>
          </div>

          <div className="mb-4">
            <label className="!block !text-sm font-medium !text-gray-800 mb-1 opacity-100 visible">Date Range</label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange?.[0] ? format(dateRange[0], 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const startDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
                  if (startDate && dateRange?.[1]) {
                    setDateRange([startDate, dateRange[1]]);
                  } else if (startDate) {
                    setDateRange([startDate, startDate]);
                  } else {
                    setDateRange(null);
                  }
                }}
                className="p-2 border border-gray-300 rounded !text-gray-800 opacity-100 visible"
              />
              <span className="!text-sm !text-gray-800 opacity-100 visible">to</span>
              <input
                type="date"
                value={dateRange?.[1] ? format(dateRange[1], 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const endDate = e.target.value ? new Date(e.target.value + 'T23:59:59') : null;
                  if (endDate && dateRange?.[0]) {
                    setDateRange([dateRange[0], endDate]);
                  } else if (endDate) {
                    setDateRange([endDate, endDate]);
                  } else {
                    setDateRange(null);
                  }
                }}
                className="p-2 border border-gray-300 rounded !text-gray-800 opacity-100 visible"
              />
            </div>
          </div>
        </div>

        {reportType === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
              <h3 className="!text-lg font-semibold !text-gray-800 mb-4 opacity-100 visible">Summary Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="!text-sm !text-gray-800 opacity-100 visible">Total Amount</p>
                  <p className="!text-xl font-bold !text-indigo-600 opacity-100 visible">₹{totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="!text-sm !text-gray-800 opacity-100 visible">Total Transactions</p>
                  <p className="!text-xl font-bold !text-indigo-600 opacity-100 visible">{filteredBills.length}</p>
                </div>
                <div>
                  <p className="!text-sm !text-gray-800 opacity-100 visible">Successful Transactions</p>
                  <p className="!text-xl font-bold !text-indigo-600 opacity-100 visible">{successfulTransactions}</p>
                </div>
                <div>
                  <p className="!text-sm !text-gray-800 opacity-100 visible">Failed Transactions</p>
                  <p className="!text-xl font-bold !text-indigo-600 opacity-100 visible">{failedTransactions}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
              <h3 className="!text-lg font-semibold !text-gray-800 mb-4 opacity-100 visible">Payment Methods</h3>
              <div className="space-y-4">
                <div>
                  <p className="!text-sm !text-gray-800 opacity-100 visible">Online Payments</p>
                  <p className="!text-xl font-bold !text-indigo-600 opacity-100 visible">{onlineTransactions}</p>
                  <p className="!text-sm !text-gray-800 opacity-100 visible">
                    ₹{filteredBills.filter(b => b.paymentMethod === 'online').reduce((sum, bill) => sum + bill.grandTotal, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="!text-sm !text-gray-800 opacity-100 visible">Cash Payments</p>
                  <p className="!text-xl font-bold !text-indigo-600 opacity-100 visible">{cashTransactions}</p>
                  <p className="!text-sm !text-gray-800 opacity-100 visible">
                    ₹{filteredBills.filter(b => b.paymentMethod === 'cash').reduce((sum, bill) => sum + bill.grandTotal, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
              <h3 className="!text-lg font-semibold !text-gray-800 mb-4 opacity-100 visible">Spending by Category</h3>
              <div style={{ height: '200px' }}>
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>
          </div>
        )}

        {reportType === 'detailed' && (
          <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
            <h3 className="!text-lg font-semibold !text-gray-800 mb-4 opacity-100 visible">Detailed Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">ID</th>
                    <th className="px-4 py-2 text-left !text-gray-800 min-w-[200px] opacity-100 visible">Items</th>
                    <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Grand Total</th>
                    <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Date</th>
                    <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Payment</th>
                    <th className="px-4 py-2 text-left !text-gray-800 min-w-[150px] opacity-100 visible">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length > 0 ? (
                    filteredBills.map((bill) => (
                      <tr key={bill._id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 !text-gray-800 opacity-100 visible">{bill._id}</td>
                        <td className="px-4 py-2 !text-gray-800 whitespace-normal opacity-100 visible">{bill.items.map((item) => `${item.itemName} (Qty: ${item.quantity})`).join(', ')}</td>
                        <td className="px-4 py-2 font-semibold !text-gray-800 opacity-100 visible">₹{bill.grandTotal.toLocaleString()}</td>
                        <td className="px-4 py-2 !text-gray-800 opacity-100 visible">{format(new Date(bill.date), 'yyyy-MM-dd')}</td>
                        <td className="px-4 py-2 opacity-100 visible">
                          <span className={`px-2 py-1 rounded ${
                            bill.paymentMethod === 'online' ? 'bg-blue-100 !text-blue-900' : 'bg-yellow-100 !text-yellow-900'
                          } opacity-100 visible`}>
                            {bill.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-2 opacity-100 visible">
                          <span className={`px-2 py-1 rounded ${
                            bill.status === 'success' ? 'bg-green-100 !text-green-900' : 'bg-red-100 !text-red-900'
                          } opacity-100 visible`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-center !text-gray-800 opacity-100 visible">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Food Management View
  const FoodManagementView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
      name: '',
      category: '',
      price: 0,
      imageUrl: '',
      openTime: '',
      closeTime: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Predefined categories
    const categories = [
      'Chaat',
      'Chinese',
      'Dessert',
      'Fast Food',
      'Juice',
      'Pasta',
      'Pizza',
      'Snacks'
    ];

    const filteredItems = foodItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: name === 'price' ? Number(value) : value
      }));
      setErrorMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Validate required fields
        if (!formData.name || !formData.category || !formData.price || !formData.openTime || !formData.closeTime) {
          setErrorMessage('Please fill in all required fields.');
          setIsLoading(false);
          return;
        }

        // Validate price
        if (formData.price <= 0) {
          setErrorMessage('Price must be greater than 0.');
          setIsLoading(false);
          return;
        }

        const itemData = {
          name: formData.name,
          category: formData.category,
          price: formData.price,
          imageUrl: formData.imageUrl,
          openTime: formData.openTime,
          closeTime: formData.closeTime,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let response: AxiosResponse<any, any>;
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        if (editingFood) {
          // Update existing item
          response = await axios.put(`${API_URL}/dashboard/items/${editingFood._id}`, itemData, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFoodItems(foodItems.map(item => item._id === editingFood._id ? response.data : item));
        } else {
          // Create new item
          response = await axios.post(`${API_URL}/dashboard/items`, itemData, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFoodItems(prevItems => [...prevItems, response.data]);
        }

        // Reset form
        setFormData({
          name: '',
          category: '',
          price: 0,
          imageUrl: '',
          openTime: '',
          closeTime: '',
        });
        setEditingFood(null);
        setErrorMessage(null);

        alert(editingFood ? 'Food item updated successfully!' : 'Food item added successfully!');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error('Error saving food item:', error);
        const errorMsg = error.response?.data?.error || 'Failed to save food item. Please try again.';
        setErrorMessage(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    const handleEdit = (item: FoodItem) => {
      setEditingFood(item);
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price,
        imageUrl: item.imageUrl,
        openTime: item.openTime,
        closeTime: item.closeTime,
      });
      setErrorMessage(null);
    };

    const handleDelete = async (id: string) => {
      if (!window.confirm('Are you sure you want to delete this food item?')) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        await axios.delete(`${API_URL}/dashboard/items/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFoodItems(foodItems.filter(item => item._id !== id));
        alert('Food item deleted successfully!');
      } catch (error: unknown) {
        console.error('Error deleting food item:', error);
        let errorMsg = 'Failed to delete food item. Please try again.';

        if (error && typeof error === 'object' && 'response' in error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          errorMsg = (error as any).response?.data?.error || errorMsg;
        }

        setErrorMessage(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    const handleRefresh = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        await fetchFoodItems();
      } catch (error) {
        // Here, we'll assume that the error is a known object type
        if (error instanceof Error) {
          console.error('Error refreshing food items:', error.message);
          setErrorMessage('Failed to refresh food items. Please try again.');
        } else {
          console.error('Unknown error:', error);
          setErrorMessage('An unknown error occurred.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="p-6">
        <h2 className="!text-2xl font-bold !text-gray-800 mb-6 opacity-100 visible">Food Management</h2>

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-100 !text-red-800 rounded-md opacity-100 visible">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-100 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                placeholder="Search food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
              />
              <button
                onClick={handleRefresh}
                className="flex items-center px-4 py-2 bg-indigo-600 !text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 opacity-100 visible"
                disabled={isLoading}
              >
                <RefreshCw size={18} className="mr-2" />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-3 text-left !text-gray-800 opacity-100 visible">Image</th>
                    <th className="p-3 text-left !text-gray-800 opacity-100 visible">Name</th>
                    <th className="p-3 text-left !text-gray-800 opacity-100 visible">Category</th>
                    <th className="p-3 text-left !text-gray-800 opacity-100 visible">Price</th>
                    <th className="p-3 text-left !text-gray-800 opacity-100 visible">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <tr key={item._id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100';
                            }}
                          />
                        </td>
                        <td className="p-3 !text-gray-800 opacity-100 visible">{item.name}</td>
                        <td className="p-3 opacity-100 visible">
                          <span className="px-2 py-1 bg-indigo-100 !text-indigo-800 rounded text-xs opacity-100 visible">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 !text-gray-800 opacity-100 visible">₹{item.price.toLocaleString()}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 bg-blue-600 !text-white rounded mr-2 hover:bg-blue-700 opacity-100 visible"
                            disabled={isLoading}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="p-2 bg-red-600 !text-white rounded hover:bg-red-700 opacity-100 visible"
                            disabled={isLoading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-3 text-center !text-gray-600 opacity-100 visible">
                        No food items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
            <h3 className="!text-xl font-semibold !text-gray-800 mb-4 opacity-100 visible">
              {editingFood ? 'Edit Food Item' : 'Add New Food Item'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="!block mb-1 !text-gray-800 opacity-100 visible">Name*</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="!block mb-1 !text-gray-800 opacity-100 visible">Price (₹)*</label>
                  <input
                    type="number"
                    name="price"
                    min="1"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
                    required
                  />
                </div>

                <div>
                  <label className="!block mb-1 !text-gray-800 opacity-100 visible">Category*</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="!block mb-1 !text-gray-800 opacity-100 visible">Open Time*</label>
                  <input
                    type="text"
                    name="openTime"
                    value={formData.openTime}
                    onChange={handleInputChange}
                    placeholder="e.g., 09:00 AM"
                    className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
                    required
                  />
                </div>

                <div>
                  <label className="!block mb-1 !text-gray-800 opacity-100 visible">Close Time*</label>
                  <input
                    type="text"
                    name="closeTime"
                    value={formData.closeTime}
                    onChange={handleInputChange}
                    placeholder="e.g., 09:00 PM"
                    className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="!block mb-1 !text-gray-800 opacity-100 visible">Image URL</label>
                <input
                  type="text"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md !text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 opacity-100 visible"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full p-2 rounded-md !text-white ${
                  isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                } opacity-100 visible`}
              >
                {isLoading ? 'Saving...' : (editingFood ? 'Update Item' : 'Add Item')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Sidebar Component
  const Sidebar: React.FC = () => {
    return (
      <>
        <div className={`fixed inset-y-0 left-0 w-64 bg-gray-800 shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-30`}>
          <div className="p-4">
            <h1 className="!text-2xl font-bold !text-teal-400 opacity-100 visible">Food Dashboard</h1>
          </div>
          <nav className="mt-4 space-y-2 px-2">
            {['dashboard', 'transactions', 'reports', 'foodManagement'].map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view as 'dashboard' | 'transactions' | 'reports' | 'foodManagement')}
                className={`w-full text-left px-4 py-2 !text-white rounded-md transition-colors ${
                  activeView === view ? 'bg-teal-500' : 'bg-teal-600 hover:bg-teal-700'
                } opacity-100 visible`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
            <button
              onClick={handleGlobalRefresh}
              className="w-full text-left px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors opacity-100 visible"
            >
              Refresh All Data
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 bg-red-600 !text-white rounded-md hover:bg-red-700 transition-colors opacity-100 visible"
            >
              Logout
            </button>
          </nav>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 !text-gray-800 z-40 opacity-100 visible"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        <main className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && <DashboardView bills={dashboardBills} />}
              {activeView === 'transactions' && <TransactionsView bills={transactionBills} />}
              {activeView === 'reports' && <ReportsView bills={reportBills} />}
              {activeView === 'foodManagement' && <FoodManagementView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default HomeOne;
 