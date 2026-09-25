"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RatioAnalysisPage() {
  const { companyId } = useParams();

  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/ratio-analysis?companyId=${companyId}&fromDate=${fromDate}&toDate=${toDate}`
      );
      if (!res.ok) throw new Error("Failed to load ratio analysis");
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const fmt = (n) =>
    typeof n === "number" ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : n;

  const Row = ({ label, value, suffix = "" }) => (
    <tr style={{ borderTop: '1px solid #f3f4f6' }}>
      <td style={{ padding: "12px 16px" }}>{label}</td>
      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: '500' }}>
        {fmt(value)}
        {suffix}
      </td>
    </tr>
  );

  const SectionHeader = ({ title }) => (
    <tr>
      <td colSpan={2} style={{ background: "#fde9c8", fontWeight: 600, padding: "12px 16px", fontSize: '14px' }}>
        {title}
      </td>
    </tr>
  );

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: '#1e293b' }}>Ratio Analysis</h1>

      <div style={{ display: "flex", gap: '16px', alignItems: "flex-end", marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }} />
        </div>
        <button onClick={fetchData} disabled={loading} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px', background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div style={{ marginBottom: '12px', padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>{error}</div>}

      {data && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflowX: 'auto' }}>
          <table style={{ width: '100%', maxWidth: 800, borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <SectionHeader title="Liquidity / Efficiency Analysis" />
              <Row label="Working Capital" value={data.liquidity.workingCapital} />
              <Row label="Current Ratio" value={data.liquidity.currentRatio} />
              <Row label="Quick Ratio" value={data.liquidity.quickRatio} />
              <Row label="Working Capital Turnover" value={data.liquidity.workingCapitalTurnover} />

              <SectionHeader title="Solvency Analysis" />
              <Row label="Debt/Equity Ratio" value={data.solvency.debtEquityRatio} />
              <Row label="Cash in Hand" value={data.solvency.cashInHand} />
              <Row label="Bank Accounts" value={data.solvency.bankAccounts} />
              <Row label="Bank OD Accounts" value={data.solvency.bankODAccounts} />
              <Row label="Stock in Hand" value={data.solvency.stockInHand} />

              <SectionHeader title="Profitability Analysis" />
              <Row label="Gross Profit/Loss" value={data.profitability.grossProfit} />
              <Row label="Gross Profit/Loss %" value={data.profitability.grossProfitPct} suffix="%" />
              <Row label="Net Profit/Loss" value={data.profitability.netProfit} />
              <Row label="Net Profit/Loss %" value={data.profitability.netProfitPct} suffix="%" />
              <Row label="Return on Investment %" value={data.profitability.returnOnInvestmentPct} suffix="%" />
              <Row label="Return on Working Capital %" value={data.profitability.returnOnWorkingCapitalPct} suffix="%" />

              <SectionHeader title="Turnover Analysis" />
              <Row label="Sales Accounts" value={data.turnover.salesAccounts} />
              <Row label="Purchase Accounts" value={data.turnover.purchaseAccounts} />
              <Row label="Operating Cost %" value={data.turnover.operatingCostPct} suffix="%" />
              <Row label="Inventory Turnover" value={data.turnover.inventoryTurnover} />

              <SectionHeader title="Cash Flow Ratio Analysis" />
              <Row label="Net Cash from Operating Activities" value={data.cashFlowRatios.netCashFromOperating} />
              <Row label="Net Cash from Investing Activities" value={data.cashFlowRatios.netCashFromInvesting} />
              <Row label="Net Cash from Financing Activities" value={data.cashFlowRatios.netCashFromFinancing} />
              <Row label="Net Cash Flow" value={data.cashFlowRatios.netCashFlow} />
              <Row label="Operating Cash Flow Ratio" value={data.cashFlowRatios.operatingCashFlowRatio} />
              <Row label="Cash Flow Coverage Ratio" value={data.cashFlowRatios.cashFlowCoverageRatio} />
              <Row label="Cash Flow Margin %" value={data.cashFlowRatios.cashFlowMarginPct} suffix="%" />
              <Row label="Cash Return on Capital Employed %" value={data.cashFlowRatios.cashReturnOnCapitalEmployedPct} suffix="%" />
              <Row label="Cash Return on Assets %" value={data.cashFlowRatios.cashReturnOnAssetsPct} suffix="%" />
              <Row label="Free Cash Flow" value={data.cashFlowRatios.freeCashFlow} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
