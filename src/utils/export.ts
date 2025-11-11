import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export class ExportUtils {
  /**
   * Xuất cây gia phả thành file PNG
   */
  static async exportToPNG(elementId: string, filename: string = 'family-tree.png'): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Không tìm thấy element để xuất');
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // Create download link
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Lỗi khi xuất PNG:', error);
      throw new Error('Không thể xuất file PNG');
    }
  }

  /**
   * Xuất cây gia phả thành file PDF
   */
  static async exportToPDF(elementId: string, filename: string = 'family-tree.pdf'): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Không tìm thấy element để xuất');
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(filename);
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error);
      throw new Error('Không thể xuất file PDF');
    }
  }

  /**
   * Tạo link chia sẻ (chỉ đọc)
   */
  static generateShareLink(data: string): string {
    try {
      // Encode data to base64
      const encodedData = btoa(encodeURIComponent(data));
      
      // Create share URL
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?share=${encodedData}`;
    } catch (error) {
      console.error('Lỗi khi tạo link chia sẻ:', error);
      throw new Error('Không thể tạo link chia sẻ');
    }
  }

  /**
   * Đọc dữ liệu từ share link
   */
  static parseShareLink(shareParam: string): string | null {
    try {
      // Decode from base64
      const decodedData = decodeURIComponent(atob(shareParam));
      return decodedData;
    } catch (error) {
      console.error('Lỗi khi đọc share link:', error);
      return null;
    }
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
    } catch (error) {
      console.error('Lỗi khi copy:', error);
      throw new Error('Không thể copy vào clipboard');
    }
  }

  /**
   * Download JSON data as file
   */
  static downloadJSON(data: any, filename: string = 'family-tree-data.json'): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Lỗi khi download JSON:', error);
      throw new Error('Không thể tải file JSON');
    }
  }

  /**
   * Read JSON file from input
   */
  static readJSONFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!file.type.includes('json')) {
        reject(new Error('File không phải định dạng JSON'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          resolve(data);
        } catch (error) {
          reject(new Error('File JSON không hợp lệ'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Không thể đọc file'));
      };
      
      reader.readAsText(file);
    });
  }
}