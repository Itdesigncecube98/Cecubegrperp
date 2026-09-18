'use client';
import React, { useState, useEffect, use } from 'react';
import { Save, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function TenderEvaluation({ params }) {
  const unwrappedParams = use(params);
  const tenderId = unwrappedParams.id;
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState([]);

  const [formData, setFormData] = useState({
    clientProfileScore: 0,
    projectExpScore: 0,
    techEligibleScore: 0,
    finEligibleScore: 0,
    similarWorkScore: 0,
    locationScore: 0,
    paymentTermsScore: 0,
    projectMarginScore: 0,
    totalScore: 0,
    decision: '',
    reason: '',
    expectedMargin: '',
    competition: '',
    resourceAvail: '',
    risk: '',
    remarks: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/tender/${tenderId}`);
        if (res.ok) {
          const data = await res.json();
          setEvaluations(data.evaluations || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [tenderId]);

  // Auto-calculate Total
  useEffect(() => {
    const total = 
      parseInt(formData.clientProfileScore || 0) +
      parseInt(formData.projectExpScore || 0) +
      parseInt(formData.techEligibleScore || 0) +
      parseInt(formData.finEligibleScore || 0) +
      parseInt(formData.similarWorkScore || 0) +
      parseInt(formData.locationScore || 0) +
      parseInt(formData.paymentTermsScore || 0) +
      parseInt(formData.projectMarginScore || 0);

    let recDecision = '';
    if (total >= 70) recDecision = 'GO';
    else if (total >= 50) recDecision = 'Review Required';
    else recDecision = 'NO-GO';

    setFormData(prev => ({ ...prev, totalScore: total, decision: prev.decision || recDecision }));
  }, [
    formData.clientProfileScore, formData.projectExpScore, formData.techEligibleScore,
    formData.finEligibleScore, formData.similarWorkScore, formData.locationScore,
    formData.paymentTermsScore, formData.projectMarginScore
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/tender/${tenderId}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newEval = await res.json();
        setEvaluations(prev => [...prev, newEval]);
        alert('Evaluation saved successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save evaluation');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tnd-card">
      <div className="tnd-card-header">
        <h2 className="tnd-card-title">Go / No-Go Evaluation</h2>
      </div>
      
      {evaluations.length > 0 && (
        <div className="tnd-mb-6 tnd-p-4" style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 className="tnd-font-semibold tnd-mb-2">Previous Evaluation Result</h3>
          <div className="tnd-flex tnd-items-center" style={{ gap: '16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: evaluations[evaluations.length-1].totalScore >= 70 ? '#16a34a' : '#dc2626' }}>
              {evaluations[evaluations.length-1].totalScore} / 100
            </div>
            <div>
              <span className={`tnd-badge ${evaluations[evaluations.length-1].decision === 'GO' ? 'tnd-badge-emerald' : 'tnd-badge-red'}`} style={{ fontSize: '1rem', padding: '4px 12px' }}>
                {evaluations[evaluations.length-1].decision}
              </span>
            </div>
            <div className="tnd-text-sm tnd-text-muted tnd-flex-1">
              <strong>Remarks:</strong> {evaluations[evaluations.length-1].remarks}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="tnd-grid-2">
          {/* Scoring Matrix */}
          <div>
            <h3 className="tnd-section-title">Scoring Matrix</h3>
            <table className="tnd-table" style={{ border: '1px solid #e2e8f0' }}>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th style={{ width: '80px' }}>Max</th>
                  <th style={{ width: '100px' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Client Profile</td>
                  <td>10</td>
                  <td><input type="number" min="0" max="10" name="clientProfileScore" value={formData.clientProfileScore} onChange={handleChange} className="tnd-input" style={{ padding: '4px' }} /></td>
                </tr>
                <tr>
                  <td>Project Experience</td>
                  <td>15</td>
                  <td><input type="number" min="0" max="15" name="projectExpScore" value={formData.projectExpScore} onChange={handleChange} className="tnd-input" style={{ padding: '4px' }} /></td>
                </tr>
                <tr>
                  <td>Technical Eligibility</td>
                  <td>20</td>
                  <td><input type="number" min="0" max="20" name="techEligibleScore" value={formData.techEligibleScore} onChange={handleChange} className="tnd-input" style={{ padding: '4px' }} /></td>
                </tr>
                <tr>
                  <td>Financial Eligibility</td>
                  <td>15</td>
                  <td><input type="number" min="0" max="15" name="finEligibleScore" value={formData.finEligibleScore} onChange={handleChange} className="tnd-input" style={{ padding: '4px' }} /></td>
                </tr>
                <tr>
                  <td>Similar Work Experience</td>
                  <td>15</td>
                  <td><input type="number" min="0" max="15" name="similarWorkScore" value={formData.similarWorkScore} onChange={handleChange} className="tnd-input" style={{ padding: '4px' }} /></td>
                </tr>
                <tr>
                  <td>Location</td>
                  <td>5</td>
                  <td><input type="number" min="0" max="5" name="locationScore" value={formData.locationScore} onChange={handleChange} className="tnd-input" style={{ padding: '4px' }} /></td>
                </tr>
                <tr>
                  <td>Payment Terms</td>
                  <td>10</td>
                  <td><input type="number" min="0" max="10" name="paymentTermsScore" value={formData.paymentTermsScore} onChange={handleChange} className="tnd-input" style={{ padding: '4px' }} /></td>
                </tr>
                <tr>
                  <td>Project Margin</td>
                  <td>10</td>
                  <td><input type="number" min="0" max="10" name="projectMarginScore" value={formData.projectMarginScore} onChange={handleChange} className="tnd-input" style={{ padding: '4px' }} /></td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  <td colSpan="2" className="tnd-text-right">Total Score:</td>
                  <td className={formData.totalScore >= 70 ? 'tnd-text-emerald-600' : formData.totalScore >= 50 ? 'tnd-text-amber-600' : 'tnd-text-red-600'}>
                    {formData.totalScore}
                  </td>
                </tr>
              </tfoot>
            </table>
            
            <div className="tnd-mt-4 tnd-p-3" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
              <div className="tnd-flex tnd-items-start" style={{ gap: '8px' }}>
                <AlertTriangle size={16} className="tnd-text-blue-600 tnd-mt-1" />
                <div className="tnd-text-sm tnd-text-blue-800">
                  <strong>Recommendation Rule:</strong> Score ≥ 70 (GO), 50–69 (Review), &lt; 50 (NO-GO)
                </div>
              </div>
            </div>
          </div>

          {/* Qualitative Data */}
          <div>
            <h3 className="tnd-section-title">Qualitative Analysis</h3>
            
            <div className="tnd-form-group">
              <label className="tnd-label">Management Decision *</label>
              <select name="decision" required value={formData.decision} onChange={handleChange} className="tnd-select" style={{ fontSize: '1.1rem', padding: '8px', fontWeight: 'bold' }}>
                <option value="">-- Select Decision --</option>
                <option value="GO">GO (Proceed to Bid)</option>
                <option value="Review Required">Review Required</option>
                <option value="NO-GO">NO-GO (Drop Tender)</option>
              </select>
            </div>

            <div className="tnd-form-group">
              <label className="tnd-label">Expected Margin (%)</label>
              <input type="number" name="expectedMargin" value={formData.expectedMargin} onChange={handleChange} className="tnd-input" />
            </div>

            <div className="tnd-form-group">
              <label className="tnd-label">Risk Factors</label>
              <textarea name="risk" rows="2" value={formData.risk} onChange={handleChange} className="tnd-textarea" placeholder="Identify any major risks..." />
            </div>

            <div className="tnd-form-group">
              <label className="tnd-label">Competition Analysis</label>
              <textarea name="competition" rows="2" value={formData.competition} onChange={handleChange} className="tnd-textarea" placeholder="Expected competitors..." />
            </div>

            <div className="tnd-form-group">
              <label className="tnd-label">Final Remarks & Reasoning</label>
              <textarea name="remarks" rows="2" value={formData.remarks} onChange={handleChange} className="tnd-textarea" />
            </div>
            
            <div className="tnd-mt-6 tnd-flex tnd-justify-end">
              <button type="submit" disabled={loading} className="tnd-btn tnd-btn-primary">
                <Save size={16} /> {loading ? 'Saving...' : 'Save Evaluation'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
