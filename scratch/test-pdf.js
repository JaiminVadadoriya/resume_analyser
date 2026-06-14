const fs = require('fs');
const path = require('path');

async function testPdf() {
  try {
    // Dynamically import the legacy build which is suitable for Node
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Read local file into buffer
    const filePath = path.join(__dirname, '..', 'test', 'Resume.pdf');
    const dataBuffer = fs.readFileSync(filePath);
    
    // Convert Buffer to ArrayBuffer
    const arrayBuffer = dataBuffer.buffer.slice(dataBuffer.byteOffset, dataBuffer.byteOffset + dataBuffer.byteLength);

    console.log('Loading PDF via legacy display library...');
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    console.log(`PDF Loaded successfully. Total pages: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      console.log(`--- Page ${i} ---`);
      console.log(text.substring(0, 300));
    }
  } catch (error) {
    console.error('Error parsing PDF:', error);
  }
}

testPdf();
