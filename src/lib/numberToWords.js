// Convert number to Indian Rupees in words
export function numberToWords(num) {
  if (num === 0) return "Zero Rupees Only";
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  function convertLessThanThousand(n) {
    if (n === 0) return '';
    
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result.trim();
  }
  
  // Split into rupees and paise
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = '';
  
  // Handle crores
  if (rupees >= 10000000) {
    const crores = Math.floor(rupees / 10000000);
    result += convertLessThanThousand(crores) + ' Crore ';
    const remainder = rupees % 10000000;
    
    // Handle lakhs
    if (remainder >= 100000) {
      const lakhs = Math.floor(remainder / 100000);
      result += convertLessThanThousand(lakhs) + ' Lakh ';
      const remainder2 = remainder % 100000;
      
      // Handle thousands
      if (remainder2 >= 1000) {
        const thousands = Math.floor(remainder2 / 1000);
        result += convertLessThanThousand(thousands) + ' Thousand ';
        const remainder3 = remainder2 % 1000;
        
        if (remainder3 > 0) {
          result += convertLessThanThousand(remainder3) + ' ';
        }
      } else if (remainder2 > 0) {
        result += convertLessThanThousand(remainder2) + ' ';
      }
    } else if (remainder > 0) {
      if (remainder >= 1000) {
        const thousands = Math.floor(remainder / 1000);
        result += convertLessThanThousand(thousands) + ' Thousand ';
        const remainder3 = remainder % 1000;
        if (remainder3 > 0) {
          result += convertLessThanThousand(remainder3) + ' ';
        }
      } else {
        result += convertLessThanThousand(remainder) + ' ';
      }
    }
  }
  // Handle lakhs (when no crores)
  else if (rupees >= 100000) {
    const lakhs = Math.floor(rupees / 100000);
    result += convertLessThanThousand(lakhs) + ' Lakh ';
    const remainder = rupees % 100000;
    
    if (remainder >= 1000) {
      const thousands = Math.floor(remainder / 1000);
      result += convertLessThanThousand(thousands) + ' Thousand ';
      const remainder2 = remainder % 1000;
      if (remainder2 > 0) {
        result += convertLessThanThousand(remainder2) + ' ';
      }
    } else if (remainder > 0) {
      result += convertLessThanThousand(remainder) + ' ';
    }
  }
  // Handle thousands (when no lakhs)
  else if (rupees >= 1000) {
    const thousands = Math.floor(rupees / 1000);
    result += convertLessThanThousand(thousands) + ' Thousand ';
    const remainder = rupees % 1000;
    if (remainder > 0) {
      result += convertLessThanThousand(remainder) + ' ';
    }
  }
  // Handle less than thousand
  else {
    result += convertLessThanThousand(rupees) + ' ';
  }
  
  result = result.trim() + ' Rupees';
  
  // Add paise if present
  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }
  
  return result + ' Only';
}

// Example usage:
// numberToWords(1234567.89) => "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees and Eighty Nine Paise Only"
// numberToWords(50000) => "Fifty Thousand Rupees Only"
