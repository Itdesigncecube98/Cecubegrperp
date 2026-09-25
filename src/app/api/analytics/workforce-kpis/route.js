import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        gender: true,
        dateOfBirth: true,
        joinedDate: true,
        basicSalary: true,
        employmentStatus: true,
        department: true,
        designation: true,
        employeeType: true,
        organisation: true,
        educations: true,
        terminationDate: true,
      },
    });

    const totalEmployees = employees.length;

    let maleCount = 0;
    let femaleCount = 0;
    let totalAge = 0;
    let ageCount = 0;
    let totalTenureDays = 0;
    let tenureCount = 0;
    let totalSalary = 0;
    let salaryCount = 0;

    const today = new Date();

    const empTypeMap = {};
    const deptCountMap = {};
    const deptSalaryMap = {};
    const designationSalaryMap = {};
    const orgSalaryMap = {};
    const tenureMap = { '< 1 yr': 0, '1-3 yrs': 0, '3-5 yrs': 0, '5+ yrs': 0 };
    const attritionMap = { '< 1 yr': 0, '1 yr': 0, '2 yrs': 0, '3 yrs': 0, '4 yrs': 0, '5+ yrs': 0 };
    const eduCountMap = { 'Ph.D': 0, 'MBA': 0, 'Masters': 0, 'Bachelors': 0, 'Class 12th': 0, 'Class 10th': 0, 'Other': 0 };

    const resignationTrendMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      resignationTrendMap[monthLabel] = 0;
    }

    employees.forEach(emp => {
      // Gender
      if (emp.gender?.toLowerCase() === 'male' || emp.gender?.toLowerCase() === 'm') maleCount++;
      else if (emp.gender?.toLowerCase() === 'female' || emp.gender?.toLowerCase() === 'f') femaleCount++;

      // Age
      if (emp.dateOfBirth) {
        const dob = new Date(emp.dateOfBirth);
        if (!isNaN(dob.getTime())) {
          const ageDifMs = today.getTime() - dob.getTime();
          const ageDate = new Date(ageDifMs);
          totalAge += Math.abs(ageDate.getUTCFullYear() - 1970);
          ageCount++;
        }
      }

      // Tenure
      if (emp.joinedDate) {
        const joined = new Date(emp.joinedDate);
        if (!isNaN(joined.getTime())) {
          const diffTime = Math.abs(today - joined);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          totalTenureDays += diffDays;
          tenureCount++;
        }
      }

      // Salary
      let salary = 0;
      if (emp.basicSalary) {
        salary = parseFloat(emp.basicSalary);
        if (!isNaN(salary)) {
          totalSalary += salary;
          salaryCount++;
        } else {
          salary = 0;
        }
      }

      // Employment Type
      const eType = emp.employmentStatus || emp.employeeType || 'Full Time';
      empTypeMap[eType] = (empTypeMap[eType] || 0) + 1;

      // Department Count
      const dept = emp.department || 'Unassigned';
      deptCountMap[dept] = (deptCountMap[dept] || 0) + 1;

      // Department Salary
      if (salary > 0) {
        if (!deptSalaryMap[dept]) deptSalaryMap[dept] = { total: 0, count: 0 };
        deptSalaryMap[dept].total += salary;
        deptSalaryMap[dept].count += 1;
      }

      // Designation Salary
      const desig = emp.designation || 'Unassigned';
      if (!designationSalaryMap[desig]) designationSalaryMap[desig] = { total: 0, count: 0 };
      if (salary > 0) {
        designationSalaryMap[desig].total += salary;
      }
      designationSalaryMap[desig].count += 1;

      // Organisation Salary
      const org = emp.organisation || 'Unassigned';
      if (!orgSalaryMap[org]) orgSalaryMap[org] = { total: 0, count: 0 };
      if (salary > 0) {
        orgSalaryMap[org].total += salary;
      }
      orgSalaryMap[org].count += 1;

      // Tenure Category
      if (emp.joinedDate) {
        const joined = new Date(emp.joinedDate);
        if (!isNaN(joined.getTime())) {
          const diffTime = Math.abs(today - joined);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const years = diffDays / 365;
          if (years < 1) tenureMap['< 1 yr']++;
          else if (years < 3) tenureMap['1-3 yrs']++;
          else if (years < 5) tenureMap['3-5 yrs']++;
          else tenureMap['5+ yrs']++;
        }
      }

      // Attrition Tenure
      if (['Resigned', 'Retired', 'Terminated', 'Inactive'].includes(emp.employmentStatus)) {
        if (emp.joinedDate) {
          const joined = new Date(emp.joinedDate);
          const ended = emp.terminationDate ? new Date(emp.terminationDate) : today;
          
          if (!isNaN(joined.getTime()) && !isNaN(ended.getTime())) {
            const diffTime = Math.abs(ended - joined);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const years = Math.floor(diffDays / 365);
            
            if (years < 1) attritionMap['< 1 yr']++;
            else if (years === 1) attritionMap['1 yr']++;
            else if (years === 2) attritionMap['2 yrs']++;
            else if (years === 3) attritionMap['3 yrs']++;
            else if (years === 4) attritionMap['4 yrs']++;
            else attritionMap['5+ yrs']++;
          }
        }
        
        if (emp.terminationDate) {
          const termDate = new Date(emp.terminationDate);
          if (!isNaN(termDate.getTime())) {
            const diffMonths = (today.getFullYear() - termDate.getFullYear()) * 12 + (today.getMonth() - termDate.getMonth());
            if (diffMonths >= 0 && diffMonths < 12) {
              const monthLabel = termDate.toLocaleString('default', { month: 'short', year: '2-digit' });
              if (resignationTrendMap[monthLabel] !== undefined) {
                resignationTrendMap[monthLabel]++;
              }
            }
          }
        }
      }

      // Education Level
      if (emp.educations && emp.educations.length > 0) {
        const uniqueLabels = new Set();
        emp.educations.forEach(edu => {
          const deg = (edu.degree || '').toLowerCase();
          let label = 'Other';
          if (deg === 'mba' || deg === 'm.b.a' || deg.includes('mba')) {
            label = 'MBA';
          } else if (deg === 'ph.d' || deg.includes('phd') || deg.includes('ph.d') || deg.includes('doctorate')) {
            label = 'Ph.D';
          } else if (deg === 'masters' || deg.includes('master') || deg.includes('pg') || deg.includes('mtech') || deg.includes('m.tech') || deg.includes('mca')) {
            label = 'Masters';
          } else if (deg === 'bachelors' || deg.includes('bachelor') || deg.includes('grad') || deg.includes('degree') || deg.includes('btech') || deg.includes('b.tech') || deg.includes('b. tech') || deg.includes('b-tech') || deg.includes('b.sc') || deg.includes('b.a') || deg.includes('b.com') || deg.includes('bba') || deg.includes('bca')) {
            label = 'Bachelors';
          } else if (deg.includes('12') || deg.includes('xii') || deg.includes('inter') || deg.includes('diploma') || deg.includes('senior')) {
            label = 'Class 12th';
          } else if (deg.includes('10') || deg.includes('x') || deg.includes('matric') || deg.includes('high')) {
            label = 'Class 10th';
          }
          uniqueLabels.add(label);
        });

        uniqueLabels.forEach(label => {
          eduCountMap[label]++;
        });
      } else {
        eduCountMap['Other']++;
      }
    });

    const empTypeData = Object.keys(empTypeMap).map(k => ({ name: k, value: empTypeMap[k] }));
    const deptCountData = Object.keys(deptCountMap).map(k => ({ name: k, value: deptCountMap[k] })).sort((a,b)=>b.value-a.value).slice(0, 8);
    const deptSalaryData = Object.keys(deptSalaryMap).map(k => ({ name: k, avgSalary: Math.round(deptSalaryMap[k].total / deptSalaryMap[k].count) })).sort((a,b)=>b.avgSalary-a.avgSalary).slice(0, 8);
    
    const designationSalaryData = Object.keys(designationSalaryMap).map(k => {
      const total = designationSalaryMap[k].total;
      const count = designationSalaryMap[k].count;
      return { 
        designation: k, 
        totalSalary: total, 
        avgSalary: count > 0 ? Math.round(total / count) : 0, 
        empCount: count 
      };
    }).sort((a,b)=>b.totalSalary - a.totalSalary);

    const orgSalaryData = Object.keys(orgSalaryMap).map(k => {
      const total = orgSalaryMap[k].total;
      const count = orgSalaryMap[k].count;
      return { 
        organisation: k, 
        totalSalary: total, 
        avgSalary: count > 0 ? Math.round(total / count) : 0, 
        empCount: count 
      };
    }).sort((a,b)=>b.totalSalary - a.totalSalary);

    const tenureData = Object.keys(tenureMap).map(k => ({ name: k, value: tenureMap[k] }));
    const attritionData = Object.keys(attritionMap).map(k => ({ name: k, value: attritionMap[k] }));
    const resignationTrendData = Object.keys(resignationTrendMap).map(k => ({ name: k, value: resignationTrendMap[k] }));

    const eduCountData = Object.keys(eduCountMap)
      .map(k => ({ name: k, value: eduCountMap[k] }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;
    const avgTenureYears = tenureCount > 0 ? (totalTenureDays / tenureCount / 365).toFixed(1) : 0;
    const avgSalary = salaryCount > 0 ? Math.round(totalSalary / salaryCount) : 0;
    const avgOvertime = 2.5; // Mocking overtime for now

    return NextResponse.json({
      totalEmployees,
      genderSplit: {
        male: maleCount,
        female: femaleCount,
      },
      avgAge,
      avgTenureYears,
      avgSalary,
      avgOvertime,
      charts: {
        empTypeData,
        deptCountData,
        deptSalaryData,
        tenureData,
        attritionData,
        resignationTrendData,
        designationSalaryData,
        orgSalaryData,
        eduCountData
      }
    });
  } catch (error) {
    console.error('Workforce KPIs API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
