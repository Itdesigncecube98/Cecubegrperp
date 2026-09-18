export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request) {
  try {
    const employees = await prisma.employee.findMany();
    
    // Get dates for past 10 days
    const today = new Date();
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(today.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];
    
    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: tenDaysAgoStr
        }
      }
    });

    // 1. Calculate time devoted per employee
    const timeDevoted = employees.map(emp => {
      let totalMinutes = 0;
      const empAttendances = attendances.filter(a => a.employeeId === emp.id);
      
      empAttendances.forEach(a => {
        try {
          if (a.timeSlots) {
            const slots = JSON.parse(a.timeSlots);
            slots.forEach(slot => {
              if (slot.in) {
                const inTime = slot.in.split(':');
                const inMins = parseInt(inTime[0]) * 60 + parseInt(inTime[1]);
                
                let outMins = 0;
                if (slot.out) {
                  const outTime = slot.out.split(':');
                  outMins = parseInt(outTime[0]) * 60 + parseInt(outTime[1]);
                  
                  // Handle Night Shifts & 12-hour format mistakes
                  if (outMins < inMins) {
                    // If out time is less than 12 PM (720 mins) and adding 12 hours makes it greater than inMins,
                    // it's highly likely they meant PM instead of AM (e.g., typed 05:00 instead of 17:00)
                    if (outMins < 12 * 60 && (outMins + 12 * 60) > inMins) {
                      outMins += 12 * 60; // They probably meant PM
                    } else {
                      outMins += 24 * 60; // Genuine night shift crossing midnight
                    }
                  }
                } else if (a.date === new Date().toISOString().split('T')[0]) {
                  const now = new Date();
                  outMins = now.getHours() * 60 + now.getMinutes();
                  if (outMins < inMins) {
                    outMins += 24 * 60; // Crossed midnight
                  }
                } else {
                  // If they didn't punch out on a previous day, assume a standard 9-hour shift
                  outMins = inMins + (9 * 60); 
                }

                if (outMins > inMins) {
                  totalMinutes += (outMins - inMins);
                }
              }
            });
          }
        } catch (e) {
          // ignore parsing errors
        }
      });
      
      const daysPresent = empAttendances.filter(a => a.status === 'Present' || a.status === 'Late').length;
      let avgHours = 0;
      if (daysPresent > 0) {
        avgHours = (totalMinutes / 60) / daysPresent;
      }
      
      return {
        name: emp.name.split(' ')[0], // First name for chart
        hours: parseFloat(avgHours.toFixed(1))
      };
    }).sort((a, b) => b.hours - a.hours);

    // 2. Calculate daily attendance trend (group by date)
    const dailyStatsMap = {};
    
    // Pre-fill the last 10 days to ensure continuous timeline
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyStatsMap[dateStr] = { date: dateStr, Present: 0, Late: 0, Absent: 0 };
    }

    attendances.forEach(a => {
      if (dailyStatsMap[a.date]) {
        if (a.status === 'Present') dailyStatsMap[a.date].Present++;
        else if (a.status === 'Late') dailyStatsMap[a.date].Late++;
        else if (a.status === 'Absent') dailyStatsMap[a.date].Absent++;
      }
    });
    
    const dailyTrend = Object.values(dailyStatsMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3. Average calculations
    let totalWorkingDays = Object.keys(dailyStatsMap).length;
    let totalPresent = attendances.filter(a => a.status === 'Present' || a.status === 'Late').length;
    let averagePresent = totalWorkingDays > 0 ? Math.round(totalPresent / totalWorkingDays) : 0;
    
    // Status distribution
    const statusDistribution = [
      { name: 'Present', value: attendances.filter(a => a.status === 'Present').length },
      { name: 'Late', value: attendances.filter(a => a.status === 'Late').length },
      { name: 'Absent', value: attendances.filter(a => a.status === 'Absent').length }
    ];

    return NextResponse.json({
      timeDevoted,
      dailyTrend,
      averagePresent,
      statusDistribution
    });

  } catch (error) {
    console.error("Analytics Error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
