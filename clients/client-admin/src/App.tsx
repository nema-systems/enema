import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Nema Admin Dashboard</h1>
      <p>Simplified admin interface for managing the Nema platform.</p>
      
      <div style={{ marginTop: '30px' }}>
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button style={buttonStyle}>Manage Users</button>
          <button style={buttonStyle}>View System Stats</button>
          <button style={buttonStyle}>Monitor Workflows</button>
          <button style={buttonStyle}>Configuration</button>
        </div>
      </div>
      
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>System Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={cardStyle}>
            <h4>Users</h4>
            <p style={{ fontSize: '24px', margin: '0' }}>0</p>
          </div>
          <div style={cardStyle}>
            <h4>Projects</h4>
            <p style={{ fontSize: '24px', margin: '0' }}>0</p>
          </div>
          <div style={cardStyle}>
            <h4>Artifacts</h4>
            <p style={{ fontSize: '24px', margin: '0' }}>0</p>
          </div>
          <div style={cardStyle}>
            <h4>Workflows</h4>
            <p style={{ fontSize: '24px', margin: '0' }}>0</p>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Connected to API: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: '10px 20px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const cardStyle = {
  padding: '15px',
  backgroundColor: 'white',
  borderRadius: '4px',
  textAlign: 'center' as const
};

export default App;