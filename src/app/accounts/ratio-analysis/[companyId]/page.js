"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const fmt = (n) =>
  typeof n === "number" ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : n;

function RatioRow({ label, value, suffix = "" }) {
  return (
    <tr style={{ borderTop: '1px solid #f3f4f6' }}>
      <td style={{ padding: "12px 16px" }}>{label}</td>
      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: '500' }}>
        {fmt(value)}
        {suffix}
      </td>
    </tr>
  );
}

function SectionHeader({ title }) {
  return (
    <tr>
      <td colSpan={2} style={{ background: "#fde9c8", fontWeight: 600, padding: "12px 16px", fontSize: '14px' }}>
        {title}
      </td>
    </tr>
  );
}

export default function RatioAnalysisPage() {
  const { companyId } = useParams();

  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (startDate = fromDate, endDate = toDate) => {
    try {
      const res = await fetch(
        `/api/ratio-analysis?companyId=${companyId}&fromDate=${startDate}&toDate=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to load ratio analysis");
      setError(null);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    async function loadInitialData() {
      try {
        const res = await fetch(
          `/api/ratio-analysis?companyId=${companyId}&fromDate=2026-04-01&toDate=2027-03-31`
        );
        if (!res.ok) throw new Error("Failed to load ratio analysis");
        const result = await res.json();
        if (active) {
          setError(null);
          setData(result);
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInitialData();
    return () => { active = false; };
  }, [companyId]);

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
        <button onClick={() => { setLoading(true); fetchData(fromDate, toDate); }} disabled={loading} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px', background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div style={{ marginBottom: '12px', padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>{error}</div>}

      {data && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflowX: 'auto' }}>
          <table style={{ width: '100%', maxWidth: 800, borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <SectionHeader title="Liquidity / Efficiency Analysis" />
              <RatioRow label="Working Capital" value={data.liquidity.workingCapital} />
              <RatioRow label="Current Ratio" value={data.liquidity.currentRatio} />
              <RatioRow label="Quick Ratio" value={data.liquidity.quickRatio} />
              <RatioRow label="Working Capital Turnover" value={data.liquidity.workingCapitalTurnover} />

              <SectionHeader title="Solvency Analysis" />
              <RatioRow label="Debt/Equity Ratio" value={data.solvency.debtEquityRatio} />
              <RatioRow label="Cash in Hand" value={data.solvency.cashInHand} />
              <RatioRow label="Bank Accounts" value={data.solvency.bankAccounts} />
              <RatioRow label="Bank OD Accounts" value={data.solvency.bankODAccounts} />
              <RatioRow label="Stock in Hand" value={data.solvency.stockInHand} />

              <SectionHeader title="Profitability Analysis" />
              <RatioRow label="Gross Profit/Loss" value={data.profitability.grossProfit} />
              <RatioRow label="Gross Profit/Loss %" value={data.profitability.grossProfitPct} suffix="%" />
              <RatioRow label="Net Profit/Loss" value={data.profitability.netProfit} />
              <RatioRow label="Net Profit/Loss %" value={data.profitability.netProfitPct} suffix="%" />
              <RatioRow label="Return on Investment %" value={data.profitability.returnOnInvestmentPct} suffix="%" />
              <RatioRow label="Return on Working Capital %" value={data.profitability.returnOnWorkingCapitalPct} suffix="%" />

              <SectionHeader title="Turnover Analysis" />
              <RatioRow label="Sales Accounts" value={data.turnover.salesAccounts} />
              <RatioRow label="Purchase Accounts" value={data.turnover.purchaseAccounts} />
              <RatioRow label="Operating Cost %" value={data.turnover.operatingCostPct} suffix="%" />
              <RatioRow label="Inventory Turnover" value={data.turnover.inventoryTurnover} />

              <SectionHeader title="Cash Flow Ratio Analysis" />
              <RatioRow label="Net Cash from Operating Activities" value={data.cashFlowRatios.netCashFromOperating} />
              <RatioRow label="Net Cash from Investing Activities" value={data.cashFlowRatios.netCashFromInvesting} />
              <RatioRow label="Net Cash from Financing Activities" value={data.cashFlowRatios.netCashFromFinancing} />
              <RatioRow label="Net Cash Flow" value={data.cashFlowRatios.netCashFlow} />
              <RatioRow label="Operating Cash Flow Ratio" value={data.cashFlowRatios.operatingCashFlowRatio} />
              <RatioRow label="Cash Flow Coverage Ratio" value={data.cashFlowRatios.cashFlowCoverageRatio} />
              <RatioRow label="Cash Flow Margin %" value={data.cashFlowRatios.cashFlowMarginPct} suffix="%" />
              <RatioRow label="Cash Return on Capital Employed %" value={data.cashFlowRatios.cashReturnOnCapitalEmployedPct} suffix="%" />
              <RatioRow label="Cash Return on Assets %" value={data.cashFlowRatios.cashReturnOnAssetsPct} suffix="%" />
              <RatioRow label="Free Cash Flow" value={data.cashFlowRatios.freeCashFlow} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
