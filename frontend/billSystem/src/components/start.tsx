
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lazy } from 'react';
import React from 'react';

const Login = lazy(() => import('../auth/login'));
const Register = lazy(() => import('../auth/register'));

// Types
interface Feature {
  title: string;
  description: string;
  image: string | string[];
  isSlideshow?: boolean;
}

interface Quote {
  text: string;
  author: string;
}

// AuthModal Component
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeForm: 'login' | 'register';
  setActiveForm: (form: 'login' | 'register') => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, activeForm, setActiveForm }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md p-6 bg-white rounded-lg shadow-md relative"
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
          <div className="flex mb-6">
            <button
              onClick={() => setActiveForm('login')}
              className={`flex-1 py-3 rounded-l-lg ${
                activeForm === 'login'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-indigo-600 border border-indigo-600'
              } font-medium transition-colors duration-200`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveForm('register')}
              className={`flex-1 py-3 rounded-r-lg ${
                activeForm === 'register'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-indigo-600 border border-indigo-600'
              } font-medium transition-colors duration-200`}
            >
              Sign Up
            </button>
          </div>
          <div className="w-full">
            {activeForm === 'login' ? (
              <Login setActiveForm={setActiveForm} />
            ) : (
              <Register setActiveForm={setActiveForm} />
            )}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Slideshow Component
interface SlideshowProps {
  images: string[];
}

const Slideshow: React.FC<SlideshowProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative w-full h-40 overflow-hidden rounded-t-lg mb-4">
      <AnimatePresence>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt="Slideshow"
          className="w-full h-full object-cover"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
        />
      </AnimatePresence>
    </div>
  );
};

// Quote Carousel Component
const QuoteCarousel: React.FC = () => {
  const quotes: Quote[] = [
    { text: 'Food is not just eating energy. It’s an experience.', author: 'Guy Fieri' },
    {
      text: 'Cooking is like love. It should be entered into with abandon or not at all.',
      author: 'Harriet Van Horne',
    },
    { text: 'Life is a combination of magic and pasta.', author: 'Federico Fellini' },
    { text: 'Good food is the foundation of genuine happiness.', author: 'Auguste Escoffier' },
  ];
  const [currentQuote, setCurrentQuote] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000); // Change quote every 5 seconds
    return () => clearInterval(interval);
  }, [quotes.length]);

  return (
    <motion.div
      key={currentQuote}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <p className="text-xl italic text-white">"{quotes[currentQuote].text}"</p>
      <p className="text-sm text-white mt-2">— {quotes[currentQuote].author}</p>
    </motion.div>
  );
};

