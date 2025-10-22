'use client';

import { useState } from 'react';

export default function TestShopify() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCustomerCreation = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          phone: '+39 123 456 789',
          privacyAccepted: true,
          newsletterAccepted: true,
          whatsappAccepted: true,
          chatHistory: [
            {
              role: 'user',
              content: 'Test di integrazione Shopify',
              timestamp: new Date().toISOString()
            }
          ]
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🏪 Test Integrazione Shopify</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Test Customer Creation</h2>
          <p className="text-sm text-gray-600 mb-4">
            Questo test crea un customer in Shopify con email generata automaticamente
          </p>
          <button
            onClick={testCustomerCreation}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testando...' : 'Testa Creazione Customer'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Risultato Test:</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            
            {result.shopify?.success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-700">
                  ✅ Customer creato con successo! ID: {result.shopify.customerId}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Verifica su Shopify Admin → Customers
                </p>
              </div>
            )}

            {result.shopify && !result.shopify.success && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700">
                  ❌ Errore creazione customer: {result.shopify.error}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">📋 Configurazione Attuale</h3>
          <ul className="text-sm space-y-1">
            <li>Domain: nabe-furniture.myshopify.com</li>
            <li>API Version: 2024-10</li>
            <li>Token: {process.env.SHOPIFY_ADMIN_API_TOKEN ? 'Configurato' : 'NON configurato'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
