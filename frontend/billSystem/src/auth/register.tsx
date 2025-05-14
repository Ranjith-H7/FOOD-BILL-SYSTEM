import axios from 'axios';
import { useState, useRef } from 'react';

interface Errors {
  phone: string;
  password: string;
  confirm: string;
  email: string;
  username: string;
}

interface RegisterProps {
  setActiveForm: (form: 'login' | 'register') => void; // Callback to toggle form in Start.tsx
}

const Register: React.FC<RegisterProps> = ({ setActiveForm }) => {
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [role, setRole] = useState<string>('user');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Errors>({
    phone: '',
    password: '',
    confirm: '',
    email: '',
    username: '',
  });
  const formRef = useRef<HTMLFormElement>(null);

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
  const toggleConfirmPasswordVisibility = () => setShowConfirm((prev) => !prev);

  const isStrongPassword = (pwd: string): boolean => {
    const strongRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(pwd);
  };

  const validateForm = (): Errors => {
    const formErrors: Errors = {
      phone: '',
      password: '',
      confirm: '',
      email: '',
      username: '',
    };

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      formErrors.phone = 'Enter a valid 10-digit phone number';
    }

    if (!isStrongPassword(password)) {
      formErrors.password = 'Use 8+ chars, 1 uppercase, 1 number, 1 special char';
    }

    if (password !== confirm) {
      formErrors.confirm = 'Passwords do not match';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      formErrors.email = 'Enter a valid email address';
    }

    if (username.length < 3) {
      formErrors.username = 'Username must be at least 3 characters';
    }

    return formErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formErrors = validateForm();
    if (Object.values(formErrors).some((error) => error !== '')) {
      setErrors(formErrors);
      setIsLoading(false);
      return;
    }

    const userData = { username, email, phone, password, confirmPassword: confirm, role };

    try {
      const res = await axios.post('http://localhost:5001/api/auth/register', userData);
      setMessage(res.data.message || 'User registered successfully');
      setTimeout(() => {
        formRef.current?.reset();
        setPassword('');
        setConfirmPassword('');
        setPhone('');
        setEmail('');
        setUsername('');
        setRole('user');
        setMessage('');
        setErrors({ phone: '', password: '', confirm: '', email: '', username: '' });
        setActiveForm('login'); // Switch to login form
      }, 3000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const defaultErrors: Errors = { phone: '', password: '', confirm: '', email: '', username: '' };
      if (err.response?.data?.error) {
        if (err.response.data.field) {
          setErrors({ ...defaultErrors, [err.response.data.field]: err.response.data.error });
        } else {
          setMessage(err.response.data.error);
        }
      } else {
        setMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
        <h1 className="text-center text-2xl font-bold text-gray-800 mb-4">Register</h1>
        {message && (
          <p
            className={`text-sm text-center ${
              message.includes('successfully') ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {message}
          </p>
        )}
        <div className="mb-2">
          <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
            Mobile No
          </label>
          <input
            type="tel"
            id="mobile"
            required
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors({ ...errors, phone: '' });
            }}
            className="w-full border-2 border-gray-300 rounded-2xl p-2 text-black focus:outline-none focus:border-purple-500"
            placeholder="1234567890"
            disabled={isLoading}
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div className="mb-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            className="w-full border-2 border-gray-300 rounded-2xl p-2 text-black focus:outline-none focus:border-purple-500"
            placeholder="example@domain.com"
            disabled={isLoading}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div className="mb-2">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            type="text"
            id="username"
            required
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errors.username) setErrors({ ...errors, username: '' });
            }}
            className="w-full border-2 border-gray-300 rounded-2xl p-2 text-black focus:outline-none focus:border-purple-500"
            placeholder="Your username"
            disabled={isLoading}
          />
          {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
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
              className="w-full border-2 border-gray-300 rounded-2xl p-2 text-black focus:outline-none focus:border-purple-500"
              placeholder="********"
              disabled={isLoading}
            />
            <span
              onClick={togglePasswordVisibility}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-xl select-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>

        <div className="mb-2">
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              required
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirm) setErrors({ ...errors, confirm: '' });
              }}
              id="confirm-password"
              className="w-full border-2 border-gray-300 rounded-2xl p-2 text-black focus:outline-none focus:border-purple-500"
              placeholder="********"
              disabled={isLoading}
            />
            <span
              onClick={toggleConfirmPasswordVisibility}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-xl select-none"
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? '🙈' : '👁️'}
            </span>
          </div>
          {errors.confirm && <p className="text-red-500 text-sm mt-1">{errors.confirm}</p>}
        </div>

        <div className="mb-2">
          <label htmlFor="userRole" className="block text-sm font-medium text-gray-700">
            Choose a role
          </label>
          <select
            id="userRole"
            name="userRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-2xl p-2 text-black focus:outline-none focus:border-purple-500"
            disabled={isLoading}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 bg-purple-600 text-white font-medium rounded-2xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
};

export default Register;