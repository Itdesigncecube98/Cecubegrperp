"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Package, Receipt, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";

const COMPANY_ID = "demo-company-id";

export default function PurchaseDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalPOs: 0,
    pendingPOs: 0,
    awaitingGRN: 0,
    awaitingBills: 0,
    totalSpend: 0,
    monthlySpend: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real stats from API
    setStats({
      totalPOs: 45,
      pendingPOs: 8,
      awaitingGRN: 12,
      awaitingBills: 5,
      totalSpend: 4567890,
      monthlySpend: 567890,
    });
    setLoading(false);
  }, []);

  const cards = [
    {
      title: "Purchase Orders",
      description: "Create and manage purchase orders",
      icon: FileText,
      color: "#3b82f6",
      bgColor: "#eff6ff",
      count: stats.totalPOs,
      pending: stats.pendingPOs,
      path: "/accounts/purchase-orders",
      action: "View All POs",
    },
    {
      title: "Vendor Payables",
      description: "Accounts approval for purchase orders",
      icon: CheckCircle,
      color: "#8b5cf6",
      bgColor: "#f3e8ff",
      count: stats.awaitingGRN,
      pending: null,
      path: "/accounts/vendor-payables",
      action: "Review & Approve",
    },
    {
      title: "Purchase Bills",
      description: "Vendor bills and TDS calculation",
      icon: Receipt,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      count: stats.awaitingBills,
      pending: null,
      path: "/accounts/purchase-bills",
      action: "View Bills",
    },
  ];

  const quickActions = [
    { label: "New Purchase Order", path: "/accounts/purchase-orders/new", color: "#3b82f6" },
    { label: "Vendor Payables (Approve)", path: "/accounts/vendor-payables", color: "#8b5cf6" },
    { label: "Purchase Bills", path: "/accounts/purchase-bills", color: "#f59e0b" },
    { label: "TDS Payment", path: "/accounts/tds/payment", color: "#10b981" },
  ];

  return (
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 32,
        paddingBottom: 20,
        borderBottom: '2px solid #e2e8f0'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: 28, 
          fontWeight: 600, 
          color: '#0f172a',
          marginBottom: 8 
        }}>
          Purchase Dashboard
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#64748b', 
          fontSize: 15 
        }}>
          Complete procurement cycle - PO → GRN → Bill → Payment
        </p>
      </div>

      {/* Stats Overview */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 8, 
              background: '#eff6ff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <TrendingUp size={20} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Total Spend</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                ₹{(stats.totalSpend / 100000).toFixed(2)}L
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 8, 
              background: '#fef3c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Clock size={20} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>This Month</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                ₹{(stats.monthlySpend / 100000).toFixed(2)}L
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 8, 
              background: '#fef3c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <AlertCircle size={20} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Pending Actions</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>
                {stats.pendingPOs + stats.awaitingGRN + stats.awaitingBills}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => router.push(action.path)}
              style={{
                padding: '10px 20px',
                background: action.color,
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <span style={{ fontSize: 18 }}>+</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Procurement Flow Cards */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
          Procurement Workflow
        </h2>
      </div>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24
      }}>
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.path}
              onClick={() => router.push(card.path)}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 24,
                border: '2px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = card.color;
                e.currentTarget.style.boxShadow = `0 4px 12px ${card.color}33`;
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Step Number */}
              <div style={{
                position: 'absolute',
                top: -12,
                left: 20,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: card.color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                {index + 1}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 12 }}>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 12, 
                  background: card.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={28} color={card.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
                    {card.title}
                  </h3>
                  <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    {card.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>
                        {card.count}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {card.pending !== null ? 'Total' : 'Awaiting'}
                      </div>
                    </div>
                    {card.pending !== null && (
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>
                          {card.pending}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Pending
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ 
                marginTop: 16, 
                paddingTop: 16, 
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: card.color }}>
                  {card.action} →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Process Flow Diagram */}
      <div style={{
        marginTop: 40,
        background: 'white',
        borderRadius: 12,
        padding: 32,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 600, color: '#0f172a', textAlign: 'center' }}>
          Purchase Procurement Flow
        </h2>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 20,
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: '#eff6ff',
              border: '3px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <FileText size={32} color="#3b82f6" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Create PO</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Purchase Order</div>
          </div>

          <div style={{ fontSize: 24, color: '#cbd5e1' }}>→</div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: '#f3e8ff',
              border: '3px solid #8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <CheckCircle size={32} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Accounts Approval</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Vendor Payable</div>
          </div>

          <div style={{ fontSize: 24, color: '#cbd5e1' }}>→</div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: '#fef3c7',
              border: '3px solid #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <Receipt size={32} color="#f59e0b" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Purchase Bill</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>With TDS</div>
          </div>

          <div style={{ fontSize: 24, color: '#cbd5e1' }}>→</div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: '#dcfce7',
              border: '3px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <CheckCircle size={32} color="#10b981" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>TDS & Payment</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Complete</div>
          </div>
        </div>
      </div>
    </div>
  );
}
