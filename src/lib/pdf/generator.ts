/**
 * PDF Export Utility
 * 
 * Generates printable medication card PDFs for wallet or doctor visits.
 * On mobile: Saves PDFs to device storage
 * On web: Downloads PDFs to browser downloads
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { Medication, Group } from '../../types';

/**
 * Generate PDF medication card for a single medication
 */
export async function generateMedicationPDF(medication: Medication, language: string = 'de') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(67, 56, 202); // Indigo
  doc.text('PillTracker', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(language === 'de' ? 'Medikamentenkarte' : 'Medication Card', pageWidth / 2, 30, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateLabel = language === 'de' ? 'Erstellt am:' : 'Generated on:';
  doc.text(`${dateLabel} ${new Date().toLocaleDateString(language)}`, pageWidth / 2, 38, { align: 'center' });
  
  // Medication Details
  const startY = 50;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(medication.name, 20, startY);
  
  // Details Table
  const details = [
    [language === 'de' ? 'Dosierung:' : 'Dosage:', `${medication.dosageAmount} ${medication.dosageUnit}`],
    [language === 'de' ? 'Intervall:' : 'Interval:', medication.intervalType === 'DAILY' ? (language === 'de' ? 'Täglich' : 'Daily') : (language === 'de' ? 'Wöchentlich' : 'Weekly')],
    [language === 'de' ? 'Uhrzeiten:' : 'Times:', medication.scheduleTimes],
    [language === 'de' ? 'Benachrichtigungen:' : 'Notifications:', medication.enableNotifications ? (language === 'de' ? 'Ja' : 'Yes') : (language === 'de' ? 'Nein' : 'No')],
  ];
  
  if (medication.notes) {
    details.push([language === 'de' ? 'Notizen:' : 'Notes:', medication.notes]);
  }
  
  autoTable(doc, {
    startY: startY + 10,
    head: [],
    body: details,
    theme: 'plain',
    styles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' }
    }
  });
  
  // Last Intake
  if (medication.intakes && medication.intakes.length > 0) {
    const lastY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'de' ? 'Letzte Einnahmen:' : 'Recent Intakes:', 20, lastY);
    
    const intakeData = medication.intakes.slice(0, 5).map(intake => [
      new Date(intake.takenAt).toLocaleString(language),
      '-'
    ]);
    
    autoTable(doc, {
      startY: lastY + 5,
      head: [[language === 'de' ? 'Zeitpunkt' : 'Time', language === 'de' ? 'Notizen' : 'Notes']],
      body: intakeData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [67, 56, 202] }
    });
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('PillTracker - Medication Tracking App', pageWidth / 2, footerY, { align: 'center' });
  
  await savePDF(doc, `${medication.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Save PDF to device storage (mobile) or download (web)
 */
async function savePDF(doc: jsPDF, filename: string): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    // Mobile: Save to Documents directory
    const pdfData = doc.output('datauristring');
    const base64Data = pdfData.split(',')[1];
    
    try {
      const result = await Filesystem.writeFile({
        path: `PillTracker/${filename}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });
      
      console.log('[PDF] Saved to:', result.uri);
      alert(`PDF gespeichert: ${result.uri}`);
    } catch (err) {
      console.error('[PDF] Save error:', err);
      alert('Fehler beim Speichern der PDF');
      throw err;
    }
  } else {
    // Web: Download
    doc.save(filename);
  }
}

/**
 * Generate PDF for a medication group
 */
export async function generateGroupPDF(group: Group, language: string = 'de') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(67, 56, 202);
  doc.text('PillTracker', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(language === 'de' ? 'Medikamentengruppe' : 'Medication Group', pageWidth / 2, 30, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateLabel = language === 'de' ? 'Erstellt am:' : 'Generated on:';
  doc.text(`${dateLabel} ${new Date().toLocaleDateString(language)}`, pageWidth / 2, 38, { align: 'center' });
  
  // Group Details
  const startY = 50;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(group.name, 20, startY);
  
  if (group.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(group.description, 20, startY + 7);
  }
  
  // Medications Table
  const medData = group.medications.map(med => [
    med.name,
    `${med.dosageAmount} ${med.dosageUnit}`,
    med.scheduleTimes,
    med.intakes.length > 0 ? new Date(med.intakes[0].takenAt).toLocaleDateString(language) : '-'
  ]);
  
  autoTable(doc, {
    startY: startY + (group.description ? 15 : 10),
    head: [[
      language === 'de' ? 'Medikament' : 'Medication',
      language === 'de' ? 'Dosierung' : 'Dosage',
      language === 'de' ? 'Zeiten' : 'Times',
      language === 'de' ? 'Letzte Einnahme' : 'Last Taken'
    ]],
    body: medData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [67, 56, 202] }
  });
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('PillTracker - Medication Tracking App', pageWidth / 2, footerY, { align: 'center' });
  
  await savePDF(doc, `Gruppe_${group.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Generate comprehensive PDF with all medications
 */
export async function generateAllMedicationsPDF(medications: Medication[], language: string = 'de') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(67, 56, 202);
  doc.text('PillTracker', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(language === 'de' ? 'Alle Medikamente' : 'All Medications', pageWidth / 2, 30, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateLabel = language === 'de' ? 'Erstellt am:' : 'Generated on:';
  doc.text(`${dateLabel} ${new Date().toLocaleDateString(language)}`, pageWidth / 2, 38, { align: 'center' });
  
  // Medications Table
  const medData = medications.map(med => [
    med.name,
    `${med.dosageAmount} ${med.dosageUnit}`,
    med.scheduleTimes,
    med.intervalType === 'DAILY' ? (language === 'de' ? 'Täglich' : 'Daily') : (language === 'de' ? 'Wöchentlich' : 'Weekly'),
    med.intakes.length > 0 ? new Date(med.intakes[0].takenAt).toLocaleDateString(language) : '-'
  ]);
  
  autoTable(doc, {
    startY: 50,
    head: [[
      language === 'de' ? 'Medikament' : 'Medication',
      language === 'de' ? 'Dosierung' : 'Dosage',
      language === 'de' ? 'Zeiten' : 'Times',
      language === 'de' ? 'Intervall' : 'Interval',
      language === 'de' ? 'Letzte Einnahme' : 'Last Taken'
    ]],
    body: medData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [67, 56, 202] }
  });
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('PillTracker - Medication Tracking App', pageWidth / 2, footerY, { align: 'center' });
  
  await savePDF(doc, `Alle_Medikamente_${new Date().toISOString().split('T')[0]}.pdf`);
}
