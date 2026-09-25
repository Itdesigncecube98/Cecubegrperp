"use client";

import Link from "next/link";

const DEMO_COMPANY_ID = "demo-company-id";

export default function AccountsDashboard() {
  return (
    <div style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 32 }}>Accounts Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {/* GST Module */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, background: "#f9f9f9" }}>
          <h2 style={{ marginTop: 0, color: "#2563eb" }}>GST Module</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: 12 }}>
              <Link href="/accounts/gst/categories" style={{ color: "#2563eb", textDecoration: "none" }}>
                → GST Categories
              </Link>
            </li>
            <li style={{ marginBottom: 12 }}>
              <Link href="/accounts/gst/vouchers" style={{ color: "#2563eb", textDecoration: "none" }}>
                → GST Vouchers
              </Link>
            </li>
            <li style={{ marginBottom: 12 }}>
              <Link href="/accounts/gst/gstr1" style={{ color: "#2563eb", textDecoration: "none" }}>
                → GSTR1 Filing
              </Link>
            </li>
          </ul>
        </div>

        {/* Basic Accounting */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, background: "#f9f9f9" }}>
          <h2 style={{ marginTop: 0, color: "#059669" }}>Basic Accounting</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: 12 }}>
              <Link href="/accounts/ledgers" style={{ color: "#059669", textDecoration: "none" }}>
                → Ledger Browse
              </Link>
            </li>
            <li style={{ marginBottom: 12 }}>
              <Link href="/accounts/trial-balance" style={{ color: "#059669", textDecoration: "none" }}>
                → Trial Balance
              </Link>
            </li>
            <li style={{ marginBottom: 12 }}>
              <Link href="/accounts/vouchers/new" style={{ color: "#059669", textDecoration: "none" }}>
                → Create Voucher
              </Link>
            </li>
          </ul>
        </div>

        {/* Financial Reports */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, background: "#f9f9f9" }}>
          <h2 style={{ marginTop: 0, color: "#dc2626" }}>Financial Reports</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: 12 }}>
              <Link href={`/accounts/ratio-analysis/${DEMO_COMPANY_ID}`} style={{ color: "#dc2626", textDecoration: "none" }}>
                → Ratio Analysis
              </Link>
            </li>
            <li style={{ marginBottom: 12 }}>
              <Link href={`/accounts/schedule3/${DEMO_COMPANY_ID}`} style={{ color: "#dc2626", textDecoration: "none" }}>
                → Schedule III (Balance Sheet)
              </Link>
            </li>
          </ul>
        </div>

        {/* TDS/TCS Management */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, background: "#f9f9f9" }}>
          <h2 style={{ marginTop: 0, color: "#7c3aed" }}>TDS/TCS</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: 12 }}>
              <Link href={`/accounts/tds/master/${DEMO_COMPANY_ID}`} style={{ color: "#7c3aed", textDecoration: "none" }}>
                → TDS Master
              </Link>
            </li>
            <li style={{ marginBottom: 12 }}>
              <Link href={`/accounts/tds/payment/${DEMO_COMPANY_ID}`} style={{ color: "#7c3aed", textDecoration: "none" }}>
                → TDS Payment
              </Link>
            </li>
            <li style={{ marginBottom: 12 }}>
              <Link href={`/accounts/tds/challan/${DEMO_COMPANY_ID}`} style={{ color: "#7c3aed", textDecoration: "none" }}>
                → TDS Challan
              </Link>
            </li>
            <li style={{ marginBottom: 12 }}>
              <Link href={`/accounts/tds/adjustment/${DEMO_COMPANY_ID}`} style={{ color: "#7c3aed", textDecoration: "none" }}>
                → TDS Adjustment
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 48, padding: 20, background: "#fef3c7", borderRadius: 8, border: "1px solid #fbbf24" }}>
        <h3 style={{ marginTop: 0 }}>📊 Quick Stats</h3>
        <p style={{ margin: "8px 0" }}>
          <strong>Company ID:</strong> {DEMO_COMPANY_ID}
        </p>
        <p style={{ margin: "8px 0" }}>
          <strong>Features:</strong> GST, Double-Entry Bookkeeping, Schedule III, Ratio Analysis, TDS/TCS, Cash Flow
        </p>
        <p style={{ margin: "8px 0" }}>
          <strong>Status:</strong> ✅ All modules operational
        </p>
      </div>

      <div style={{ marginTop: 24, padding: 20, background: "#eff6ff", borderRadius: 8, border: "1px solid #3b82f6" }}>
        <h3 style={{ marginTop: 0 }}>💡 Features Implemented</h3>
        <ul style={{ marginLeft: 20 }}>
          <li>TDS/TCS Master with section-wise configuration</li>
          <li>Decimal.js precision for all financial calculations</li>
          <li>Dynamic company-based routing for all reports</li>
          <li>Cash Flow analysis (Operating/Investing/Financing)</li>
          <li>Schedule III Balance Sheet (Companies Act 2013)</li>
          <li>Complete ratio analysis (Liquidity, Solvency, Profitability, Turnover, Cash Flow ratios)</li>
          <li>GST vouchers with GSTR1 filing workflow</li>
          <li>Double-entry vouchers for Vehicle, Salary, Imprest tracking</li>
        </ul>
      </div>
    </div>
  );
}
