const ALLOWED_ACTIONS = Object.freeze({
  loginAndLoad: 2,
  getAppDataInstant: 1,
  refreshAppData: 1,
  refreshLdmSession: 1,
  logoutLdmSession: 1,
  saveTransaction: 2,
  cancelTransaction: 2,
  saveBudget: 2,
  saveDebt: 2,
  markDebtPaid: 2,
  undoDebtPayment: 2,
  addFundMovement: 2,
  saveSettings: 2,
  getDatabaseStatus: 1
});

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method tidak diizinkan.' });
  }

  // Browser requests must originate from this same Vercel deployment/domain.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ ok: false, error: 'Origin tidak diizinkan.' });
      }
    } catch (_) {
      return res.status(403).json({ ok: false, error: 'Origin tidak valid.' });
    }
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch (_) { return res.status(400).json({ ok: false, error: 'Format JSON tidak valid.' }); }
  }

  const action = body && String(body.action || '');
  const args = body && Array.isArray(body.args) ? body.args : null;
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_ACTIONS, action) || !args || args.length !== ALLOWED_ACTIONS[action]) {
    return res.status(400).json({ ok: false, error: 'Permintaan API tidak valid.' });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const proxySecret = process.env.GAS_PROXY_SECRET;
  if (!gasUrl || !proxySecret) {
    return res.status(500).json({ ok: false, error: 'Konfigurasi API server belum lengkap.' });
  }

  try {
    const upstream = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ proxySecret, action, args }),
      redirect: 'follow',
      signal: AbortSignal.timeout(25000)
    });

    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); }
    catch (_) {
      console.error('Apps Script bridge returned non-JSON response:', raw.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'Apps Script API belum merespons JSON. Periksa URL deployment dan versi bridge.' });
    }

    if (!upstream.ok) {
      console.error('Apps Script bridge HTTP status:', upstream.status);
      return res.status(502).json({ ok: false, error: 'Koneksi ke backend Apps Script gagal.' });
    }

    if (!result || result.ok !== true) {
      const message = result && result.error ? String(result.error) : 'Backend menolak permintaan.';
      const status = /akses api ditolak|proxy secret/i.test(message) ? 401 : 400;
      return res.status(status).json({ ok: false, error: message });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('LDM API proxy error:', error && error.message ? error.message : error);
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return res.status(timedOut ? 504 : 502).json({
      ok: false,
      error: timedOut ? 'Backend Apps Script terlalu lama merespons. Coba kembali.' : 'Tidak dapat terhubung ke backend Apps Script.'
    });
  }
};
