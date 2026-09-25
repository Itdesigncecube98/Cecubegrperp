'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccountsSidebar from '@/components/AccountsSidebar';

export default function NewGRNPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  
  const [formData, setFormData] = useState({
    purchaseOrderId: '',
    grnDate: new Date().toISOString().split('T')[0],
    receivedBy: '',
    remarks: '',
    items: []
  });

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch('/api/purchase-orders?status=APPROVED');
      const data = await res.json();
      setPurchaseOrders(data);
    } catch (error) {
      console.error('Error fetching POs:', error);
    }
  };

  const handlePOSelect = async (poId) => {
    if (!poId) {
      setSelectedPO(null);
      setFormData({ ...formData, purchaseOrderId: '', items: [] });
      return;
    }

    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      const po = await res.json();
      setSelectedPO(po);
      
      // Initialize items with PO items
      const items = po.items.map(item => ({
        poItemId: item.id,
        description: item.description,
        hsnCode: item.hsnCode,
        uom: item.uom,
        orderedQuantity: item.quantity,
        receivedQuantity: item.quantity,
        acceptedQuantity: item.quantity,
        rejectedQuantity: 0,
        remarks: ''
      }));
      
      setFormData({ ...formData, purchaseOrderId: parseInt(poId), items });
    } catch (error) {
      console.error('Error fetching PO details:', error);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Auto-calculate accepted/rejected
    if (field === 'receivedQuantity' || field === 'acceptedQuantity' || field === 'rejectedQuantity') {
      const received = parseFloat(newItems[index].receivedQuantity) || 0;
      const accepted = parseFloat(newItems[index].acceptedQuantity) || 0;
      const rejected = parseFloat(newItems[index].rejectedQuantity) || 0;
      
      if (field === 'receivedQuantity') {
        newItems[index].acceptedQuantity = received;
        newItems[index].rejectedQuantity = 0;
      } else if (field === 'acceptedQuantity') {
        newItems[index].rejectedQuantity = received - accepted;
      } else if (field === 'rejectedQuantity') {
        newItems[index].acceptedQuantity = received - rejected;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.purchaseOrderId) {
      alert('Please select a Purchase Order');
      return;
    }
    
    if (!formData.receivedBy) {
      alert('Please enter who received the materials');
      return;
    }
    
    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const grn = await res.json();
        alert(`GRN ${grn.grnNumber} created successfully!`);
        router.push('/accounts/purchase/grn');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
      alert('Failed to create GRN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AccountsSidebar />
      
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Goods Receipt Note</h1>
              <p className="text-gray-600 mt-1">Record material receipt and quality inspection</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Details */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Order <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.purchaseOrderId}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Purchase Order</option>
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} - {po.vendor.name} - ₹{po.totalAmount.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GRN Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.grnDate}
                  onChange={(e) => setFormData({ ...formData, grnDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.receivedBy}
                  onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                  placeholder="Name of person who received"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Any additional notes"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {selectedPO && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Vendor:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedPO.vendor.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">PO Date:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {new Date(selectedPO.poDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      ₹{selectedPO.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          {formData.items.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Items Received</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">HSN</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">UOM</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Ordered</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Received</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Accepted</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Rejected</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.hsnCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.uom}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center font-medium">
                          {item.orderedQuantity}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.receivedQuantity}
                            onChange={(e) => handleItemChange(index, 'receivedQuantity', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                            step="0.01"
                            min="0"
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.acceptedQuantity}
                            onChange={(e) => handleItemChange(index, 'acceptedQuantity', e.target.value)}
                            className="w-20 px-2 py-1 border border-green-300 rounded text-center text-sm bg-green-50"
                            step="0.01"
                            min="0"
                            max={item.receivedQuantity}
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.rejectedQuantity}
                            onChange={(e) => handleItemChange(index, 'rejectedQuantity', e.target.value)}
                            className="w-20 px-2 py-1 border border-red-300 rounded text-center text-sm bg-red-50"
                            step="0.01"
                            min="0"
                            max={item.receivedQuantity}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                            placeholder="Notes"
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.purchaseOrderId}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
