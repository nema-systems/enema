import React from 'react';

function App() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#1a365d', 
        color: 'white', 
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0', fontSize: '2.5em' }}>Nema</h1>
        <p style={{ margin: '10px 0 0', fontSize: '1.2em' }}>
          Simplified Data Science Platform
        </p>
      </header>

      {/* Hero Section */}
      <section style={{ 
        padding: '60px 20px', 
        textAlign: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <h2 style={{ fontSize: '2em', marginBottom: '20px' }}>
          Track, Manage, and Optimize Your Data Workflows
        </h2>
        <p style={{ 
          fontSize: '1.1em', 
          maxWidth: '600px', 
          margin: '0 auto 30px',
          color: '#666'
        }}>
          Nema provides a unified platform for managing data science artifacts, 
          workflows, and collaboration. This sandbox version demonstrates core 
          functionality with minimal infrastructure overhead.
        </p>
        
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={primaryButtonStyle}>Get Started</button>
          <button style={secondaryButtonStyle}>Learn More</button>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Key Features</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={featureCardStyle}>
            <h3>Artifact Tracking</h3>
            <p>Track and version your data, models, and analysis artifacts automatically.</p>
          </div>
          
          <div style={featureCardStyle}>
            <h3>Workflow Orchestration</h3>
            <p>Manage complex data pipelines with Temporal workflow engine integration.</p>
          </div>
          
          <div style={featureCardStyle}>
            <h3>Semantic Search</h3>
            <p>Find relevant data and artifacts using vector-based semantic search.</p>
          </div>
          
          <div style={featureCardStyle}>
            <h3>Multi-Language Support</h3>
            <p>Works with Python, R, Julia, and other data science languages.</p>
          </div>
          
          <div style={featureCardStyle}>
            <h3>Cloud Integration</h3>
            <p>Seamlessly integrate with AWS services and cloud storage.</p>
          </div>
          
          <div style={featureCardStyle}>
            <h3>Simplified Deployment</h3>
            <p>Deploy with Docker Compose instead of complex CDK infrastructure.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        backgroundColor: '#1a365d', 
        color: 'white', 
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <h3>Ready to Simplify Your Data Science Workflow?</h3>
        <p style={{ marginBottom: '20px' }}>
          Get started with the Nema sandbox environment in minutes.
        </p>
        
        <div style={{ fontSize: '14px', opacity: '0.8', marginTop: '30px' }}>
          <p>Nema Sandbox - Demonstrating 99% less infrastructure complexity</p>
          <p>Connected to API: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</p>
        </div>
      </footer>
    </div>
  );
}

const primaryButtonStyle = {
  padding: '12px 30px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '16px',
  cursor: 'pointer',
  fontWeight: 'bold' as const
};

const secondaryButtonStyle = {
  padding: '12px 30px',
  backgroundColor: 'transparent',
  color: '#007bff',
  border: '2px solid #007bff',
  borderRadius: '6px',
  fontSize: '16px',
  cursor: 'pointer',
  fontWeight: 'bold' as const
};

const featureCardStyle = {
  padding: '30px',
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  textAlign: 'center' as const
};

export default App;