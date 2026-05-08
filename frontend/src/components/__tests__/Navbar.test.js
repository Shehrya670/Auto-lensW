import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../Navbar';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, logout: jest.fn() }),
}));

test('renders nav links and auth buttons when not logged in', () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  expect(screen.getByText(/Browse Cars/i)).toBeInTheDocument();
  expect(screen.getByText(/Sell Your Car/i)).toBeInTheDocument();
  expect(screen.getByText(/Login/i)).toBeInTheDocument();
  expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
});

test('shows user initial and dropdown when user present', () => {
  const mockLogout = jest.fn();
  jest.resetModules();
  jest.doMock('../../context/AuthContext', () => ({
    useAuth: () => ({ user: { name: 'Alice' }, loading: false, logout: mockLogout }),
  }));
  const NavbarWithUser = require('../Navbar').default;

  render(
    <MemoryRouter>
      <NavbarWithUser />
    </MemoryRouter>
  );

  expect(screen.getByText('Alice'.split(' ')[0])).toBeInTheDocument();

  // open dropdown
  fireEvent.click(screen.getByText('Alice'.split(' ')[0]));
  expect(screen.getByText(/Logout/i)).toBeInTheDocument();
});

test('mobile menu toggles when hamburger clicked', () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  const button = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  expect(mobileMenu).toBeInTheDocument();
  // initial should not have open
  expect(mobileMenu.className).not.toContain('open');
  fireEvent.click(button);
  expect(mobileMenu.className).toContain('open');
});
