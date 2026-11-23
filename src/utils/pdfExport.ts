import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export interface TransactionItem {
  id?: string;
  created_at: string;
  type: string;
  amount: number | string;
  reference?: string;
  status?: string;
}

export interface StatementData {
  memberName: string;
  chamaName: string;
  totalBalance?: number;
  transactions: TransactionItem[];
}

export async function generateMemberStatementPDF({
  memberName,
  chamaName,
  totalBalance = 0,
  transactions = [],
}: StatementData) {
  try {
    const formattedDate = new Date().toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const rowsHtml = transactions.map((t) => {
      const isPositive = ['contribution', 'repayment', 'loan_repayment', 'penalty', 'interest', 'deposit', 'smartgrow_return'].includes(t.type);
      const formattedAmt = Math.abs(Number(t.amount)).toLocaleString('en-KE');
      const dateStr = new Date(t.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      return `
        <tr style="border-bottom: 1px solid #C6D8CA;">
          <td style="padding: 10px 12px; font-size: 13px; color: #2B4637;">${dateStr}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #0F241A; font-weight: 600; text-transform: capitalize;">${t.type.replace('_', ' ')}</td>
          <td style="padding: 10px 12px; font-size: 12px; font-family: monospace; color: #4C6858;">${esc(t.reference || '')}</td>
          <td style="padding: 10px 12px; font-size: 12px; text-align: center;">
            <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background-color: ${t.status === 'confirmed' ? '#DCFCE7' : '#FEF3C7'}; color: ${t.status === 'confirmed' ? '#166534' : '#92400E'};">
              ${(t.status || 'confirmed').toUpperCase()}
            </span>
          </td>
          <td style="padding: 10px 12px; font-size: 13px; font-family: monospace; font-weight: bold; text-align: right; color: ${isPositive ? '#1F6B4A' : '#0F241A'};">
            ${isPositive ? '+' : '-'} KSh ${formattedAmt}
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0F241A; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1F6B4A; padding-bottom: 16px; margin-bottom: 20px; }
            .brand { color: #1F6B4A; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
            .chama-subtitle { color: #4C6858; font-size: 12px; margin-top: 4px; }
            .report-title { font-size: 18px; font-weight: bold; color: #0F241A; text-align: right; }
            .report-date { font-size: 12px; color: #4C6858; margin-top: 4px; text-align: right; }
            .meta-box { background-color: #EDF4EE; border: 1px solid #C6D8CA; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
            .meta-item { flex: 1; }
            .meta-label { font-size: 10px; font-weight: bold; color: #4C6858; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-value { font-size: 15px; font-weight: bold; color: #0F241A; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background-color: #F1F5F9; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 12px; text-align: left; border-bottom: 2px solid #C6D8CA; }
            .footer { margin-top: 40px; text-align: center; border-top: 1px solid #C6D8CA; padding-top: 16px; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Akibora</div>
              <div class="chama-subtitle">Member statement for ${esc(chamaName)}</div>
            </div>
            <div>
              <div class="report-title">Account Statement</div>
              <div class="report-date">Generated ${formattedDate}</div>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item">
              <div class="meta-label">Member</div>
              <div class="meta-value">${esc(memberName)}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Group</div>
              <div class="meta-value">${esc(chamaName)}</div>
            </div>
            <div class="meta-item" style="text-align: right;">
              <div class="meta-label">Group wallet</div>
              <div class="meta-value" style="color: #1F6B4A; font-family: monospace;">KSh ${totalBalance.toLocaleString('en-KE')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Date</th>
                <th style="text-align: left;">Type</th>
                <th style="text-align: left;">Reference</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94A3B8;">No transactions found</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            Made with Akibora on ${formattedDate}. This statement lists records kept by your group. It is not a bank statement.
          </div>
        </body>
      </html>
    `;

    // 1. Generate local PDF file
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // 2. Open native sharing/download prompt
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${chamaName} statement.pdf`,
      });
    } else {
      Alert.alert('Statement Ready', `PDF generated successfully at: ${uri}`);
    }
  } catch (error: any) {
    console.error('PDF Statement generation error:', error);
    Alert.alert('Export Error', error.message || 'Could not generate statement PDF.');
  }
}