// Main Start Component
const Start: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeForm, setActiveForm] = useState<'login' | 'register'>('login');

  const features: Feature[] = [
    {
      title: 'Quick Billing',
      description: 'Generate printed/online bills in seconds with GST.',
      image: 'https://i.pinimg.com/736x/b0/b2/0a/b0b20a8ba50eea07f03a65e954ad4cc3.jpg',
    },
    {
      title: 'Sales Tracking',
      description: 'View daily, weekly, or monthly sales reports.',
      image: 'https://i.pinimg.com/736x/2d/96/84/2d9684cfee54ebbeeb03fe92b89a5810.jpg',
    },
    {
      title: 'Item Management',
      description: 'Add/edit menu items with pricing and tax settings.',
      image: [
        'https://i.pinimg.com/736x/aa/3f/d7/aa3fd768441e488e4f77ef8172a3d154.jpg',
        'https://i.pinimg.com/736x/60/63/f9/6063f96d9892e87035e5fcb60ac9a9fb.jpg',
        'https://i.pinimg.com/736x/da/75/65/da7565d95f7ce75b3e37a7e9f9b5ea70.jpg',
      ],
      isSlideshow: true,
    },
    {
      title: 'UPI & Cash Support',
      description: 'Accept UPI, card, and cash payments easily.',
      image: 'https://i.pinimg.com/736x/cb/af/7e/cbaf7e19b353349276aeab3d3f682d6d.jpg',
    },
  ];

  return (
    <div className="min-h-screen w-screen flex flex-col bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500">
      {/* Header */}
      <header className="bg-indigo-600 text-white py-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center px-4">
          <img
            src="https://i.pinimg.com/736x/2d/f8/8d/2df88d6165e5f530a762f81f94310aad.jpg"
            alt="Swad Billing Logo"
            className="h-12"
          />
          <nav className="space-x-4">
            <a href="#home" className="hover:underline text-amber-300">
              Home
            </a>
            <a href="#dashboard" className="hover:underline text-amber-300">
              Dashboard
            </a>
            <a href="#pricing" className="hover:underline text-amber-300">
              Pricing
            </a>
            <a href="#contact" className="hover:underline text-amber-300">
              Contact
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-amber-500 text-indigo-900 px-4 py-2 rounded hover:bg-amber-400 transition-colors"
            >
              Login
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-grow flex items-center justify-center text-center text-white py-20">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-6xl font-bold mb-4 text-amber-300"
          >
            Fast, Easy Billing for Indian Food Businesses
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl mb-6 text-white"
          >
            Create bills, manage orders, and track sales – all in one place.
          </motion.p>
          <div className="space-x-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-amber-500 text-indigo-900 px-6 py-3 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
            >
              Try for Free
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-transparent border-2 border-amber-300 text-amber-300 px-6 py-3 rounded-lg font-semibold hover:bg-amber-300 hover:text-indigo-900 transition-colors"
            >
              View Dashboard Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 bg-gray-100 w-full">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12 text-indigo-900">Why Choose Swad Billing?</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow ${
                  index % 3 === 0 ? 'border-l-4 border-indigo-600' : index % 3 === 1 ? 'border-l-4 border-emerald-600' : 'border-l-4 border-amber-600'
                }`}
              >
                {feature.isSlideshow ? (
                  <Slideshow images={feature.image as string[]} />
                ) : (
                  <img
                    src={feature.image as string}
                    alt={feature.title}
                    className="w-full h-40 object-cover rounded-t-lg mb-4"
                  />
                )}
                <h4 className="text-xl font-semibold mb-2 text-indigo-900">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-16 w-full">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12 text-white">Dashboard Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-lg shadow-md bg-indigo-100 p-4"
            >
              <img
                src="https://i.pinimg.com/736x/63/db/c9/63dbc96387fc733bd6bbf1148c050e8d.jpg"
                alt="Dashboard 1"
                className="w-full h-auto rounded-lg"
              />
              <p className="mt-4 text-gray-700">
                Displays Today's Orders (e.g., 25 Orders), Total Sales (e.g., ₹12,500), Pending
                Payments (e.g., ₹2,000), Top Items Sold (e.g., Biryani, Dosa), and a sales trend
                chart.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-lg shadow-md bg-emerald-100 p-4"
            >
              <img
                src="https://i.pinimg.com/736x/c2/e0/60/c2e0607c254889777cce06dc3b874a1f.jpg"
                alt="Dashboard 2"
                className="w-full h-auto rounded-lg"
              />
              <p className="mt-4 text-gray-700">
                Shows Order Summary table (Order ID, Customer, Amount, Status), Sales Overview (e.g.,
                ₹5,000 Today), Menu Items management, and Quick Actions for creating bills.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Content Sample Section */}
      <section className="py-16 bg-gray-100 w-full">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-6 text-indigo-900">Run Your Food Business Your Way</h3>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Whether you're managing a street stall, a tiffin service, or a family restaurant, our
            billing system makes it easy to keep track of sales and serve your customers faster.
          </p>
        </div>
      </section>

      {/* Food Quotes Section */}
      <section className="py-16 w-full">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-12 text-white">Food for Thought</h3>
          <QuoteCarousel />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-indigo-600 text-white py-8 w-full">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-4 text-amber-300">Contact: support@swadbilling.com | +91 123-456-7890</p>
          <div className="flex justify-center space-x-4 mb-4">
            <a href="#" className="hover:underline text-amber-300">
              Facebook
            </a>
            <a href="#" className="hover:underline text-amber-300">
              Twitter
            </a>
            <a href="#" className="hover:underline text-amber-300">
              Instagram
            </a>
          </div>
          <p className="text-amber-300">© 2025 Swad Billing. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeForm={activeForm}
        setActiveForm={setActiveForm}
      />
    </div>
  );
};

export default Start;
