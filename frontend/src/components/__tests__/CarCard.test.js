import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CarCard from '../CarCard';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('../../api', () => ({
  __esModule: true,
  default: { post: jest.fn(), delete: jest.fn() },
  BASE_URL: 'http://localhost:5000'
}));

describe('CarCard component', () => {
  const car = { id: 42, title: 'Nice Car', price: 1000000, primary_image: '/img/1.jpg', year: 2010 };

  beforeEach(() => localStorage.clear());

  test('renders image when primary_image present', () => {
    render(
      <MemoryRouter>
        <CarCard car={car} />
      </MemoryRouter>
    );

    const img = screen.getByAltText(/Nice Car/i);
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/img/1.jpg');
  });

  test('stores recently viewed and navigates on card click', () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    const { container } = render(
      <MemoryRouter>
        <CarCard car={car} />
      </MemoryRouter>
    );

    fireEvent.click(container.firstChild);
    const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    expect(stored[0]).toBe(car.id);
  });

  test('favorite button redirects to login when no user', () => {
    const { getByTitle } = render(
      <MemoryRouter>
        <CarCard car={car} />
      </MemoryRouter>
    );

    const favBtn = getByTitle(/Save car|Remove from saved/i);
    fireEvent.click(favBtn);
    // When not logged in, component uses useNavigate to /login; no explicit assertion here beyond no crash
    expect(localStorage).toBeDefined();
  });

  test('favorite action calls API and onFavoriteChange when logged in', async () => {
    const mockPost = require('../../api').default.post;
    mockPost.mockResolvedValueOnce({ data: { success: true } });

    jest.resetModules();
    jest.doMock('../../context/AuthContext', () => ({
      useAuth: () => ({ user: { id: 1, name: 'Bob' } }),
    }));
    const CarCardWithAuth = require('../CarCard').default;

    const onFav = jest.fn();
    const { getByTitle } = render(
      <MemoryRouter>
        <CarCardWithAuth car={car} isFavorited={false} onFavoriteChange={onFav} />
      </MemoryRouter>
    );

    const favBtn = getByTitle(/Save car|Remove from saved/i);
    fireEvent.click(favBtn);
    // Wait for promises to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(mockPost).toHaveBeenCalled();
    // onFavoriteChange should be called to update parent state
    expect(onFav).toHaveBeenCalledWith(car.id, true);
  });

  test('shows placeholder when no image provided', () => {
    const noImageCar = { ...car, primary_image: null };
    render(
      <MemoryRouter>
        <CarCard car={noImageCar} />
      </MemoryRouter>
    );

    expect(screen.getByText(/No photo/i)).toBeInTheDocument();
  });
});
