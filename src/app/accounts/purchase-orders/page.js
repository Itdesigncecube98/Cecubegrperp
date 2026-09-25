"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const COMPANY_ID = "demo-company-id";

const STATUS_COLORS = {
  DRAFT: { bg: '#f3f4f6', text: '#374151' },
  PENDING_APPROVAL: { bg: '#fef3c7', text: '#92400e' },
  APPROVED: { bg: '#dcfce7', text: '#166534' },
  SENT: { bg: '#dbeafe', text: '#1e40af' },
  PARTIALLY_RECEIVED: { bg: '#fce7f3', text: '#9f1239' },
  FULLY_RECEIVED: { bg: '#d1fae5', text: '#065f46' },
  CLOSED: { bg: '#e5e7eb', text: '#1f2937' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: "",
    fromDate: "",
    toDate: "",
    search: "",
  });
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ companyId: COMPANY_ID });
      if (filters.status) params.set("status", filters.status);
      if (filters.fromDate) params.set("fromDate", filters.fromDate);
      if (filters.toDate) params.set("toDate", filters.toDate);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/purchase-orders?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setPOs(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    search();
  }, [search]);

  return (
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 32,
        paddingBottom: 20,
        borderBottom: '2px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: 28, 
            fontWeight: 600, 
            color: '#0f172a',
            marginBottom: 8 
          }}>
            Purchase Orders
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#64748b', 
            fontSize: 15 
          }}>
            Create and manage purchase orders for vendor procurement
          </p>
        </div>
        <button
          onClick={() => router.push('/accounts/purchase-orders/new')}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#2563eb'}
          onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
        >
          <span style={{ fontSize: 18 }}>+</span>
          New Purchase Order
        </button>
      </div>

      {/* Filters Card */}
      <div style={{ 
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16,
          marginBottom: 16
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                background: 'white'
              }}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="FULLY_RECEIVED">Fully Received</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              Search
            </label>
            <input
              placeholder="Search by PO Number, Supplier Name, Project..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>
          <button
            onClick={search}
            disabled={loading}
            style={{
              padding: '10px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#2563eb')}
            onMouseLeave={(e) => (e.target.style.background = '#3b82f6')}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={() => setFilters({ status: "", fromDate: "", toDate: "", search: "" })}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
            onMouseLeave={(e) => e.target.style.background = 'white'}
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: 14, 
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 14,
          fontWeight: 500,
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      )}

      {/* POs Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 16 }}>Loading purchase orders...</div>
        </div>
      ) : pos.length === 0 ? (
        <div style={{ 
          background: 'white',
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>No purchase orders found</div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>Create your first PO to get started</div>
          <button
            onClick={() => router.push('/accounts/purchase-orders/new')}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Create Purchase Order
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 20
        }}>
          {pos.map((po) => {
            const statusColor = STATUS_COLORS[po.status] || STATUS_COLORS.DRAFT;
            return (
              <div
                key={po.id}
                onClick={() => router.push(`/accounts/purchase-orders/${po.id}`)}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                      {po.poNumber}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {new Date(po.poDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: statusColor.bg,
                    color: statusColor.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {po.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Supplier</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{po.supplierName}</div>
                </div>

                {po.projectName && (
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                    🏗️ {po.projectName}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Total Amount</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                      ₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {po._count.items} Items • {po._count.grns} GRNs
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
