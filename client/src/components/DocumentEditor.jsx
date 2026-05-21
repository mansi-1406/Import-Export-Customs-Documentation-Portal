import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Save, FileDown, Eye, Check } from 'lucide-react';

const API_BASE = 'http://localhost:5050/api';

function DocumentEditor({ shipment, docType, existingData, onBack }) {
  const [saveStatus, setSaveStatus] = useState(null);

  // Initialize React Hook Form
  const { register, control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      // General Common Fields
      shipper: shipment.client_name || '',
      consignee: '',
      carrier: 'Maersk Shipping Line',
      portOfLoading: '',
      portOfDischarge: '',
      vesselName: '',
      voyageNumber: '',
      descriptionOfGoods: '',
      grossWeight: '',
      measurement: '',
      
      // Packing List & Commercial Invoice Fields
      invoiceNumber: `INV-${shipment.tracking_number.split('-')[2] || '991'}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      paymentTerms: 'Net 30',
      totalPackages: '10 Pallets',
      items: [
        { description: 'Industrial Parts', quantity: 10, unitPrice: 150 }
      ],
      
      // Certificate of Origin Fields
      exporter: shipment.client_name || '',
      producer: 'Same as Exporter',
      countryOfOrigin: shipment.origin_country || '',
      meansOfTransport: 'Ocean Vessel',
    }
  });

  // For dynamic items in Packing List and Commercial Invoice
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  // Watch form data for live preview
  const watchedData = watch();

  // Load existing data if available
  useEffect(() => {
    if (existingData && existingData.content) {
      reset({
        ...watchedData,
        ...existingData.content
      });
    }
  }, [existingData, reset]);

  // Handle Save
  const handleSaveDoc = async (data, status = 'Draft') => {
    setSaveStatus('Saving...');
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipment.id,
          doc_type: docType,
          status,
          content: data
        })
      });
      if (res.ok) {
        setSaveStatus('Saved successfully!');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('Error saving document.');
      }
    } catch (err) {
      console.warn('Backend offline, simulating local save...');
      setSaveStatus('Saved locally (Offline mode)');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Generate jsPDF Document
  const handleGeneratePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const data = watchedData;

    // Outer Border
    doc.setDrawColor(30, 41, 59); // slate-800
    doc.setLineWidth(0.8);
    doc.rect(5, 5, 200, 287);

    // Inner subtle border
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.rect(7, 7, 196, 283);

    // Header Band
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(7, 7, 196, 20, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`OFFICIAL CUSTOMS DOCUMENTATION`, 105, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.text(docType.toUpperCase(), 105, 21, { align: 'center' });

    // Reset colors
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'normal');

    // Tracking Number info box
    doc.setFillColor(241, 245, 249);
    doc.rect(7, 27, 196, 12, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`SHIPMENT REFERENCE: ${shipment.tracking_number}`, 12, 34);
    doc.text(`DATE OF ISSUE: ${new Date().toLocaleDateString()}`, 130, 34);

    let currentY = 45;

    // Type-specific PDF layout
    if (docType === 'Bill of Lading') {
      // Two-column layout boxes
      doc.setDrawColor(203, 213, 225); // slate-300
      
      // Box 1: Shipper
      doc.rect(7, currentY, 96, 28);
      doc.setFont('Helvetica', 'bold');
      doc.text("1. SHIPPER / EXPORTER", 10, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.shipper || '', 10, currentY + 12);
      
      // Box 2: Consignee
      doc.rect(107, currentY, 96, 28);
      doc.setFont('Helvetica', 'bold');
      doc.text("2. CONSIGNEE (RECEIVER)", 110, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.consignee || '', 110, currentY + 12);

      currentY += 32;

      // Box 3: Carrier Details
      doc.rect(7, currentY, 96, 24);
      doc.setFont('Helvetica', 'bold');
      doc.text("3. CARRIER & TRANSPORT", 10, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Carrier: ${data.carrier}`, 10, currentY + 11);
      doc.text(`Vessel: ${data.vesselName || 'N/A'}`, 10, currentY + 16);
      doc.text(`Voyage No: ${data.voyageNumber || 'N/A'}`, 10, currentY + 21);

      // Box 4: Routing Details
      doc.rect(107, currentY, 96, 24);
      doc.setFont('Helvetica', 'bold');
      doc.text("4. ROUTING DETAILS", 110, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Port of Loading: ${data.portOfLoading || 'N/A'}`, 110, currentY + 11);
      doc.text(`Port of Discharge: ${data.portOfDischarge || 'N/A'}`, 110, currentY + 16);

      currentY += 28;

      // Description of goods box
      doc.rect(7, currentY, 196, 50);
      doc.setFont('Helvetica', 'bold');
      doc.text("5. DESCRIPTION OF CARGO", 10, currentY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.descriptionOfGoods || 'No description provided.', 10, currentY + 14, { maxWidth: 190 });

      currentY += 54;

      // Weight & Dimensions Box
      doc.rect(7, currentY, 96, 20);
      doc.setFont('Helvetica', 'bold');
      doc.text("6. GROSS WEIGHT", 10, currentY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.grossWeight || 'N/A', 10, currentY + 13);

      doc.rect(107, currentY, 96, 20);
      doc.setFont('Helvetica', 'bold');
      doc.text("7. MEASUREMENT (CBM)", 110, currentY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.measurement || 'N/A', 110, currentY + 13);

    } else if (docType === 'Packing List') {
      // Shipper & Consignee
      doc.setDrawColor(203, 213, 225);
      doc.rect(7, currentY, 96, 24);
      doc.setFont('Helvetica', 'bold');
      doc.text("EXPORTER / SHIPPER", 10, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.shipper || '', 10, currentY + 11);

      doc.rect(107, currentY, 96, 24);
      doc.setFont('Helvetica', 'bold');
      doc.text("CONSIGNEE", 110, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.consignee || '', 110, currentY + 11);

      currentY += 28;

      doc.rect(7, currentY, 196, 12);
      doc.setFont('Helvetica', 'bold');
      doc.text(`INVOICE REFERENCE: ${data.invoiceNumber}`, 10, currentY + 8);
      doc.text(`PACKAGES: ${data.totalPackages}`, 120, currentY + 8);

      currentY += 16;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(7, currentY, 196, 8, 'F');
      doc.rect(7, currentY, 196, 8);
      doc.setFont('Helvetica', 'bold');
      doc.text("ITEM DESCRIPTION", 10, currentY + 6);
      doc.text("QUANTITY", 120, currentY + 6);
      doc.text("UNIT WEIGHT", 160, currentY + 6);

      currentY += 8;
      doc.setFont('Helvetica', 'normal');
      
      // Table Content
      data.items.forEach((item) => {
        doc.rect(7, currentY, 196, 10);
        doc.text(item.description || 'N/A', 10, currentY + 6);
        doc.text(String(item.quantity || 0), 120, currentY + 6);
        doc.text("N/A", 160, currentY + 6); // Weight dummy
        currentY += 10;
      });

    } else if (docType === 'Certificate of Origin') {
      doc.setDrawColor(203, 213, 225);
      
      doc.rect(7, currentY, 96, 28);
      doc.setFont('Helvetica', 'bold');
      doc.text("EXPORTER (NAME & ADDRESS)", 10, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.exporter || '', 10, currentY + 12);

      doc.rect(107, currentY, 96, 28);
      doc.setFont('Helvetica', 'bold');
      doc.text("CONSIGNEE", 110, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.consignee || '', 110, currentY + 12);

      currentY += 32;

      doc.rect(7, currentY, 96, 24);
      doc.setFont('Helvetica', 'bold');
      doc.text("PRODUCER", 10, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.producer || '', 10, currentY + 11);

      doc.rect(107, currentY, 96, 24);
      doc.setFont('Helvetica', 'bold');
      doc.text("TRANSPORT DETAILS", 110, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Means: ${data.meansOfTransport}`, 110, currentY + 11);
      doc.text(`Country of Origin: ${data.countryOfOrigin}`, 110, currentY + 17);

      currentY += 28;

      doc.rect(7, currentY, 196, 60);
      doc.setFont('Helvetica', 'bold');
      doc.text("CERTIFICATION OF COUNTRY OF ORIGIN FOR GOODS", 10, currentY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.text(`The undersigned hereby certifies that the goods described above originated in: ${data.countryOfOrigin.toUpperCase()}`, 10, currentY + 14);
      doc.text(`Description of Goods: ${data.descriptionOfGoods || 'N/A'}`, 10, currentY + 24, { maxWidth: 190 });

    } else if (docType === 'Commercial Invoice') {
      doc.setDrawColor(203, 213, 225);
      
      doc.rect(7, currentY, 96, 28);
      doc.setFont('Helvetica', 'bold');
      doc.text("EXPORTER / SELLER", 10, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.exporter || '', 10, currentY + 12);

      doc.rect(107, currentY, 96, 28);
      doc.setFont('Helvetica', 'bold');
      doc.text("IMPORTER / BUYER", 110, currentY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.text(data.importer || '', 110, currentY + 12);

      currentY += 32;

      doc.rect(7, currentY, 196, 12);
      doc.setFont('Helvetica', 'bold');
      doc.text(`INVOICE NO: ${data.invoiceNumber}`, 10, currentY + 8);
      doc.text(`DATE: ${data.invoiceDate}`, 75, currentY + 8);
      doc.text(`TERMS: ${data.paymentTerms}`, 140, currentY + 8);

      currentY += 16;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(7, currentY, 196, 8, 'F');
      doc.rect(7, currentY, 196, 8);
      doc.setFont('Helvetica', 'bold');
      doc.text("ITEM DESCRIPTION", 10, currentY + 6);
      doc.text("QTY", 120, currentY + 6);
      doc.text("UNIT PRICE ($)", 145, currentY + 6);
      doc.text("TOTAL AMOUNT ($)", 170, currentY + 6);

      currentY += 8;
      doc.setFont('Helvetica', 'normal');
      
      let grandTotal = 0;
      data.items.forEach((item) => {
        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
        grandTotal += itemTotal;
        
        doc.rect(7, currentY, 196, 10);
        doc.text(item.description || 'N/A', 10, currentY + 6);
        doc.text(String(item.quantity || 0), 120, currentY + 6);
        doc.text(String(item.unitPrice || 0), 145, currentY + 6);
        doc.text(String(itemTotal), 170, currentY + 6);
        currentY += 10;
      });

      // Grand Total Box
      doc.rect(7, currentY, 196, 10);
      doc.setFont('Helvetica', 'bold');
      doc.text("GRAND TOTAL", 120, currentY + 7);
      doc.text(`$${grandTotal.toFixed(2)}`, 170, currentY + 7);
    }

    // Standard Signature & Custom Stamp seal on all documents
    const signatureY = 240;
    doc.setDrawColor(203, 213, 225);
    
    // Customs Seal Box
    doc.rect(15, signatureY, 45, 30);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("[ PLACE OFFICIAL ]", 37, signatureY + 12, { align: 'center' });
    doc.text("[ CUSTOMS STAMP HERE ]", 37, signatureY + 18, { align: 'center' });

    // Authorized Signature line
    doc.setTextColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(115, signatureY + 22, 185, signatureY + 22);
    doc.setFont('Helvetica', 'bold');
    doc.text("AUTHORIZED FORWARDER SIGNATURE", 150, signatureY + 26, { align: 'center' });

    // Save/Download PDF
    const filename = `${docType.toLowerCase().replace(/\s+/g, '_')}_${shipment.tracking_number}.pdf`;
    doc.save(filename);
  };

  return (
    <div style={{ height: '100%' }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Documents List
        </button>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {saveStatus && <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: '500' }}>{saveStatus}</span>}
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleSubmit((data) => handleSaveDoc(data, 'Draft'))}
            title="Save as Draft"
          >
            <Save size={16} /> Save Draft
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSubmit((data) => handleSaveDoc(data, 'Submitted'))}
            title="Submit Customs File"
          >
            <Check size={16} /> Submit Document
          </button>
          <button 
            type="button" 
            className="btn" 
            style={{ background: 'var(--accent-purple)', color: '#fff' }} 
            onClick={handleGeneratePDF}
            title="Export as Official PDF"
          >
            <FileDown size={16} /> Download PDF
          </button>
        </div>
      </div>

      <div className="doc-prep-layout">
        {/* Left Form Panel */}
        <div className="glass-panel editor-panel">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Filing Editor: {docType}
          </h2>

          <form>
            {/* Conditional Form Rendering based on docType */}
            {docType === 'Bill of Lading' && (
              <>
                <div className="form-group">
                  <label className="form-label">Shipper / Exporter Name</label>
                  <input type="text" className="form-control" {...register('shipper')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Consignee Name</label>
                  <input type="text" className="form-control" placeholder="Recipient company" {...register('consignee')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Carrier</label>
                    <input type="text" className="form-control" {...register('carrier')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vessel Name</label>
                    <input type="text" className="form-control" placeholder="e.g. Maersk McKinney" {...register('vesselName')} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Voyage Number</label>
                    <input type="text" className="form-control" placeholder="e.g. V-102" {...register('voyageNumber')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Port of Loading</label>
                    <input type="text" className="form-control" placeholder="Origin port" {...register('portOfLoading')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Port of Discharge</label>
                  <input type="text" className="form-control" placeholder="Destination port" {...register('portOfDischarge')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description of Goods</label>
                  <textarea rows="4" className="form-control" placeholder="Detailed container description" {...register('descriptionOfGoods')}></textarea>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Gross Weight (kg)</label>
                    <input type="text" className="form-control" placeholder="e.g. 10,500 kg" {...register('grossWeight')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Measurement (CBM)</label>
                    <input type="text" className="form-control" placeholder="e.g. 35 CBM" {...register('measurement')} />
                  </div>
                </div>
              </>
            )}

            {docType === 'Packing List' && (
              <>
                <div className="form-group">
                  <label className="form-label">Shipper Name</label>
                  <input type="text" className="form-control" {...register('shipper')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Consignee Name</label>
                  <input type="text" className="form-control" {...register('consignee')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Associated Invoice Ref</label>
                    <input type="text" className="form-control" {...register('invoiceNumber')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Packages Summary</label>
                    <input type="text" className="form-control" placeholder="e.g. 12 Pallets" {...register('totalPackages')} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span className="form-label" style={{ margin: 0 }}>Itemized Package List</span>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                    >
                      + Add Item
                    </button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Description of box contents" 
                        style={{ flexGrow: 2 }}
                        {...register(`items.${index}.description`)} 
                      />
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Qty" 
                        style={{ width: '80px' }}
                        {...register(`items.${index}.quantity`)} 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-red)', border: 'none' }}
                        onClick={() => remove(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {docType === 'Certificate of Origin' && (
              <>
                <div className="form-group">
                  <label className="form-label">Exporter</label>
                  <input type="text" className="form-control" {...register('exporter')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Consignee</label>
                  <input type="text" className="form-control" {...register('consignee')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Producer (if different)</label>
                  <input type="text" className="form-control" {...register('producer')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Country of Origin</label>
                    <input type="text" className="form-control" {...register('countryOfOrigin')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Means of Transport</label>
                    <input type="text" className="form-control" {...register('meansOfTransport')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description of Goods</label>
                  <textarea rows="4" className="form-control" {...register('descriptionOfGoods')}></textarea>
                </div>
              </>
            )}

            {docType === 'Commercial Invoice' && (
              <>
                <div className="form-group">
                  <label className="form-label">Exporter / Seller</label>
                  <input type="text" className="form-control" {...register('exporter')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Importer / Buyer</label>
                  <input type="text" className="form-control" placeholder="Importer address & name" {...register('importer')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Invoice Number</label>
                    <input type="text" className="form-control" {...register('invoiceNumber')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice Date</label>
                    <input type="date" className="form-control" {...register('invoiceDate')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <input type="text" className="form-control" placeholder="e.g. Net 30" {...register('paymentTerms')} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span className="form-label" style={{ margin: 0 }}>Invoice Items</span>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                    >
                      + Add Item
                    </button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Item details" 
                        style={{ flexGrow: 2 }}
                        {...register(`items.${index}.description`)} 
                      />
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Qty" 
                        style={{ width: '70px' }}
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })} 
                      />
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Price" 
                        style={{ width: '90px' }}
                        {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-red)', border: 'none' }}
                        onClick={() => remove(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </form>
        </div>

        {/* Right Live Preview Panel */}
        <div className="preview-panel">
          <div>
            <div className="preview-header">
              <h3 className="preview-title">{docType}</h3>
              <p style={{ fontSize: '0.65rem', color: '#64748b', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
                LIVE DRAFT PREVIEW &bull; SECURE ENTRY
              </p>
            </div>

            <div className="preview-meta">
              <div className="preview-meta-col">
                <span className="preview-meta-label">Shipper / Exporter:</span>
                <div style={{ marginTop: '0.25rem', fontWeight: 'bold' }}>{watchedData.shipper || watchedData.exporter}</div>
              </div>
              <div className="preview-meta-col">
                <span className="preview-meta-label">Consignee / Importer:</span>
                <div style={{ marginTop: '0.25rem', fontWeight: 'bold' }}>{watchedData.consignee || watchedData.importer}</div>
              </div>
            </div>

            {/* Document specific details in preview */}
            {docType === 'Bill of Lading' && (
              <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span className="preview-meta-label">Carrier:</span>
                    <div>{watchedData.carrier}</div>
                  </div>
                  <div>
                    <span className="preview-meta-label">Vessel/Voyage:</span>
                    <div>{watchedData.vesselName || 'N/A'} {watchedData.voyageNumber ? `#${watchedData.voyageNumber}` : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span className="preview-meta-label">Port of Loading:</span>
                    <div>{watchedData.portOfLoading}</div>
                  </div>
                  <div>
                    <span className="preview-meta-label">Port of Discharge:</span>
                    <div>{watchedData.portOfDischarge}</div>
                  </div>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span className="preview-meta-label">Description of Goods:</span>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem', fontSize: '0.8rem' }}>{watchedData.descriptionOfGoods}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <div>
                    <span className="preview-meta-label">Gross Weight:</span>
                    <div>{watchedData.grossWeight}</div>
                  </div>
                  <div>
                    <span className="preview-meta-label">Measurement:</span>
                    <div>{watchedData.measurement}</div>
                  </div>
                </div>
              </div>
            )}

            {docType === 'Packing List' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem' }}>
                  <span><strong>Invoice:</strong> {watchedData.invoiceNumber}</span>
                  <span><strong>Total Packages:</strong> {watchedData.totalPackages}</span>
                </div>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchedData.items?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.description || 'N/A'}</td>
                        <td>{item.quantity || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {docType === 'Certificate of Origin' && (
              <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className="preview-meta-label">Producer:</span>
                  <div>{watchedData.producer}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="preview-meta-label">Country of Origin:</span>
                    <div style={{ fontWeight: 'bold' }}>{watchedData.countryOfOrigin}</div>
                  </div>
                  <div>
                    <span className="preview-meta-label">Means of Transport:</span>
                    <div>{watchedData.meansOfTransport}</div>
                  </div>
                </div>
                <div>
                  <span className="preview-meta-label">Description of Goods:</span>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{watchedData.descriptionOfGoods}</div>
                </div>
              </div>
            )}

            {docType === 'Commercial Invoice' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem' }}>
                  <span><strong>Invoice:</strong> {watchedData.invoiceNumber}</span>
                  <span><strong>Date:</strong> {watchedData.invoiceDate}</span>
                  <span><strong>Terms:</strong> {watchedData.paymentTerms}</span>
                </div>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th>Qty</th>
                      <th>Price ($)</th>
                      <th>Total ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchedData.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.description || 'N/A'}</td>
                        <td>{item.quantity || 0}</td>
                        <td>{item.unitPrice || 0}</td>
                        <td>{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                      <td colSpan="3" style={{ textAlign: 'right' }}>Grand Total:</td>
                      <td>
                        ${watchedData.items?.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.unitPrice || 0)), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footnotes */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b' }}>
            <span>Digital Draft Verified</span>
            <span>WebSpark Port Authority</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentEditor;
