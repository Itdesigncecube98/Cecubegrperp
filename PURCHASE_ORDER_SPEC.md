# Purchase Order System Specification

## PDF Structure Analysis

### Header Section
- **Company**: CeCube Engineering India Private Limited
- **Address**: A-121/122, Shed No 9, New Pune Vidya, Navi, Dr Salike Kalel, Gurgaon
- **Contact**: +91-981-7833257
- **Email**: operations@cecubeeng.com

### Purchase Order Details
- **PO Number**: Generated (e.g., PO2026)
- **PO Date**: Date of issue
- **Delivery Date**: Expected delivery date

### Supplier Details (Consignee Billing Address)
- Supplier Name
- Complete Address
- Contact Person
- Phone Number
- Email
- GST Number

### Delivery Address
- Site/Project location where items will be delivered
- Complete address

### Item Details Table
| S.No | Description of Material | Qty | Unit | Rate | Disc% | Taxable Amount | GST% | GST Amount | Total |
|------|------------------------|-----|------|------|-------|----------------|------|------------|-------|

### Totals Section
- Sub Total
- CGST (%)
- SGST (%)
- IGST (%)
- Total Tax Amount
- **Total Amount in Words**

### Terms & Conditions Section
1. Scope of Work
2. Measurement/Inspection terms
3. Payment terms
4. Quality requirements
5. Delivery schedule
6. Loading/Unloading charges
7. Freight terms
8. Liquidated Damages clause
9. Legal jurisdiction

### Signatures
- **Prepared By**: (Company authorized person)
- **Approved By**: (Senior authority)

## System Flow
1. **Create PO** → Select vendor, add items, calculate totals
2. **Approve PO** → Send for approval workflow
3. **Print PO** → Generate PDF with all details
4. **Track PO** → Monitor delivery status
5. **GRN (Goods Receipt Note)** → Record received items
6. **Create Vendor Bill** → Link to TDS system for payment
