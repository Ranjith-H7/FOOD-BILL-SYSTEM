/*import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Start from './components/start';
import HomeOne from './components/HomeOne';
import HomeTwo from './components/HomeTwo';

const App: React.FC = () => {
  // Clear localStorage on app startup
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('billData');
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/admin/dashboard" element={<HomeOne />} />
        <Route path="/user/dashboard" element={<HomeTwo />} />
      </Routes>
    </Router>
  );
};

export default App;

*/




import { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import React from 'react';

// Lazy-load components
const Start = React.lazy(() => import('./components/start'));
const HomeOne = React.lazy(() => import('./components/HomeOne'));
const HomeTwo = React.lazy(() => import('./components/HomeTwo'));

const App: React.FC = () => {
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('billData');
  }, []);

  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/admin/dashboard" element={<HomeOne />} />
          <Route path="/user/dashboard" element={<HomeTwo />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;