import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, LogOut, Download, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';

// Extend the Window interface to include Razorpay
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface FoodItem {
  _id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  openTime: string;
  closeTime: string;
}

interface CartItem {
  item: FoodItem;
  quantity: number;
}

const API_URL = 'http://localhost:5001';

const HomeTwo: React.FC = () => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Successful'>('Pending');
  const [paymentMethod, setPaymentMethod] = useState<string>(''); // Track specific payment method
  const [isLoadingPayment, setIsLoadingPayment] = useState<boolean>(false);
  const [hasSavedBill, setHasSavedBill] = useState<boolean>(false);
  const [hasDownloadedBill, setHasDownloadedBill] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => console.log('Razorpay script loaded');
    script.onerror = () => alert('Failed to load Razorpay script. Please check your network.');
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch food items from API
  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get(`${API_URL}/api/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFoodItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('Failed to fetch items. Please ensure you are logged in.');
    }
  };

  // Fetch QR code for Online payment
  const fetchQrCode = async () => {
    try {
      const response = await axios.get(`${API_URL}/fetch-qr`);
      const data = response.data;
      if (data.image_url) {
        setQrCodeUrl(data.image_url);
      } else {
        setQrCodeUrl('');
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      setQrCodeUrl('');
    }
  };

  // Initial fetch
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchItems();
      fetchQrCode();
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Categories
  const categories = useMemo(() => {
    return ['All', ...new Set(foodItems.map(item => item.category))].sort();
  }, [foodItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = selectedCategory === 'All'
      ? foodItems
      : foodItems.filter(item => item.category === selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.price.toString().includes(query)
      );
    }

    return items;
  }, [selectedCategory, searchQuery, foodItems]);

  // Cart operations
  const addToCart = (item: FoodItem, quantity: number = 1) => {
    const existing = cart.find(c => c.item._id === item._id);
    if (existing) {
      setCart(cart.map(c =>
        c.item._id === item._id ? { ...c, quantity: c.quantity + quantity } : c
      ));
    } else {
      setCart([...cart, { item, quantity }]);
    }
  };

  const increaseQuantity = (itemId: string) => {
    setCart(cart.map(c =>
      c.item._id === itemId ? { ...c, quantity: c.quantity + 1 } : c
    ));
  };

  const decreaseQuantity = (itemId: string) => {
    setCart(cart
      .map(c => c.item._id === itemId ? { ...c, quantity: c.quantity - 1 } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const totalAmount = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);

  // Map frontend payment mode to backend values
  const mapPaymentMethod = (mode: string): string => {
    if (mode === 'Cash') return 'cash';
    if (mode === 'Online') return 'online';
    return 'cash';
  };

  // Handle save bill to backend
  const handleSave = async () => {
    if (cart.length === 0) {
      alert('Please add items to the bill before saving.');
      return;
    }
    if (paymentMode === 'Card') {
      alert('Card payment is not supported. Please select Cash or Online.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication token missing. Please log in again.');
      navigate('/');
      return;
    }
    setIsLoadingPayment(true);
    try {
      const billData = {
        items: cart.map(cartItem => ({
          itemName: cartItem.item.name,
          category: cartItem.item.category,
          price: cartItem.item.price,
          quantity: cartItem.quantity,
          total: cartItem.item.price * cartItem.quantity,
        })),
        grandTotal: totalAmount,
        paymentMethod: mapPaymentMethod(paymentMode),
        status: 'failed',
        date: new Date().toISOString(),
      };
      const response = await axios.post(`${API_URL}/api/bill/bills`, billData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasSavedBill(true);
      alert('Bill saved successfully!');
      console.log('Save bill response:', response.data);
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Failed to save bill. Please try again.');
    } finally {
      setIsLoadingPayment(false);
    }
  };

  // Handle confirm payment with Razorpay for Online mode
  const handleConfirmPayment = async () => {
    if (cart.length === 0) {
      alert('Please add items to the bill before confirming payment.');
      return;
    }
    if (paymentMode === 'Card') {
      alert('Card payment is not supported. Please select Cash or Online.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication token missing. Please log in again.');
      navigate('/');
      return;
    }
    setIsLoadingPayment(true);

    try {
      const billData = {
        items: cart.map(cartItem => ({
          itemName: cartItem.item.name,
          category: cartItem.item.category,
          price: cartItem.item.price,
          quantity: cartItem.quantity,
          total: cartItem.item.price * cartItem.quantity,
        })),
        grandTotal: totalAmount,
        paymentMethod: mapPaymentMethod(paymentMode),
        status: 'success',
        date: new Date().toISOString(),
      };

      if (paymentMode === 'Online') {
        const response = await axios.post(`${API_URL}/create-order`, {
          amount: totalAmount,
        });
        if (!response.data.order_id) {
          throw new Error('Failed to create Razorpay order');
        }
        const { order_id, amount } = response.data;

        const options = {
          key: 'rzp_test_8GbTvyO0t2rPVW', // Replace with your actual Razorpay Test Key ID
          amount: amount,
          currency: 'INR',
          name: 'Food Billing System',
          description: 'Bill Payment',
          image: '/2.jpeg',
          order_id: order_id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          handler: async (response: any) => {
            try {
              // Verify payment method via backend
              const verifyResponse = await axios.post(`${API_URL}/verify-payment`, {
                payment_id: response.razorpay_payment_id,
              });
              const method = verifyResponse.data.method || 'unknown';

              const paymentData = {
                ...billData,
                paymentDetails: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  payment_method: method,
                },
              };
              const saveResponse = await axios.post(`${API_URL}/api/bill/bills`, paymentData, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setHasSavedBill(true);
              setPaymentStatus('Successful');
              setPaymentMethod(method);
              alert(
                `Payment via ${paymentMode} (${method.toUpperCase()}) successful! Payment ID: ${
                  response.razorpay_payment_id
                }`
              );
              console.log('Payment response:', response);
              console.log('Payment save response:', saveResponse.data);
            } catch (error) {
              console.error('Error processing payment:', error);
              alert('Payment successful but failed to save to backend. Please contact support.');
            } finally {
              setIsLoadingPayment(false);
            }
          },
          prefill: {
            name: 'Customer Name',
            email: 'customer@example.com',
            contact: '9999999999',
          },
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true,
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay via UPI',
                  instruments: [{ method: 'upi', flows: ['qr', 'collect', 'intent'] }],
                },
                banks: {
                  name: 'Pay via Banks',
                  instruments: [
                    { method: 'card' },
                    { method: 'netbanking' },
                    { method: 'wallet' },
                  ],
                },
              },
              sequence: ['block.upi', 'block.banks'],
              preferences: { show_default_blocks: true },
            },
          },
          theme: { color: '#528FF0' },
          modal: {
            ondismiss: () => {
              setIsLoadingPayment(false);
              alert('Payment window closed');
            },
          },
        };

        if (!window.Razorpay) {
          throw new Error('Razorpay script not loaded. Please check your network.');
        }
        const rzp1 = new window.Razorpay(options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rzp1.on('payment.failed', (response: any) => {
          console.error('Payment failed:', response.error);
          const errorMsg = response.error.description || 'Unknown error occurred';
          alert(`Payment Failed: ${errorMsg}. Please try again or contact support.`);
          setIsLoadingPayment(false);
        });
        rzp1.open();
      } else {
        const response = await axios.post(`${API_URL}/api/bill/bills`, billData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHasSavedBill(true);
        setPaymentStatus('Successful');
        setPaymentMethod('cash');
        alert(`Payment via ${paymentMode} successful!`);
        console.log('Confirm payment response:', response.data);
        setIsLoadingPayment(false);
      }
    } catch (error: unknown) {
  console.error('Error confirming payment:', error);

  let errorMessage = 'Please try again or check your Razorpay setup.';
  if (error instanceof Error) {
    errorMessage = error.message;
  }

  alert(`Payment failed: ${errorMessage}`);

  if (paymentMode !== 'Online') {
    setIsLoadingPayment(false);
  }
}

  };

  // Handle download bill as PDF
  const handleDownloadBill = async () => {
    if (cart.length === 0) {
      alert('Please add items to the bill before downloading.');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(16);
      doc.text('FOOD BILL', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.text(`Date: ${new Date().toLocaleString()}`, 20, 40);
      doc.text(
        `Payment Method: ${paymentMode}${paymentMethod ? ` (${paymentMethod.toUpperCase()})` : ''}`,
        20,
        50
      );
      doc.text(`Status: ${paymentStatus}`, 20, 60);

      let y = 70;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Item', 20, y);
      doc.text('Qty', 100, y, { align: 'center' });
      doc.text('Price', 130, y, { align: 'right' });
      doc.text('Total', 160, y, { align: 'right' });
      y += 5;
      doc.setLineWidth(0.2);
      doc.line(20, y, 190, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      cart.forEach((c) => {
        doc.text(c.item.name, 20, y, { maxWidth: 70 });
        doc.text(c.quantity.toString(), 100, y, { align: 'center' });
        doc.text(`₹${c.item.price}`, 130, y, { align: 'right' });
        doc.text(`₹${c.item.price * c.quantity}`, 160, y, { align: 'right' });
        y += 10;
      });

      y += 5;
      doc.line(20, y, 190, y);
      y += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Grand Total: ₹${totalAmount}`, 20, y);

      doc.save(`bill_${new Date().toISOString().split('T')[0]}.pdf`);
      setHasDownloadedBill(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please ensure jsPDF is properly installed and try again.');
    }
  };

  // Handle refresh items
  const handleRefresh = () => {
    fetchItems();
  };

  // Handle new bill with confirmation
  const handleNewBill = () => {
    setCart([]);
    setPaymentMode('Cash');
    setPaymentStatus('Pending');
    setPaymentMethod('');
    setHasSavedBill(false);
    setHasDownloadedBill(false);
    setQrCodeUrl('');
    localStorage.removeItem('cart');
    fetchQrCode();
  };

  // Handle new bill button click
  const handleNewBillClick = () => {
    if (cart.length > 0 && !hasSavedBill && !hasDownloadedBill) {
      alert('Please save or download the bill before starting a new one.');
      return;
    }
    if (window.confirm('Are you sure you want to start a new bill?')) {
      handleNewBill();
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('cart');
    navigate('/');
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-green-600 text-white p-4 flex items-center justify-between shadow-md w-full z-30 fixed top-0">
        <div className="flex items-center gap-3">
          <button
            className="sm:hidden text-white text-2xl"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>
          <div className="text-lg sm:text-xl font-bold">Food Billing System</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"
              size={18}
            />
            <input
              type="text"
              placeholder="Search..."
              className="p-2 pl-10 rounded text-black w-full max-w-[160px] sm:max-w-[240px] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            onClick={handleRefresh}
            title="Refresh Items"
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 w-full min-w-0 h-[calc(100vh-4rem)] pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed sm:static top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-gray-100 p-4 overflow-y-auto border-r border-gray-200 transform transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } sm:translate-x-0 z-20`}
        >
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Categories</h2>
          <ul className="space-y-2 mb-4">
            {categories.map((category) => (
              <li
                key={category}
                className={`cursor-pointer w-full px-3 py-2 rounded text-sm transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => {
                  setSelectedCategory(category);
                  setIsSidebarOpen(false);
                }}
              >
                {category}
              </li>
            ))}
          </ul>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 sm:hidden z-10"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Main Section */}
        <main className="flex-1 p-4 overflow-y-auto bg-white min-w-0 h-[calc(100vh-4rem)]">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Menu</h1>
          {filteredItems.length === 0 ? (
            <div className="text-gray-500 text-center mt-8 text-lg">No items found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const cartItem = cart.find((c) => c.item._id === item._id);
                const quantity = cartItem ? cartItem.quantity : 0;

                return (
                  <div
                    key={item._id}
                    className="shadow-lg rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-xl transition"
                  >
                    <div className="w-full h-40 flex items-center justify-center">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="max-w-full max-h-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder.jpg';
                        }}
                      />
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-gray-800 line-clamp-2">
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-600 font-medium">₹{item.price}</span>
                      </div>
                      <div className="flex items-center justify-end">
                        {quantity === 0 ? (
                          <button
                            className="px-3 py-1.5 bg-teal-500 text-white rounded text-sm shadow hover:bg-teal-600 transition"
                            onClick={() => addToCart(item)}
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                            <button
                              className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded text-xs shadow-sm hover:bg-red-600"
                              onClick={() => decreaseQuantity(item._id)}
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                            <button
                              className="w-6 h-6 flex items-center justify-center bg-green-500 text-white rounded text-xs shadow-sm hover:bg-green-600"
                              onClick={() => increaseQuantity(item._id)}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Billing Section */}
        <aside className="w-full sm:w-96 bg-gray-100 p-4 flex flex-col border-t sm:border-t-0 sm:border-l border-gray-200 overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="flex-grow">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Billing</h2>
            <button
              className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm shadow hover:bg-purple-700 mb-4 transition"
              onClick={handleNewBillClick}
            >
              New Bill
            </button>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No items added.</p>
            ) : (
              <div className="w-full">
                <div className="bg-white p-4 rounded shadow mb-4">
                  <div className="flex font-semibold text-gray-700 mb-2 text-xs">
                    <span className="w-2/5 pl-1">Item</span>
                    <span className="w-1/5 text-center">Qty</span>
                    <span className="w-1/5 text-right">Rate</span>
                    <span className="w-1/5 text-right">Amount</span>
                  </div>
                  {cart.map((c) => (
                    <div
                      key={c.item._id}
                      className="flex items-center text-gray-600 mb-2 text-xs"
                    >
                      <span className="w-2/5 truncate line-clamp-1 pl-1">{c.item.name}</span>
                      <div className="w-1/5">
                        <div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          <button
                            className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded text-xs shadow-sm hover:bg-red-600"
                            onClick={() => decreaseQuantity(c.item._id)}
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{c.quantity}</span>
                          <button
                            className="w-6 h-6 flex items-center justify-center bg-green-500 text-white rounded text-xs shadow-sm hover:bg-green-600"
                            onClick={() => increaseQuantity(c.item._id)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <span className="w-1/5 text-right">₹{c.item.price}</span>
                      <span className="w-1/5 text-right">₹{c.item.price * c.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-gray-800 text-sm">
                      <span>Subtotal:</span>
                      <span>₹{totalAmount}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base text-gray-800 mt-1">
                      <span>Total:</span>
                      <span>₹{totalAmount}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm text-gray-700">Payment:</label>
                    <select
                      className="p-2 rounded text-black w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      disabled={paymentStatus === 'Successful' || isLoadingPayment}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  {paymentMode === 'Online' && qrCodeUrl && (
                    <div className="flex flex-col items-center mt-3 mb-3">
                      <img
                        src={qrCodeUrl}
                        alt="UPI QR Code"
                        className="w-40 h-40 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/online/online.png';
                        }}
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        Scan with any UPI app (Google Pay, PhonePe, etc.)
                      </p>
                    </div>
                  )}
                  <div className="text-sm text-gray-700 mb-2">
                    Status:{' '}
                    <span
                      className={paymentStatus === 'Successful' ? 'text-green-600' : 'text-yellow-600'}
                    >
                      {paymentStatus}
                    </span>
                  </div>
                  {paymentStatus === 'Successful' && paymentMethod && (
                    <div className="text-sm text-gray-700 mb-2">
                      Paid via:{' '}
                      <span className="text-green-600">{paymentMethod.toUpperCase()}</span>
                    </div>
                  )}
                  {paymentStatus !== 'Successful' && (
                    <button
                      className={`w-full px-3 py-2 bg-blue-600 text-white rounded text-sm shadow hover:bg-blue-700 transition ${
                        isLoadingPayment ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={handleConfirmPayment}
                      disabled={isLoadingPayment}
                    >
                      {isLoadingPayment ? 'Processing...' : 'Confirm Payment'}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    className={`w-full px-3 py-2 bg-blue-600 text-white rounded text-sm shadow hover:bg-blue-700 transition ${
                      isLoadingPayment ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleSave}
                    disabled={isLoadingPayment}
                  >
                    Save Bill
                  </button>
                  <button
                    className={`w-full px-3 py-2 bg-green-600 text-white rounded text-sm shadow hover:bg-green-700 flex items-center justify-center transition ${
                      isLoadingPayment ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleDownloadBill}
                    disabled={isLoadingPayment}
                  >
                    <Download size={18} className="mr-2" />
                    Download Bill
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HomeTwo;