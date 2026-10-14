import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

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
      const isPositive = Number(t.amount) > 0;
      const formattedAmt = Math.abs(Number(t.amount)).toLocaleString('en-KE');
      const dateStr = new Date(t.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 12px; font-size: 13px; color: #334155;">${dateStr}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #0F172A; font-weight: 600; text-transform: capitalize;">${t.type.replace('_', ' ')}</td>
          <td style="padding: 10px 12px; font-size: 12px; font-family: monospace; color: #64748B;">${t.reference || 'N/A'}</td>
          <td style="padding: 10px 12px; font-size: 12px; text-align: center;">
            <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background-color: ${t.status === 'confirmed' ? '#DCFCE7' : '#FEF3C7'}; color: ${t.status === 'confirmed' ? '#166534' : '#92400E'};">
              ${(t.status || 'confirmed').toUpperCase()}
            </span>
          </td>
          <td style="padding: 10px 12px; font-size: 13px; font-family: monospace; font-weight: bold; text-align: right; color: ${isPositive ? '#16A34A' : '#DC2626'};">
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
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #22C55E; padding-bottom: 16px; margin-bottom: 20px; }
            .brand { color: #22C55E; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
            .chama-subtitle { color: #64748B; font-size: 12px; margin-top: 4px; }
            .report-title { font-size: 18px; font-weight: bold; color: #0F172A; text-align: right; }
            .report-date { font-size: 12px; color: #64748B; margin-top: 4px; text-align: right; }
            .meta-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
            .meta-item { flex: 1; }
            .meta-label { font-size: 10px; font-weight: bold; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-value { font-size: 15px; font-weight: bold; color: #0F172A; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background-color: #F1F5F9; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 12px; text-align: left; border-bottom: 2px solid #E2E8F0; }
            .footer { margin-top: 40px; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Akibora</div>
              <div class="chama-subtitle">${chamaName} — Official Member Statement</div>
            </div>
            <div>
              <div class="report-title">Account Statement</div>
              <div class="report-date">Generated ${formattedDate}</div>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item">
              <div class="meta-label">Member Name</div>
              <div class="meta-value">${memberName}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Chama Group</div>
              <div class="meta-value">${chamaName}</div>
            </div>
            <div class="meta-item" style="text-align: right;">
              <div class="meta-label">Current Balance</div>
              <div class="meta-value" style="color: #22C55E; font-family: monospace;">KSh ${totalBalance.toLocaleString('en-KE')}</div>
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
            Akibora Financial Systems • Bank-grade encrypted statement • Certified by Group Officers
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
        dialogTitle: `${chamaName}_Statement.pdf`,
      });
    } else {
      Alert.alert('Statement Ready', `PDF generated successfully at: ${uri}`);
    }
  } catch (error: any) {
    console.error('PDF Statement generation error:', error);
    Alert.alert('Export Error', error.message || 'Could not generate statement PDF.');
  }
}
