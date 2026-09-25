'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccountsSidebar from '@/components/AccountsSidebar';

export default function GRNListPage() {
  const router = useRouter();
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchGRNs();
  }, [filters.status]);

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      
      const res = await fetch(`/api/grn?${params}`);
      const data = await res.json();
      setGrns(data);
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredGRNs = grns.filter(grn => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      grn.grnNumber.toLowerCase().includes(search) ||
      grn.purchaseOrder.poNumber.toLowerCase().includes(search) ||
      grn.purchaseOrder.vendor.name.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AccountsSidebar />
      
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Goods Receipt Notes</h1>
              <p className="text-gray-600 mt-1">Material receipt and quality inspection records</p>
            </div>
            <button
              onClick={() => router.push('/accounts/purchase/grn/new')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create GRN
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="GRN number, PO number, vendor..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchGRNs}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* GRN Cards */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 mt-4">Loading GRNs...</p>
          </div>
        ) : filteredGRNs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No GRNs found</h3>
            <p className="text-gray-600 mb-4">Create your first Goods Receipt Note to record material receipts</p>
            <button
              onClick={() => router.push('/accounts/purchase/grn/new')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create GRN
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredGRNs.map((grn) => (
              <div key={grn.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{grn.grnNumber}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(grn.status)}`}>
                          {grn.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">PO Number:</span>
                          <span className="ml-2 font-medium text-gray-900">{grn.purchaseOrder.poNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Vendor:</span>
                          <span className="ml-2 font-medium text-gray-900">{grn.purchaseOrder.vendor.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">GRN Date:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {new Date(grn.grnDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Received By:</span>
                          <span className="ml-2 font-medium text-gray-900">{grn.receivedBy}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/accounts/purchase/grn/${grn.id}`)}
                      className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      View Details →
                    </button>
                  </div>

                  {/* Items Summary */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Items Received</h4>
                    <div className="space-y-2">
                      {grn.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.poItem.description}</div>
                            <div className="text-gray-600 text-xs mt-1">
                              HSN: {item.poItem.hsnCode} | UOM: {item.poItem.uom}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-600 font-semibold">
                              ✓ {item.acceptedQuantity} {item.poItem.uom}
                            </div>
                            {item.rejectedQuantity > 0 && (
                              <div className="text-red-600 text-xs">
                                ✗ {item.rejectedQuantity} rejected
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {grn.items.length > 3 && (
                        <div className="text-center text-sm text-gray-600">
                          +{grn.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>

                  {grn.remarks && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm font-medium text-gray-700">Remarks: </span>
                      <span className="text-sm text-gray-600">{grn.remarks}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
