import React, { useState, useEffect, useCallback } from 'react';
import { useAsgardeo } from '@asgardeo/react';
import './Body.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const Body = () => {
  const auth = useAsgardeo();
  const [accessToken, setAccessToken] = useState(null);
  const [puppies, setPuppies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: '',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!auth?.isSignedIn) {
      setPuppies([]);
      setAccessToken(null);
      setEditingId(null);
      setFormData({ name: '', breed: '', age: '' });
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.getAccessToken?.();
        if (!cancelled && token) setAccessToken(token);
      } catch (e) {
        if (!cancelled) setError('Could not load access token');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const getAuthHeaders = useCallback(() => {
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
  }, [accessToken]);

  const fetchPuppies = useCallback(async () => {
    const headers = getAuthHeaders();
    if (Object.keys(headers).length === 0) {
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/puppies`, { headers });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const msg = body?.detail
          ? `${body.error}: ${body.detail}`
          : body?.error || `Failed (${response.status})`;
        throw new Error(msg);
      }
      const data = await response.json();
      setPuppies(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchPuppies();
  }, [fetchPuppies]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const apiRequest = async (url, options = {}) => {
    const headers = { ...getAuthHeaders(), ...options.headers };
    return fetch(url, { ...options, headers });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.breed.trim() || formData.age === '') {
      setError('Please fill in all fields');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      breed: formData.breed.trim(),
      age: Number(formData.age),
    };

    try {
      setError(null);
      let response;
      if (editingId) {
        response = await apiRequest(`${API_URL}/puppies/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await apiRequest(`${API_URL}/puppies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!response.ok) {
        throw new Error('Failed to save');
      }
      await fetchPuppies();
      setFormData({ name: '', breed: '', age: '' });
      setEditingId(null);
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  const handleEdit = (p) => {
    setFormData({
      name: p.name,
      breed: p.breed,
      age: String(p.age),
    });
    setEditingId(p.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this puppy?')) return;
    try {
      setError(null);
      const response = await apiRequest(`${API_URL}/puppies/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete');
      }
      await fetchPuppies();
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', breed: '', age: '' });
    setEditingId(null);
    setError(null);
  };

  if (auth?.isLoading) {
    return (
      <div className="body-page">
        <h2>Puppies</h2>
        <p className="body-page__hint">Loading...</p>
      </div>
    );
  }

  if (!auth?.isSignedIn) {
    return (
      <div className="body-page">
        <h2>Puppies</h2>
        <p className="body-page__hint">Sign in to view and manage your puppies.</p>
      </div>
    );
  }

  return (
    <div className="body-page">
      <h2>Puppies</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-section">
        <h3>{editingId ? 'Edit' : 'Add'}</h3>
        <div className="form-group">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleInputChange}
            className="input-field"
          />
          <input
            type="text"
            name="breed"
            placeholder="Breed"
            value={formData.breed}
            onChange={handleInputChange}
            className="input-field"
          />
          <input
            type="number"
            name="age"
            placeholder="Age"
            min={0}
            value={formData.age}
            onChange={handleInputChange}
            className="input-field"
          />
          <div className="button-group">
            <button type="button" onClick={handleSave} className="btn btn-primary">
              {editingId ? 'Update' : 'Add'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="table-section">
        <h3>Puppies {!loading && `(${puppies.length})`}</h3>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : puppies.length === 0 ? (
          <div className="empty-state">No puppies yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Breed</th>
                <th>Age</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {puppies.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.breed}</td>
                  <td>{p.age}</td>
                  <td className="actions">
                    <button
                      type="button"
                      onClick={() => handleEdit(p)}
                      className="btn-icon"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="btn-icon"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Body;
