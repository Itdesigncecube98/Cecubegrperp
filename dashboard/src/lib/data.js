// Mock Data Provider using LocalStorage

const STORAGE_KEY = 'cecube_attendance_data';

// Initial dummy data if storage is empty
const initialData = {
  admin: {
    username: 'admin',
    password: 'password123'
  },
  employees: [
    {
      id: 'emp-1',
      name: 'Aditya Gupta',
      email: 'aditya@cecube.com',
      password: 'password123',
      department: 'Engineering',
      joinDate: '2023-01-15'
    },
    {
      id: 'emp-2',
      name: 'Rohan Sharma',
      email: 'rohan@cecube.com',
      password: 'password123',
      department: 'Marketing',
      joinDate: '2023-03-10'
    }
  ],
  attendance: [
    // format: { employeeId, date: 'YYYY-MM-DD', status: 'Present' | 'Absent' | 'Late' }
    { employeeId: 'emp-1', date: new Date().toISOString().split('T')[0], status: 'Present' },
    { employeeId: 'emp-2', date: new Date().toISOString().split('T')[0], status: 'Late' }
  ]
};

// Initialize DB
const initDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
  }
};

const getDB = () => {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
};

const saveDB = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// --- Auth API ---
export const loginAdmin = (username, password) => {
  const db = getDB();
  return db.admin.username === username && db.admin.password === password;
};

// --- Employee API ---
export const getEmployees = () => {
  return getDB().employees;
};

export const addEmployee = (employeeData) => {
  const db = getDB();
  const newEmployee = {
    id: `emp-${Date.now()}`,
    ...employeeData
  };
  db.employees.push(newEmployee);
  saveDB(db);
  return newEmployee;
};

export const updateEmployee = (id, updatedData) => {
  const db = getDB();
  db.employees = db.employees.map(emp => emp.id === id ? { ...emp, ...updatedData } : emp);
  saveDB(db);
};

export const deleteEmployee = (id) => {
  const db = getDB();
  db.employees = db.employees.filter(emp => emp.id !== id);
  // Also clean up attendance records
  db.attendance = db.attendance.filter(att => att.employeeId !== id);
  saveDB(db);
};

// --- Attendance API ---
export const getAttendance = (date) => {
  const db = getDB();
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  // Return attendance joined with employee info
  return db.employees.map(emp => {
    const record = db.attendance.find(a => a.employeeId === emp.id && a.date === targetDate);
    return {
      employee: emp,
      status: record ? record.status : 'Not Marked',
      date: targetDate
    };
  });
};

export const markAttendance = (employeeId, date, status) => {
  const db = getDB();
  const existingIndex = db.attendance.findIndex(a => a.employeeId === employeeId && a.date === date);
  
  if (existingIndex >= 0) {
    db.attendance[existingIndex].status = status;
  } else {
    db.attendance.push({ employeeId, date, status });
  }
  
  saveDB(db);
};
