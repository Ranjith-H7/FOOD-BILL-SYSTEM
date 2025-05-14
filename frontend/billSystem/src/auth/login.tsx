import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import HomeOne from '../components/HomeOne';
import HomeTwo from '../components/HomeTwo';

type FormStep = 'login' | 'enterEmail' | 'resetPassword';
interface Errors {
  email: string;
  password: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

interface LoginProps {
  setActiveForm: (form: 'login' | 'register') => void; // Callback to toggle form in Start.tsx
}

const Login: React.FC<LoginProps> = ({ setActiveForm }) => {
  const [formStep, setFormStep] = useState<FormStep>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({
    email: '',
    password: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (storedToken && storedRole) {
      setToken(storedToken);
      setRole(storedRole);
      axios
        .get(`http://localhost:5001/api/${storedRole}/dashboard`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          setToken(null);
          setRole(null);
        });
    }

    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  const validatePassword = (pwd: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(pwd);
  };

  const handleForgotPassword = () => {
    setFormStep('enterEmail');
    setEmail('');
    setPassword('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({ email: '', password: '', otp: '', newPassword: '', confirmPassword: '' });
    setMessage('');
  };

  const handleGenerateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: '', password: '', otp: '', newPassword: '', confirmPassword: '' });
    setMessage('');
  
    if (!email) {
      setErrors({ ...errors, email: 'Email is required' });
      return;
    }
  
    try {
      const res = await axios.post('http://localhost:5001/api/auth/forgot-password', { email });
      setMessage(res.data.message || 'OTP sent to email');
      setFormStep('resetPassword');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('handleGenerateOtp error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      setErrors({
        ...errors,
        email:
          err.response?.data?.details ||
          err.response?.data?.error ||
          'Failed to send OTP. Please check your email or try again later.',
      });
    }
  };
  const handleBackToLogin = () => {
    setFormStep('login');
    setEmail('');
    setPassword('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({ email: '', password: '', otp: '', newPassword: '', confirmPassword: '' });
    setMessage('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: '', password: '', otp: '', newPassword: '', confirmPassword: '' });
    setMessage('');

    const newErrors: Partial<Errors> = { email: '', password: '' };
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors({ ...errors, ...newErrors });

    if (!isValid) return;

    try {
      const res = await axios.post('http://localhost:5001/api/auth/login', { email, password });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      setToken(token);
      setRole(user.role);
      setMessage(res.data.message || 'Login successful');

      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'user') {
        navigate('/user/dashboard');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response?.data?.field) {
        setErrors({ ...errors, [err.response.data.field]: err.response.data.error });
      } else {
        setErrors({
          ...errors,
          email: err.response?.data?.error || 'Login failed. Please try again.',
        });
      }
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: '', password: '', otp: '', newPassword: '', confirmPassword: '' });
    setMessage('');

    const newErrors: Partial<Errors> = { otp: '', newPassword: '', confirmPassword: '' };
    let isValid = true;

    if (!otp) {
      newErrors.otp = 'OTP is required';
      isValid = false;
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
      isValid = false;
    } else if (!validatePassword(newPassword)) {
      newErrors.newPassword =
        'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character';
      isValid = false;
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors({ ...errors, ...newErrors });

    if (!isValid) return;

    try {
      const res = await axios.post('http://localhost:5001/api/auth/verify-otp', {
        email,
        otp,
        newPassword,
      });
      setMessage(res.data.message || 'Password updated successfully');
      setTimeout(() => {
        handleBackToLogin();
      }, 3000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrors({
        ...errors,
        otp: err.response?.data?.error || 'Failed to reset password. Please try again.',
      });
    }
  };

  if (token && role === 'admin') {
    return <HomeOne />;
  } else if (token && role === 'user') {
    return <HomeTwo />;
  }

  return (
    <div className="w-full">
      <h2 className="text-center text-2xl font-bold text-gray-800 mb-4">
        {formStep === 'login' ? 'Login' : formStep === 'enterEmail' ? 'Enter Email for OTP' : 'Reset Password'}
      </h2>
      {message && (
        <p className={`text-sm text-center ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
          {message}
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={
          formStep === 'login' ? handleLoginSubmit : formStep === 'enterEmail' ? handleGenerateOtp : handlePasswordResetSubmit
        }
      >
        {formStep === 'login' && (
          <>
            <div className="mb-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  required
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  className="w-full border-2 text-black border-gray-300 rounded-2xl p-2 focus:outline-none focus:border-purple-500"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  required
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  id="password"
                  className="w-full border-2 text-black border-gray-300 rounded-2xl p-2 focus:outline-none focus:border-purple-500"
                  placeholder="********"
                />
                <span
                  onClick={togglePasswordVisibility}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-xl select-none"
                >
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-purple-600 text-white font-medium rounded-2xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Sign In
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                Forgot your password?
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveForm('register')}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  Don't have an account? Register
                </button>
              </div>
            </div>
          </>
        )}

        {formStep === 'enterEmail' && (
          <>
            <div className="mb-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  required
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  className="w-full border-2 text-black border-gray-300 rounded-2xl p-2 focus:outline-none focus:border-purple-500"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-2xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Generate OTP
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                Back to Login
              </button>
            </div>
          </>
        )}

        {formStep === 'resetPassword' && (
          <>
            <div className="mb-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full border-2 text-black border-gray-300 rounded-2xl p-2 bg-gray-100 cursor-not-allowed"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="mb-2">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                OTP
              </label>
              <div className="relative">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  value={otp}
                  required
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (errors.otp) setErrors({ ...errors, otp: '' });
                  }}
                  className="w-full border-2 text-black border-gray-300 rounded-2xl p-2 focus:outline-none focus:border-purple-500"
                  placeholder="Enter OTP"
                />
              </div>
              {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
            </div>

            <div className="mb-2">
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  required
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                  }}
                  className="w-full border-2 text-black border-gray-300 rounded-2xl p-2 focus:outline-none focus:border-purple-500"
                  placeholder="********"
                />
                <span
                  onClick={toggleNewPasswordVisibility}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-xl select-none"
                >
                  {showNewPassword ? '🙈' : '👁️'}
                </span>
              </div>
              {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
            </div>

            <div className="mb-2">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  required
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  className="w-full border-2 text-black border-gray-300 rounded-2xl p-2 focus:outline-none focus:border-purple-500"
                  placeholder="********"
                />
                <span
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-xl select-none"
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </span>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-purple-600 text-white font-medium rounded-2xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Reset Password
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default Login;